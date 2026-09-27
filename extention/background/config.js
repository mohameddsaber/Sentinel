export const DEFAULT_SETTINGS = {
  blockedDomains: [],
  blockedPatterns: [],
  allowPatterns: [],
  allowedYouTubeChannels: [],
  blockShorts: true,
  timerMinutes: 50,
  dailyMinutesGoal: 180,
};

export const DEFAULT_STATE = {
  deepWorkActive: false,
  startTime: null,
  durationMin: 0,
  currentTask: null,

};

export const DEFAULT_PROGRESS = {
  sessions: [],
};

 export const KEYWORD_WEIGHTS = [
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

export const EMERGENCY_EXIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const ALWAYS_BLOCK_DOMAINS = [
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

export const ALWAYS_ALLOW_DOMAINS = [
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


export const SCORE_ALLOW_THRESHOLD = 2;
export const SCORE_BLOCK_THRESHOLD = -2;

export const ADULT_DOMAIN_KEYWORDS = [
  "porn", "sex", "xxx", "xvideos", "xhamster", "xnxx", "redtube", "youporn", "hentai", "cam", "cams",
  "onlyfans", "erotic", "nsfw", "milf", "anal", "bdsm", "escort", "fuck", "boobs"
];

export const STREAMING_DOMAIN_KEYWORDS = [
  "watch", "stream", "movie", "movies", "series", "tv", "anime", "episode", "cinema", "flixtor",
  "putlocker", "123movies", "soap2day", "cuevana", "myflixer", "sflix", "lookmovie", "vidcloud"
];

export const SUSPICIOUS_TLDS = [
  ".to", ".sx", ".ru", ".su", ".xyz", ".click", ".top", ".rest", ".monster", ".buzz", ".cam", ".porn", ".adult"
];

export const KNOWN_SAFE_STREAMING_DOMAINS = [
  "youtube.com",
  "vimeo.com",
  "coursera.org",
  "edx.org",
  "udemy.com",
  "khanacademy.org"
];

export const STRICT_UNKNOWN_MEDIA_BLOCK = true;
