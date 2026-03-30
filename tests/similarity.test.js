import test from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity } from "../scorer/similarity.js";

test("cosineSimilarity returns 1 for identical vectors", () => {
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
});

test("cosineSimilarity returns 0 for zero vectors", () => {
  assert.equal(cosineSimilarity([0, 0, 0], [1, 2, 3]), 0);
});

test("cosineSimilarity throws on mismatched lengths", () => {
  assert.throws(
    () => cosineSimilarity([1, 2], [1, 2, 3]),
    /equal length/
  );
});

test("cosineSimilarity throws on invalid values", () => {
  assert.throws(
    () => cosineSimilarity([1, Number.NaN], [1, 2]),
    /finite numeric vectors/
  );
});
