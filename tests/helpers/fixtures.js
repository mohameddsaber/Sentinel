const STATES = Object.freeze({
  IDLE: 'IDLE',
  SESSION_ACTIVE: 'SESSION_ACTIVE',
  SESSION_ESCALATED: 'SESSION_ESCALATED',
  LOCKDOWN: 'LOCKDOWN',
  BREAK: 'BREAK',
  COOLDOWN: 'COOLDOWN'
});

const EVENTS = Object.freeze({
  START_SESSION: 'START_SESSION',
  END_SESSION: 'END_SESSION',
  DISTRACTION_ATTEMPT: 'DISTRACTION_ATTEMPT',
  ACTIVE_UPDATE: 'ACTIVE_UPDATE',
  REQUEST_BREAK: 'REQUEST_BREAK',
  BREAK_TIMER_EXPIRED: 'BREAK_TIMER_EXPIRED',
  COOLDOWN_TIMER_EXPIRED: 'COOLDOWN_TIMER_EXPIRED'
});

const DEFAULT_STATS = Object.freeze({
  firstDistractionAt: null,
  interruptionAttempts: 0,
  resistanceCount: 0,
  attemptsByBucket: {},
  attemptsByDomain: {},
  distractionTimestamps: []
});

function createEngine(overrides = {}) {
  return {
    state: STATES.IDLE,
    startTime: null,
    durationMin: 0,
    breakUntil: null,
    cooldownUntil: null,
    lastActiveCategory: null,
    lastActiveAt: null,
    stats: {
      firstDistractionAt: null,
      interruptionAttempts: 0,
      resistanceCount: 0,
      attemptsByBucket: {},
      attemptsByDomain: {},
      distractionTimestamps: []
    },
    ...overrides,
    stats: {
      firstDistractionAt: null,
      interruptionAttempts: 0,
      resistanceCount: 0,
      attemptsByBucket: {},
      attemptsByDomain: {},
      distractionTimestamps: [],
      ...(overrides.stats || {})
    }
  };
}

const ANALYZER_CONSTANTS = Object.freeze({
  BUCKET_MINUTES: 5,
  LOOP_WINDOW_MINUTES: 10,
  REPEAT_DOMAIN_WINDOW_MS: 5 * 60 * 1000,
  REPEAT_DOMAIN_THRESHOLD: 3,
  events: EVENTS,
  states: STATES,
  categories: {
    WORK: 'work',
    DISTRACTING: 'distracting'
  },
  messages: {
    LOOP_DENSITY: '3 distractions in 10 minutes',
    LOOP_REPEAT_DOMAIN: 'repeated attempts on the same site',
    QUICK_SWITCH: 'switching quickly from work to entertainment'
  }
});

const DECISION_CONSTANTS = Object.freeze({
  DIRECTIVES: {
    ALLOW: 'ALLOW',
    BLOCK_HARD: 'BLOCK_HARD'
  },
  SCORE_ALLOW_THRESHOLD: 2,
  SCORE_BLOCK_THRESHOLD: -2,
  STRICT_UNKNOWN_MEDIA_BLOCK: true,
  ALWAYS_BLOCK_DOMAINS: ['reddit.com', 'netflix.com'],
  ALWAYS_ALLOW_DOMAINS: ['coursera.org', 'edx.org', 'khanacademy.org'],
  KNOWN_SAFE_STREAMING_DOMAINS: ['youtube.com', 'coursera.org'],
  ADULT_DOMAIN_KEYWORDS: ['porn', 'xxx', 'sex'],
  STREAMING_DOMAIN_KEYWORDS: ['watch', 'stream', 'movie', 'series', 'tv'],
  SUSPICIOUS_TLDS: ['.to', '.xyz', '.adult'],
  KEYWORD_WEIGHTS: [
    { weight: 4, words: ['course', 'tutorial', 'lecture'] },
    { weight: -4, words: ['prank', 'meme', 'reaction'] },
    { weight: -6, words: ['shorts'] }
  ]
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  STATES,
  EVENTS,
  DEFAULT_STATS,
  ANALYZER_CONSTANTS,
  DECISION_CONSTANTS,
  createEngine,
  deepClone
};
