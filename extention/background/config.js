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
export const SCORE_ALLOW_THRESHOLD = 2;
export const SCORE_BLOCK_THRESHOLD = -2;

// YouTube channel handles (@handle), channel IDs (UC...), and /c/ or /user/ slugs.
// Any video whose URL contains one of these identifiers is treated as educational and allowed.
export const EDUCATIONAL_YT_CHANNELS = new Set([
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
export const ENTERTAINMENT_YT_CHANNELS = new Set([
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
