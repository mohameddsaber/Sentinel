const test = require('node:test');
const assert = require('node:assert/strict');

const { loadCoreModule } = require('../helpers/loadCoreModule');
const { STATES, EVENTS } = require('../helpers/fixtures');

const transitionsModule = loadCoreModule('core/transitions.js', 'SentinelCoreTransitions');

const THRESHOLDS = {
  ESCALATION_THRESHOLD: 3,
  LOCKDOWN_THRESHOLD: 6
};

function build() {
  return transitionsModule.buildTransitions(STATES, THRESHOLDS, EVENTS);
}

test('buildTransitions includes expected core transitions', () => {
  const transitions = build();

  const hasStart = transitions.some((t) => t.from === STATES.IDLE && t.on === EVENTS.START_SESSION && t.to === STATES.SESSION_ACTIVE);
  const hasBreakToCooldown = transitions.some((t) => t.from === STATES.BREAK && t.on === EVENTS.BREAK_TIMER_EXPIRED && t.to === STATES.COOLDOWN);
  const hasCooldownToActive = transitions.some((t) => t.from === STATES.COOLDOWN && t.on === EVENTS.COOLDOWN_TIMER_EXPIRED && t.to === STATES.SESSION_ACTIVE);

  assert.equal(hasStart, true);
  assert.equal(hasBreakToCooldown, true);
  assert.equal(hasCooldownToActive, true);
});

test('resolveTransition returns source state when no transition matches', () => {
  const transitions = build();
  const next = transitionsModule.resolveTransition(transitions, STATES.IDLE, EVENTS.BREAK_TIMER_EXPIRED, {});
  assert.equal(next, STATES.IDLE);
});

test('LOCKDOWN transition precedence over ESCALATED from SESSION_ACTIVE', () => {
  const transitions = build();

  const lockIndex = transitions.findIndex(
    (t) => t.from === STATES.SESSION_ACTIVE && t.on === EVENTS.DISTRACTION_ATTEMPT && t.to === STATES.LOCKDOWN
  );
  const escalatedIndex = transitions.findIndex(
    (t) => t.from === STATES.SESSION_ACTIVE && t.on === EVENTS.DISTRACTION_ATTEMPT && t.to === STATES.SESSION_ESCALATED
  );

  assert.notEqual(lockIndex, -1);
  assert.notEqual(escalatedIndex, -1);
  assert.ok(lockIndex < escalatedIndex, 'LOCKDOWN rule must appear before ESCALATED rule');

  const next = transitionsModule.resolveTransition(
    transitions,
    STATES.SESSION_ACTIVE,
    EVENTS.DISTRACTION_ATTEMPT,
    { resistanceCount: 10 }
  );
  assert.equal(next, STATES.LOCKDOWN);
});

test('DISTRACTION_ATTEMPT threshold boundaries are applied correctly', () => {
  const transitions = build();

  const belowEscalation = transitionsModule.resolveTransition(
    transitions,
    STATES.SESSION_ACTIVE,
    EVENTS.DISTRACTION_ATTEMPT,
    { resistanceCount: THRESHOLDS.ESCALATION_THRESHOLD - 1 }
  );
  assert.equal(belowEscalation, STATES.SESSION_ACTIVE);

  const atEscalation = transitionsModule.resolveTransition(
    transitions,
    STATES.SESSION_ACTIVE,
    EVENTS.DISTRACTION_ATTEMPT,
    { resistanceCount: THRESHOLDS.ESCALATION_THRESHOLD }
  );
  assert.equal(atEscalation, STATES.SESSION_ESCALATED);

  const atLockdown = transitionsModule.resolveTransition(
    transitions,
    STATES.SESSION_ACTIVE,
    EVENTS.DISTRACTION_ATTEMPT,
    { resistanceCount: THRESHOLDS.LOCKDOWN_THRESHOLD }
  );
  assert.equal(atLockdown, STATES.LOCKDOWN);
});

test('SESSION_ESCALATED moves to LOCKDOWN at threshold', () => {
  const transitions = build();

  const below = transitionsModule.resolveTransition(
    transitions,
    STATES.SESSION_ESCALATED,
    EVENTS.DISTRACTION_ATTEMPT,
    { resistanceCount: THRESHOLDS.LOCKDOWN_THRESHOLD - 1 }
  );
  assert.equal(below, STATES.SESSION_ESCALATED);

  const at = transitionsModule.resolveTransition(
    transitions,
    STATES.SESSION_ESCALATED,
    EVENTS.DISTRACTION_ATTEMPT,
    { resistanceCount: THRESHOLDS.LOCKDOWN_THRESHOLD }
  );
  assert.equal(at, STATES.LOCKDOWN);
});

test('REQUEST_BREAK is accepted from active/escalated/lockdown states', () => {
  const transitions = build();
  for (const from of [STATES.SESSION_ACTIVE, STATES.SESSION_ESCALATED, STATES.LOCKDOWN]) {
    const to = transitionsModule.resolveTransition(transitions, from, EVENTS.REQUEST_BREAK, {});
    assert.equal(to, STATES.BREAK, `from ${from}`);
  }
});

test('END_SESSION transitions to IDLE from all session states', () => {
  const transitions = build();
  for (const from of [
    STATES.SESSION_ACTIVE,
    STATES.SESSION_ESCALATED,
    STATES.LOCKDOWN,
    STATES.BREAK,
    STATES.COOLDOWN
  ]) {
    const to = transitionsModule.resolveTransition(transitions, from, EVENTS.END_SESSION, {});
    assert.equal(to, STATES.IDLE, `from ${from}`);
  }
});

test('resolveTransition with empty context object is safe and returns no transition', () => {
  const transitions = build();
  const next = transitionsModule.resolveTransition(transitions, STATES.SESSION_ACTIVE, EVENTS.DISTRACTION_ATTEMPT, {});
  assert.equal(next, STATES.SESSION_ACTIVE);
});

test('resolveTransition throws when condition receives null context (invalid input guard)', () => {
  const transitions = build();
  assert.throws(() => {
    transitionsModule.resolveTransition(transitions, STATES.SESSION_ACTIVE, EVENTS.DISTRACTION_ATTEMPT, null);
  });
});
