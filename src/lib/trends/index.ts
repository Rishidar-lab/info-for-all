/**
 * IFFA Trend Intelligence engine (v0.7).
 *
 *   enrichDataset(dataset, { now, previous })  →  clusters gain .trendData,
 *   dataset gains .trending / .watching / .situation / .counts.byCategory
 *
 * See docs/TREND-MODEL.md for the ranking model and a worked example.
 */
export { enrichDataset } from "./enrich";
export type { EnrichOptions, EnrichedDataset } from "./enrich";
export { computeTrend } from "./score";
export type { ScoreInput } from "./score";
export { trendWindows, velocityScore, trendState } from "./velocity";
export { buildTimeline, lastMeaningfulUpdate } from "./timeline";
export { buildSituation } from "./situation";
export {
  TREND_WEIGHTS,
  TREND_WEIGHT_SUM,
  TREND_MIN,
  DIVERSITY_CAP,
  NOVELTY_SCORE,
} from "./weights";
export * from "./types";
