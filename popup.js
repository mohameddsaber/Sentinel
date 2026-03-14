const popupEl = document.querySelector(".popup");
const badgeLabelEl = document.getElementById("badgeLabel");
const modeValEl = document.getElementById("modeVal");
const sessionBtn = document.getElementById("sessionBtn");
const timerSlider = document.getElementById("timerSlider");
const timerValEl = document.getElementById("timerVal");
const sliderFillEl = document.getElementById("sliderFill");
const signalBars = Array.from(document.querySelectorAll("#signalBars .bar"));
const activityValEl = document.getElementById("activityVal");
const reportListEl = document.getElementById("reportList");

let currentState = null;

init();

async function init() {
  timerSlider.addEventListener("input", () => {
    updateTimer(Number(timerSlider.value));
  });

  sessionBtn.addEventListener("click", async () => {
    if (!currentState) return;

    sessionBtn.disabled = true;
    sessionBtn.textContent = currentState.deepWorkActive ? "ENDING..." : "STARTING...";

    const enabled = !currentState.deepWorkActive;
    const durationMin = enabled ? Number(timerSlider.value) : 0;
    await chrome.runtime.sendMessage({ type: "toggle_deepwork", enabled, durationMin });

    const state = await chrome.runtime.sendMessage({ type: "get_state" });
    currentState = state;
    renderState(state);
    sessionBtn.disabled = false;
  });

  const state = await chrome.runtime.sendMessage({ type: "get_state" });
  currentState = state;
  renderState(state);
}

function renderState(state) {
  const active = state.deepWorkActive;
  const timer = clampTimer(state.durationMin || state.settings?.timerMinutes || 50);

  popupEl.classList.toggle("inactive", !active);
  badgeLabelEl.textContent = active ? "ACTIVE" : "INACTIVE";

  modeValEl.textContent = active ? formatState(state.sentinelState) : "IDLE";
  sessionBtn.textContent = active ? "END SESSION" : "START SESSION";
  sessionBtn.classList.toggle("inactive", !active);

  timerSlider.value = String(timer);
  updateTimer(timer);

  renderActivity(state);
  renderReport(state.lastReport);
}

function updateTimer(value) {
  const timer = clampTimer(value);
  timerValEl.textContent = `${timer}m`;
  const min = Number(timerSlider.min);
  const max = Number(timerSlider.max);
  const percentage = ((timer - min) / (max - min)) * 100;
  sliderFillEl.style.width = `${percentage}%`;
}

function renderActivity(state) {
  const level = signalLevelForState(state.deepWorkActive ? state.sentinelState : "IDLE");
  signalBars.forEach((bar, index) => {
    bar.classList.toggle("on", index < level);
    bar.classList.toggle("off", index >= level);
  });
  activityValEl.textContent = activityLabelForState(state.deepWorkActive ? state.sentinelState : "IDLE");
}

function renderReport(report) {
  if (!report) {
    reportListEl.innerHTML = '<div class="report-row empty"><span>No session yet.</span></div>';
    return;
  }

  const rows = [
    ["Focus duration", `${report.durationMin}m`],
    ["Distraction attempts", String(report.interruptionAttempts)],
    [
      "First distraction",
      report.firstDistraction ? `${report.firstDistraction.minutesIn}m` : "None"
    ]
  ];

  const strongestWindow = formatStrongestWindow(report.strongestWindow);
  if (strongestWindow) {
    rows.push(["Vulnerability window", strongestWindow]);
  }

  reportListEl.innerHTML = rows
    .map(
      ([label, value]) =>
        `<div class="report-row"><span>${escapeHtml(label)}</span><span class="sep"></span><span class="rval">${escapeHtml(value)}</span></div>`
    )
    .join("");
}

function clampTimer(value) {
  const min = Number(timerSlider.min);
  const max = Number(timerSlider.max);
  return Math.min(max, Math.max(min, Number(value) || min));
}

function formatState(rawState) {
  if (!rawState) return "MONITORING";

  return rawState
    .toLowerCase()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function activityLabelForState(rawState) {
  switch (rawState) {
    case "LOCKDOWN":
      return "CRITICAL";
    case "SESSION_ESCALATED":
      return "ELEVATED";
    case "BREAK":
      return "RECOVERY";
    case "COOLDOWN":
      return "COOLDOWN";
    case "SESSION_ACTIVE":
      return "NORMAL";
    default:
      return "OFFLINE";
  }
}

function signalLevelForState(rawState) {
  switch (rawState) {
    case "LOCKDOWN":
      return 7;
    case "SESSION_ESCALATED":
      return 5;
    case "SESSION_ACTIVE":
      return 4;
    case "BREAK":
      return 2;
    case "COOLDOWN":
      return 1;
    default:
      return 0;
  }
}

function formatStrongestWindow(value) {
  if (!value || value === "No clear window") {
    return null;
  }

  const minuteMatch = String(value).match(/minute\s+(\d+-\d+)/i);
  if (minuteMatch) {
    return minuteMatch[1];
  }

  return String(value);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}