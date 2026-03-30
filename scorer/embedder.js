let extractorPromise = null;

async function getExtractor() {
  // Load the MiniLM pipeline on first use and reuse it afterwards.
  if (!extractorPromise) {
    extractorPromise = import("@huggingface/transformers")
      .then(({ pipeline }) =>
        pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
      )
      .catch((error) => {
        extractorPromise = null;
        throw error;
      });
  }

  return extractorPromise;
}

async function embed(normalized) {
  if (typeof normalized !== "string") {
    throw new TypeError("embed(normalized) expects a string.");
  }
  const extractor = await getExtractor();
  const output = await extractor(normalized, {
    pooling: "mean",
    normalize: true
  });

  return toFlatNumberArray(output);
}

function toFlatNumberArray(output) {
  if (output && output.data) {
    return Array.from(output.data, (value) => Number(value));
  }

  if (output && typeof output.tolist === "function") {
    return flattenNumericArray(output.tolist());
  }

  if (Array.isArray(output)) {
    return flattenNumericArray(output);
  }

  throw new TypeError("Unsupported embedding output format.");
}

function flattenNumericArray(value) {
  const flattened = [];
  const stack = [value];

  while (stack.length > 0) {
    const current = stack.pop();

    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) {
        stack.push(current[index]);
      }
      continue;
    }

    const numericValue = Number(current);
    if (!Number.isFinite(numericValue)) {
      throw new TypeError("Embedding output contains non-numeric values.");
    }

    flattened.push(numericValue);
  }

  return flattened;
}

export {
  getExtractor,
  embed
};
