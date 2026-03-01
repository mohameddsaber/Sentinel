const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggleBtn");
const timerRange = document.getElementById("timerRange");
const timerValue = document.getElementById("timerValue");
const timerEnabled = document.getElementById("timerEnabled");
const reportEl = document.getElementById("report");

let currentState = null;

init();

async function init() {
  const state = await chrome.runtime.sendMessage({ type: "get_state" });
  currentState = state;
  renderState(state);
  timerRange.addEventListener("input", () => {
    timerValue.textContent = timerRange.value;
  });
}

toggleBtn.addEventListener("click", async () => {
  const enabled = !currentState.deepWorkActive;
  const duration = timerEnabled.checked ? Number(timerRange.value) : 0;
  await chrome.runtime.sendMessage({ type: "toggle_deepwork", enabled, durationMin: duration });
  const state = await chrome.runtime.sendMessage({ type: "get_state" });
  currentState = state;
  renderState(state);
});

function renderState(state) {
  const active = state.deepWorkActive;
  statusEl.textContent = active ? "Active" : "Off";
  toggleBtn.textContent = active ? "End" : "Start";

  const settings = state.settings || {};
  const timer = state.durationMin || settings.timerMinutes || 50;
  timerRange.value = timer;
  timerValue.textContent = timer;
  timerEnabled.checked = (state.durationMin || 0) > 0;

  renderReport(state.lastReport);
}

function renderReport(report) {
  if (!report) {
    reportEl.textContent = "No session yet.";
    return;
  }
  const parts = [];
  parts.push(`Focus duration: ${report.durationMin} min`);
  if (report.firstDistraction) {
    parts.push(`First distraction: ${report.firstDistraction.minutesIn} min in (${report.firstDistraction.at})`);
  } else {
    parts.push("First distraction: none");
  }
  parts.push(`Interruption attempts: ${report.interruptionAttempts}`);
  parts.push(`Strongest vulnerability window: ${report.strongestWindow}`);
  reportEl.innerHTML = parts.map((p) => `<div>${escapeHtml(p)}</div>`).join("");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
