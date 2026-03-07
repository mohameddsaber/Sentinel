const test = require('node:test');
const assert = require('node:assert/strict');

const { loadCoreModule } = require('../helpers/loadCoreModule');
const {
  EVENTS,
  ANALYZER_CONSTANTS,
  DEFAULT_STATS,
  createEngine,
  deepClone
} = require('../helpers/fixtures');

const analyzer = loadCoreModule('core/analyzer.js', 'SentinelCoreAnalyzer');
const toPlain = (value) => JSON.parse(JSON.stringify(value));

test('applyEventUpdates START_SESSION resets runtime fields and stats', () => {
  const now = 1_700_000_000_000;
  const engine = createEngine({
    state: 'LOCKDOWN',
    startTime: now - 50_000,
    durationMin: 90,
    breakUntil: now + 10_000,
    cooldownUntil: now + 20_000,
    lastActiveCategory: 'distracting',
    lastActiveAt: now - 1000,
    stats: {
      interruptionAttempts: 7,
      resistanceCount: 8,
      attemptsByBucket: { 0: 2 },
      attemptsByDomain: { 'reddit.com': { count: 3, firstAt: now - 5000 } },
      distractionTimestamps: [now - 3000]
    }
  });

  const next = analyzer.applyEventUpdates(
    engine,
    EVENTS.START_SESSION,
    { durationMin: 45 },
    now,
    ANALYZER_CONSTANTS,
    { DEFAULT_STATS }
  );

  assert.equal(next.state, ANALYZER_CONSTANTS.states.IDLE);
  assert.equal(next.startTime, now);
  assert.equal(next.durationMin, 45);
  assert.equal(next.breakUntil, null);
  assert.equal(next.cooldownUntil, null);
  assert.equal(next.lastActiveCategory, null);
  assert.equal(next.lastActiveAt, null);
  assert.deepEqual(toPlain(next.stats), DEFAULT_STATS);
});

test('applyEventUpdates ACTIVE_UPDATE updates category and timestamp only when category exists', () => {
  const now = 1_700_000_100_000;
  const engine = createEngine({ lastActiveCategory: 'work', lastActiveAt: now - 4000 });

  const updated = analyzer.applyEventUpdates(
    engine,
    EVENTS.ACTIVE_UPDATE,
    { category: 'distracting', at: now },
    now,
    ANALYZER_CONSTANTS,
    { DEFAULT_STATS }
  );
  assert.equal(updated.lastActiveCategory, 'distracting');
  assert.equal(updated.lastActiveAt, now);

  const unchanged = analyzer.applyEventUpdates(
    engine,
    EVENTS.ACTIVE_UPDATE,
    {},
    now,
    ANALYZER_CONSTANTS,
    { DEFAULT_STATS }
  );
  assert.equal(unchanged.lastActiveCategory, 'work');
  assert.equal(unchanged.lastActiveAt, now - 4000);
});

test('applyEventUpdates DISTRACTION_ATTEMPT increments counters and creates domain bucket', () => {
  const startTime = 1_700_000_000_000;
  const now = startTime + (6 * 60 * 1000);
  const engine = createEngine({
    state: 'SESSION_ACTIVE',
    startTime,
    stats: {
      firstDistractionAt: null,
      interruptionAttempts: 1,
      resistanceCount: 2,
      attemptsByBucket: { 0: 1 },
      attemptsByDomain: {},
      distractionTimestamps: [startTime + 1000]
    }
  });

  const next = analyzer.applyEventUpdates(
    engine,
    EVENTS.DISTRACTION_ATTEMPT,
    { url: 'https://www.reddit.com/r/programming' },
    now,
    ANALYZER_CONSTANTS,
    { DEFAULT_STATS }
  );

  assert.equal(next.stats.firstDistractionAt, now);
  assert.equal(next.stats.interruptionAttempts, 2);
  assert.equal(next.stats.resistanceCount, 3);
  assert.equal(next.stats.attemptsByBucket[1], 1);
  assert.equal(next.stats.attemptsByDomain['reddit.com'].count, 1);
  assert.equal(next.stats.attemptsByDomain['reddit.com'].firstAt, now);
});

test('applyEventUpdates DISTRACTION_ATTEMPT preserves firstDistractionAt and prunes stale timestamps', () => {
  const now = 2_000_000;
  const old = now - (ANALYZER_CONSTANTS.LOOP_WINDOW_MINUTES * 60 * 1000) - 1;
  const recent = now - 1000;

  const engine = createEngine({
    startTime: now - 60_000,
    stats: {
      firstDistractionAt: 1234,
      interruptionAttempts: 0,
      resistanceCount: 0,
      attemptsByBucket: {},
      attemptsByDomain: {},
      distractionTimestamps: [old, recent]
    }
  });

  const next = analyzer.applyEventUpdates(
    engine,
    EVENTS.DISTRACTION_ATTEMPT,
    { url: 'https://example.com' },
    now,
    ANALYZER_CONSTANTS,
    { DEFAULT_STATS }
  );

  assert.equal(next.stats.firstDistractionAt, 1234);
  assert.deepEqual(toPlain(next.stats.distractionTimestamps), [recent, now]);
});

test('applyEventUpdates DISTRACTION_ATTEMPT handles invalid URL safely', () => {
  const now = 42_000;
  const engine = createEngine({ startTime: now - 1000 });

  const next = analyzer.applyEventUpdates(
    engine,
    EVENTS.DISTRACTION_ATTEMPT,
    { url: 'not a valid url' },
    now,
    ANALYZER_CONSTANTS,
    { DEFAULT_STATS }
  );

  assert.equal(next.stats.attemptsByDomain[''].count, 1);
});

test('applyEventUpdates END_SESSION clears active session fields and stats', () => {
  const engine = createEngine({
    state: 'SESSION_ESCALATED',
    startTime: 100,
    durationMin: 25,
    breakUntil: 200,
    cooldownUntil: 300,
    lastActiveCategory: 'distracting',
    lastActiveAt: 150,
    stats: {
      firstDistractionAt: 110,
      interruptionAttempts: 5,
      resistanceCount: 4,
      attemptsByBucket: { 0: 2 },
      attemptsByDomain: { 'x.com': { count: 2, firstAt: 120 } },
      distractionTimestamps: [130]
    }
  });

  const next = analyzer.applyEventUpdates(
    engine,
    EVENTS.END_SESSION,
    {},
    999,
    ANALYZER_CONSTANTS,
    { DEFAULT_STATS }
  );

  assert.equal(next.startTime, null);
  assert.equal(next.durationMin, 0);
  assert.equal(next.breakUntil, null);
  assert.equal(next.cooldownUntil, null);
  assert.equal(next.lastActiveCategory, null);
  assert.equal(next.lastActiveAt, null);
  assert.deepEqual(toPlain(next.stats), DEFAULT_STATS);
});

test('applyEventUpdates does not mutate input engine (regression guard)', () => {
  const now = 900_000;
  const engine = createEngine({
    startTime: now - 10_000,
    stats: { attemptsByBucket: { 0: 1 }, distractionTimestamps: [now - 2000] }
  });
  const snapshot = deepClone(engine);

  analyzer.applyEventUpdates(
    engine,
    EVENTS.DISTRACTION_ATTEMPT,
    { url: 'https://reddit.com' },
    now,
    ANALYZER_CONSTANTS,
    { DEFAULT_STATS }
  );

  assert.deepEqual(engine, snapshot);
});

test('behaviorMetrics computes resistanceIndex and vulnerabilityScore deterministically', () => {
  const engine = createEngine({
    stats: {
      interruptionAttempts: 10,
      resistanceCount: 8
    }
  });

  const metrics = analyzer.behaviorMetrics(engine);
  assert.equal(metrics.resistanceIndex, 8);
  assert.equal(metrics.vulnerabilityScore, 20);
});

test('detectQuickSwitch boundary behavior', () => {
  const now = 1_000_000;
  const windowMs = 2000;

  const base = createEngine({
    lastActiveCategory: ANALYZER_CONSTANTS.categories.WORK,
    lastActiveAt: now - windowMs
  });

  assert.equal(analyzer.detectQuickSwitch(base, true, now, windowMs, ANALYZER_CONSTANTS), true);
  assert.equal(analyzer.detectQuickSwitch(base, false, now, windowMs, ANALYZER_CONSTANTS), false);

  const tooLate = createEngine({
    lastActiveCategory: ANALYZER_CONSTANTS.categories.WORK,
    lastActiveAt: now - windowMs - 1
  });
  assert.equal(analyzer.detectQuickSwitch(tooLate, true, now, windowMs, ANALYZER_CONSTANTS), false);

  const wrongCategory = createEngine({
    lastActiveCategory: ANALYZER_CONSTANTS.categories.DISTRACTING,
    lastActiveAt: now - 100
  });
  assert.equal(analyzer.detectQuickSwitch(wrongCategory, true, now, windowMs, ANALYZER_CONSTANTS), false);
});

test('detectLoopReason prefers density trigger over repeated-domain trigger', () => {
  const now = 5_000_000;
  const engine = createEngine({
    stats: {
      distractionTimestamps: [now - 1000, now - 2000, now - 3000],
      attemptsByDomain: {
        'reddit.com': { count: 10, firstAt: now - 1000 }
      }
    }
  });

  const reason = analyzer.detectLoopReason(engine, 'https://reddit.com', now, ANALYZER_CONSTANTS);
  assert.equal(reason, ANALYZER_CONSTANTS.messages.LOOP_DENSITY);
});

test('detectLoopReason fires repeated-domain trigger at threshold boundary', () => {
  const now = 7_000_000;
  const engine = createEngine({
    stats: {
      distractionTimestamps: [now - (ANALYZER_CONSTANTS.LOOP_WINDOW_MINUTES * 60 * 1000) - 1],
      attemptsByDomain: {
        'reddit.com': {
          count: ANALYZER_CONSTANTS.REPEAT_DOMAIN_THRESHOLD,
          firstAt: now - ANALYZER_CONSTANTS.REPEAT_DOMAIN_WINDOW_MS
        }
      }
    }
  });

  const reason = analyzer.detectLoopReason(engine, 'https://reddit.com/r/focus', now, ANALYZER_CONSTANTS);
  assert.equal(reason, ANALYZER_CONSTANTS.messages.LOOP_REPEAT_DOMAIN);
});

test('detectLoopReason returns null when no trigger conditions match', () => {
  const now = 9_000_000;
  const engine = createEngine({
    stats: {
      distractionTimestamps: [now - 1000],
      attemptsByDomain: {
        'reddit.com': { count: 2, firstAt: now - 1000 }
      }
    }
  });

  const reason = analyzer.detectLoopReason(engine, 'https://reddit.com', now, ANALYZER_CONSTANTS);
  assert.equal(reason, null);
});
