// PLACEHOLDER DATA: delete this file (and its <script> tag) once real sessions are wired up.
// Sessions use the same shape you save today:
// { startTime, endTime, durationMin, reason, task }
(function () {
  "use strict";

  // Flip to true to preview the brand-new-user (zero sessions) state.
  const USE_EMPTY_STATE = false;

  const DURATIONS = [25, 45, 50, 60, 90];
  const TASKS = ["Study algorithms", "Sentinel extension", "CV pipeline", "Reading", null];

  function buildSessions() {
    const sessions = [];
    const now = Date.now();

    for (let daysAgo = 0; daysAgo < 45; daysAgo++) {
      // Skip a few days so the streak and the chart have gaps.
      if (daysAgo % 6 === 2 || daysAgo % 11 === 5) continue;

      const count = 1 + ((daysAgo * 3) % 3); // 1 to 3 sessions a day

      for (let i = 0; i < count; i++) {
        const durationMin = DURATIONS[(daysAgo * 2 + i * 3) % DURATIONS.length];

        const start = new Date();
        start.setDate(start.getDate() - daysAgo);
        start.setHours(9 + i * 3, 0, 0, 0);

        const startTime = start.getTime();
        const endTime = startTime + durationMin * 60000;

        // Don't invent sessions that end in the future.
        if (endTime > now) continue;

        sessions.push({
          startTime,
          endTime,
          durationMin,
          reason: "completed",
          task: TASKS[(daysAgo + i) % TASKS.length]
        });
      }
    }

    return sessions;
  }

  window.SentinelPlaceholder = {
    sessions: USE_EMPTY_STATE ? [] : buildSessions()
  };
})();
