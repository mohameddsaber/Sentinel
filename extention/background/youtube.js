import {
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  EDUCATIONAL_YT_CHANNELS,
  ENTERTAINMENT_YT_CHANNELS,
  SCORE_ALLOW_THRESHOLD,
  SCORE_BLOCK_THRESHOLD
} from "./config.js";

import {
  extractDomain,
  getPath,
  parseUrl
} from "./utils.js";
export function isYouTubeDomain(url) {
  const hostname = extractDomain(url);
  return hostname === "youtube.com" || hostname.endsWith(".youtube.com");
}
export function isYouTubeShorts(url) {
  return /https?:\/\/(www\.)?youtube\.com\/shorts\//i.test(url);
}

 function isBlockedYouTubeSurface(url) {
  if (!isYouTubeDomain(url)) return false;
  const path = getPath(url);
  if (path === "/feed/explore") return true;
  if (path === "/feed/trending") return true;
  return false;
}

export function isKnownSafeYouTubeIntent(url) {
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

export function isAllowedYouTubeRoute(url, title = "", category = "") {
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
    return isAllowedYouTubeVideo(url, title, category);
  }

  return false;
}
function isAllowedYouTubeVideo(url, title = "", category = "") {
  if (isEntertainmentChannel(url)) return false;

  if (category) {
    const catLower = category.toLowerCase();
    const isAllowedCat = catLower === "education" ||
      catLower === "science & technology" ||
      catLower === "howto & style" ||
      catLower === "how-to & style";
    return isAllowedCat;
  }

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
      if (handle && e === handle.toLowerCase()) return true;
      if (channelId && e === channelId.toLowerCase()) return true;
      if (cSlug && e === cSlug.toLowerCase()) return true;
      if (userSlug && e === userSlug.toLowerCase()) return true;
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