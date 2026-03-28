const params = new URLSearchParams(window.location.search);
const query = params.get("query") || "";
const task = params.get("task") || "";
const tabId = params.get("tabId") || "";

const taskEl = document.getElementById("taskDisplay");
const queryEl = document.getElementById("queryDisplay");
const challengeTextEl = document.getElementById("challengeText");
const reasonInput = document.getElementById("reasonInput");
const progressFill = document.getElementById("progressFill");
const countLabel = document.getElementById("countLabel");
const matchStatusEl = document.getElementById("matchStatus");
const overrideBtn = document.getElementById("overrideBtn");
const backBtn = document.getElementById("backBtn");
const overrideCountEl = document.getElementById("overrideCount");
const exactMatchText = buildExactMatchText(task, query);

init();

function init() {
  taskEl.textContent = task || "none set";
  queryEl.textContent = query || "(unknown)";
  challengeTextEl.textContent = exactMatchText;
  if (!task) taskEl.classList.add("dim");

  reasonInput.addEventListener("input", handleReasonInput);
  reasonInput.addEventListener("paste", blockManualBypass);
  reasonInput.addEventListener("drop", blockManualBypass);
  backBtn.addEventListener("click", handleGoBack);
  overrideBtn.addEventListener("click", handleOverride);
  challengeTextEl.addEventListener("copy", blockManualBypass);
  challengeTextEl.addEventListener("cut", blockManualBypass);
  challengeTextEl.addEventListener("dragstart", blockManualBypass);

  updateMatchUI("");
  void loadOverrideCount();
}

function normalizeInlineText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function buildExactMatchText(currentTask, currentQuery) {
  const normalizedTask = normalizeInlineText(currentTask);
  const normalizedQuery = normalizeInlineText(currentQuery);

  if (normalizedTask) {
    return `Task: ${normalizedTask}. Search: ${normalizedQuery}. I confirm this search is necessary for my current work.`;
  }

  return `Search: ${normalizedQuery}. I confirm this search is necessary for my deep-work session.`;
}

function blockManualBypass(event) {
  event.preventDefault();
}

function getMatchingPrefixLength(inputText, expectedText) {
  const maxLength = Math.min(inputText.length, expectedText.length);
  let index = 0;

  while (index < maxLength && inputText[index] === expectedText[index]) {
    index += 1;
  }

  return index;
}

function handleReasonInput() {
  updateMatchUI(reasonInput.value);
}

function updateMatchUI(inputValue) {
  const matchLength = getMatchingPrefixLength(inputValue, exactMatchText);
  const progressPercent = exactMatchText.length === 0
    ? 0
    : Math.min(100, (matchLength / exactMatchText.length) * 100);
  const complete = inputValue === exactMatchText;

  progressFill.style.width = `${progressPercent}%`;
  progressFill.classList.toggle("complete", complete);

  countLabel.textContent = `${matchLength} / ${exactMatchText.length} matched`;
  countLabel.classList.toggle("complete", complete);
  reasonInput.classList.toggle("matched", complete);

  overrideBtn.disabled = !complete;

  if (!inputValue) {
    matchStatusEl.textContent = "Retype the full sentence exactly to unlock the override.";
    matchStatusEl.classList.remove("complete");
    return;
  }

  if (complete) {
    matchStatusEl.textContent = "Exact match complete. You can proceed.";
    matchStatusEl.classList.add("complete");
    return;
  }

  matchStatusEl.textContent = "Not an exact match yet. Match is case-sensitive and paste is disabled.";
  matchStatusEl.classList.remove("complete");
}

function handleGoBack() {
  window.location.href = "https://www.youtube.com/";
}

async function handleOverride() {
  const reason = reasonInput.value;
  if (reason !== exactMatchText || !query) return;

  overrideBtn.disabled = true;
  overrideBtn.textContent = "Proceeding...";

  try {
    await chrome.runtime.sendMessage({
      type: "approve_search_query_with_reason",
      query,
      reason,
      tabId: tabId ? Number(tabId) : undefined,
    });
  } catch {
    // Ignore extension context failures and continue to the search.
  }

  window.location.href =
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

async function loadOverrideCount() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "get_override_count" });
    const count = response?.count ?? 0;
    if (count <= 0) return;

    overrideCountEl.hidden = false;
    overrideCountEl.innerHTML =
      `You've overridden <strong>${count}</strong> search${count === 1 ? "" : "es"} today.`;
  } catch {
    // ignore
  }
}
