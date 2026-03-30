import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreCandidate } from "./scorer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DATASET_PATH = path.join(
  __dirname,
  "..",
  "data",
  "scorer_dataset.json"
);

async function runEvaluation(datasetPath) {
  const resolvedPath = datasetPath
    ? path.resolve(datasetPath)
    : DEFAULT_DATASET_PATH;
  const dataset = loadDataset(resolvedPath);

  const expectedCounts = createDecisionCounts();
  const predictedCounts = createDecisionCounts();
  const mistakes = [];

  for (let index = 0; index < dataset.length; index += 1) {
    const example = dataset[index];
    expectedCounts[example.label] += 1;

    const result = await scoreCandidate({
      task: example.task,
      candidate: example.candidate
    });

    predictedCounts[result.decision] += 1;

    if (result.decision !== example.label) {
      mistakes.push({
        index,
        example,
        result
      });
    }
  }

  const correct = dataset.length - mistakes.length;
  const accuracy = dataset.length === 0 ? 0 : correct / dataset.length;

  console.log("Sentinel Scorer v1 Evaluation");
  console.log(`Dataset: ${resolvedPath}`);
  console.log(`Examples: ${dataset.length}`);
  console.log(`Accuracy: ${(accuracy * 100).toFixed(2)}% (${correct}/${dataset.length})`);
  console.log("");
  console.log("Expected counts:", expectedCounts);
  console.log("Predicted counts:", predictedCounts);
  console.log("");

  if (mistakes.length === 0) {
    console.log("Mistakes: none");
    return { accuracy, expectedCounts, predictedCounts, mistakes };
  }

  console.log(`Mistakes (${mistakes.length}):`);

  for (const mistake of mistakes) {
    console.log(
      `- [${mistake.index}] expected=${mistake.example.label} predicted=${mistake.result.decision} similarity=${mistake.result.similarity.toFixed(3)}`
    );
    console.log(`  task: ${mistake.example.task}`);
    console.log(`  candidate: ${mistake.example.candidate}`);
    console.log(`  reasons: ${mistake.result.reasons.join(" | ")}`);
  }

  return { accuracy, expectedCounts, predictedCounts, mistakes };
}

function loadDataset(datasetPath) {
  const raw = fs.readFileSync(datasetPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new TypeError("Dataset must be a JSON array.");
  }

  return parsed;
}

function createDecisionCounts() {
  return {
    allow: 0,
    block: 0,
    uncertain: 0
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runEvaluation(process.argv[2]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  runEvaluation
};
