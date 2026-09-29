import {
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  DEFAULT_PROGRESS
} from "./config.js";
import {enforceBlocking} from "./background.js";

export async function startDeepWork(durationMin, currentTask) {
  const now = Date.now();
  // await clearAllApprovedSearches();

  const { progress } = await chrome.storage.local.get("progress");
  const activeProgress = progress || DEFAULT_PROGRESS;
  await chrome.storage.local.set({
    progress: { ...activeProgress, searchOverrides: [] },
  });

  await chrome.storage.local.set({
    state: {
      deepWorkActive: true,
      startTime: now,
      durationMin: durationMin || 0,
      currentTask: currentTask || null,
    }
  });
  await chrome.alarms.clear("deepwork_end");
  if (durationMin && durationMin > 0) {
    const when = now + durationMin * 60 * 1000;
    await chrome.alarms.create("deepwork_end", { when });
  }
  await enforceActiveTabAtSessionStart();
}
export async function toggleDeepWork(enabled, durationMin, currentTask) {
  if (enabled) {
    await startDeepWork(durationMin, currentTask);
  }
  return { ok: true };
}

export async function endDeepWork(reason) {
  const { state, progress } = await chrome.storage.local.get([
    "state",
    "progress",
  ]);
  const activeState = state || DEFAULT_STATE;
  const activeProgress = progress || DEFAULT_PROGRESS;
  const { deepWorkActive, startTime, currentTask } = activeState;
  if (!deepWorkActive || !startTime) return;
  const endTime = Date.now();
  const actualDurationMin = Math.max(
    1,
    Math.round((endTime - startTime) / 60000)
  );
  const newSession = {
    startTime,
    endTime,
    durationMin: actualDurationMin,
    reason,
    task: currentTask,
  };
  await chrome.storage.local.set({
    state: { ...DEFAULT_STATE },
    progress: { ...activeProgress, sessions: [...activeProgress.sessions, newSession] },
  });
  // await clearAllApprovedSearches();
  await chrome.alarms.clear("deepwork_end");
    await playEndSound();
  
}
export function getTodayMinutes(sessions, activeState = DEFAULT_STATE) {
  const now = new Date();
  let total = 0;

  for (const session of sessions) {
    const endDate = new Date(session.endTime);
    const isToday =
      endDate.getFullYear() === now.getFullYear() &&
      endDate.getMonth() === now.getMonth() &&
      endDate.getDate() === now.getDate();

    if (isToday) {
      total += session.durationMin;
    }
  }

  if (activeState.deepWorkActive && activeState.startTime) {
    const startedAt = new Date(activeState.startTime);
    const startedToday =
      startedAt.getFullYear() === now.getFullYear() &&
      startedAt.getMonth() === now.getMonth() &&
      startedAt.getDate() === now.getDate();

    if (startedToday) {
      total += Math.max(1, Math.floor((Date.now() - activeState.startTime) / 60000));
    }
  }

  return total;
}

export async function setDailyGoal(dailyMinutesGoal) {
  const { settings } = await chrome.storage.local.get("settings");
  const activeSettings = settings || DEFAULT_SETTINGS;

  await chrome.storage.local.set({
    settings: {
      ...activeSettings,
      dailyMinutesGoal
    }
  });

  return { ok: true };
}

async function enforceActiveTabAtSessionStart() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (activeTab?.id && activeTab.url) {
      await enforceBlocking(activeTab.id, activeTab.url);
    }
  } catch {
    // ignore
  }
}

async function playEndSound() {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play session end sound",
    });
  }
  chrome.runtime.sendMessage({ type: "play_end_sound" });
}