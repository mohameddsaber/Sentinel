(() => {
  function isEnforcementState(state, states) {
    return (
      state === states.SESSION_ACTIVE ||
      state === states.SESSION_ESCALATED ||
      state === states.LOCKDOWN ||
      state === states.COOLDOWN
    );
  }

  function classifyNavigation(url, settings, meta, constants) {
    return isBlockedByRules(url, settings, meta, constants);
  }

  function directiveForNavigation({ enforcing, isDistracting }) {
    if (!enforcing) return { type: "ALLOW" };
    if (isDistracting) return { type: "BLOCK_HARD" };
    return { type: "ALLOW" };
  }

  function transitionContext(engine, metrics) {
    return {
      resistanceCount: engine.stats.resistanceCount || 0,
      interruptionAttempts: engine.stats.interruptionAttempts || 0,
      resistanceIndex: metrics.resistanceIndex,
      vulnerabilityScore: metrics.vulnerabilityScore
    };
  }

  function isBlockedByRules(url, settings, meta, constants) {
    if (isAllowlisted(url, settings.allowPatterns || [])) return false;
    if (isYouTubeDomain(url)) {
      if (settings.blockShorts && isYouTubeShorts(url)) return true;
      return !isAllowedYouTubeRoute(url);
    }
    if (matchesDomain(url, settings.blockedDomains || [])) return true;
    if (matchesPatterns(url, settings.blockedPatterns || [])) return true;

    if (matchesDomain(url, constants.ALWAYS_ALLOW_DOMAINS)) return false;
    if (isKnownSafeYouTubeIntent(url)) return false;

    const domainRisk = domainPatternRisk(url, constants);
    if (domainRisk >= 3) return true;

    if (constants.STRICT_UNKNOWN_MEDIA_BLOCK && shouldBlockUnknownMediaDomain(url, meta?.title || "", constants)) {
      return true;
    }

    const score = keywordScore(url, meta?.title || "", constants);
    const hasNegatives = score.negativeHits > 0;

    if (matchesDomain(url, constants.ALWAYS_BLOCK_DOMAINS)) {
      return score.total < constants.SCORE_ALLOW_THRESHOLD;
    }

    if (score.total <= constants.SCORE_BLOCK_THRESHOLD && hasNegatives) {
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

  function domainPatternRisk(url, constants) {
    const hostname = extractDomain(url);
    if (!hostname) return 0;
    if (matchesDomain(url, constants.KNOWN_SAFE_STREAMING_DOMAINS)) return 0;

    const allTokens = hostname
      .split(/[.\-_\d]+/)
      .filter(Boolean)
      .map((token) => token.toLowerCase());
    let risk = 0;

    for (const token of allTokens) {
      if (constants.ADULT_DOMAIN_KEYWORDS.includes(token)) risk += 3;
      if (constants.STREAMING_DOMAIN_KEYWORDS.includes(token)) risk += 2;
    }

    for (const keyword of constants.ADULT_DOMAIN_KEYWORDS) {
      if (hostname.includes(keyword)) {
        risk += 2;
        break;
      }
    }

    for (const keyword of constants.STREAMING_DOMAIN_KEYWORDS) {
      if (hostname.includes(keyword)) {
        risk += 1;
        break;
      }
    }

    for (const tld of constants.SUSPICIOUS_TLDS) {
      if (hostname.endsWith(tld)) {
        risk += 1;
        break;
      }
    }

    return risk;
  }

  function shouldBlockUnknownMediaDomain(url, title, constants) {
    if (matchesDomain(url, constants.KNOWN_SAFE_STREAMING_DOMAINS)) return false;
    if (matchesDomain(url, constants.ALWAYS_ALLOW_DOMAINS)) return false;
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

  function keywordScore(url, title, constants) {
    const text = `${url} ${title}`.toLowerCase();
    let total = 0;
    let negativeHits = 0;

    for (const entry of constants.KEYWORD_WEIGHTS) {
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

  globalThis.SentinelCoreDecision = {
    isEnforcementState,
    classifyNavigation,
    directiveForNavigation,
    transitionContext
  };
})();
