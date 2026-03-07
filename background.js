importScripts(
  "config.js",
  "core/events.js",
  "core/analyzer.js",
  "core/transitions.js",
  "core/decision.js",
  "adapter/storage.js",
  "adapter/engineCache.js",
  "adapter/enforcement.js"
);

const { SentinelEvent } = SentinelCoreEvents;
const CONFIG = SentinelConfig;

const DEFAULT_SETTINGS = CONFIG.defaults.settings;
const DEFAULT_STATS = CONFIG.defaults.stats;
const DEFAULT_ENGINE = CONFIG.defaults.engine;
const SentinelState = CONFIG.session.states;

const ENGINE_KEY = CONFIG.system.ENGINE_KEY;
const DEBUG = CONFIG.system.DEBUG;

const STORAGE_DEFAULTS = {
  DEFAULT_ENGINE,
  DEFAULT_STATS,
  IDLE: SentinelState.IDLE,
  SESSION_ACTIVE: SentinelState.SESSION_ACTIVE
};

const TRANSITIONS = SentinelCoreTransitions.buildTransitions(
  SentinelState,
  {
    ESCALATION_THRESHOLD: CONFIG.thresholds.ESCALATION_THRESHOLD,
    LOCKDOWN_THRESHOLD: CONFIG.thresholds.LOCKDOWN_THRESHOLD
  },
  SentinelEvent
);

const ANALYZER_CONSTANTS = {
  BUCKET_MINUTES: CONFIG.timing.BUCKET_MINUTES,
  LOOP_WINDOW_MINUTES: CONFIG.timing.LOOP_WINDOW_MINUTES,
  REPEAT_DOMAIN_WINDOW_MS: CONFIG.timing.REPEAT_DOMAIN_WINDOW_MS,
  REPEAT_DOMAIN_THRESHOLD: CONFIG.thresholds.REPEAT_DOMAIN_THRESHOLD,
  events: SentinelEvent,
  states: SentinelState,
  categories: CONFIG.session.categories,
  messages: CONFIG.messages
};

const DECISION_CONSTANTS = {
  ...CONFIG.scoring,
  SCORE_ALLOW_THRESHOLD: CONFIG.thresholds.SCORE_ALLOW_THRESHOLD,
  SCORE_BLOCK_THRESHOLD: CONFIG.thresholds.SCORE_BLOCK_THRESHOLD,
  DIRECTIVES: CONFIG.enforcement.DIRECTIVES
};

const ENFORCEMENT_CONSTANTS = {
  states: SentinelState,
  BREAK_MINUTES: CONFIG.timing.BREAK_MINUTES,
  COOLDOWN_MINUTES: CONFIG.timing.COOLDOWN_MINUTES,
  ALARM_NAMES: CONFIG.enforcement.ALARM_NAMES
};

const tabMeta = new Map();
const navigationCoalescer = new Map();
let dispatchQueue = Promise.resolve();
const engineCache = SentinelAdapterEngineCache.createEngineCache({
  load: () => SentinelAdapterStorage.loadEngine(ENGINE_KEY, STORAGE_DEFAULTS),
  save: (engine) => SentinelAdapterStorage.saveEngine(ENGINE_KEY, engine, STORAGE_DEFAULTS),
  normalize: (engine) => SentinelAdapterStorage.normalizeEngine(engine, STORAGE_DEFAULTS),
  debounceMs: CONFIG.system.CACHE.FLUSH_DEBOUNCE_MS,
  flushIntervalMs: CONFIG.system.CACHE.FLUSH_INTERVAL_MS,
  dlog
});

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get(["settings"]);
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  await engineCache.init();
  await dispatchQueued(SentinelEvent.ACTIVE_UPDATE, {});
});

chrome.runtime.onStartup?.addListener(() => {
  void engineCache.init();
});

chrome.runtime.onSuspend.addListener(() => {
  engineCache.flushNowNoAwait("suspend");
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CONFIG.enforcement.ALARM_NAMES.DEEPWORK_END) {
    await endDeepWork("timer");
  }
  if (alarm.name === CONFIG.enforcement.ALARM_NAMES.BREAK_END) {
    await dispatchQueued(SentinelEvent.BREAK_TIMER_EXPIRED, {});
  }
  if (alarm.name === CONFIG.enforcement.ALARM_NAMES.COOLDOWN_END) {
    await dispatchQueued(SentinelEvent.COOLDOWN_TIMER_EXPIRED, {});
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handleNavigation(tabId, changeInfo.url, tab.active === true);
    return;
  }
  if (changeInfo.status === "complete" && tab.url) {
    handleNavigation(tabId, tab.url, tab.active === true);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) {
    handleNavigation(tabId, tab.url, true);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabMeta.delete(tabId);
  clearNavigationCoalescerForTab(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "get_state") {
    getStateForPopup().then(sendResponse);
    return true;
  }
  if (message.type === "toggle_deepwork") {
    toggleDeepWork(message.enabled, message.durationMin).then(sendResponse);
    return true;
  }
  if (message.type === "start_break") {
    requestBreak().then(sendResponse);
    return true;
  }
  if (message.type === "prompt_response") {
    handlePromptResponse(message.choice, sender?.tab?.id).then(sendResponse);
    return true;
  }
  if (message.type === "page_meta") {
    const tabId = sender?.tab?.id;
    if (tabId && message.url) {
      tabMeta.set(tabId, { url: message.url, title: message.title || "" });
      handleNavigation(tabId, message.url, sender?.tab?.active === true);
    }
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === "request_report") {
    chrome.storage.local.get("lastReport").then(sendResponse);
    return true;
  }
});

async function handleNavigation(tabId, url, isActive) {
  if (!isHttpUrl(url)) return;
  if (isExtensionUrl(url)) return;
  const now = Date.now();
  if (shouldCoalesceNavigation(tabId, url, isActive, now)) return;
  const meta = tabMeta.get(tabId);
  await dispatchQueued(SentinelEvent.NAVIGATION, { tabId, url, isActive, meta });
}

async function getStateForPopup() {
  const { settings, lastReport } = await chrome.storage.local.get(["settings", "lastReport"]);
  const engine = await loadEngine();
  return {
    settings: settings || DEFAULT_SETTINGS,
    sentinelState: engine.state,
    deepWorkActive: engine.state !== SentinelState.IDLE,
    startTime: engine.startTime,
    durationMin: engine.durationMin,
    breakUntil: engine.breakUntil,
    cooldownUntil: engine.cooldownUntil,
    lastReport: lastReport || null
  };
}

async function toggleDeepWork(enabled, durationMin) {
  if (enabled) {
    await startDeepWork(durationMin);
  } else {
    await endDeepWork("manual");
  }
  return { ok: true };
}

async function startDeepWork(durationMin) {
  const now = Date.now();
  await SentinelAdapterEnforcement.clearAlarm(CONFIG.enforcement.ALARM_NAMES.DEEPWORK_END, dlog);
  await SentinelAdapterEnforcement.clearAlarm(CONFIG.enforcement.ALARM_NAMES.BREAK_END, dlog);
  await SentinelAdapterEnforcement.clearAlarm(CONFIG.enforcement.ALARM_NAMES.COOLDOWN_END, dlog);

  await dispatchQueued(SentinelEvent.START_SESSION, { durationMin });

  if (durationMin && durationMin > 0) {
    await SentinelAdapterEnforcement.createAlarm(
      CONFIG.enforcement.ALARM_NAMES.DEEPWORK_END,
      now + durationMin * 60 * 1000,
      dlog
    );
  }

  await SentinelAdapterEnforcement.refreshActiveTab();
}

async function endDeepWork(reason) {
  const engine = await loadEngine();
  if (engine.state === SentinelState.IDLE || !engine.startTime) return;

  const endTime = Date.now();
  const report = buildReport(engine.startTime, endTime, engine.stats || DEFAULT_STATS, reason);

  await dispatchQueued(SentinelEvent.END_SESSION, { reason });
  await chrome.storage.local.set({ lastReport: report });

  await SentinelAdapterEnforcement.clearAlarm(CONFIG.enforcement.ALARM_NAMES.DEEPWORK_END, dlog);
  await SentinelAdapterEnforcement.clearAlarm(CONFIG.enforcement.ALARM_NAMES.BREAK_END, dlog);
  await SentinelAdapterEnforcement.clearAlarm(CONFIG.enforcement.ALARM_NAMES.COOLDOWN_END, dlog);
}

async function requestBreak() {
  await dispatchQueued(SentinelEvent.REQUEST_BREAK, {});
  return { ok: true };
}

async function handlePromptResponse(choice, tabId) {
  if (choice === "break") {
    await requestBreak();
    return { ok: true };
  }
  if (choice === "focus" && tabId) {
    await SentinelAdapterEnforcement.applyDirective(
      { type: CONFIG.enforcement.DIRECTIVES.FOCUS_REDIRECT },
      { tabId, constants: CONFIG.enforcement }
    );
  }
  return { ok: true };
}

function dispatchQueued(event, payload = {}) {
  const run = () => dispatch(event, payload);
  const scheduled = dispatchQueue.then(run, run);
  dispatchQueue = scheduled.catch((error) => {
    dlog("dispatch error", event, error?.message || error);
  });
  return scheduled;
}

async function dispatch(event, payload = {}) {
  const now = Date.now();
  let engine = await loadEngine();

  if (event === SentinelEvent.NAVIGATION) {
    const settings = await loadSettings();
    const enforcing = SentinelCoreDecision.isEnforcementState(engine.state, SentinelState);
    const isDistracting = SentinelCoreDecision.classifyNavigation(payload.url, settings, payload.meta, DECISION_CONSTANTS);

    const quickSwitch = SentinelCoreAnalyzer.detectQuickSwitch(
      engine,
      isDistracting,
      now,
      CONFIG.timing.SWITCH_WINDOW_MS,
      ANALYZER_CONSTANTS
    );

    if (payload.isActive) {
      engine = SentinelCoreAnalyzer.applyEventUpdates(
        engine,
        SentinelEvent.ACTIVE_UPDATE,
        { category: isDistracting ? CONFIG.session.categories.DISTRACTING : CONFIG.session.categories.WORK, at: now },
        now,
        ANALYZER_CONSTANTS,
        { DEFAULT_STATS }
      );
    }

    const directive = SentinelCoreDecision.directiveForNavigation({ enforcing, isDistracting }, DECISION_CONSTANTS);
    const from = engine.state;
    let to = engine.state;

    if (enforcing && isDistracting) {
      engine = SentinelCoreAnalyzer.applyEventUpdates(
        engine,
        SentinelEvent.DISTRACTION_ATTEMPT,
        payload,
        now,
        ANALYZER_CONSTANTS,
        { DEFAULT_STATS }
      );

      const metrics = SentinelCoreAnalyzer.behaviorMetrics(engine);
      to = SentinelCoreTransitions.resolveTransition(
        TRANSITIONS,
        from,
        SentinelEvent.DISTRACTION_ATTEMPT,
        SentinelCoreDecision.transitionContext(engine, metrics)
      );
      engine.state = to;

      if (to !== from) {
        await SentinelAdapterEnforcement.applyStateSideEffects(from, to, engine, now, ENFORCEMENT_CONSTANTS, dlog);
      }

      const loopReason = SentinelCoreAnalyzer.detectLoopReason(engine, payload.url, now, ANALYZER_CONSTANTS);
      const promptReason = loopReason || (quickSwitch ? CONFIG.messages.QUICK_SWITCH : null);
      if (promptReason) {
        await SentinelAdapterEnforcement.applyDirective(
          { type: CONFIG.enforcement.DIRECTIVES.PROMPT, reason: promptReason },
          { ...payload, constants: CONFIG.enforcement }
        );
      }

      if (directive.type === CONFIG.enforcement.DIRECTIVES.BLOCK_HARD) {
        await SentinelAdapterEnforcement.applyDirective(directive, { ...payload, constants: CONFIG.enforcement });
      }
    }

    await saveEngine(engine, {
      flushNow: isCriticalTransition(from, to, event),
      reason: "navigation"
    });
    dlog("transition", `${from} --${event}--> ${to}`, {
      resistanceCount: engine.stats.resistanceCount || 0,
      interruptionAttempts: engine.stats.interruptionAttempts || 0
    });
    return { from, to, engine };
  }

  const nextEngine = SentinelCoreAnalyzer.applyEventUpdates(
    engine,
    event,
    payload,
    now,
    ANALYZER_CONSTANTS,
    { DEFAULT_STATS }
  );
  const from = nextEngine.state;
  const metrics = SentinelCoreAnalyzer.behaviorMetrics(nextEngine);
  const to = SentinelCoreTransitions.resolveTransition(
    TRANSITIONS,
    from,
    event,
    SentinelCoreDecision.transitionContext(nextEngine, metrics)
  );

  nextEngine.state = to;
  if (to !== from) {
    await SentinelAdapterEnforcement.applyStateSideEffects(from, to, nextEngine, now, ENFORCEMENT_CONSTANTS, dlog);
  }

  await saveEngine(nextEngine, {
    flushNow: isCriticalTransition(from, to, event),
    reason: "state_event"
  });
  dlog("transition", `${from} --${event}--> ${to}`, {
    resistanceCount: nextEngine.stats.resistanceCount || 0,
    interruptionAttempts: nextEngine.stats.interruptionAttempts || 0
  });

  return { from, to, engine: nextEngine };
}

async function loadEngine() {
  return engineCache.get();
}

async function saveEngine(engine, options = {}) {
  return engineCache.set(engine, options);
}

async function loadSettings() {
  const { settings } = await chrome.storage.local.get(["settings"]);
  return settings || DEFAULT_SETTINGS;
}

function buildReport(startTime, endTime, stats, reason) {
  const durationMs = endTime - startTime;
  const durationMin = Math.max(1, Math.round(durationMs / 60000));
  let firstDistraction = null;
  if (stats.firstDistractionAt) {
    const minutesIn = Math.round((stats.firstDistractionAt - startTime) / 60000);
    firstDistraction = {
      at: new Date(stats.firstDistractionAt).toLocaleTimeString(),
      minutesIn
    };
  }

  const { windowLabel, windowCount } = strongestVulnerabilityWindow(startTime, stats.attemptsByBucket);

  return {
    reason,
    durationMin,
    firstDistraction,
    interruptionAttempts: stats.interruptionAttempts || 0,
    strongestWindow: windowCount > 0 ? windowLabel : "No clear window"
  };
}

function strongestVulnerabilityWindow(startTime, buckets) {
  let maxCount = 0;
  let maxIndex = null;
  Object.entries(buckets || {}).forEach(([idx, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxIndex = Number(idx);
    }
  });
  if (maxIndex === null) {
    return { windowLabel: null, windowCount: 0 };
  }
  const windowStart = new Date(startTime + maxIndex * CONFIG.timing.BUCKET_MINUTES * 60 * 1000);
  const windowEnd = new Date(startTime + (maxIndex + 1) * CONFIG.timing.BUCKET_MINUTES * 60 * 1000);
  const windowLabel = `${windowStart.toLocaleTimeString()} - ${windowEnd.toLocaleTimeString()} (minute ${maxIndex * CONFIG.timing.BUCKET_MINUTES}-${(maxIndex + 1) * CONFIG.timing.BUCKET_MINUTES})`;
  return { windowLabel, windowCount: maxCount };
}

function isHttpUrl(url) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function isExtensionUrl(url) {
  return url.startsWith(chrome.runtime.getURL(""));
}

function dlog(...args) {
  if (!DEBUG) return;
  console.log("[Sentinel]", ...args);
}

function shouldCoalesceNavigation(tabId, url, isActive, now) {
  pruneNavigationCoalescer(now);
  const key = navigationKey(tabId, url);
  const previous = navigationCoalescer.get(key);
  const windowMs = CONFIG.timing.NAVIGATION_COALESCE_WINDOW_MS;

  if (!previous) {
    navigationCoalescer.set(key, { tabId, url, seenAt: now, isActive: Boolean(isActive) });
    return false;
  }

  // Preserve correctness: if we receive an "active" navigation after an inactive duplicate,
  // let it through once so active-category updates are not lost.
  const shouldUpgrade = Boolean(isActive) && !previous.isActive;
  const isWithinWindow = now - previous.seenAt <= windowMs;
  previous.seenAt = now;
  previous.isActive = previous.isActive || Boolean(isActive);
  navigationCoalescer.set(key, previous);

  if (isWithinWindow && !shouldUpgrade) {
    dlog("navigation coalesced", { tabId, url });
    return true;
  }
  return false;
}

function pruneNavigationCoalescer(now) {
  const ttl = CONFIG.timing.NAVIGATION_COALESCE_WINDOW_MS * 4;
  for (const [key, value] of navigationCoalescer.entries()) {
    if (now - value.seenAt > ttl) {
      navigationCoalescer.delete(key);
    }
  }
}

function clearNavigationCoalescerForTab(tabId) {
  for (const [key, value] of navigationCoalescer.entries()) {
    if (value.tabId === tabId) {
      navigationCoalescer.delete(key);
    }
  }
}

function navigationKey(tabId, url) {
  return `${tabId}::${url}`;
}

function isCriticalTransition(from, to, event) {
  if (event === SentinelEvent.START_SESSION) return true;
  if (event === SentinelEvent.END_SESSION) return true;
  if (to === SentinelState.LOCKDOWN && from !== SentinelState.LOCKDOWN) return true;
  return false;
}
