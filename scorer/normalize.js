function normalizeText(text) {
  if (typeof text !== "string") {
    return "";
  }

  let normalized = text.normalize("NFKC").toLowerCase().trim();

  if (!normalized) {
    return "";
  }

  normalized = normalized
    .replace(/&/g, " and ")
    .replace(/([!?.,:;])\1+/g, "$1")
    .replace(/[`"'“”‘’()[\]{}<>]/g, " ")
    .replace(/\|+/g, " ")
    .replace(/[^a-z0-9+#./_\-\s]/g, " ");

  normalized = splitTechnicalSeparators(normalized);
  normalized = normalized.replace(/(^|\s)[./_\-]+(?=\s|$)/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

function splitTechnicalSeparators(text) {
  let previous = text;
  let current = text.replace(/([a-z0-9+#])([./_\-])([a-z0-9+#])/g, "$1 $3");

  while (current !== previous) {
    previous = current;
    current = current.replace(/([a-z0-9+#])([./_\-])([a-z0-9+#])/g, "$1 $3");
  }

  return current;
}

function joinCandidateParts(parts) {
  return normalizeText(
    parts
      .filter((part) => typeof part === "string" && part.trim())
      .join(" ")
  );
}

function buildTitleCandidate(title) {
  return joinCandidateParts([title]);
}

function buildChannelTitleCandidate(channel, title) {
  return joinCandidateParts([channel, title]);
}

function buildQueryTitleCandidate(query, title) {
  return joinCandidateParts([query, title]);
}

function buildSiteTitleCandidate(site, title) {
  return joinCandidateParts([site, title]);
}

function buildCandidateForms(parts) {
  const safeParts = parts && typeof parts === "object" ? parts : {};

  return {
    title: buildTitleCandidate(safeParts.title || ""),
    channelTitle: buildChannelTitleCandidate(
      safeParts.channel || "",
      safeParts.title || ""
    ),
    queryTitle: buildQueryTitleCandidate(
      safeParts.query || "",
      safeParts.title || ""
    ),
    siteTitle: buildSiteTitleCandidate(safeParts.site || "", safeParts.title || "")
  };
}

export {
  normalizeText,
  joinCandidateParts,
  buildTitleCandidate,
  buildChannelTitleCandidate,
  buildQueryTitleCandidate,
  buildSiteTitleCandidate,
  buildCandidateForms
};
