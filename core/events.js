(() => {
  const SentinelEvent = Object.freeze({
    START_SESSION: "START_SESSION",
    END_SESSION: "END_SESSION",
    DISTRACTION_ATTEMPT: "DISTRACTION_ATTEMPT",
    ACTIVE_UPDATE: "ACTIVE_UPDATE",
    REQUEST_BREAK: "REQUEST_BREAK",
    BREAK_TIMER_EXPIRED: "BREAK_TIMER_EXPIRED",
    COOLDOWN_TIMER_EXPIRED: "COOLDOWN_TIMER_EXPIRED",
    NAVIGATION: "NAVIGATION"
  });

  function navigationEvent(payload) {
    return { type: SentinelEvent.NAVIGATION, payload };
  }

  function timerExpiredEvent(kind) {
    if (kind === "break") return { type: SentinelEvent.BREAK_TIMER_EXPIRED, payload: {} };
    if (kind === "cooldown") return { type: SentinelEvent.COOLDOWN_TIMER_EXPIRED, payload: {} };
    return null;
  }

  globalThis.SentinelCoreEvents = {
    SentinelEvent,
    navigationEvent,
    timerExpiredEvent
  };
})();
