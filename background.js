importScripts(
  "core/events.js",
  "core/analyzer.js",
  "core/transitions.js",
  "core/decision.js",
  "adapter/storage.js",
  "adapter/enforcement.js"
);

const { SentinelEvent } = SentinelCoreEvents;

const DEFAULT_SETTINGS = {
  blockedDomains: [],
  blockedPatterns: [],
  allowPatterns: [],
  blockShorts: true,
  timerMinutes: 50
};

const SentinelState = Object.freeze({
  IDLE: "IDLE",
  SESSION_ACTIVE: "SESSION_ACTIVE",
  SESSION_ESCALATED: "SESSION_ESCALATED",
  LOCKDOWN: "LOCKDOWN",
  BREAK: "BREAK",
  COOLDOWN: "COOLDOWN"
});

const DEFAULT_STATS = {
  firstDistractionAt: null,
  interruptionAttempts: 0,
  resistanceCount: 0,
  attemptsByBucket: {},
  attemptsByDomain: {},
  distractionTimestamps: []
};

const DEFAULT_ENGINE = {
  state: SentinelState.IDLE,
  startTime: null,
  durationMin: 0,
  breakUntil: null,
  cooldownUntil: null,
  lastActiveCategory: null,
  lastActiveAt: null,
  stats: { ...DEFAULT_STATS }
};

const ENGINE_KEY = "engine";
const DEBUG = false;

const CONSTANTS = {
  BUCKET_MINUTES: 5,
  LOOP_WINDOW_MINUTES: 10,
  SWITCH_WINDOW_MS: 2 * 60 * 1000,
  REPEAT_DOMAIN_WINDOW_MS: 5 * 60 * 1000,
  REPEAT_DOMAIN_THRESHOLD: 3,
  ESCALATION_THRESHOLD: 3,
  LOCKDOWN_THRESHOLD: 6,
  BREAK_MINUTES: 5,
  COOLDOWN_MINUTES: 3,
  SCORE_ALLOW_THRESHOLD: 2,
  SCORE_BLOCK_THRESHOLD: -2,
  STRICT_UNKNOWN_MEDIA_BLOCK: true,
  ALWAYS_BLOCK_DOMAINS: [
    "twitter.com", "x.com", "instagram.com", "tiktok.com", "reddit.com", "facebook.com", "threads.net",
    "snapchat.com", "pinterest.com", "tumblr.com", "9gag.com", "imgur.com", "twitch.tv", "netflix.com",
    "hulu.com", "disneyplus.com", "hbomax.com", "max.com", "primevideo.com", "crunchyroll.com",
    "soundcloud.com", "spotify.com", "bandcamp.com", "espn.com", "bleacherreport.com", "theathletic.com",
    "ign.com", "gamespot.com", "steamcommunity.com"
  ],
  ALWAYS_ALLOW_DOMAINS: [
    "coursera.org", "edx.org", "khanacademy.org", "udemy.com", "pluralsight.com", "frontendmasters.com",
    "ocw.mit.edu", "mit.edu", "open.edu", "harvard.edu", "stanford.edu", "wikipedia.org",
    "developer.mozilla.org", "docs.google.com"
  ],
  KEYWORD_WEIGHTS: [
    { weight: 6, words: ["full course", "complete course", "crash course", "masterclass", "step by step", "from scratch", "for beginners", "advanced course"] },
    { weight: 4, words: ["lecture", "lesson", "syllabus", "assignment", "lab session", "seminar", "workshop", "training program"] },
    { weight: 3, words: ["tutorial", "guide", "how to", "how-to", "documentation", "docs", "reference", "api", "specification", "explained", "deep dive"] },
    { weight: 3, words: ["university", "college", "research", "paper", "journal", "case study", "curriculum", "professor"] },
    { weight: 3, words: ["react", "typescript", "javascript", "node", "express", "nextjs", "api design", "system design", "algorithms", "data structures", "database", "sql", "docker", "git"] },
    { weight: 2, words: ["walkthrough", "explainer", "overview", "fundamentals", "intro", "bootcamp", "best practices", "project tutorial"] },
    { weight: -6, words: ["shorts", "yt shorts", "reels", "tiktok", "asmr", "mukbang"] },
    { weight: -4, words: ["prank", "meme", "reaction", "reacts", "trailer", "compilation", "funny", "vlog", "highlights", "clip", "edit", "drama", "gossip"] },
    { weight: -3, words: ["gameplay", "let's play", "lets play", "live stream", "livestream", "stream", "music", "lyrics", "concert"] },
    { weight: -3, words: ["you won't believe", "insane", "shocking", "crazy", "top 10", "must watch", "gone wrong", "exposed", "destroyed"] }
  ],
  ADULT_DOMAIN_KEYWORDS: [
    "porn", "sex", "xxx", "xvideos", "xhamster", "xnxx", "redtube", "youporn", "hentai", "cam", "cams",
    "onlyfans", "erotic", "nsfw", "milf", "anal", "bdsm", "escort", "fuck", "boobs"
  ],
  STREAMING_DOMAIN_KEYWORDS: [
    "watch", "stream", "movie", "movies", "series", "tv", "anime", "episode", "cinema", "flixtor",
    "putlocker", "123movies", "soap2day", "cuevana", "myflixer", "sflix", "lookmovie", "vidcloud"
  ],
  SUSPICIOUS_TLDS: [".to", ".sx", ".ru", ".su", ".xyz", ".click", ".top", ".rest", ".monster", ".buzz", ".cam", ".porn", ".adult"],
  KNOWN_SAFE_STREAMING_DOMAINS: ["youtube.com", "vimeo.com", "coursera.org", "edx.org", "udemy.com", "khanacademy.org"]
};

const STORAGE_DEFAULTS = {
  DEFAULT_ENGINE,
  DEFAULT_STATS,
  IDLE: SentinelState.IDLE,
  SESSION_ACTIVE: SentinelState.SESSION_ACTIVE
};

const STATE_CONSTANTS = { states: SentinelState, events: SentinelEvent };
const TRANSITIONS = SentinelCoreTransitions.buildTransitions(SentinelState, CONSTANTS, SentinelEvent);

const tabMeta = new Map();
let dispatchQueue = Promise.resolve();

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get(["settings"]);
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  await dispatchQueued(SentinelEvent.ACTIVE_UPDATE, {});
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "deepwork_end") {
    await endDeepWork("timer");
  }
  if (alarm.name === "break_end") {
    await dispatchQueued(SentinelEvent.BREAK_TIMER_EXPIRED, {});
  }
  if (alarm.name === "cooldown_end") {
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
  await SentinelAdapterEnforcement.clearAlarm("deepwork_end", dlog);
  await SentinelAdapterEnforcement.clearAlarm("break_end", dlog);
  await SentinelAdapterEnforcement.clearAlarm("cooldown_end", dlog);

  await dispatchQueued(SentinelEvent.START_SESSION, { durationMin });

  if (durationMin && durationMin > 0) {
    await SentinelAdapterEnforcement.createAlarm("deepwork_end", now + durationMin * 60 * 1000, dlog);
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

  await SentinelAdapterEnforcement.clearAlarm("deepwork_end", dlog);
  await SentinelAdapterEnforcement.clearAlarm("break_end", dlog);
  await SentinelAdapterEnforcement.clearAlarm("cooldown_end", dlog);
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
    await SentinelAdapterEnforcement.applyDirective({ type: "FOCUS_REDIRECT" }, { tabId });
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
    const isDistracting = SentinelCoreDecision.classifyNavigation(payload.url, settings, payload.meta, CONSTANTS);

    const quickSwitch = SentinelCoreAnalyzer.detectQuickSwitch(
      engine,
      isDistracting,
      now,
      CONSTANTS.SWITCH_WINDOW_MS
    );

    if (payload.isActive) {
      engine = SentinelCoreAnalyzer.applyEventUpdates(
        engine,
        SentinelEvent.ACTIVE_UPDATE,
        { category: isDistracting ? "distracting" : "work", at: now },
        now,
        { ...CONSTANTS, ...STATE_CONSTANTS },
        { DEFAULT_STATS }
      );
    }

    const directive = SentinelCoreDecision.directiveForNavigation({ enforcing, isDistracting });
    let from = engine.state;
    let to = engine.state;

    if (enforcing && isDistracting) {
      engine = SentinelCoreAnalyzer.applyEventUpdates(
        engine,
        SentinelEvent.DISTRACTION_ATTEMPT,
        payload,
        now,
        { ...CONSTANTS, ...STATE_CONSTANTS },
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
        await SentinelAdapterEnforcement.applyStateSideEffects(from, to, engine, now, { ...CONSTANTS, states: SentinelState }, dlog);
      }

      const loopReason = SentinelCoreAnalyzer.detectLoopReason(engine, payload.url, now, CONSTANTS);
      const promptReason = loopReason || (quickSwitch ? "switching quickly from work to entertainment" : null);
      if (promptReason) {
        await SentinelAdapterEnforcement.applyDirective({ type: "PROMPT", reason: promptReason }, payload);
      }

      if (directive.type === "BLOCK_HARD") {
        await SentinelAdapterEnforcement.applyDirective(directive, payload);
      }
    }

    await saveEngine(engine);
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
    { ...CONSTANTS, ...STATE_CONSTANTS },
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
    await SentinelAdapterEnforcement.applyStateSideEffects(from, to, nextEngine, now, { ...CONSTANTS, states: SentinelState }, dlog);
  }

  await saveEngine(nextEngine);
  dlog("transition", `${from} --${event}--> ${to}`, {
    resistanceCount: nextEngine.stats.resistanceCount || 0,
    interruptionAttempts: nextEngine.stats.interruptionAttempts || 0
  });

  return { from, to, engine: nextEngine };
}

async function loadEngine() {
  return SentinelAdapterStorage.loadEngine(ENGINE_KEY, STORAGE_DEFAULTS);
}

async function saveEngine(engine) {
  return SentinelAdapterStorage.saveEngine(ENGINE_KEY, engine, STORAGE_DEFAULTS);
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
  const windowStart = new Date(startTime + maxIndex * CONSTANTS.BUCKET_MINUTES * 60 * 1000);
  const windowEnd = new Date(startTime + (maxIndex + 1) * CONSTANTS.BUCKET_MINUTES * 60 * 1000);
  const windowLabel = `${windowStart.toLocaleTimeString()} - ${windowEnd.toLocaleTimeString()} (minute ${maxIndex * CONSTANTS.BUCKET_MINUTES}-${(maxIndex + 1) * CONSTANTS.BUCKET_MINUTES})`;
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
