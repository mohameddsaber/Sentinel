import { scoreCandidate } from "../scorer/scorer.js";

async function run() {
  const result1 = await scoreCandidate({ candidate: "Learn Node.js Authentication with JWT" });
  console.log("Result 1:", result1);

  const result2 = await scoreCandidate({ candidate: "Top 10 funny cat videos compilation" });
  console.log("Result 2:", result2);
}

run();
