const emergencyExitBtn = document.getElementById("emergencyExit");
const emergencyMessageEl = document.getElementById("emergencyMessage");

const params = new URLSearchParams(window.location.search);
const original = params.get("url");

init();

async function init() {
  emergencyExitBtn.addEventListener("click", handleEmergencyExit);
  await renderEmergencyExitState();
}

async function handleEmergencyExit() {
  emergencyExitBtn.disabled = true;

  const result = await chrome.runtime.sendMessage({ type: "emergency_exit" });
  if (result?.ok) {
    emergencyMessageEl.hidden = false;
    emergencyMessageEl.textContent = "Session ended. Emergency Exit consumed for 24 hours.";
    window.location.href = original || "about:blank";
    return;
  }

  await renderEmergencyExitState(result);
}

async function renderEmergencyExitState(status) {
  const state = status || await chrome.runtime.sendMessage({ type: "get_emergency_exit_status" });
  const available = Boolean(state?.available);

  emergencyExitBtn.disabled = !available;
  emergencyMessageEl.hidden = false;

  if (available) {
    emergencyMessageEl.textContent = "Emergency Exit ends the current session immediately. Available once every 24 hours.";
    return;
  }

  emergencyMessageEl.textContent = `Emergency Exit unavailable. Recharges in ${formatRemainingTime(state?.remainingMs || 0)}.`;
}

function formatRemainingTime(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(1, minutes)}m`;
}
