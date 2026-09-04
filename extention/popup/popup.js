const popupEl = document.querySelector(".popup");
const badgeLabelEl = document.getElementById("badgeLabel");
const modeValEl = document.getElementById("modeVal");
const sessionBtn = document.getElementById("sessionBtn");
const timerSlider = document.getElementById("timerSlider");
const timerValEl = document.getElementById("timerVal");
const sliderFillEl = document.getElementById("sliderFill");
const todayValEl = document.getElementById("todayVal");
const goalValEl = document.getElementById("goalVal");
const progressValEl = document.getElementById("progressVal");
const progressBarFillEl = document.getElementById("progressBarFill");
const progressSummaryEl = document.getElementById("progressSummary");
const taskInput = document.getElementById("taskInput");
const goalInput = document.getElementById("goalInput");
const saveGoalBtn = document.getElementById("saveGoalBtn");

let currentState = null;
let refreshTimerId = null;

if (saveGoalBtn && goalInput) {
  saveGoalBtn.addEventListener("click", async () => {
    const goal = Math.max(0, Number(goalInput.value) || 0);

    await chrome.runtime.sendMessage({
      type: "set_daily_goal",
      dailyMinutesGoal: goal
    });

    await refreshState();
  });
}

init();

async function init() {
  timerSlider.addEventListener("input", () => {
    updateTimer(Number(timerSlider.value));
  });

  sessionBtn.addEventListener("click", async () => {
    if (!currentState || currentState.sentinelState === "SESSION_ACTIVE") return;

    sessionBtn.disabled = true;
    sessionBtn.textContent = "STARTING...";

    const durationMin = Number(timerSlider.value);
    const task = taskInput ? taskInput.value.trim() || null : null;

    await chrome.runtime.sendMessage({
      type: "toggle_deepwork",
      enabled: true,
      durationMin,
      currentTask: task
    });

    await refreshState();
    sessionBtn.disabled = false;
  });

  await refreshState();
  startAutoRefresh();
}

async function refreshState() {
  const state = await chrome.runtime.sendMessage({ type: "get_state" });
  currentState = state;
  renderState(state);
}

function startAutoRefresh() {
  if (refreshTimerId) clearInterval(refreshTimerId);
  refreshTimerId = window.setInterval(() => {
    refreshState().catch(() => {});
  }, 30000);
}

function renderState(state) {
  const active = state.sentinelState === "SESSION_ACTIVE";
  const sentinelState = getDisplayState(state);
  const timer = clampTimer(state.durationMin || 50);

  popupEl.classList.toggle("inactive", !active);
  badgeLabelEl.textContent = active ? "ACTIVE" : "INACTIVE";

  modeValEl.textContent = formatState(sentinelState);
  sessionBtn.textContent = active ? "SESSION LOCKED" : "START SESSION";
  sessionBtn.classList.toggle("inactive", !active);
  sessionBtn.disabled = active;
  timerSlider.disabled = active;

  todayValEl.textContent = `${state.todayMinutes || 0}m`;
  goalValEl.textContent = `${state.goal || 0}m`;
  progressValEl.textContent = `${state.progressPercent || 0}%`;
  progressBarFillEl.style.width = `${Math.max(0, Math.min(100, state.progressPercent || 0))}%`;
  progressSummaryEl.textContent = `${state.todayMinutes || 0}m / ${state.goal || 0}m`;

  if (goalInput) goalInput.value = state.goal || 0;

  timerSlider.value = String(timer);
  updateTimer(timer);
}

function updateTimer(value) {
  const timer = clampTimer(value);
  timerValEl.textContent = `${timer}m`;
  const min = Number(timerSlider.min);
  const max = Number(timerSlider.max);
  const percentage = ((timer - min) / (max - min)) * 100;
  sliderFillEl.style.width = `${percentage}%`;
}

function clampTimer(value) {
  const min = Number(timerSlider.min);
  const max = Number(timerSlider.max);
  return Math.min(max, Math.max(min, Number(value) || min));
}

function getDisplayState(state) {
  return state?.sentinelState || "IDLE";
}

function formatState(rawState) {
  if (!rawState) return "Idle";

  return rawState
    .toLowerCase()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}
