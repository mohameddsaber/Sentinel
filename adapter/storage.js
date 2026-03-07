(() => {
  async function loadEngine(storageKey, defaults) {
    const data = await chrome.storage.local.get([
      storageKey,
      "sentinelState",
      "deepWorkActive",
      "startTime",
      "durationMin",
      "breakUntil",
      "cooldownUntil",
      "lastActiveCategory",
      "lastActiveAt",
      "stats"
    ]);

    if (data[storageKey]) {
      return normalizeEngine(data[storageKey], defaults);
    }

    const legacyState = data.sentinelState || (data.deepWorkActive ? defaults.SESSION_ACTIVE : defaults.IDLE);
    const hasLegacyData = Boolean(
      data.sentinelState ||
      data.deepWorkActive ||
      data.startTime ||
      data.durationMin ||
      data.breakUntil ||
      data.cooldownUntil ||
      data.lastActiveCategory ||
      data.lastActiveAt ||
      data.stats
    );

    if (!hasLegacyData) {
      return normalizeEngine(defaults.DEFAULT_ENGINE, defaults);
    }

    return normalizeEngine({
      state: legacyState,
      startTime: data.startTime || null,
      durationMin: data.durationMin || 0,
      breakUntil: data.breakUntil || null,
      cooldownUntil: data.cooldownUntil || null,
      lastActiveCategory: data.lastActiveCategory || null,
      lastActiveAt: data.lastActiveAt || null,
      stats: data.stats || { ...defaults.DEFAULT_STATS }
    }, defaults);
  }

  async function saveEngine(storageKey, engine, defaults) {
    await chrome.storage.local.set({ [storageKey]: normalizeEngine(engine, defaults) });
  }

  function normalizeEngine(engine, defaults) {
    return {
      state: engine.state || defaults.IDLE,
      startTime: engine.startTime || null,
      durationMin: engine.durationMin || 0,
      breakUntil: engine.breakUntil || null,
      cooldownUntil: engine.cooldownUntil || null,
      lastActiveCategory: engine.lastActiveCategory || null,
      lastActiveAt: engine.lastActiveAt || null,
      stats: {
        ...defaults.DEFAULT_STATS,
        ...(engine.stats || {}),
        attemptsByBucket: { ...(engine.stats?.attemptsByBucket || {}) },
        attemptsByDomain: { ...(engine.stats?.attemptsByDomain || {}) },
        distractionTimestamps: [...(engine.stats?.distractionTimestamps || [])]
      }
    };
  }

  globalThis.SentinelAdapterStorage = {
    loadEngine,
    saveEngine,
    normalizeEngine
  };
})();
