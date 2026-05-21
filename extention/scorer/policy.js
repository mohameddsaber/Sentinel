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
  const similarity = Number.isFinite(input && input.similarity)
    ? input.similarity
    : 0;
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
    reasons.push(`similarity ${similarity.toFixed(3)} ignored due to hard block`);

    return {
      decision: "block",
      reasons,
      debug: {
        allowThreshold: ALLOW_THRESHOLD,
        blockThreshold: BLOCK_THRESHOLD,
        hardBlockMatches,
        softSuspiciousMatches
      }
    };
  }

  if (similarity >= ALLOW_THRESHOLD) {
    reasons.push(
      `similarity ${similarity.toFixed(3)} >= allow threshold ${ALLOW_THRESHOLD}`
    );

    return {
      decision: "allow",
      reasons,
      debug: {
        allowThreshold: ALLOW_THRESHOLD,
        blockThreshold: BLOCK_THRESHOLD,
        hardBlockMatches,
        softSuspiciousMatches
      }
    };
  }

  if (similarity <= BLOCK_THRESHOLD) {
    reasons.push(
      `similarity ${similarity.toFixed(3)} <= block threshold ${BLOCK_THRESHOLD}`
    );

    return {
      decision: "block",
      reasons,
      debug: {
        allowThreshold: ALLOW_THRESHOLD,
        blockThreshold: BLOCK_THRESHOLD,
        hardBlockMatches,
        softSuspiciousMatches
      }
    };
  }

  if (softSuspiciousMatches.length > 0) {
    reasons.push(`suspicious pattern: ${softSuspiciousMatches.join(", ")}`);
  }

  reasons.push(
    `similarity ${similarity.toFixed(3)} in uncertain band (${BLOCK_THRESHOLD}, ${ALLOW_THRESHOLD})`
  );

  return {
    decision: "uncertain",
    reasons,
    debug: {
      allowThreshold: ALLOW_THRESHOLD,
      blockThreshold: BLOCK_THRESHOLD,
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
