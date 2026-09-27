export const YOUTUBE_SEARCH_HARD_BLOCK_PATTERNS = [
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

export async function clearApprovedSearchesForTab(tabId) {
  if (!tabId) return;
  await chrome.storage.session.remove(getApprovedSearchStorageKey(tabId));
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


async function handleSearchQueryCheck(query, tabId) {
  // TEMPORARY: Disable search blocking
  return { verdict: "allow" };

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


  // if (message.type === "search_query_check") {
  //   handleSearchQueryCheck(message.query, sender?.tab?.id).then(sendResponse);
  //   return true;
  // }
  // if (message.type === "approve_search_query") {
  //   approveSearchQuery(sender?.tab?.id, message.query).then(sendResponse);
  //   return true;
  // }
  // Sent by soft_blocked.html after the user provides a written reason.
  // tabId comes from the page's query param since extension pages have no sender tab context.

  // if (message.type === "approve_search_query_with_reason") {
  //   const tabId = message.tabId ?? sender?.tab?.id;
  //   approveSearchQueryWithReason(tabId, message.query, message.reason).then(sendResponse);
  //   return true;
  // }
  // Used by soft_blocked.html to display the running session override count.
  
  // if (message.type === "get_override_count") {
  //   getTodayOverrideCount().then(sendResponse);
  //   return true;
  // }

  // async function getTodayOverrideCount() {
//   const { progress } = await chrome.storage.local.get("progress");
//   const overrides = (progress || DEFAULT_PROGRESS).searchOverrides || [];
//   return { count: overrides.length };
// }

// async function clearAllApprovedSearches() {
//   const sessionState = await chrome.storage.session.get(null);
//   const keysToRemove = Object.keys(sessionState).filter((key) =>
//     key.startsWith(APPROVED_SEARCH_KEY_PREFIX)
//   );
//   if (keysToRemove.length === 0) return;
//   await chrome.storage.session.remove(keysToRemove);
// }