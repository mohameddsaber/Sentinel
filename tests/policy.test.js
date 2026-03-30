import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDecisionPolicy,
  ALLOW_THRESHOLD,
  BLOCK_THRESHOLD
} from "../scorer/policy.js";

test("hard block patterns override similarity", () => {
  const result = applyDecisionPolicy({
    similarity: 0.95,
    normalizedCandidate: "mrbeast node js tutorial highlights"
  });

  assert.equal(result.decision, "block");
  assert.match(result.reasons[0], /hard block pattern/);
});

test("high similarity allows content", () => {
  const result = applyDecisionPolicy({
    similarity: ALLOW_THRESHOLD,
    normalizedCandidate: "rest api design guide"
  });

  assert.equal(result.decision, "allow");
});

test("low similarity blocks content", () => {
  const result = applyDecisionPolicy({
    similarity: BLOCK_THRESHOLD,
    normalizedCandidate: "travel vlog"
  });

  assert.equal(result.decision, "block");
});

test("mid-band suspicious content is uncertain", () => {
  const result = applyDecisionPolicy({
    similarity: (ALLOW_THRESHOLD + BLOCK_THRESHOLD) / 2,
    normalizedCandidate: "productivity routine for backend developers"
  });

  assert.equal(result.decision, "uncertain");
  assert.match(result.reasons[0], /suspicious pattern/);
});
