import {
  buildCandidateForms,
  normalizeText
} from "./normalize.js";
import { scoreCandidate } from "./scorer.js";

const FORM_PRIORITY = {
  queryTitle: 4,
  channelTitle: 3,
  siteTitle: 2,
  title: 1
};

async function scoreYouTubeCandidate(input, options) {
  validateYouTubeScoreInput(input);

  const forms = buildYouTubeCandidateForms(input);
  const scoredForms = [];

  for (const [form, candidate] of Object.entries(forms)) {
    if (!candidate) {
      continue;
    }

    const result = await scoreCandidate(
      {
        task: input.task,
        candidate,
        metadata: {
          ...input.metadata,
          form,
          source: "youtube"
        }
      },
      options
    );

    scoredForms.push({
      form,
      candidate,
      result
    });
  }

  if (scoredForms.length === 0) {
    throw new TypeError("scoreYouTubeCandidate requires at least one non-empty candidate field.");
  }

  const selected = selectBestForm(scoredForms);

  return {
    selectedForm: selected.form,
    normalizedTask: selected.result.normalizedTask,
    normalizedCandidate: selected.result.normalizedCandidate,
    similarity: selected.result.similarity,
    decision: selected.result.decision,
    reasons: selected.result.reasons,
    debug: {
      ...selected.result.debug,
      source: "youtube",
      scoredForms: scoredForms.map((entry) => ({
        form: entry.form,
        candidate: entry.candidate,
        similarity: entry.result.similarity,
        decision: entry.result.decision,
        hardBlockMatches: entry.result.debug.hardBlockMatches,
        softSuspiciousMatches: entry.result.debug.softSuspiciousMatches
      }))
    }
  };
}

function buildYouTubeCandidateForms(input) {
  const site = input.site || extractSiteLabel(input.url) || "youtube";
  const forms = buildCandidateForms({
    title: input.title || "",
    channel: input.channel || "",
    query: input.query || "",
    site
  });

  return forms;
}

function extractSiteLabel(url) {
  if (typeof url !== "string" || !url.trim()) {
    return "";
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const firstLabel = hostname.split(".")[0];

    return normalizeText(firstLabel);
  } catch {
    return "";
  }
}

function selectBestForm(scoredForms) {
  const hardBlocked = scoredForms.filter(
    (entry) => entry.result.debug.hardBlockMatches.length > 0
  );

  if (hardBlocked.length > 0) {
    return hardBlocked.sort(compareScoredForms)[0];
  }

  return scoredForms.sort(compareScoredForms)[0];
}

function compareScoredForms(a, b) {
  const decisionDelta = decisionRank(b.result.decision) - decisionRank(a.result.decision);
  if (decisionDelta !== 0) {
    return decisionDelta;
  }

  const similarityDelta = b.result.similarity - a.result.similarity;
  if (similarityDelta !== 0) {
    return similarityDelta;
  }

  return (FORM_PRIORITY[b.form] || 0) - (FORM_PRIORITY[a.form] || 0);
}

function decisionRank(decision) {
  switch (decision) {
    case "block":
      return 3;
    case "allow":
      return 2;
    case "uncertain":
      return 1;
    default:
      return 0;
  }
}

function validateYouTubeScoreInput(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("scoreYouTubeCandidate expects an input object.");
  }

  if (typeof input.task !== "string" || !input.task.trim()) {
    throw new TypeError("scoreYouTubeCandidate requires a non-empty task string.");
  }
}

export {
  buildYouTubeCandidateForms,
  extractSiteLabel,
  scoreYouTubeCandidate
};
