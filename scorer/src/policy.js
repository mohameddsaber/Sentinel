const ALLOW_THRESHOLD = 0.4;
const BLOCK_THRESHOLD = 0.22;

const HARD_BLOCK_PATTERNS = [
  "asmr",
  "mukbang",
  "prank",
  "reaction",
  "reacts",
  "compilation",
  "funny moments",
  "highlights",
  "lyrics",
  "music video",
  "official video",
  "fortnite",
  "ishowspeed",
  "mrbeast",
  "sidemen",
  "tiktok",
  "reels",
  "shorts",
  "celebrity drama",
  "gossip"
];

const SOFT_SUSPICIOUS_PATTERNS = [
  "study with me",
  "productivity",
  "motivation",
  "routine",
  "day in the life",
  "podcast",
  "vlog",
  "workspace setup",
  "focus music",
  "career advice"
];

function applyDecisionPolicy(input) {
  const label = input && input.label ? input.label : "uncertain";
  const score = Number.isFinite(input && input.score) ? input.score : 0;
  const normalizedCandidate =
    input && typeof input.normalizedCandidate === "string"
      ? input.normalizedCandidate
      : "";

  const hardBlockMatches = findMatchingPatterns(
    normalizedCandidate,
    HARD_BLOCK_PATTERNS
  );
  const softSuspiciousMatches = findMatchingPatterns(
    normalizedCandidate,
    SOFT_SUSPICIOUS_PATTERNS
  );

  const reasons = [];

  if (hardBlockMatches.length > 0) {
    reasons.push(`hard block pattern: ${hardBlockMatches.join(", ")}`);
    reasons.push(`classifier label ${label} ignored due to hard block`);

    return {
      decision: "block",
      reasons,
      debug: {
        label,
        score,
        hardBlockMatches,
        softSuspiciousMatches
      }
    };
  }

  // Use the classifier output directly
  if (label === "block" || label === "allow" || label === "uncertain") {
     reasons.push(`classifier determined label: ${label} with score ${score.toFixed(3)}`);
     
     // If the model said allow but it has suspicious patterns, maybe drop to uncertain
     if (label === "allow" && softSuspiciousMatches.length > 0) {
        reasons.push(`suspicious pattern found: ${softSuspiciousMatches.join(", ")}`);
        reasons.push(`downgrading from allow to uncertain`);
        return {
           decision: "uncertain",
           reasons,
           debug: { label, score, hardBlockMatches, softSuspiciousMatches }
        };
     }
     
     return {
        decision: label,
        reasons,
        debug: { label, score, hardBlockMatches, softSuspiciousMatches }
     };
  }

  reasons.push(
    `classifier returned unknown label ${label}`
  );

  return {
    decision: "uncertain",
    reasons,
    debug: {
      label,
      score,
      hardBlockMatches,
      softSuspiciousMatches
    }
  };
}

function findMatchingPatterns(text, patterns) {
  if (!text) {
    return [];
  }

  return patterns.filter((pattern) => text.includes(pattern));
}

export {
  ALLOW_THRESHOLD,
  BLOCK_THRESHOLD,
  HARD_BLOCK_PATTERNS,
  SOFT_SUSPICIOUS_PATTERNS,
  applyDecisionPolicy
};
