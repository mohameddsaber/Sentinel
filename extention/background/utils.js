import {
  ALWAYS_ALLOW_DOMAINS,
  KEYWORD_WEIGHTS,
  ADULT_DOMAIN_KEYWORDS,
  STREAMING_DOMAIN_KEYWORDS,
  SUSPICIOUS_TLDS,
  KNOWN_SAFE_STREAMING_DOMAINS
} from "./config.js";

import {isKnownSafeYouTubeIntent,isYouTubeDomain} from "./youtube.js";


export function matchesDomain(url, domains) {
  const hostname = extractDomain(url);
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function matchesPatterns(url, patterns) {
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
export function isHttpUrl(url) {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function isExtensionUrl(url) {
  return url.startsWith(chrome.runtime.getURL(""));
}

export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getPath(url) {
  const parsed = parseUrl(url);
  if (!parsed) return "";
  return parsed.pathname;
}

export function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
export function domainPatternRisk(url) {
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

export function shouldBlockUnknownMediaDomain(url, title) {
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

export function keywordScore(url, title) {
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