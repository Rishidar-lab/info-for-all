/**
 * IFFA trend-score weights and normalisation curves (v0.7, Phase F).
 *
 * EVERY constant that affects ranking lives here, named and commented. There are
 * no magic numbers buried in the scorer. See `docs/TREND-MODEL.md` for the
 * rationale and a worked example.
 */
import type { NoveltyClass } from "./types";

/**
 * Weights for the weighted GEOMETRIC mean:
 *
 *   score = 100 · Π_i ( subScore_i ^ w_i )      with   Σ w_i = 1
 *
 * Geometric (not arithmetic) so a genuinely weak dimension pulls the score down
 * hard, and a zero in `geo` (an out-of-scope story) removes the item entirely —
 * which is the point of "don't let generic international content pollute the feed".
 */
export const TREND_WEIGHTS = {
  recency: 0.14, // how long since the last MEANINGFUL update
  velocity: 0.16, // acceleration of independent-family publication
  diversity: 0.12, // how many independent newsrooms
  geo: 0.14, // Tamil Nadu > India > abroad-relevant
  category: 0.12, // crisis > politics > finance > sports
  consequence: 0.16, // official alert, wide district impact, corroboration
  novelty: 0.08, // a new fact / correction beats "more of the same"
  corroboration: 0.08, // independent confirmation or an official primary source
} as const;

/** Sum of all weights — must be 1.0 (checked at module load and in tests). */
export const TREND_WEIGHT_SUM = Object.values(TREND_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(TREND_WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(`TREND_WEIGHTS must sum to 1, got ${TREND_WEIGHT_SUM}`);
}

/** Sub-scores are floored here (except geo) so one missing signal never zeroes the score. */
export const SUBSCORE_FLOOR = 0.03;

/** A cluster is "trending" only at or above this composite score. */
export const TREND_MIN = 20;

/** Independent-family count that saturates the diversity sub-score. */
export const DIVERSITY_CAP = 6;

/** Recency curve: minutes since last meaningful update → sub-score. */
export const RECENCY_CURVE: [number, number][] = [
  [15, 1.0],
  [60, 0.9],
  [180, 0.74],
  [360, 0.55],
  [720, 0.36],
  [1440, 0.18],
  [2880, 0.08],
  [Infinity, 0.03],
];

/** Acceleration (last-hour family rate ÷ prior-6h family rate) → velocity sub-score. */
export const VELOCITY_CURVE: [number, number][] = [
  [4, 1.0],
  [2.5, 0.85],
  [1.6, 0.66],
  [1.0, 0.46],
  [0.5, 0.26],
  [0.2, 0.12],
  [0, 0.06],
];

/** Baseline velocity for a cluster with too few articles to measure acceleration. */
export const VELOCITY_BASELINE = 0.15;

export const NOVELTY_SCORE: Record<NoveltyClass, number> = {
  "new-event": 1.0,
  correction: 0.9,
  "new-fact": 0.8,
  "more-of-same": 0.25,
  unknown: 0.5, // honest: novelty can't be judged on first observation
};

/** Map a value through a descending-threshold curve. */
export function curve(value: number, table: [number, number][]): number {
  for (const [threshold, out] of table) {
    if (value <= threshold) return out;
  }
  return table[table.length - 1][1];
}

/** Map a value through an ASCENDING-threshold curve (first threshold the value meets). */
export function curveDesc(value: number, table: [number, number][]): number {
  for (const [threshold, out] of table) {
    if (value >= threshold) return out;
  }
  return table[table.length - 1][1];
}
