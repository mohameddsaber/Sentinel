function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new TypeError("cosineSimilarity expects two numeric arrays.");
  }

  if (a.length !== b.length) {
    throw new RangeError("cosineSimilarity expects vectors of equal length.");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const valueA = a[index];
    const valueB = b[index];

    if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) {
      throw new TypeError("cosineSimilarity expects finite numeric vectors.");
    }

    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  if (!normA || !normB) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export {
  cosineSimilarity
};
