(() => {
  function buildTransitions(state, constants, event) {
    return [
      { from: state.IDLE, on: event.START_SESSION, to: state.SESSION_ACTIVE },
      {
        from: state.SESSION_ACTIVE,
        on: event.DISTRACTION_ATTEMPT,
        condition: (ctx) => (ctx.resistanceCount || 0) >= constants.LOCKDOWN_THRESHOLD,
        to: state.LOCKDOWN
      },
      {
        from: state.SESSION_ACTIVE,
        on: event.DISTRACTION_ATTEMPT,
        condition: (ctx) => (ctx.resistanceCount || 0) >= constants.ESCALATION_THRESHOLD,
        to: state.SESSION_ESCALATED
      },
      {
        from: state.SESSION_ESCALATED,
        on: event.DISTRACTION_ATTEMPT,
        condition: (ctx) => (ctx.resistanceCount || 0) >= constants.LOCKDOWN_THRESHOLD,
        to: state.LOCKDOWN
      },
      { from: state.SESSION_ACTIVE, on: event.REQUEST_BREAK, to: state.BREAK },
      { from: state.SESSION_ESCALATED, on: event.REQUEST_BREAK, to: state.BREAK },
      { from: state.LOCKDOWN, on: event.REQUEST_BREAK, to: state.BREAK },
      { from: state.BREAK, on: event.BREAK_TIMER_EXPIRED, to: state.COOLDOWN },
      { from: state.COOLDOWN, on: event.COOLDOWN_TIMER_EXPIRED, to: state.SESSION_ACTIVE },
      { from: state.SESSION_ACTIVE, on: event.END_SESSION, to: state.IDLE },
      { from: state.SESSION_ESCALATED, on: event.END_SESSION, to: state.IDLE },
      { from: state.LOCKDOWN, on: event.END_SESSION, to: state.IDLE },
      { from: state.BREAK, on: event.END_SESSION, to: state.IDLE },
      { from: state.COOLDOWN, on: event.END_SESSION, to: state.IDLE }
    ];
  }

  function resolveTransition(transitions, from, on, context) {
    const match = transitions.find((item) =>
      item.from === from &&
      item.on === on &&
      (!item.condition || item.condition(context))
    );
    return match ? match.to : from;
  }

  globalThis.SentinelCoreTransitions = {
    buildTransitions,
    resolveTransition
  };
})();
