/**
 * IFFA Editorial Intelligence (v0.9, Phase A).
 *
 * "Classify everything we ingest" → "decide which events deserve prominence".
 *
 * EditorialPriority is a DETERMINISTIC, EVIDENCE-GROUNDED ranking layer that
 * sits ON TOP of the trend score. Its number is a RANKING SCORE, not a
 * probability — 82 does NOT mean "82% true / 82% reliable / 82% likely". Every
 * result exposes its factors, their weights and their contributions, plus the
 * reasons and penalties in plain words.
 *
 * See docs/EDITORIAL-MODEL.md.
 */

export type EditorialBand = "urgent" | "high" | "standard" | "background" | "suppressed";

export const EDITORIAL_BAND_LABEL: Record<EditorialBand, string> = {
  urgent: "Urgent",
  high: "High",
  standard: "Standard",
  background: "Background",
  suppressed: "Suppressed",
};

export const EDITORIAL_BAND_RANK: Record<EditorialBand, number> = {
  urgent: 4,
  high: 3,
  standard: 2,
  background: 1,
  suppressed: 0,
};

export interface EditorialFactor {
  name: string;
  /** normalised 0–1 */
  value: number;
  weight: number;
  /** value * weight, rounded */
  contribution: number;
}

export interface EditorialPenalty {
  name: string;
  amount: number;
  reason: string;
}

export interface EditorialPriority {
  /** 0–100 ranking score. NOT a probability of truth / reliability. */
  score: number;
  band: EditorialBand;
  factors: EditorialFactor[];
  /** Plain-language reasons this is (or is not) prominent, most important first. */
  reasons: string[];
  penalties: EditorialPenalty[];
  /** True when a hard rule (out of scope / celebrity / pure duplicate) forced suppression. */
  suppressedByRule?: string;
}
