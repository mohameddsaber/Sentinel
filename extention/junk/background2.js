const DEFAULT_SETTINGS = {
  blockedDomains: [],
  blockedPatterns: [],
  allowPatterns: [],
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
const SEARCH_STRONG_ALLOW_SCORE = 8;
const SEARCH_PROMPT_SCORE = 3;
const SEARCH_HARD_BLOCK_RISK = 6;
const SEARCH_OVERRIDE_LIMIT_PER_SESSION = 2;
const SEARCH_APPROVAL_TTL_MS = 3 * 60 * 1000;
const SEARCH_APPROVAL_MAX_USES = 1;

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
const SEARCH_OVERRIDE_STATE_KEY = "search_override_state";

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
  if (message.type === "approve_search_query_with_justification") {
    approveSearchQueryWithJustification(
      sender?.tab?.id,
      message.query,
      message.justification
    ).then(sendResponse);
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
  return {
    sentinelState: activeState.deepWorkActive ? "SESSION_ACTIVE" : "IDLE",
    currentTask: activeState.currentTask,
    durationMin: activeState.durationMin,
    todayMinutes:todayMinutes,
    goal:goal,
    progressPercent:progressPercent,
    };
}


async function toggleDeepWork(enabled, durationMin, currentTask) {
  if (enabled) {
    await startDeepWork(durationMin,currentTask);
  }
  return { ok: true };
}

async function startDeepWork(durationMin,currentTask) {
  const now = Date.now();
  await clearAllApprovedSearches();
  await clearSearchOverrideState();
  await chrome.storage.local.set({
    state: 
    {
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
    state: 
    { ...DEFAULT_STATE},
    progress: { ...activeProgress,sessions:[...activeProgress.sessions,newSession] },
  });
  await clearAllApprovedSearches();
  await clearSearchOverrideState();
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

  const { settings, state, progress } = await chrome.storage.local.get([
    "settings",
    "state",
    "progress"
  ]);
  const activeSettings = settings || DEFAULT_SETTINGS;
  const activeState = state || DEFAULT_STATE;
  const activeProgress = progress || DEFAULT_PROGRESS;
  const deepWorkActive = activeState.deepWorkActive;
  const startTime = activeState.startTime;
  const meta = tabMeta.get(tabId);
  const isDistracting = isBlockedByRules(url, activeSettings, meta);

  if (deepWorkActive) {
    if (isDistracting) {
      await redirectToBlocked(tabId, url);
    }
  }

}

async function handleActiveTabSwitch(tabId, url) {
  if (!isHttpUrl(url)) return;
  if (isExtensionUrl(url)) return;

  const { settings, state, progress } = await chrome.storage.local.get([
    "settings",
    "state",
    "progress"
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

async function getApprovedSearchApprovalsForTab(tabId) {
  if (!tabId) return [];
  const storageKey = getApprovedSearchStorageKey(tabId);
  const stored = await chrome.storage.session.get(storageKey);
  const rawApprovals = Array.isArray(stored[storageKey]) ? stored[storageKey] : [];
  const now = Date.now();
  const approvals = rawApprovals.filter((approval) =>
    approval &&
    typeof approval.query === "string" &&
    typeof approval.expiresAt === "number" &&
    approval.expiresAt > now &&
    typeof approval.remainingUses === "number" &&
    approval.remainingUses > 0
  );

  if (approvals.length !== rawApprovals.length) {
    await chrome.storage.session.set({
      [storageKey]: approvals.slice(-10),
    });
  }

  return approvals;
}

async function findValidApprovedSearch(tabId, normalizedQuery) {
  if (!tabId || !normalizedQuery) return null;
  const approvals = await getApprovedSearchApprovalsForTab(tabId);
  return approvals.find((approval) => approval.query === normalizedQuery) || null;
}

async function consumeApprovedSearch(tabId, normalizedQuery) {
  if (!tabId || !normalizedQuery) return false;
  const storageKey = getApprovedSearchStorageKey(tabId);
  const approvals = await getApprovedSearchApprovalsForTab(tabId);
  const nextApprovals = [];
  let consumed = false;

  for (const approval of approvals) {
    if (!consumed && approval.query === normalizedQuery) {
      consumed = true;
      const remainingUses = approval.remainingUses - 1;
      if (remainingUses > 0) {
        nextApprovals.push({ ...approval, remainingUses });
      }
      continue;
    }
    nextApprovals.push(approval);
  }

  await chrome.storage.session.set({
    [storageKey]: nextApprovals.slice(-10),
  });
  return consumed;
}

async function approveSearchQuery(tabId, query, justification) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!tabId || !normalizedQuery) return { ok: false };

  const storageKey = getApprovedSearchStorageKey(tabId);
  const approvals = await getApprovedSearchApprovalsForTab(tabId);
  const now = Date.now();
  const nextApproval = {
    query: normalizedQuery,
    approvedAt: now,
    expiresAt: now + SEARCH_APPROVAL_TTL_MS,
    remainingUses: SEARCH_APPROVAL_MAX_USES,
    justification: String(justification || "").trim(),
  };

  await chrome.storage.session.set({
    [storageKey]: [
      ...approvals.filter((approval) => approval.query !== normalizedQuery),
      nextApproval,
    ].slice(-10),
  });

  return { ok: true, approval: nextApproval };
}

async function getSearchOverrideState() {
  const stored = await chrome.storage.session.get(SEARCH_OVERRIDE_STATE_KEY);
  const rawState = stored[SEARCH_OVERRIDE_STATE_KEY];
  return {
    used: rawState && typeof rawState.used === "number" ? rawState.used : 0,
  };
}

async function incrementSearchOverrideCount() {
  const state = await getSearchOverrideState();
  const nextState = { used: state.used + 1 };
  await chrome.storage.session.set({
    [SEARCH_OVERRIDE_STATE_KEY]: nextState,
  });
  return nextState;
}

async function clearSearchOverrideState() {
  await chrome.storage.session.remove(SEARCH_OVERRIDE_STATE_KEY);
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

function isAllowedYouTubeRoute(url, title = "") {
  if (!isYouTubeDomain(url)) return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;
  const path = parsed.pathname;

  if (path === "/") return true;
  if (path === "/results") return parsed.searchParams.has("search_query");

  // Channel pages — check against allow/block lists
  if (
    path.startsWith("/@") ||
    path.startsWith("/channel/") ||
    path.startsWith("/c/") ||
    path.startsWith("/user/")
  ) {
    if (isEntertainmentChannel(url)) return false;
    // Educational channels (and unknown channels) are allowed to browse
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

/**
 * Returns true if the URL references a known educational YouTube channel.
 */
function isEducationalChannel(url) {
  return matchesYouTubeChannelSet(url, EDUCATIONAL_YT_CHANNELS);
}

/**
 * Returns true if the URL references a known entertainment YouTube channel.
 */
function isEntertainmentChannel(url) {
  return matchesYouTubeChannelSet(url, ENTERTAINMENT_YT_CHANNELS);
}

/**
 * Checks whether any channel identifier in the URL (handle, channel ID, slug)
 * appears in the given Set. Handles /@handle, /channel/ID, /c/slug, /user/slug,
 * and also the channel that "owns" a /watch?v= URL when stored in tabMeta title
 * (best-effort; exact channel matching requires the page_meta message).
 */
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
      if (handle && e === handle.toLowerCase()) return true;
      if (channelId && e === channelId.toLowerCase()) return true;
      if (cSlug && e === cSlug.toLowerCase()) return true;
      if (userSlug && e === userSlug.toLowerCase()) return true;
    }
  }

  return false;
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

const GENERIC_SEARCH_WORDS = new Set([
  "video", "videos", "youtube", "search", "watch", "learn", "guide", "tutorial",
  "course", "how", "what", "why", "best", "top", "tips", "help", "example",
  "beginner", "beginners", "advanced", "full", "complete", "intro", "overview"
]);

const SEARCH_BROAD_PATTERNS = [
  "motivation", "productive", "productivity", "study with me", "day in the life",
  "routine", "podcast", "interview", "news", "update", "clip", "highlights",
  "funny", "meme", "reaction", "vlog", "edit", "stream", "livestream"
];

const SEARCH_HARD_BLOCK_PATTERNS = [
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

/**
 * Tokenises a string into meaningful lowercase words, stripping filler.
 */
function tokenise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FILLER_WORDS.has(w));
}

function normaliseTextForSearchMatching(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractMeaningfulTaskTerms(task) {
  return uniqueValues(
    tokenise(task).filter((term) => !GENERIC_SEARCH_WORDS.has(term))
  );
}

/**
 * Returns the number of tokens the query shares with the current task.
 * Also does a substring check so "nextjs" matches a task containing "next.js".
 */
function taskOverlapScore(query, currentTask) {
  if (!currentTask) return 0;
  const queryTokens = tokenise(query).filter((token) => !GENERIC_SEARCH_WORDS.has(token));
  const taskTokens = extractMeaningfulTaskTerms(currentTask);
  if (queryTokens.length === 0 || taskTokens.length === 0) return 0;

  const taskStr = normaliseTextForSearchMatching(currentTask);
  let overlap = 0;

  for (const qt of queryTokens) {
    if (taskTokens.includes(qt)) { overlap++; continue; }
    if (
      taskStr.includes(qt) ||
      (qt.length > 4 && taskTokens.some((tt) => tt.includes(qt) || qt.includes(tt)))
    ) {
      overlap++;
    }
  }

  return overlap;
}

function countExactTaskPhraseMatches(query, currentTask) {
  const taskTerms = extractMeaningfulTaskTerms(currentTask);
  const normalizedQuery = normaliseTextForSearchMatching(query);
  if (!normalizedQuery || taskTerms.length < 2) {
    return { score: 0, matchedPhrases: [] };
  }

  let score = 0;
  const matchedPhrases = [];

  for (let size = 3; size >= 2; size--) {
    for (let i = 0; i <= taskTerms.length - size; i++) {
      const phrase = taskTerms.slice(i, i + size).join(" ");
      if (phrase && normalizedQuery.includes(phrase)) {
        score += size === 3 ? 4 : 2;
        matchedPhrases.push(phrase);
      }
    }
  }

  return {
    score,
    matchedPhrases: uniqueValues(matchedPhrases),
  };
}

function computeBroadQueryPenalty(query) {
  const normalizedQuery = normaliseTextForSearchMatching(query);
  const queryTokens = tokenise(query);
  const meaningfulTokens = queryTokens.filter((token) => !GENERIC_SEARCH_WORDS.has(token));
  const reasons = [];
  let score = 0;

  if (meaningfulTokens.length <= 1) {
    score += 2;
    reasons.push("broad_query");
  }

  if (queryTokens.length > 0 && meaningfulTokens.length === 0) {
    score += 2;
    reasons.push("generic_query");
  }

  if (SEARCH_BROAD_PATTERNS.some((pattern) => normalizedQuery.includes(pattern))) {
    score += 2;
    reasons.push("broad_query");
  }

  return {
    score,
    reasons: uniqueValues(reasons),
  };
}

function computeDistractionRisk(query) {
  const normalizedQuery = normaliseTextForSearchMatching(query);
  const scoreSignals = keywordScore("", query);
  const reasons = [];
  let score = 0;

  if (scoreSignals.total < 0) {
    score += Math.abs(scoreSignals.total);
  }

  if (scoreSignals.negativeHits > 0) {
    score += scoreSignals.negativeHits;
    reasons.push("entertainment_pattern");
  }

  const broadMatches = SEARCH_BROAD_PATTERNS.filter((pattern) =>
    normalizedQuery.includes(pattern)
  );
  if (broadMatches.length > 0) {
    score += broadMatches.length;
    reasons.push("entertainment_pattern");
  }

  const hardBlockMatches = SEARCH_HARD_BLOCK_PATTERNS.filter((pattern) =>
    normalizedQuery.includes(pattern)
  );
  if (hardBlockMatches.length > 0) {
    score += hardBlockMatches.length * 4;
    reasons.push("hard_block_pattern");
  }

  return {
    score,
    reasons: uniqueValues(reasons),
  };
}

function scoreSearchIntent(query, currentTask) {
  const taskOverlap = taskOverlapScore(query, currentTask);
  const phraseMatches = countExactTaskPhraseMatches(query, currentTask);
  const taskRelevanceScore = taskOverlap * 2 + phraseMatches.score;
  const educationalSignal = keywordScore("", query);
  const educationalScore = Math.max(0, Math.min(3, educationalSignal.total));
  const broadPenalty = computeBroadQueryPenalty(query);
  const distractionRisk = computeDistractionRisk(query);

  const reasons = [];
  if (taskRelevanceScore < SEARCH_PROMPT_SCORE) {
    reasons.push("low_task_match");
  }
  reasons.push(...broadPenalty.reasons);
  reasons.push(...distractionRisk.reasons);

  const totalScore =
    taskRelevanceScore +
    educationalScore -
    broadPenalty.score -
    distractionRisk.score;

  const hardBlock = distractionRisk.score >= SEARCH_HARD_BLOCK_RISK;
  const lowRiskAllow = distractionRisk.score <= 1;
  const moderateRiskEducationalAllow =
    distractionRisk.score <= SEARCH_PROMPT_SCORE &&
    educationalScore > 0;
  const shouldAllow =
    !hardBlock &&
    (
      taskOverlap >= 1 ||
      taskRelevanceScore >= SEARCH_STRONG_ALLOW_SCORE ||
      lowRiskAllow ||
      moderateRiskEducationalAllow
    );

  return {
    totalScore,
    taskOverlap,
    taskRelevanceScore,
    educationalScore,
    distractionRiskScore: distractionRisk.score,
    broadPenalty: broadPenalty.score,
    reasons: uniqueValues(reasons),
    hardBlock,
    shouldPrompt: !hardBlock && !shouldAllow,
    shouldAllow,
  };
}

function validateSearchJustification(justification, currentTask) {
  const text = String(justification || "").trim();
  const normalizedText = normalizeSearchQuery(text);
  if (text.length < 12) {
    return {
      ok: false,
      errorCode: "justification_too_short",
      message: "Add a more specific justification tied to your task.",
    };
  }

  const genericJustifications = [
    "needed",
    "important",
    "for task",
    "it helps",
    "needed for task",
    "important for task",
    "i need this",
    "this helps",
  ];
  if (genericJustifications.includes(normalizedText)) {
    return {
      ok: false,
      errorCode: "justification_too_generic",
      message: "Explain exactly how this search supports the task.",
    };
  }

  const taskTerms = extractMeaningfulTaskTerms(currentTask);
  if (taskTerms.length === 0) {
    return {
      ok: false,
      errorCode: "task_context_missing",
      message: "Set a more specific current task before overriding searches.",
    };
  }

  const justificationTokens = tokenise(text);
  const hasTaskTerm = taskTerms.some((term) =>
    justificationTokens.includes(term) || normalizedText.includes(term)
  );
  if (!hasTaskTerm) {
    return {
      ok: false,
      errorCode: "justification_missing_task_term",
      message: "Mention at least one meaningful term from your current task.",
    };
  }

  return { ok: true };
}

async function approveSearchQueryWithJustification(tabId, query, justification) {
  const { state } = await chrome.storage.local.get("state");
  const activeState = state || DEFAULT_STATE;
  const currentTask = activeState.currentTask || "";
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedJustification = normalizeSearchQuery(justification);
  const overrideState = await getSearchOverrideState();
  const remainingBefore = Math.max(
    0,
    SEARCH_OVERRIDE_LIMIT_PER_SESSION - overrideState.used
  );

  if (!activeState.deepWorkActive) {
    return {
      ok: false,
      errorCode: "deep_work_inactive",
      message: "Deep work is not active.",
      override: { allowed: false, remaining: 0 },
    };
  }

  if (!tabId || !normalizedQuery) {
    return {
      ok: false,
      errorCode: "invalid_query",
      message: "That search query could not be approved.",
      override: { allowed: remainingBefore > 0, remaining: remainingBefore },
    };
  }

  if (remainingBefore <= 0) {
    return {
      ok: false,
      errorCode: "override_limit_reached",
      message: "No manual overrides remain this session.",
      override: { allowed: false, remaining: 0 },
    };
  }

  if (normalizedJustification === normalizedQuery) {
    return {
      ok: false,
      errorCode: "justification_matches_query",
      message: "Your justification must explain the task need, not repeat the search.",
      override: { allowed: true, remaining: remainingBefore },
    };
  }

  const validation = validateSearchJustification(justification, currentTask);
  if (!validation.ok) {
    return {
      ok: false,
      errorCode: validation.errorCode,
      message: validation.message,
      override: { allowed: true, remaining: remainingBefore },
    };
  }

  const nextOverrideState = await incrementSearchOverrideCount();
  const remainingAfter = Math.max(
    0,
    SEARCH_OVERRIDE_LIMIT_PER_SESSION - nextOverrideState.used
  );
  const approval = await approveSearchQuery(tabId, normalizedQuery, justification);

  return {
    ok: approval.ok,
    query: normalizedQuery,
    override: { allowed: remainingAfter > 0, remaining: remainingAfter },
  };
}

/**
 * Called when the content script intercepts a YouTube search.
 * Returns an allow, prompt, or block verdict so the content script can
 * either proceed or show the higher-friction prompt flow.
 */
async function handleSearchQueryCheck(query, tabId) {
  const { state } = await chrome.storage.local.get("state");
  const activeState = state || DEFAULT_STATE;
  const normalizedQuery = normalizeSearchQuery(query);
  const currentTask = activeState.currentTask || "";
  const overrideState = await getSearchOverrideState();
  const remainingOverrides = Math.max(
    0,
    SEARCH_OVERRIDE_LIMIT_PER_SESSION - overrideState.used
  );

  if (!activeState.deepWorkActive) return { verdict: "allow" };
  if (!normalizedQuery) return { verdict: "allow" };

  const approvedSearch = await findValidApprovedSearch(tabId, normalizedQuery);
  if (approvedSearch) {
    await consumeApprovedSearch(tabId, normalizedQuery);
    return { verdict: "allow" };
  }

  const intentScore = scoreSearchIntent(query, currentTask);
  const scoreSummary = {
    totalScore: intentScore.totalScore,
    taskOverlap: intentScore.taskOverlap,
    taskRelevanceScore: intentScore.taskRelevanceScore,
    educationalScore: intentScore.educationalScore,
    distractionRiskScore: intentScore.distractionRiskScore,
    broadPenalty: intentScore.broadPenalty,
  };

  if (intentScore.hardBlock) {
    return {
      verdict: "block",
      query,
      currentTask,
      reasons: intentScore.reasons,
      scoreSummary,
      override: {
        allowed: false,
        remaining: remainingOverrides,
      },
    };
  }

  if (intentScore.shouldAllow) {
    return { verdict: "allow" };
  }

  return {
    verdict: "prompt",
    query,
    currentTask,
    reasons: intentScore.reasons,
    scoreSummary,
    override: {
      allowed: remainingOverrides > 0,
      remaining: remainingOverrides,
    },
  };
}
