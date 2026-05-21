import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeText,
  buildCandidateForms,
  buildChannelTitleCandidate
} from "../scorer/normalize.js";

test("normalizeText lowercases trims and collapses spacing", () => {
  assert.equal(normalizeText("  Learn   NODE.js   Auth  "), "learn node js auth");
});

test("normalizeText preserves meaningful technical tokens", () => {
  assert.equal(normalizeText("C++ vs C# for API work!!!"), "c++ vs c# for api work");
});

test("buildCandidateForms returns normalized composite variants", () => {
  assert.deepEqual(
    buildCandidateForms({
      title: "BFS / DFS Walkthrough",
      channel: "NeetCode",
      query: "graph problems",
      site: "YouTube"
    }),
    {
      title: "bfs dfs walkthrough",
      channelTitle: "neetcode bfs dfs walkthrough",
      queryTitle: "graph problems bfs dfs walkthrough",
      siteTitle: "youtube bfs dfs walkthrough"
    }
  );
});

test("buildChannelTitleCandidate skips empty parts", () => {
  assert.equal(buildChannelTitleCandidate("", "  API Design Guide "), "api design guide");
});
