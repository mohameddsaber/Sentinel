import {
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  DEFAULT_PROGRESS,
  EMERGENCY_EXIT_COOLDOWN_MS,
  ALWAYS_BLOCK_DOMAINS,
  ALWAYS_ALLOW_DOMAINS,
  SCORE_ALLOW_THRESHOLD,
  SCORE_BLOCK_THRESHOLD,
  STRICT_UNKNOWN_MEDIA_BLOCK,

} from "./config.js";

import {
  toggleDeepWork,
  endDeepWork,
  getTodayMinutes,
  setDailyGoal
} from "./deepWork.js";

import {
  isHttpUrl,
  isExtensionUrl,
  matchesDomain,
  matchesPatterns,
  domainPatternRisk,
  shouldBlockUnknownMediaDomain,
  keywordScore,
} from "./utils.js";

import {
  isYouTubeDomain,
  isYouTubeShorts,
  isAllowedYouTubeRoute,
  handleYouTubeChannelCheck,
  approveYouTubeChannel
} from "./youtube.js";

const tabMeta = new Map();

chrome.runtime.onInstalled.addListener(async () => {
  const { settings, progress } = await chrome.storage.local.get([
    "settings",
    "progress"
  ]);
  const updates = {};
  if (!settings) updates.settings = DEFAULT_SETTINGS;
  if (!progress) updates.progress = DEFAULT_PROGRESS;
  if (Object.keys(updates).length > 0) await chrome.storage.local.set(updates);
  await injectContentScriptIntoExistingTabs();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "deepwork_end") {
    await endDeepWork("timer");
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "loading") {
    const url= (changeInfo.url || tab.pendingUrl || tab.url );
    if(url) enforceBlocking(tabId, url);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) {
    enforceBlocking(tabId, tab.url);
  }
});


chrome.tabs.onRemoved.addListener((tabId) => {
  tabMeta.delete(tabId);
  // clearApprovedSearchesForTab(tabId).catch(() => { });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "get_state") {
    getStateForPopup().then(sendResponse);
    return true;
  }
  if (message.type === "toggle_deepwork") {
    toggleDeepWork(message.enabled, message.durationMin, message.currentTask).then(sendResponse);
    return true;
  }
  if (message.type === "get_emergency_exit_status") {
    getEmergencyExitStatus().then(sendResponse);
    return true;
  }
  if (message.type === "emergency_exit") {
    useEmergencyExit().then(sendResponse);
    return true;
  }

  if (message.type === "page_meta") {
    if (sender.documentLifecycle && sender.documentLifecycle !== "active") {
    sendResponse({ ok: false });
    return true;
    }
    if (sender.frameId !== 0) {
      sendResponse({ ok: false });
      return true;
    }
    const tabId = sender?.tab?.id;
    if (tabId && message.url) {
      tabMeta.set(tabId, { url: message.url, title: message.title || "", category: message.category || "" });
      enforceBlocking(tabId, message.url);
    }
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === "set_daily_goal") {
    setDailyGoal(message.dailyMinutesGoal).then(sendResponse);
    return true;
  }

  if (message.type === "youtube_channel_check") {
    handleYouTubeChannelCheck(message.url).then(sendResponse);
    return true;
  }
  if (message.type === "approve_youtube_channel") {
    approveYouTubeChannel(message.url).then(sendResponse);
    return true;
  }

});

async function getStateForPopup() {
  const { settings, state, progress } = await chrome.storage.local.get([
    "settings",
    "state",
    "progress"
  ]);
  const activeSettings = settings || DEFAULT_SETTINGS;
  const activeState = state || DEFAULT_STATE;
  const activeProgress = progress || DEFAULT_PROGRESS;
  const todayMinutes = getTodayMinutes(activeProgress.sessions, activeState);
  const goal = activeSettings.dailyMinutesGoal || 0;
  const progressPercent = goal > 0
    ? Math.min(100, Math.round((todayMinutes / goal) * 100))
    : 0;
  // const { count: searchOverridesToday } = await getTodayOverrideCount();
  return {
    sentinelState: activeState.deepWorkActive ? "SESSION_ACTIVE" : "IDLE",
    currentTask: activeState.currentTask,
    durationMin: activeState.durationMin,
    todayMinutes,
    goal,
    progressPercent,
  };
}

export async function enforceBlocking(tabId, url) {
  if (!isHttpUrl(url)) return;
  if (isExtensionUrl(url)) return;

  const { settings, state } = await chrome.storage.local.get([
    "settings",
    "state",
  ]);
  const activeState = state || DEFAULT_STATE;
  const deepWorkActive = activeState.deepWorkActive;
  if (!deepWorkActive) return;

  const activeSettings = settings || DEFAULT_SETTINGS;
  const meta = tabMeta.get(tabId);
  const isDistracting = isBlockedByRules(url, activeSettings, meta);
  if (isDistracting) {
    await redirectToBlocked(tabId, url);
  }
}

async function redirectToBlocked(tabId, originalUrl) {
  const blockedUrl = chrome.runtime.getURL(`blocked/blocked.html?url=${encodeURIComponent(originalUrl)}`);
  try {
    await chrome.tabs.update(tabId, { url: blockedUrl });
  } catch {
    // ignore
  }
}
async function injectContentScriptIntoExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
      if (!tab.id || !tab.url || isExtensionUrl(tab.url)) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content/content_script.js"],
        });
      } catch {
      }
    }
  } catch {
  }
}

async function getEmergencyExitStatus() {
  const { emergencyExitLastUsedAt } = await chrome.storage.local.get("emergencyExitLastUsedAt");
  const lastUsedAt = typeof emergencyExitLastUsedAt === "number" ? emergencyExitLastUsedAt : null;

  if (!lastUsedAt) {
    return { available: true, remainingMs: 0, lastUsedAt: null };
  }

  const remainingMs = Math.max(0, lastUsedAt + EMERGENCY_EXIT_COOLDOWN_MS - Date.now());
  return {
    available: remainingMs === 0,
    remainingMs,
    lastUsedAt
  };
}

async function useEmergencyExit() {
  const status = await getEmergencyExitStatus();
  if (!status.available) {
    return { ok: false, ...status };
  }

  const { state } = await chrome.storage.local.get("state");
  const activeState = state || DEFAULT_STATE;

  if (!activeState.deepWorkActive) {
    return { ok: false, available: true, remainingMs: 0 };
  }
  const usedAt = Date.now();
  await chrome.storage.local.set({ emergencyExitLastUsedAt: usedAt });
  await endDeepWork("emergency_exit");
  return { ok: true, available: false, remainingMs: EMERGENCY_EXIT_COOLDOWN_MS, lastUsedAt: usedAt };
}
function isBlockedByRules(url, settings, meta) {
  if (isAllowlisted(url, settings.allowPatterns || [])) return false;
  if (isYouTubeDomain(url)) {
    if (settings.blockShorts && isYouTubeShorts(url)) return true;
    const isAllowed = isAllowedYouTubeRoute(url, meta?.title || "", meta?.category || "");
    console.log(`[Sentinel Background] Video: ${url} | Category: "${meta?.category || 'N/A'}" | Blocked: ${!isAllowed}`);
    return !isAllowed;
  }
  if (matchesDomain(url, settings.blockedDomains || [])) return true;
  if (matchesPatterns(url, settings.blockedPatterns || [])) return true;

  if (matchesDomain(url, ALWAYS_ALLOW_DOMAINS)) return false;

  const domainRisk = domainPatternRisk(url);
  if (domainRisk >= 3) return true;

  if (STRICT_UNKNOWN_MEDIA_BLOCK && shouldBlockUnknownMediaDomain(url, meta?.title || "")) {
    return true;
  }

  const score = keywordScore(url, meta?.title || "");
  const hasNegatives = score.negativeHits > 0;

  if (matchesDomain(url, ALWAYS_BLOCK_DOMAINS)) {
    return score.total < SCORE_ALLOW_THRESHOLD;
  }

  if (score.total <= SCORE_BLOCK_THRESHOLD && hasNegatives) {
    return true;
  }
  return false;
}

function isAllowlisted(url, allowPatterns) {
  return matchesPatterns(url, allowPatterns || []);
}