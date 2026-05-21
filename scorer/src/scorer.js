import { normalizeText } from "./normalize.js";
import { classify } from "./classifier.js";
import { applyDecisionPolicy } from "./policy.js";

async function scoreCandidate(input, options) {
  validateScoreInput(input);

  const normalizedCandidate = normalizeText(input.candidate);

  if (!normalizedCandidate) {
    return {
       normalizedCandidate: "",
       decision: "allow",
       reasons: ["Empty candidate"],
       debug: {}
    };
  }

  // The output is typically an array like [{ label: "allow", score: 0.95 }]
  const classificationOutput = await classify(normalizedCandidate);
  
  // Extract label and score
  let label = "uncertain";
  let score = 0;
  
  if (classificationOutput && classificationOutput.length > 0) {
      label = classificationOutput[0].label;
      score = classificationOutput[0].score;
  }

  const policyResult = applyDecisionPolicy({
    label,
    score,
    normalizedCandidate,
    metadata: input.metadata
  });

  return {
    normalizedCandidate,
    similarity: score,
    decision: policyResult.decision,
    reasons: policyResult.reasons,
    debug: policyResult.debug
  };
}

function validateScoreInput(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("scoreCandidate expects an input object.");
  }

  if (typeof input.candidate !== "string") {
    throw new TypeError("scoreCandidate expects input.candidate to be a string.");
  }
}

export {
  scoreCandidate
};
