import test from "node:test";
import assert from "node:assert/strict";
import {
  buildYouTubeCandidateForms,
  extractSiteLabel,
  scoreYouTubeCandidate
} from "../scorer/integration.js";

function createStubEmbedder(vectors) {
  return {
    async embed(text) {
      return vectors[text] || [0, 0, 0];
    }
  };
}

test("extractSiteLabel derives a clean hostname label", () => {
  assert.equal(
    extractSiteLabel("https://www.youtube.com/watch?v=123"),
    "youtube"
  );
});

test("buildYouTubeCandidateForms builds normalized scorer candidates", () => {
  assert.deepEqual(
    buildYouTubeCandidateForms({
      task: "study bfs and dfs graph problems",
      query: "bfs dfs",
      title: "Graph traversal patterns",
      channel: "NeetCode",
      url: "https://www.youtube.com/watch?v=123"
    }),
    {
      title: "graph traversal patterns",
      channelTitle: "neetcode graph traversal patterns",
      queryTitle: "bfs dfs graph traversal patterns",
      siteTitle: "youtube graph traversal patterns"
    }
  );
});

test("scoreYouTubeCandidate prefers the strongest relevant form", async () => {
  const embedder = createStubEmbedder({
    "study bfs and dfs graph problems": [1, 0, 0],
    "graph traversal patterns explained": [0.2, 0.1, 0],
    "neetcode graph traversal patterns explained": [0.4, 0.1, 0],
    "bfs dfs graph problems graph traversal patterns explained": [0.95, 0.05, 0],
    "youtube graph traversal patterns explained": [0.3, 0.1, 0]
  });

  const result = await scoreYouTubeCandidate({
    task: "study bfs and dfs graph problems",
    query: "bfs dfs graph problems",
    title: "Graph traversal patterns explained",
    channel: "NeetCode",
    url: "https://www.youtube.com/watch?v=123"
  }, { embedder });

  assert.equal(result.decision, "allow");
  assert.equal(result.selectedForm, "queryTitle");
  assert.ok(result.debug.scoredForms.length >= 3);
});

test("scoreYouTubeCandidate surfaces hard block forms", async () => {
  const embedder = createStubEmbedder({
    "learn node js authentication": [1, 0, 0],
    "mrbeast highlights": [0.9, 0, 0],
    "mrbeast mrbeast highlights": [0.95, 0, 0],
    "node auth tutorial mrbeast highlights": [0.98, 0, 0],
    "youtube mrbeast highlights": [0.85, 0, 0]
  });

  const result = await scoreYouTubeCandidate({
    task: "learn node js authentication",
    query: "node auth tutorial",
    title: "MrBeast highlights",
    channel: "MrBeast",
    url: "https://www.youtube.com/watch?v=123"
  }, { embedder });

  assert.equal(result.decision, "block");
  assert.ok(["title", "channelTitle", "queryTitle", "siteTitle"].includes(result.selectedForm));
  assert.match(result.reasons[0], /hard block pattern/);
});
