/**
 * Shared JSDoc typedefs for Sentinel Scorer v1.
 */

/**
 * @typedef {"allow" | "block" | "uncertain"} ScoreDecision
 */

/**
 * @typedef {Object} ScoreInput
 * @property {string} task
 * @property {string} candidate
 * @property {Object=} metadata
 */

/**
 * @typedef {Object} ScoreDebug
 * @property {number} allowThreshold
 * @property {number} blockThreshold
 * @property {string[]} hardBlockMatches
 * @property {string[]} softSuspiciousMatches
 */

/**
 * @typedef {Object} ScoreResult
 * @property {string} normalizedTask
 * @property {string} normalizedCandidate
 * @property {number} similarity
 * @property {ScoreDecision} decision
 * @property {string[]} reasons
 * @property {ScoreDebug} debug
 */

/**
 * @typedef {Object} EvalExample
 * @property {string} task
 * @property {string} candidate
 * @property {ScoreDecision} label
 */

/**
 * @typedef {Object} Embedder
 * @property {(text: string) => Promise<number[]>} embed
 */

/**
 * @typedef {Object} YouTubeScoreInput
 * @property {string} task
 * @property {string=} query
 * @property {string=} title
 * @property {string=} channel
 * @property {string=} site
 * @property {string=} url
 * @property {Object=} metadata
 */

/**
 * @typedef {Object} CandidateFormScore
 * @property {"title" | "channelTitle" | "queryTitle" | "siteTitle"} form
 * @property {string} candidate
 * @property {import("./types.js").ScoreResult} result
 */

export {};
