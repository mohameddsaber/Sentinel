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