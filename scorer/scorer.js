import { normalizeText } from "./normalize.js";
import { embed } from "./embedder.js";
import { cosineSimilarity } from "./similarity.js";
import { applyDecisionPolicy } from "./policy.js";

async function scoreCandidate(input, options) {
  validateScoreInput(input);

  const normalizedTask = normalizeText(input.task);
  const normalizedCandidate = normalizeText(input.candidate);

  if (!normalizedTask) {
    throw new TypeError("scoreCandidate requires a non-empty task string.");
  }

  const activeEmbedder = resolveEmbedder(options);
  const [taskVector, candidateVector] = await Promise.all([
    activeEmbedder.embed(normalizedTask),
    activeEmbedder.embed(normalizedCandidate)
  ]);

  const similarity = cosineSimilarity(taskVector, candidateVector);
  const policyResult = applyDecisionPolicy({
    similarity,
    normalizedTask,
    normalizedCandidate,
    metadata: input.metadata
  });

  return {
    normalizedTask,
    normalizedCandidate,
    similarity,
    decision: policyResult.decision,
    reasons: policyResult.reasons,
    debug: policyResult.debug
  };
}

function resolveEmbedder(options) {
  if (options && typeof options.embedder === "function") {
    return { embed: options.embedder };
  }

  if (options && options.embedder && typeof options.embedder.embed === "function") {
    return options.embedder;
  }

  return { embed };
}

function validateScoreInput(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("scoreCandidate expects an input object.");
  }

  if (typeof input.task !== "string") {
    throw new TypeError("scoreCandidate expects input.task to be a string.");
  }

  if (typeof input.candidate !== "string") {
    throw new TypeError("scoreCandidate expects input.candidate to be a string.");
  }
}

export {
  scoreCandidate
};
