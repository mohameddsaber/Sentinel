(() => {
  const SentinelState = Object.freeze({
    IDLE: "IDLE",
    SESSION_ACTIVE: "SESSION_ACTIVE",
    SESSION_ESCALATED: "SESSION_ESCALATED",
    LOCKDOWN: "LOCKDOWN",
    BREAK: "BREAK",
    COOLDOWN: "COOLDOWN"
  });

  const DEFAULT_SETTINGS = {
    blockedDomains: [],
    blockedPatterns: [],
    allowPatterns: [],
    blockShorts: true,
    timerMinutes: 50
  };

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

  const config = {
    system: {
      ENGINE_KEY: "engine",
      DEBUG: false,
      CACHE: {
        FLUSH_DEBOUNCE_MS: 800,
        FLUSH_INTERVAL_MS: 5000
      }
    },
    defaults: {
      settings: DEFAULT_SETTINGS,
      stats: DEFAULT_STATS,
      engine: DEFAULT_ENGINE
    },
    session: {
      states: SentinelState,
      categories: {
        WORK: "work",
        DISTRACTING: "distracting"
      }
    },
    timing: {
      BUCKET_MINUTES: 5,
      LOOP_WINDOW_MINUTES: 10,
      SWITCH_WINDOW_MS: 2 * 60 * 1000,
      REPEAT_DOMAIN_WINDOW_MS: 5 * 60 * 1000,
      BREAK_MINUTES: 5,
      COOLDOWN_MINUTES: 3
    },
    thresholds: {
      REPEAT_DOMAIN_THRESHOLD: 3,
      ESCALATION_THRESHOLD: 3,
      LOCKDOWN_THRESHOLD: 6,
      SCORE_ALLOW_THRESHOLD: 2,
      SCORE_BLOCK_THRESHOLD: -2
    },
    scoring: {
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
    },
    enforcement: {
      ALARM_NAMES: {
        DEEPWORK_END: "deepwork_end",
        BREAK_END: "break_end",
        COOLDOWN_END: "cooldown_end"
      },
      DIRECTIVES: {
        ALLOW: "ALLOW",
        BLOCK_HARD: "BLOCK_HARD",
        PROMPT: "PROMPT",
        FOCUS_REDIRECT: "FOCUS_REDIRECT"
      },
      PAGES: {
        BLOCKED: "blocked.html"
      }
    },
    messages: {
      LOOP_DENSITY: "3 distractions in 10 minutes",
      LOOP_REPEAT_DOMAIN: "repeated attempts on the same site",
      QUICK_SWITCH: "switching quickly from work to entertainment"
    }
  };

  globalThis.SentinelConfig = config;
})();
