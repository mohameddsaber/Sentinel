const DEFAULT_SETTINGS = {
  blockedDomains: [],
  blockedPatterns: [],
  allowPatterns: [],
  blockShorts: true,
  timerMinutes: 50
};

const DEFAULT_STATE = {
  deepWorkActive: false,
  startTime: null,
  durationMin: 0,
  breakUntil: null,
  lastActiveCategory: null,
  lastActiveAt: null
};

const DEFAULT_STATS = {
  firstDistractionAt: null,
  interruptionAttempts: 0,
  attemptsByBucket: {},
  attemptsByDomain: {},
  distractionTimestamps: []
};

const BUCKET_MINUTES = 5;
const LOOP_WINDOW_MINUTES = 10;
const SWITCH_WINDOW_MS = 2 * 60 * 1000;
const REPEAT_DOMAIN_WINDOW_MS = 5 * 60 * 1000;
const REPEAT_DOMAIN_THRESHOLD = 3;
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

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get("settings");
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
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
  if (message.type === "request_report") {
    chrome.storage.local.get("lastReport").then(sendResponse);
    return true;
  }
});

async function getStateForPopup() {
  const { settings, deepWorkActive, startTime, durationMin, breakUntil, lastReport } = await chrome.storage.local.get([
    "settings",
    "deepWorkActive",
    "startTime",
    "durationMin",
    "breakUntil",
    "lastReport"
  ]);
  return {
    settings: settings || DEFAULT_SETTINGS,
    deepWorkActive: deepWorkActive || false,
    startTime: startTime || null,
    durationMin: durationMin || 0,
    sentinelState: deepWorkActive ? "SESSION_ACTIVE" : "IDLE",
    breakUntil: breakUntil || null,
    lastReport: lastReport || null
  };
}


async function toggleDeepWork(enabled, durationMin) {
  if (enabled) {
    await startDeepWork(durationMin);
  }
  return { ok: true };
}

async function startDeepWork(durationMin) {
  const now = Date.now();
  await chrome.storage.local.set({
    deepWorkActive: true,
    startTime: now,
    durationMin: durationMin || 0,
    breakUntil: null,
    stats: { ...DEFAULT_STATS }
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
  const { deepWorkActive, startTime, stats } = await chrome.storage.local.get([
    "deepWorkActive",
    "startTime",
    "stats"
  ]);
  if (!deepWorkActive || !startTime) return;

  const endTime = Date.now();
  const report = buildReport(startTime, endTime, stats || DEFAULT_STATS, reason);

  await chrome.storage.local.set({
    deepWorkActive: false,
    startTime: null,
    durationMin: 0,
    breakUntil: null,
    stats: { ...DEFAULT_STATS },
    lastReport: report
  });
  await chrome.alarms.clear("deepwork_end");
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
  const windowStart = new Date(startTime + maxIndex * BUCKET_MINUTES * 60 * 1000);
  const windowEnd = new Date(startTime + (maxIndex + 1) * BUCKET_MINUTES * 60 * 1000);
  const windowLabel = `${windowStart.toLocaleTimeString()} – ${windowEnd.toLocaleTimeString()} (minute ${maxIndex * BUCKET_MINUTES}–${(maxIndex + 1) * BUCKET_MINUTES})`;
  return { windowLabel, windowCount: maxCount };
}

async function handleUrlChange(tabId, url, isActive) {
  if (!isHttpUrl(url)) return;
  if (isExtensionUrl(url)) return;

  const { settings, deepWorkActive, startTime, stats } = await chrome.storage.local.get([
    "settings",
    "deepWorkActive",
    "startTime",
    "stats"
  ]);
  const activeSettings = settings || DEFAULT_SETTINGS;
  const meta = tabMeta.get(tabId);
  const isDistracting = isBlockedByRules(url, activeSettings, meta);

  if (deepWorkActive) {
    if (isDistracting) {
      await recordDistraction(url, startTime, stats || DEFAULT_STATS);
      await maybeTriggerLoop(tabId, url, startTime, stats || DEFAULT_STATS);
      await redirectToBlocked(tabId, url);
    }
  }

  if (isActive) {
    await updateLastActiveCategory(isDistracting ? "distracting" : "work");
  }
}

async function handleActiveTabSwitch(tabId, url) {
  if (!isHttpUrl(url)) return;
  if (isExtensionUrl(url)) return;

  const { settings, deepWorkActive, startTime, stats } = await chrome.storage.local.get([
    "settings",
    "deepWorkActive",
    "startTime",
    "stats"
  ]);
  if (!deepWorkActive) return;

  const activeSettings = settings || DEFAULT_SETTINGS;
  const meta = tabMeta.get(tabId);
  const isDistracting = isBlockedByRules(url, activeSettings, meta);
  await detectQuickSwitch(tabId, isDistracting);
  await updateLastActiveCategory(isDistracting ? "distracting" : "work");

  if (isDistracting) {
    await recordDistraction(url, startTime, stats || DEFAULT_STATS);
    await maybeTriggerLoop(tabId, url, startTime, stats || DEFAULT_STATS);
    await redirectToBlocked(tabId, url);
  }
}

async function updateLastActiveCategory(category) {
  await chrome.storage.local.set({
    lastActiveCategory: category,
    lastActiveAt: Date.now()
  });
}

async function detectQuickSwitch(tabId, isDistracting) {
  const { lastActiveCategory, lastActiveAt } = await chrome.storage.local.get([
    "lastActiveCategory",
    "lastActiveAt"
  ]);
  if (lastActiveCategory === "work" && isDistracting && lastActiveAt && Date.now() - lastActiveAt <= SWITCH_WINDOW_MS) {
    await triggerPrompt(tabId, "switching quickly from work to entertainment");
  }
}

async function recordDistraction(url, startTime, stats) {
  const now = Date.now();
  if (!stats.firstDistractionAt) {
    stats.firstDistractionAt = now;
  }
  stats.interruptionAttempts = (stats.interruptionAttempts || 0) + 1;
  const bucketIndex = Math.floor((now - startTime) / (BUCKET_MINUTES * 60 * 1000));
  stats.attemptsByBucket[bucketIndex] = (stats.attemptsByBucket[bucketIndex] || 0) + 1;

  const domain = extractDomain(url);
  if (!stats.attemptsByDomain[domain]) {
    stats.attemptsByDomain[domain] = { count: 0, firstAt: now };
  }
  stats.attemptsByDomain[domain].count += 1;

  stats.distractionTimestamps = (stats.distractionTimestamps || []).filter(ts => now - ts <= LOOP_WINDOW_MINUTES * 60 * 1000);
  stats.distractionTimestamps.push(now);

  await chrome.storage.local.set({ stats });
}

async function maybeTriggerLoop(tabId, url, startTime, stats) {
  const now = Date.now();
  const recent = (stats.distractionTimestamps || []).filter(ts => now - ts <= LOOP_WINDOW_MINUTES * 60 * 1000);
  if (recent.length >= 3) {
    await triggerPrompt(tabId, "3 distractions in 10 minutes");
    return;
  }

  const domain = extractDomain(url);
  const info = stats.attemptsByDomain?.[domain];
  if (info && info.count >= REPEAT_DOMAIN_THRESHOLD && now - info.firstAt <= REPEAT_DOMAIN_WINDOW_MS) {
    await triggerPrompt(tabId, "repeated attempts on the same site");
  }
}

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
    await chrome.tabs.update(tabId, { url: "about:blank" });
  }
  return { ok: true };
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

  const { deepWorkActive } = await chrome.storage.local.get("deepWorkActive");
  if (!deepWorkActive) {
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
    return !isAllowedYouTubeRoute(url);
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
  if (path.startsWith("/@")) return true;
  if (path.startsWith("/channel/")) return true;
  if (path.startsWith("/c/")) return true;
  if (path.startsWith("/user/")) return true;
  return false;
}

function isAllowedYouTubeRoute(url) {
  if (!isYouTubeDomain(url)) return false;
  const parsed = parseUrl(url);
  if (!parsed) return false;
  const path = parsed.pathname;

  if (path === "/") return true;
  if (isKnownSafeYouTubeIntent(url)) return true;
  if (path === "/results") return parsed.searchParams.has("search_query");
  if (path === "/watch") return parsed.searchParams.has("v");
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

  if (isYouTubeHomeOrTrending(url)) {
    total -= 2;
    negativeHits += 1;
  }

  return { total, negativeHits };
}

function isYouTubeHomeOrTrending(url) {
  return /https?:\/\/(www\.)?youtube\.com\/(feed\/|$)/i.test(url);
}
