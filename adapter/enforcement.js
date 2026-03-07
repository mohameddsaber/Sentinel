(() => {
  async function clearAlarm(name, dlog) {
    const cleared = await chrome.alarms.clear(name);
    dlog("alarm clear", name, { cleared });
    return cleared;
  }

  async function createAlarm(name, when, dlog) {
    await chrome.alarms.create(name, { when });
    dlog("alarm set", name, { when });
  }

  async function applyStateSideEffects(from, to, engine, now, constants, dlog) {
    await clearAlarm(constants.ALARM_NAMES.BREAK_END, dlog);
    await clearAlarm(constants.ALARM_NAMES.COOLDOWN_END, dlog);

    if (to === constants.states.BREAK) {
      engine.breakUntil = now + constants.BREAK_MINUTES * 60 * 1000;
      engine.cooldownUntil = null;
      await createAlarm(constants.ALARM_NAMES.BREAK_END, engine.breakUntil, dlog);
    }

    if (to === constants.states.COOLDOWN) {
      engine.cooldownUntil = now + constants.COOLDOWN_MINUTES * 60 * 1000;
      engine.breakUntil = null;
      await createAlarm(constants.ALARM_NAMES.COOLDOWN_END, engine.cooldownUntil, dlog);
    }

    if (to === constants.states.SESSION_ACTIVE && from === constants.states.COOLDOWN) {
      engine.cooldownUntil = null;
    }

    if (to === constants.states.IDLE) {
      engine.breakUntil = null;
      engine.cooldownUntil = null;
    }
  }

  async function applyDirective(directive, payload) {
    if (!directive) return;
    if (directive.type === payload.constants.DIRECTIVES.BLOCK_HARD) {
      const blockedUrl = chrome.runtime.getURL(`${payload.constants.PAGES.BLOCKED}?url=${encodeURIComponent(payload.url)}`);
      await chrome.tabs.update(payload.tabId, { url: blockedUrl });
      return;
    }
    if (directive.type === payload.constants.DIRECTIVES.PROMPT) {
      await chrome.tabs.sendMessage(payload.tabId, { type: "distraction_prompt", reason: directive.reason });
      return;
    }
    if (directive.type === payload.constants.DIRECTIVES.FOCUS_REDIRECT) {
      await chrome.tabs.update(payload.tabId, { url: chrome.runtime.getURL(`${payload.constants.PAGES.BLOCKED}?focus=1`) });
    }
  }

  async function refreshActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length && tabs[0].id) {
      await chrome.tabs.reload(tabs[0].id);
    }
  }

  globalThis.SentinelAdapterEnforcement = {
    clearAlarm,
    createAlarm,
    applyStateSideEffects,
    applyDirective,
    refreshActiveTab
  };
})();
