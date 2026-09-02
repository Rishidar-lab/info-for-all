/**
 * IFFA editorial-priority weights and curves (v0.9, Phase A).
 *
 * Every constant that affects PROMINENCE lives here, named and commented. There
 * are no magic numbers in the scorer. See docs/EDITORIAL-MODEL.md.
 *
 * Design intent, measured from the v0.8 top-20 audit
 * (evaluation/reports/v0.9-baseline.md):
 *  - geographic relevance is the biggest lever (Tamil-Nadu-first), not a small bump;
 *  - a "duplicate" update — nothing actually changed — must NOT be prominent,
 *    however many publishers reprinted the wire copy;
 *  - publication velocity is noisy on a 15-minute cadence and is weighted low;
 *  - a generic national CAP watch ("Heavy Rain", 1 family, no district) is
 *    background, not trending.
 */

/** Σ = 1. Weighted arithmetic mean of the eight factors below. */
export const EDITORIAL_WEIGHTS = {
  geoRelevance: 0.2, // Tamil Nadu ≫ India ≫ abroad-relevant
  categoryPriority: 0.14, // crisis > politics > finance > sports ≫ general
  consequence: 0.18, // human safety / disruption / official action / population
  informationGain: 0.16, // a NEW fact / correction ≫ "more of the same"
  corroboration: 0.12, // INDEPENDENT source families + an official primary
  meaningfulRecency: 0.1, // time since a fact last CHANGED (not since a wire pickup)
  localImpact: 0.06, // named affected TN districts / infrastructure
  velocity: 0.04, // independent-family publication acceleration — deliberately small
} as const;

export const EDITORIAL_WEIGHT_SUM = Object.values(EDITORIAL_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(EDITORIAL_WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(`EDITORIAL_WEIGHTS must sum to 1, got ${EDITORIAL_WEIGHT_SUM}`);
}

export const GEO_RELEVANCE: Record<string, number> = { P0: 1.0, P1: 0.5, P2: 0.28, out: 0 };

export const CATEGORY_PRIORITY: Record<string, number> = {
  crisis: 1.0,
  politics: 0.72,
  finance: 0.64,
  sports: 0.52,
  "other-relevant": 0.22,
  entertainment: 0.02,
  celebrity: 0.0,
};

/** Novelty updateKind → informationGain. A duplicate is near zero. */
export const INFO_GAIN: Record<string, number> = {
  "new-event": 1.0,
  correction: 0.95,
  retraction: 0.95,
  "major-development": 0.9,
  "new-official-confirmation": 0.85,
  "new-contradiction": 0.8,
  "new-number": 0.72,
  "new-location": 0.7,
  "new-fact": 0.68,
  "new-counterclaim": 0.6,
  "new-authority-statement": 0.5,
  "new-source-only": 0.33,
  "minor-detail": 0.26,
  // "rephrasing" = a fresh article that added zero information (real SEO churn).
  rephrasing: 0.14,
  // "duplicate" = no new article at all since the last snapshot. The story is
  // simply STABLE — not junk. It is de-prioritised for prominence but not buried.
  duplicate: 0.32,
  unknown: 0.42,
};

/** minutes since the last MEANINGFUL update → recency sub-score. */
export const MEANINGFUL_RECENCY_CURVE: [number, number][] = [
  [30, 1.0],
  [90, 0.9],
  [240, 0.72],
  [480, 0.52],
  [720, 0.36],
  [1440, 0.2],
  [2880, 0.08],
  [Infinity, 0.03],
];

// ── penalties (subtracted from the weighted factor sum, 0–1 scale) ──
export const PENALTY = {
  duplicate: 0.22, // updateKind duplicate / rephrasing
  staleness12h: 0.12,
  staleness24h: 0.26,
  syndicationMax: 0.16, // scaled by syndicated / reports
  genericCap: 0.34, // SACHET-only + generic title + no district + 1 family
  headlineOnly: 0.09, // no excerpt anywhere + a single report
  weakEvidence: 0.12, // 1 source family AND no official primary
  gossip: 0.6, // celebrity keywords
} as const;

/**
 * Band thresholds on the 0–100 score (after hard rules).
 *
 * SUPPRESSED is deliberately a SMALL set — genuine junk (celebrity, digests,
 * out-of-scope, syndicated duplicates with no independent value). Ordinary
 * not-currently-developing news is BACKGROUND (findable in "More" and on the
 * category pages), not suppressed.
 */
export const BANDS = {
  urgentMin: 60,
  highMin: 42,
  standardMin: 24,
  backgroundMin: 5,
} as const;

/** Homepage source-concentration cap: max events from one publisher in the top-N surfaces. */
export const MAX_PER_PUBLISHER_TOP = 4;

export function curve(value: number, table: [number, number][]): number {
  for (const [threshold, out] of table) if (value <= threshold) return out;
  return table[table.length - 1][1];
}
export function curveDesc(value: number, table: [number, number][]): number {
  for (const [threshold, out] of table) if (value >= threshold) return out;
  return table[table.length - 1][1];
}
