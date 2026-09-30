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


