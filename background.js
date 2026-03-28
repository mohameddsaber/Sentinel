const DEFAULT_SETTINGS = {
  blockedDomains: [],
  blockedPatterns: [],
  allowPatterns: [],
  allowedYouTubeChannels: [],
  blockShorts: true,
  timerMinutes: 50,
  dailyMinutesGoal: 180,
};

const DEFAULT_STATE = {
  deepWorkActive: false,
  startTime: null,
  durationMin: 0,
  currentTask: null,

};

const DEFAULT_PROGRESS = {
  sessions: [],
};

// const BUCKET_MINUTES = 5;
// const LOOP_WINDOW_MINUTES = 10;
// const SWITCH_WINDOW_MS = 2 * 60 * 1000;
// const REPEAT_DOMAIN_WINDOW_MS = 5 * 60 * 1000;
// const REPEAT_DOMAIN_THRESHOLD = 3;

const EMERGENCY_EXIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const ALWAYS_BLOCK_DOMAINS = [
  "twitter.com",
  "x.com",
  "instagram.com",
  "tiktok.com",
  "reddit.com",
  "facebook.com",
  "threads.net",
  "snapchat.com",
  "pinterest.com",
  "tumblr.com",
  "9gag.com",
  "imgur.com",
  "twitch.tv",
  "netflix.com",
  "hulu.com",
  "disneyplus.com",
  "hbomax.com",
  "max.com",
  "primevideo.com",
  "crunchyroll.com",
  "soundcloud.com",
  "spotify.com",
  "bandcamp.com",
  "espn.com",
  "bleacherreport.com",
  "theathletic.com",
  "ign.com",
  "gamespot.com",
  "steamcommunity.com"
];

const ALWAYS_ALLOW_DOMAINS = [
  "coursera.org",
  "edx.org",
  "khanacademy.org",
  "udemy.com",
  "pluralsight.com",
  "frontendmasters.com",
  "ocw.mit.edu",
  "mit.edu",
  "open.edu",
  "harvard.edu",
  "stanford.edu",
  "wikipedia.org",
  "developer.mozilla.org",
  "docs.google.com"
];

const KEYWORD_WEIGHTS = [
  // Strong educational phrases (highest signal)
  { weight: 6, words: ["full course", "complete course", "crash course", "masterclass", "step by step", "from scratch", "for beginners", "advanced course"] },

  // Strong academic/training signals
  { weight: 4, words: ["lecture", "lesson", "syllabus", "assignment", "lab session", "seminar", "workshop", "training program"] },

  // Tutorials / documentation signals
  { weight: 3, words: ["tutorial", "guide", "how to", "how-to", "documentation", "docs", "reference", "api", "specification", "explained", "deep dive"] },

  // University / research signals
  { weight: 3, words: ["university", "college", "research", "paper", "journal", "case study", "curriculum", "professor"] },

  // Tech/domain boosts (customize to your goals)
  { weight: 3, words: ["react", "typescript", "javascript", "node", "express", "nextjs", "api design", "system design", "algorithms", "data structures", "database", "sql", "docker", "git"] },

  // Medium positives (lighter learning)
  { weight: 2, words: ["walkthrough", "explainer", "overview", "fundamentals", "intro", "bootcamp", "best practices", "project tutorial"] },

  // HARD negatives (block-y)
  { weight: -6, words: ["shorts", "yt shorts", "reels", "tiktok", "asmr", "mukbang"] },

  // Entertainment negatives
  { weight: -4, words: ["prank", "meme", "reaction", "reacts", "trailer", "compilation", "funny", "vlog", "highlights", "clip", "edit", "drama", "gossip"] },

  // Gaming / streaming / music sinks
  { weight: -3, words: ["gameplay", "let's play", "lets play", "live stream", "livestream", "stream", "music", "lyrics", "concert"] },

  // Clickbait patterns (super useful)
  { weight: -3, words: ["you won't believe", "insane", "shocking", "crazy", "top 10", "must watch", "gone wrong", "exposed", "destroyed"] }
];
const SCORE_ALLOW_THRESHOLD = 2;
const SCORE_BLOCK_THRESHOLD = -2;

// YouTube channel handles (@handle), channel IDs (UC...), and /c/ or /user/ slugs.
// Any video whose URL contains one of these identifiers is treated as educational and allowed.
const EDUCATIONAL_YT_CHANNELS = new Set([
  // Science & Engineering
  "@3blue1brown", "UCYO_jab_esuFRV4b17AJtAw",
  "@veritasium", "UCHnyfMqiRRG1u-2MsSQLbXA",
  "@SmarterEveryDay", "UC6107grRI4m0o2-emgoDnAA",
  "@Kurzgesagt", "UCsXVk37bltHxD1rDPwtNM8Q",
  "@PBS_Spacetime", "UC7_gcs09iThXybpVgjHZ_7g",
  "@numberphile", "UCoxcjq-8xIDTYp3uz647V5A",
  "@minutephysics", "UCUHW94eEFW7hkUMVaZz4eDg",
  "@TED", "UCAuUUnT6oDeKwE6v1NGQxug",
  "@TEDx", "UCsT0YIqwnpJCM-mx7-gSA4Q",
  "@lexfridman", "UCSHZKyawb77ixDdsGog4iWA",
  "@andrewhubermanlab", "UC2D2CMWXMOVWx7giW1n3LIg",
  "@pbsspacetime",

  // CS / Programming
  "@ThePrimeagen", "UCVMe_QbS3OA1lRIBLKFDikg",
  "@Fireship", "UCsBjURrPoezykLs9EqgamOA",
  "@TechWithTim", "UC4JX40jDee_tINbkjycV4Sg",
  "@NetworkChuck", "UCVeW9qkBjo3zosnqUbG7CFw",
  "@BroCodez", "UC-yuWVUplUJZvieEligKBkA",
  "@TheCodingTrain", "UCvjgXvBlbQiydffZU7m1_aw",
  "@MITOpenCourseWare", "UCEBb1b_L6zDS3xTUrIALZOw",
  "@StanfordOnline",
  "@YaleCourses",
  "@HarvardX",
  "@freeCodeCamp", "UC8butISFwT-Wl7EV0hUK0BQ",
  "@Reducible",
  "@NeetCode", "UC_mYaQAE6-71rjSN6CeCA-g",
  "@AbdulBari1",
  "@CS50", "UCcabW7890RKJzL968QWEykA",

  // Math
  "@blackpenredpen", "UC_SvYP0k05UKiJ_2ndB02IA",
  "@patrickjmt",
  "@ProfessorLeonard", "UCoHhuummRZaIVAxzHU3GXrw",
  "@mathsaurus",
  "@TheOrganicChemistryTutor", "UCEWpbFLzoYGPfuWUMFPSaoA",

  // History / Humanities
  "@OverSimplified", "UCNIuvl7V8zACPpTmmNIqP2A",
  "@HistoryMatters", "UC22BdTgxefuvUivrjesETjg",
  "@CrashCourse", "UCX6b17PVsYBQ0ip5gyeme-Q",
  "@TomScottGo", "UCBa659QWEk1AI4Tg--mrJ2A",
  "@Wendoverproductions", "UC9RM-iSvTu1uPJb8X5yp3EQ",
  "@RealEngineering", "UCR1IuLEqb6UEA_zQ81kwXfg",
  "@HalfAsInteresting", "UCuCkxoKLYO_EQ2GeFtbM_bw",
]);

// Videos from these channels are blocked regardless of title score.
const ENTERTAINMENT_YT_CHANNELS = new Set([
  // Reaction / commentary
  "@IShowSpeed", "UCnYMl8hHKkELSmg6QkwRNEg",
  "@MrBeast", "UCX6OQ3DkcsbYNE6H8uQQuVA",
  "@Sidemen", "UCiWLfSweyRNmLpgEHekhoAg",
  "@PewDiePie", "UC-lHJZR3Gqxm24_Vd_AJ5Yw",
  "@Markiplier", "UCfAPTv1LgeEWevG8X_6PUOQ",
  "@jacksepticeye", "UCYzPXprvl5Y-Sf0g4vX-m6g",
  "@jaidenanimations", "UCGwu0nbY2wSkW8N-cghnLpA",
  "@ksi", "UCWX3yGbODI3HLz839YbWCHg",
  "@NickEh30", "UCVGthgSXmCEHF6htAASiR1Q",
  "@Typical_Gamer", "UCpvg0uZH-J2oJQXXeKZAVqg",
  "@FaZeRug", "UCH_0SCoGQhFSNFQ-R1H9crQ",
  "@SSundee", "UCVv8HgBFZsBnKGqr9EGVK3A",
  "@Dude Perfect", "UCRijo3ddMTht_IHyNSNXpNQ",
  "@TreyKennedy",
  "@5MinuteCrafts",
]);

const YOUTUBE_SEARCH_HARD_BLOCK_PATTERNS = [
  // Ultra-passive / dopamine
  "asmr", "mukbang", "satisfying", "oddly satisfying",

  // Pranks / reactions / memes
  "prank", "reaction", "reacts", "meme", "memes",
  "funny moments", "best moments", "compilation", "try not to laugh",

  // Short-form / algorithm bait
  "shorts", "reels", "tiktok", "clips", "clip", "edit", "edits",

  // Celebrity / drama / gossip
  "celebrity", "drama", "gossip", "exposed", "beef", "controversy",

  // Gaming binge content
  "gameplay", "lets play", "let's play", "livestream", "stream highlights",

  // Music consumption
  "lyrics", "music video", "official video", "audio", "live concert", "music mix", "playlist",

  // Lifestyle / vlog / day content
  "vlog", "day in the life", "morning routine", "night routine", "daily routine",

  // Clickbait formats
  "you won't believe", "insane", "crazy", "shocking",
  "top 10", "top 5", "must watch", "gone wrong",

  // Podcasts / long passive listening
  "podcast", "interview highlights",

  // Commentary / commentary drama
  "commentary", "rant", "hot take"
];

const ADULT_DOMAIN_KEYWORDS = [
  "porn", "sex", "xxx", "xvideos", "xhamster", "xnxx", "redtube", "youporn", "hentai", "cam", "cams",
  "onlyfans", "erotic", "nsfw", "milf", "anal", "bdsm", "escort", "fuck", "boobs"
];

const STREAMING_DOMAIN_KEYWORDS = [
  "watch", "stream", "movie", "movies", "series", "tv", "anime", "episode", "cinema", "flixtor",
  "putlocker", "123movies", "soap2day", "cuevana", "myflixer", "sflix", "lookmovie", "vidcloud"
];

const SUSPICIOUS_TLDS = [
  ".to", ".sx", ".ru", ".su", ".xyz", ".click", ".top", ".rest", ".monster", ".buzz", ".cam", ".porn", ".adult"
];

const KNOWN_SAFE_STREAMING_DOMAINS = [
  "youtube.com",
  "vimeo.com",
  "coursera.org",
  "edx.org",
  "udemy.com",
  "khanacademy.org"
];

const STRICT_UNKNOWN_MEDIA_BLOCK = true;

const tabMeta = new Map();
const APPROVED_SEARCH_KEY_PREFIX = "approved_searches:";

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
  if (changeInfo.url) {
    handleUrlChange(tabId, changeInfo.url, tab.active === true);
    return;
  }
  if (changeInfo.status === "complete" && tab.url) {
    handleUrlChange(tabId, tab.url, tab.active === true);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) {
    handleActiveTabSwitch(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabMeta.delete(tabId);
  clearApprovedSearchesForTab(tabId).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "get_state") {
    getStateForPopup().then(sendResponse);
    return true;
  }
  if (message.type === "toggle_deepwork") {
    toggleDeepWork(message.enabled, message.durationMin,message.currentTask).then(sendResponse);
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
  if (message.type === "prompt_response") {
    handlePromptResponse(message.choice, sender?.tab?.id).then(sendResponse);
    return true;
  }
  if (message.type === "page_meta") {
    const tabId = sender?.tab?.id;
    if (tabId && message.url) {
      tabMeta.set(tabId, { url: message.url, title: message.title || "" });
      handleUrlChange(tabId, message.url, sender?.tab?.active === true);
    }
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === "set_daily_goal") {
    setDailyGoal(message.dailyMinutesGoal).then(sendResponse);
    return true;
  }
  if (message.type === "search_query_check") {
    handleSearchQueryCheck(message.query, sender?.tab?.id).then(sendResponse);
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
  if (message.type === "approve_search_query") {
    approveSearchQuery(sender?.tab?.id, message.query).then(sendResponse);
    return true;
  }
  // Sent by soft_blocked.html after the user provides a written reason.
  // tabId comes from the page's query param since extension pages have no sender tab context.
  if (message.type === "approve_search_query_with_reason") {
    const tabId = message.tabId ?? sender?.tab?.id;
    approveSearchQueryWithReason(tabId, message.query, message.reason).then(sendResponse);
    return true;
  }
  // Used by soft_blocked.html to display the running session override count.
  if (message.type === "get_override_count") {
    getTodayOverrideCount().then(sendResponse);
    return true;
  }
});

async function getStateForPopup() {
  const { settings, state,progress } = await chrome.storage.local.get([
    "settings",
    "state",
    "progress"
  ]);
  const activeSettings = settings || DEFAULT_SETTINGS;
  const activeState = state || DEFAULT_STATE;
  const activeProgress = progress || DEFAULT_PROGRESS;
  const todayMinutes = getTodayMinutes(activeProgress.sessions);
  const goal = activeSettings.dailyMinutesGoal || 0;
  const progressPercent = goal > 0
    ? Math.min(100, Math.round((todayMinutes / goal) * 100))
    : 0;
  const { count: searchOverridesToday } = await getTodayOverrideCount();
  return {
    sentinelState: activeState.deepWorkActive ? "SESSION_ACTIVE" : "IDLE",
    currentTask: activeState.currentTask,
    durationMin: activeState.durationMin,
    todayMinutes,
    goal,
    progressPercent,
    searchOverridesToday,
  };
}


async function toggleDeepWork(enabled, durationMin, currentTask) {
  if (enabled) {
    await startDeepWork(durationMin,currentTask);
  }
  return { ok: true };
}

async function startDeepWork(durationMin, currentTask) {
  const now = Date.now();
  await clearAllApprovedSearches();

  // Reset the override log at the start of each new session
  const { progress } = await chrome.storage.local.get("progress");
  const activeProgress = progress || DEFAULT_PROGRESS;
  await chrome.storage.local.set({
    progress: { ...activeProgress, searchOverrides: [] },
  });

  await chrome.storage.local.set({
    state: {
      deepWorkActive: true,
      startTime: now,
      durationMin: durationMin || 0,
      currentTask: currentTask || null,
    }
  });
  await chrome.alarms.clear("deepwork_end");
  if (durationMin && durationMin > 0) {
    const when = now + durationMin * 60 * 1000;
    await chrome.alarms.create("deepwork_end", { when });
  }
  await enforceActiveTabAtSessionStart();
}

async function enforceActiveTabAtSessionStart() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (activeTab?.id && activeTab.url) {
      await handleActiveTabSwitch(activeTab.id, activeTab.url);
    }
  } catch {
    // ignore
  }
}

async function endDeepWork(reason) {
  const { state, progress } = await chrome.storage.local.get([
    "state",
    "progress",
  ]);
  const activeState = state || DEFAULT_STATE;
  const activeProgress = progress || DEFAULT_PROGRESS;
  const { deepWorkActive, startTime, currentTask } = activeState;
    if (!deepWorkActive || !startTime) return;
  const endTime = Date.now();
  const actualDurationMin = Math.max(
  1,
  Math.round((endTime - startTime) / 60000)
);
  const newSession = {
    startTime,
    endTime,
    durationMin: actualDurationMin,
    reason,
    task: currentTask,
  };
  await chrome.storage.local.set({
    state: { ...DEFAULT_STATE },
    progress: { ...activeProgress, sessions: [...activeProgress.sessions, newSession] },
  });
  await clearAllApprovedSearches();
  await chrome.alarms.clear("deepwork_end");
}
function getTodayMinutes(sessions) 
{
  const now=new Date();
  let total=0;
  for(let session of sessions)
    {
      const endDate = new Date(session.endTime);
      let isToday=endDate.getFullYear()===now.getFullYear() && 
      endDate.getMonth()===now.getMonth() && 
      endDate.getDate()===now.getDate()
      if(isToday)
        {
          total+=session.durationMin
        }
    }
    return total

}

async function setDailyGoal(dailyMinutesGoal) {
  const { settings } = await chrome.storage.local.get("settings");
  const activeSettings = settings || DEFAULT_SETTINGS;

  await chrome.storage.local.set({
    settings: {
      ...activeSettings,
      dailyMinutesGoal
    }
  });

  return { ok: true };
}

async function handleUrlChange(tabId, url, isActive) {
  if (!isHttpUrl(url)) return;
  if (isExtensionUrl(url)) return;

  const { settings, state } = await chrome.storage.local.get([
    "settings",
    "state",
  ]);
  const activeSettings = settings || DEFAULT_SETTINGS;
  const activeState = state || DEFAULT_STATE;
  const deepWorkActive = activeState.deepWorkActive;
  const meta = tabMeta.get(tabId);
  const isDistracting = isBlockedByRules(url, activeSettings, meta);

  if (deepWorkActive && isDistracting) {
    await redirectToBlocked(tabId, url);
  }
}

async function handleActiveTabSwitch(tabId, url) {
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

//TODO: add an agent layer where if the user is stuck the agent can help them get unstuck instead of just blocking.
// For example if they are on youtube shorts the agent can ask them
// if they want to watch a specific educational video instead
// and then take them there if they say yes.

async function triggerPrompt(tabId, reason) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "distraction_prompt", reason });
  } catch {
    // ignore if content script not ready
  }
}

async function redirectToBlocked(tabId, originalUrl) {
  const blockedUrl = chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(originalUrl)}`);
  try {
    await chrome.tabs.update(tabId, { url: blockedUrl });
  } catch {
    // ignore
  }
}

async function handlePromptResponse(choice, tabId) {
  if (choice === "focus" && tabId) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    const currentUrl = tab?.url && isHttpUrl(tab.url) ? tab.url : "https://www.youtube.com/";
    const blockedUrl = chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(currentUrl)}`);
    await chrome.tabs.update(tabId, { url: blockedUrl });
  }
  return { ok: true };
}

async function injectContentScriptIntoExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
      if (!tab.id || !tab.url || isExtensionUrl(tab.url)) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content_script.js"],
        });
      } catch {
        // ignore restricted pages or tabs where injection is unavailable
      }
    }
  } catch {
    // ignore
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

function getApprovedSearchStorageKey(tabId) {
  return `${APPROVED_SEARCH_KEY_PREFIX}${tabId}`;
}

function normalizeSearchQuery(query) {
  return String(query || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function getApprovedSearchesForTab(tabId) {
  if (!tabId) return [];
  const storageKey = getApprovedSearchStorageKey(tabId);
  const stored = await chrome.storage.session.get(storageKey);
  return Array.isArray(stored[storageKey]) ? stored[storageKey] : [];
}

async function approveSearchQuery(tabId, query) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!tabId || !normalizedQuery) return { ok: false };

  const storageKey = getApprovedSearchStorageKey(tabId);
  const approvedSearches = await getApprovedSearchesForTab(tabId);
  if (approvedSearches.includes(normalizedQuery)) {
    return { ok: true };
  }

  await chrome.storage.session.set({
    [storageKey]: [...approvedSearches, normalizedQuery].slice(-25),
  });
  return { ok: true };
}

async function clearApprovedSearchesForTab(tabId) {
  if (!tabId) return;
  await chrome.storage.session.remove(getApprovedSearchStorageKey(tabId));
}

async function clearAllApprovedSearches() {
  const sessionState = await chrome.storage.session.get(null);
  const keysToRemove = Object.keys(sessionState).filter((key) =>
    key.startsWith(APPROVED_SEARCH_KEY_PREFIX)
  );
  if (keysToRemove.length === 0) return;
  await chrome.storage.session.remove(keysToRemove);
}

// ---------------------------------------------------------------------------
// Override logging
// Persists each override with its written reason to progress.searchOverrides
// so the popup can surface the running count and session history.
// ---------------------------------------------------------------------------

/**
 * Approves a query for the tab session AND logs the override + written reason.
 */
async function approveSearchQueryWithReason(tabId, query, reason) {
  await approveSearchQuery(tabId, query);

  const { progress } = await chrome.storage.local.get("progress");
  const activeProgress = progress || DEFAULT_PROGRESS;
  const overrides = activeProgress.searchOverrides || [];

  overrides.push({
    query: normalizeSearchQuery(query),
    reason: String(reason || "").trim(),
    timestamp: Date.now(),
  });

  await chrome.storage.local.set({
    progress: { ...activeProgress, searchOverrides: overrides },
  });

  return { ok: true };
}

/**
 * Returns the number of search overrides recorded in the current session.
 * The override log is reset to [] in startDeepWork, so this is a per-session count.
 */
async function getTodayOverrideCount() {
  const { progress } = await chrome.storage.local.get("progress");
  const overrides = (progress || DEFAULT_PROGRESS).searchOverrides || [];
  return { count: overrides.length };
}

// ---------------------------------------------------------------------------
// URL / domain classification helpers
// ---------------------------------------------------------------------------

function isBlockedByRules(url, settings, meta) {
  if (isAllowlisted(url, settings.allowPatterns || [])) return false;
  if (isYouTubeDomain(url)) {
    if (settings.blockShorts && isYouTubeShorts(url)) return true;
    return !isAllowedYouTubeRoute(url, meta?.title || "");
  }
  if (matchesDomain(url, settings.blockedDomains || [])) return true;
  if (matchesPatterns(url, settings.blockedPatterns || [])) return true;

  if (matchesDomain(url, ALWAYS_ALLOW_DOMAINS)) return false;
  if (isKnownSafeYouTubeIntent(url)) return false;

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

function matchesDomain(url, domains) {
  const hostname = extractDomain(url);
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function matchesPatterns(url, patterns) {
  return patterns.some((pattern) => {
    if (!pattern) return false;
    const regex = patternToRegex(pattern);
    return regex.test(url);
  });
}

function patternToRegex(pattern) {
  const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
  const regexStr = "^" + escaped.replace(/\*/g, ".*") + "$";
  return new RegExp(regexStr, "i");
}

function isYouTubeShorts(url) {
  return /https?:\/\/(www\.)?youtube\.com\/shorts\//i.test(url);
}

function isBlockedYouTubeSurface(url) {
  if (!isYouTubeDomain(url)) return false;
  const path = getPath(url);
  if (path === "/feed/explore") return true;
  if (path === "/feed/trending") return true;
  return false;
}

function isKnownSafeYouTubeIntent(url) {
  if (!isYouTubeDomain(url)) return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;
  const path = parsed.pathname;
  if (path === "/results" && parsed.searchParams.has("search_query")) return true;
  if (path === "/watch" && parsed.searchParams.has("v")) return true;
  if (path === "/playlist" && parsed.searchParams.has("list")) return true;
  if (path === "/feed/playlists") return true;
  if (path === "/feed/library") return true;
  // Channel pages: only safe if NOT a known entertainment channel
  if (path.startsWith("/@") || path.startsWith("/channel/") || path.startsWith("/c/") || path.startsWith("/user/")) {
    return !isEntertainmentChannel(url);
  }
  return false;
}

function isYouTubeChannelPath(path) {
  return (
    path.startsWith("/@") ||
    path.startsWith("/channel/") ||
    path.startsWith("/c/") ||
    path.startsWith("/user/")
  );
}

function isAllowedYouTubeRoute(url, title = "") {
  if (!isYouTubeDomain(url)) return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;
  const path = parsed.pathname;

  if (path === "/") return true;
  if (path === "/results") return parsed.searchParams.has("search_query");

  // Channel pages — check against allow/block lists
  if (isYouTubeChannelPath(path)) {
    if (isEntertainmentChannel(url)) return false;
    return true;
  }

  if (path === "/feed/playlists" || path === "/feed/library") return true;
  if (path === "/playlist" && parsed.searchParams.has("list")) return true;

  // Individual video — apply full channel + keyword scoring
  if (path === "/watch" && parsed.searchParams.has("v")) {
    return isAllowedYouTubeVideo(url, title);
  }

  return false;
}

/**
 * Decides whether a specific YouTube video URL + title should be allowed.
 * Priority order:
 *   1. Known entertainment channel → block
 *   2. Known educational channel  → allow
 *   3. Keyword score >= ALLOW threshold → allow
 *   4. Keyword score <= BLOCK threshold with negative hits → block
 *   5. Ambiguous → allow (avoid false positives for genuine work)
 */
function isAllowedYouTubeVideo(url, title = "") {
  if (isEntertainmentChannel(url)) return false;
  if (isEducationalChannel(url)) return true;

  const score = keywordScore(url, title);
  if (score.total >= SCORE_ALLOW_THRESHOLD) return true;
  if (score.total <= SCORE_BLOCK_THRESHOLD && score.negativeHits > 0) return false;

  return true; // ambiguous — default allow
}

function isEducationalChannel(url) {
  return matchesYouTubeChannelSet(url, EDUCATIONAL_YT_CHANNELS);
}

function isEntertainmentChannel(url) {
  return matchesYouTubeChannelSet(url, ENTERTAINMENT_YT_CHANNELS);
}

function isUserAllowedYouTubeChannel(url, allowedChannels = []) {
  if (!Array.isArray(allowedChannels) || allowedChannels.length === 0) return false;
  const channelInfo = extractYouTubeChannelInfo(url);
  if (!channelInfo) return false;
  return allowedChannels.includes(channelInfo.key);
}

function matchesYouTubeChannelSet(url, channelSet) {
  if (!isYouTubeDomain(url)) return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;

  const pathMatch = parsed.pathname.match(
    /^\/((@[^/]+)|(channel\/([^/]+))|(c\/([^/]+))|(user\/([^/]+)))/i
  );
  if (pathMatch) {
    // Grab just the handle/ID portion
    const handle = pathMatch[2]; // e.g. "@3blue1brown"
    const channelId = pathMatch[4]; // e.g. "UC..."
    const cSlug = pathMatch[6];
    const userSlug = pathMatch[8];

    for (const entry of channelSet) {
      const e = entry.toLowerCase();
      if (handle    && e === handle.toLowerCase())    return true;
      if (channelId && e === channelId.toLowerCase()) return true;
      if (cSlug     && e === cSlug.toLowerCase())     return true;
      if (userSlug  && e === userSlug.toLowerCase())  return true;
    }
  }

  return false;
}

function extractYouTubeChannelInfo(url) {
  if (!isYouTubeDomain(url)) return null;
  const parsed = parseUrl(url);
  if (!parsed || !isYouTubeChannelPath(parsed.pathname)) return null;

  const pathMatch = parsed.pathname.match(
    /^\/((@[^/]+)|(channel\/([^/]+))|(c\/([^/]+))|(user\/([^/]+)))/i
  );
  if (!pathMatch) return null;

  const handle = pathMatch[2];
  const channelId = pathMatch[4];
  const customSlug = pathMatch[6];
  const userSlug = pathMatch[8];

  if (handle) {
    return {
      key: `handle:${handle.toLowerCase()}`,
      label: handle,
    };
  }

  if (channelId) {
    return {
      key: `channel:${channelId.toLowerCase()}`,
      label: channelId,
    };
  }

  if (customSlug) {
    return {
      key: `custom:${customSlug.toLowerCase()}`,
      label: customSlug,
    };
  }

  if (userSlug) {
    return {
      key: `user:${userSlug.toLowerCase()}`,
      label: userSlug,
    };
  }

  return null;
}

function isHttpUrl(url) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function isExtensionUrl(url) {
  return url.startsWith(chrome.runtime.getURL(""));
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getPath(url) {
  const parsed = parseUrl(url);
  if (!parsed) return "";
  return parsed.pathname;
}

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isYouTubeDomain(url) {
  const hostname = extractDomain(url);
  return hostname === "youtube.com" || hostname.endsWith(".youtube.com");
}

function domainPatternRisk(url) {
  const hostname = extractDomain(url);
  if (!hostname) return 0;
  if (matchesDomain(url, KNOWN_SAFE_STREAMING_DOMAINS)) return 0;

  const allTokens = hostname
    .split(/[.\-_\d]+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
  let risk = 0;

  for (const token of allTokens) {
    if (ADULT_DOMAIN_KEYWORDS.includes(token)) risk += 3;
    if (STREAMING_DOMAIN_KEYWORDS.includes(token)) risk += 2;
  }

  for (const keyword of ADULT_DOMAIN_KEYWORDS) {
    if (hostname.includes(keyword)) {
      risk += 2;
      break;
    }
  }

  for (const keyword of STREAMING_DOMAIN_KEYWORDS) {
    if (hostname.includes(keyword)) {
      risk += 1;
      break;
    }
  }

  for (const tld of SUSPICIOUS_TLDS) {
    if (hostname.endsWith(tld)) {
      risk += 1;
      break;
    }
  }

  return risk;
}

function shouldBlockUnknownMediaDomain(url, title) {
  if (matchesDomain(url, KNOWN_SAFE_STREAMING_DOMAINS)) return false;
  if (matchesDomain(url, ALWAYS_ALLOW_DOMAINS)) return false;
  if (isKnownSafeYouTubeIntent(url)) return false;
  if (isYouTubeDomain(url)) return true;

  const text = `${extractDomain(url)} ${getPath(url)} ${title}`.toLowerCase();

  const strongMediaTokens = [
    "watch", "stream", "movie", "movies", "series", "episode", "season", "anime", "tv",
    "video", "videos", "player", "vod", "live", "broadcast", "reel", "shorts", "clip"
  ];
  const adultTokens = [
    "porn", "sex", "xxx", "hentai", "cam", "nsfw", "onlyfans", "erotic"
  ];

  for (const token of adultTokens) {
    if (text.includes(token)) return true;
  }

  for (const token of strongMediaTokens) {
    if (text.includes(token)) return true;
  }

  return false;
}

function keywordScore(url, title) {
  const text = `${url} ${title}`.toLowerCase();
  let total = 0;
  let negativeHits = 0;

  for (const entry of KEYWORD_WEIGHTS) {
    for (const word of entry.words) {
      if (text.includes(word)) {
        total += entry.weight;
        if (entry.weight < 0) negativeHits += 1;
      }
    }
  }

  return { total, negativeHits };
}

// Words too common to be meaningful for task overlap matching
const FILLER_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "be", "as", "this", "that",
  "was", "are", "how", "what", "why", "when", "do", "i", "my", "me",
  "using", "use", "make", "get", "learn", "learning", "understand", "need",
  "help", "fix", "build", "create", "work", "working"
]);

function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !FILLER_WORDS.has(w));
}

/**
 * Returns the number of tokens the query shares with the current task.
 * Also does a substring check so "nextjs" matches a task containing "next.js".
 */
function taskOverlapScore(query, currentTask) {
  if (!currentTask) return 0;
  const queryTokens = tokenise(query);
  const taskTokens = tokenise(currentTask);
  if (queryTokens.length === 0 || taskTokens.length === 0) return 0;

  const taskStr = currentTask.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  let overlap = 0;

  for (const qt of queryTokens) {
    if (taskTokens.includes(qt)) { overlap++; continue; }
    if (taskStr.includes(qt) || qt.length > 4 && taskTokens.some(tt => tt.includes(qt) || qt.includes(tt))) {
      overlap++;
    }
  }

  return overlap;
}

/**
 * Called when the content script intercepts a YouTube search.
 * The content script owns all navigation — this function only classifies.
 *
 * Returns one of:
 *   { verdict: "allow" }
 *   { verdict: "hard_block", query, currentTask }  → content script → hard_blocked.html
 *   { verdict: "prompt",     query, currentTask }  → content script → soft_blocked.html
 */
async function handleSearchQueryCheck(query, tabId) {
  const { state } = await chrome.storage.local.get("state");
  const activeState = state || DEFAULT_STATE;
  const normalizedQuery = normalizeSearchQuery(query);

  // Only enforce during deep work
  if (!activeState.deepWorkActive) return { verdict: "allow" };
  if (!normalizedQuery) return { verdict: "allow" };

  const currentTask = activeState.currentTask || "";

  // Hard block — matches a pattern that is never task-relevant, no override path
  const isHardBlocked = YOUTUBE_SEARCH_HARD_BLOCK_PATTERNS.some(
    (p) => normalizedQuery.includes(p)
  );
  if (isHardBlocked) return { verdict: "hard_block", query, currentTask, tabId };

  // Already approved for this tab session → allow through
  const approvedSearches = await getApprovedSearchesForTab(tabId);
  if (approvedSearches.includes(normalizedQuery)) {
    return { verdict: "allow" };
  }

  const overlap = taskOverlapScore(query, currentTask);

  // Strong task overlap → always allow
  if (overlap >= 2) return { verdict: "allow" };
  if (overlap === 1) {
    // Single-word overlap: allow if the query also looks educational
    const score = keywordScore("", query);
    if (score.total >= 0) return { verdict: "allow" };
  }

  // No task overlap — check if the query is strongly educational on its own
  const score = keywordScore("", query);
  if (score.total >= SCORE_ALLOW_THRESHOLD) return { verdict: "allow" };

  // Ambiguous or clearly off-task → require a written reason to proceed
  return { verdict: "prompt", query, currentTask, tabId };
}

async function handleYouTubeChannelCheck(url) {
  const { settings, state } = await chrome.storage.local.get(["settings", "state"]);
  const activeSettings = settings || DEFAULT_SETTINGS;
  const activeState = state || DEFAULT_STATE;

  if (!activeState.deepWorkActive) return { verdict: "allow" };
  if (!url || !isYouTubeDomain(url)) return { verdict: "allow" };

  const parsed = parseUrl(url);
  if (!parsed || !isYouTubeChannelPath(parsed.pathname)) return { verdict: "allow" };
  if (isEntertainmentChannel(url)) return { verdict: "block" };
  if (isEducationalChannel(url)) return { verdict: "allow" };
  if (isUserAllowedYouTubeChannel(url, activeSettings.allowedYouTubeChannels || [])) {
    return { verdict: "allow" };
  }

  const channelInfo = extractYouTubeChannelInfo(url);
  if (!channelInfo) return { verdict: "allow" };

  return {
    verdict: "prompt",
    channelKey: channelInfo.key,
    channelLabel: channelInfo.label,
    currentTask: activeState.currentTask || null,
  };
}

async function approveYouTubeChannel(url) {
  const channelInfo = extractYouTubeChannelInfo(url);
  if (!channelInfo) return { ok: false };

  const { settings } = await chrome.storage.local.get("settings");
  const activeSettings = settings || DEFAULT_SETTINGS;
  const allowedChannels = Array.isArray(activeSettings.allowedYouTubeChannels)
    ? activeSettings.allowedYouTubeChannels
    : [];

  if (allowedChannels.includes(channelInfo.key)) {
    return { ok: true, channelKey: channelInfo.key };
  }

  await chrome.storage.local.set({
    settings: {
      ...activeSettings,
      allowedYouTubeChannels: [...allowedChannels, channelInfo.key],
    }
  });

  return { ok: true, channelKey: channelInfo.key };
}
