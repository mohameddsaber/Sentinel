(() => {
  function applyEventUpdates(engine, event, payload, now, constants, defaults) {
    const next = cloneEngine(engine, defaults);

    if (event === constants.events.START_SESSION) {
      next.state = constants.states.IDLE;
      next.startTime = now;
      next.durationMin = payload.durationMin || 0;
      next.breakUntil = null;
      next.cooldownUntil = null;
      next.lastActiveCategory = null;
      next.lastActiveAt = null;
      next.stats = { ...defaults.DEFAULT_STATS };
      return next;
    }

    if (event === constants.events.ACTIVE_UPDATE) {
      if (payload.category) {
        next.lastActiveCategory = payload.category;
        next.lastActiveAt = payload.at || now;
      }
      return next;
    }

    if (event === constants.events.DISTRACTION_ATTEMPT) {
      const url = payload.url || "";
      const domain = extractDomain(url);

      if (!next.stats.firstDistractionAt) next.stats.firstDistractionAt = now;
      next.stats.interruptionAttempts = (next.stats.interruptionAttempts || 0) + 1;
      next.stats.resistanceCount = (next.stats.resistanceCount || 0) + 1;

      if (next.startTime) {
        const bucketIndex = Math.floor((now - next.startTime) / (constants.BUCKET_MINUTES * 60 * 1000));
        next.stats.attemptsByBucket[bucketIndex] = (next.stats.attemptsByBucket[bucketIndex] || 0) + 1;
      }

      if (!next.stats.attemptsByDomain[domain]) {
        next.stats.attemptsByDomain[domain] = { count: 0, firstAt: now };
      }
      next.stats.attemptsByDomain[domain].count += 1;

      next.stats.distractionTimestamps = (next.stats.distractionTimestamps || []).filter(
        (ts) => now - ts <= constants.LOOP_WINDOW_MINUTES * 60 * 1000
      );
      next.stats.distractionTimestamps.push(now);

      return next;
    }

    if (event === constants.events.END_SESSION) {
      next.startTime = null;
      next.durationMin = 0;
      next.breakUntil = null;
      next.cooldownUntil = null;
      next.lastActiveCategory = null;
      next.lastActiveAt = null;
      next.stats = { ...defaults.DEFAULT_STATS };
      return next;
    }

    return next;
  }

  function behaviorMetrics(engine) {
    const attempts = engine.stats.interruptionAttempts || 0;
    const resistance = engine.stats.resistanceCount || 0;
    return {
      resistanceIndex: resistance,
      vulnerabilityScore: attempts + Math.floor(resistance * 1.25)
    };
  }

  function detectQuickSwitch(engine, isDistracting, now, switchWindowMs, constants) {
    return (
      engine.lastActiveCategory === constants.categories.WORK &&
      isDistracting &&
      Boolean(engine.lastActiveAt) &&
      now - engine.lastActiveAt <= switchWindowMs
    );
  }

  function detectLoopReason(engine, url, now, constants) {
    const recent = (engine.stats.distractionTimestamps || []).filter(
      (ts) => now - ts <= constants.LOOP_WINDOW_MINUTES * 60 * 1000
    );
    if (recent.length >= 3) {
      return constants.messages.LOOP_DENSITY;
    }

    const domain = extractDomain(url);
    const info = engine.stats.attemptsByDomain?.[domain];
    if (info && info.count >= constants.REPEAT_DOMAIN_THRESHOLD && now - info.firstAt <= constants.REPEAT_DOMAIN_WINDOW_MS) {
      return constants.messages.LOOP_REPEAT_DOMAIN;
    }
    return null;
  }

  function cloneEngine(engine, defaults) {
    return {
      state: engine.state,
      startTime: engine.startTime,
      durationMin: engine.durationMin,
      breakUntil: engine.breakUntil,
      cooldownUntil: engine.cooldownUntil,
      lastActiveCategory: engine.lastActiveCategory,
      lastActiveAt: engine.lastActiveAt,
      stats: {
        ...defaults.DEFAULT_STATS,
        ...(engine.stats || {}),
        attemptsByBucket: { ...(engine.stats?.attemptsByBucket || {}) },
        attemptsByDomain: { ...(engine.stats?.attemptsByDomain || {}) },
        distractionTimestamps: [...(engine.stats?.distractionTimestamps || [])]
      }
    };
  }

  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  globalThis.SentinelCoreAnalyzer = {
    applyEventUpdates,
    behaviorMetrics,
    detectQuickSwitch,
    detectLoopReason
  };
})();
