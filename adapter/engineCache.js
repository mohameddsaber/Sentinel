(() => {
  function createEngineCache(options) {
    const {
      load,
      save,
      normalize,
      debounceMs,
      flushIntervalMs,
      dlog
    } = options;

    let engine = null;
    let initialized = false;
    let dirty = false;
    let flushTimer = null;
    let periodicTimer = null;
    let flushing = Promise.resolve();

    async function init() {
      if (initialized) return;
      engine = normalize(await load());
      initialized = true;
      startPeriodicFlush();
    }

    async function get() {
      await init();
      return clone(engine);
    }

    async function set(nextEngine, options = {}) {
      await init();
      engine = normalize(nextEngine);
      dirty = true;
      if (options.flushNow) {
        await flushNow(options.reason || "critical");
        return clone(engine);
      }
      scheduleFlush();
      return clone(engine);
    }

    function scheduleFlush() {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushNow("debounced");
      }, debounceMs);
    }

    function startPeriodicFlush() {
      if (periodicTimer) return;
      periodicTimer = setInterval(() => {
        void flushNow("periodic");
      }, flushIntervalMs);
    }

    async function flushNow(reason = "manual") {
      await init();
      if (!dirty) return;

      const run = async () => {
        await save(normalize(engine));
        dirty = false;
        dlog("engine flush", { reason });
      };
      flushing = flushing.then(run, run);
      await flushing;
    }

    function flushNowNoAwait(reason = "suspend") {
      void flushNow(reason);
    }

    function clone(value) {
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }
      return JSON.parse(JSON.stringify(value));
    }

    return {
      init,
      get,
      set,
      flushNow,
      flushNowNoAwait
    };
  }

  globalThis.SentinelAdapterEngineCache = {
    createEngineCache
  };
})();
