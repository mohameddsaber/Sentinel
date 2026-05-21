import { scoreCandidate } from "../src/scorer.js";
import { scoreYouTubeCandidate } from "../src/integration.js";
import { getClassifier } from "../src/classifier.js";

const EXAMPLES = {
  text: {
    allow: {
      candidate:
        "attention is all you need explained with annotated transformer diagrams and encoder decoder walkthrough"
    },
    block: {
      candidate:
        "mrbeast funny reaction compilation and prank highlights"
    }
  },
  youtube: {
    allow: {
      title: "full lecture on attention mechanisms and transformer scaling laws",
      channel: "ML Systems Lab",
      query: "transformer architecture lecture",
      site: "youtube",
      url: "https://www.youtube.com/watch?v=lecture"
    },
    block: {
      title: "study with me for 4 hours deep work session",
      channel: "Focus Lab",
      query: "transformer architecture lecture",
      site: "youtube",
      url: "https://www.youtube.com/watch?v=focus"
    }
  }
};

const elements = {
  modeSelect: document.querySelector("#mode-select"),
  textFields: document.querySelector("#text-fields"),
  youtubeFields: document.querySelector("#youtube-fields"),
  candidateInput: document.querySelector("#candidate-input"),
  youtubeTitleInput: document.querySelector("#youtube-title-input"),
  youtubeChannelInput: document.querySelector("#youtube-channel-input"),
  youtubeQueryInput: document.querySelector("#youtube-query-input"),
  youtubeSiteInput: document.querySelector("#youtube-site-input"),
  youtubeUrlInput: document.querySelector("#youtube-url-input"),
  warmupButton: document.querySelector("#warmup-button"),
  scoreButton: document.querySelector("#score-button"),
  fillAllowedButton: document.querySelector("#fill-allowed-button"),
  fillBlockedButton: document.querySelector("#fill-blocked-button"),
  clearButton: document.querySelector("#clear-button"),
  statusBadge: document.querySelector("#status-badge"),
  decisionBadge: document.querySelector("#decision-badge"),
  similarityValue: document.querySelector("#similarity-value"),
  selectedFormValue: document.querySelector("#selected-form-value"),
  allowThresholdValue: document.querySelector("#allow-threshold-value"),
  blockThresholdValue: document.querySelector("#block-threshold-value"),
  normalizedCandidateOutput: document.querySelector("#normalized-candidate-output"),
  reasonsList: document.querySelector("#reasons-list"),
  formsOutput: document.querySelector("#forms-output"),
  rawOutput: document.querySelector("#raw-output")
};

let isBusy = false;

elements.modeSelect.addEventListener("change", syncModeVisibility);
elements.warmupButton.addEventListener("click", handleWarmup);
elements.scoreButton.addEventListener("click", handleScore);
elements.fillAllowedButton.addEventListener("click", () => fillExample("allow"));
elements.fillBlockedButton.addEventListener("click", () => fillExample("block"));
elements.clearButton.addEventListener("click", clearOutput);

syncModeVisibility();
clearOutput();

async function handleWarmup() {
  await runBusyTask("Loading model", async () => {
    await getClassifier();
    setStatus("Model ready", "allow");
  });
}

async function handleScore() {
  await runBusyTask("Scoring", async () => {
    const mode = getMode();
    const result =
      mode === "youtube"
        ? await scoreYouTubeCandidate(readYouTubeInput())
        : await scoreCandidate(readTextInput());

    renderResult(result, mode);
    setStatus("Score complete", result.decision);
    console.log("[Sentinel] Playground result", {
      mode,
      result
    });
  });
}

async function runBusyTask(label, task) {
  if (isBusy) {
    return;
  }

  isBusy = true;
  setButtonsDisabled(true);
  setStatus(label, "loading");

  try {
    await task();
  } catch (error) {
    renderError(error);
    setStatus("Failed", "error");
    console.error("[Sentinel] Playground error", error);
  } finally {
    isBusy = false;
    setButtonsDisabled(false);
  }
}

function readTextInput() {
  return {
    candidate: elements.candidateInput.value
  };
}

function readYouTubeInput() {
  return {
    title: elements.youtubeTitleInput.value,
    channel: elements.youtubeChannelInput.value,
    query: elements.youtubeQueryInput.value,
    site: elements.youtubeSiteInput.value,
    url: elements.youtubeUrlInput.value
  };
}

function renderResult(result, mode) {
  elements.decisionBadge.textContent = result.decision;
  elements.decisionBadge.className = `badge ${result.decision}`;
  elements.similarityValue.textContent = Number.isFinite(result.similarity)
    ? result.similarity.toFixed(4)
    : "-";
  elements.selectedFormValue.textContent =
    mode === "youtube" ? result.selectedForm || "-" : "plain";
  elements.allowThresholdValue.textContent = formatThreshold(
    result.debug?.allowThreshold
  );
  elements.blockThresholdValue.textContent = formatThreshold(
    result.debug?.blockThreshold
  );
  elements.normalizedCandidateOutput.textContent =
    result.normalizedCandidate || "-";

  renderReasons(result.reasons || []);
  renderForms(result.debug?.scoredForms || []);
  elements.rawOutput.textContent = JSON.stringify(result, null, 2);
}

function renderReasons(reasons) {
  if (!reasons.length) {
    elements.reasonsList.innerHTML = "<li>No reasons returned.</li>";
    return;
  }

  elements.reasonsList.innerHTML = reasons
    .map((reason) => `<li>${escapeHtml(reason)}</li>`)
    .join("");
}

function renderForms(scoredForms) {
  if (!scoredForms.length) {
    elements.formsOutput.textContent = "No alternate forms for this mode.";
    return;
  }

  const lines = scoredForms.map((entry) =>
    [
      `form: ${entry.form}`,
      `decision: ${entry.decision}`,
      `similarity: ${formatThreshold(entry.similarity)}`,
      `candidate: ${entry.candidate}`
    ].join("\n")
  );

  elements.formsOutput.textContent = lines.join("\n\n");
}

function renderError(error) {
  elements.decisionBadge.textContent = "Error";
  elements.decisionBadge.className = "badge error";
  elements.similarityValue.textContent = "-";
  elements.selectedFormValue.textContent = "-";
  elements.allowThresholdValue.textContent = "-";
  elements.blockThresholdValue.textContent = "-";
  elements.normalizedCandidateOutput.textContent = "-";
  elements.reasonsList.innerHTML = `<li>${escapeHtml(
    error instanceof Error ? error.message : String(error)
  )}</li>`;
  elements.formsOutput.textContent = "No result.";
  elements.rawOutput.textContent =
    error instanceof Error && error.stack ? error.stack : String(error);
}

function clearOutput() {
  elements.decisionBadge.textContent = "No result";
  elements.decisionBadge.className = "badge idle";
  elements.similarityValue.textContent = "-";
  elements.selectedFormValue.textContent = "-";
  elements.allowThresholdValue.textContent = "-";
  elements.blockThresholdValue.textContent = "-";
  elements.normalizedCandidateOutput.textContent = "-";
  elements.reasonsList.innerHTML = "<li>No result yet.</li>";
  elements.formsOutput.textContent = "No result yet.";
  elements.rawOutput.textContent = "No result yet.";
}

function fillExample(kind) {
  const mode = getMode();
  const example = EXAMPLES[mode][kind];

  if (mode === "youtube") {
    elements.youtubeTitleInput.value = example.title;
    elements.youtubeChannelInput.value = example.channel;
    elements.youtubeQueryInput.value = example.query;
    elements.youtubeSiteInput.value = example.site;
    elements.youtubeUrlInput.value = example.url;
  } else {
    elements.candidateInput.value = example.candidate;
  }
}

function syncModeVisibility() {
  const isYouTube = getMode() === "youtube";
  elements.textFields.classList.toggle("hidden", isYouTube);
  elements.youtubeFields.classList.toggle("hidden", !isYouTube);
}

function setButtonsDisabled(disabled) {
  elements.warmupButton.disabled = disabled;
  elements.scoreButton.disabled = disabled;
  elements.fillAllowedButton.disabled = disabled;
  elements.fillBlockedButton.disabled = disabled;
  elements.clearButton.disabled = disabled;
}

function setStatus(text, tone) {
  elements.statusBadge.textContent = text;
  elements.statusBadge.className = `badge ${tone}`;
}

function getMode() {
  return elements.modeSelect.value;
}

function formatThreshold(value) {
  return Number.isFinite(value) ? Number(value).toFixed(3) : "-";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
