/**
 * IFFA Trend Intelligence — types (v0.7, Phase F).
 *
 * "Trending" is NOT "most articles". A story trends when several independent
 * signals move together: it is recent, publication is accelerating across
 * DIFFERENT newsrooms, it matters here (Tamil Nadu / India), it is consequential,
 * and it carries a genuinely new development. Every sub-score is stored and shown.
 */
import type { CategoryId } from "@/lib/domain/categories";
import type { GeoTier } from "@/lib/domain/geo-tiers";

export type TrendState =
  | "new"
  | "rising"
  | "fast-rising"
  | "stable"
  | "fading"
  | "resurging";

export const TREND_STATE_LABEL: Record<TrendState, string> = {
  new: "New",
  rising: "Rising",
  "fast-rising": "Fast rising",
  stable: "Stable",
  fading: "Fading",
  resurging: "Resurging",
};

/** How a cluster's information changed since the previous snapshot. */
export type NoveltyClass = "new-event" | "new-fact" | "correction" | "more-of-same" | "unknown";

export interface TrendWindows {
  /** Distinct independent source families publishing within each window back from `now`. */
  m15: number;
  h1: number;
  h3: number;
  h6: number;
  h12: number;
  h24: number;
}

export interface TrendSignal {
  /** 0–100, weighted geometric mean of the sub-scores below. */
  score: number;
  state: TrendState;
  noveltyClass: NoveltyClass;

  // sub-scores, each 0–1, all stored so the ranking is never a black box
  recencyScore: number;
  velocityScore: number;
  sourceDiversityScore: number;
  geoScore: number;
  categoryScore: number;
  consequenceScore: number;
  noveltyScore: number;
  corroborationScore: number;

  windows: TrendWindows;
  /** Family-count acceleration: last-hour rate ÷ prior-6h rate. */
  acceleration: number;
  /** Human-readable "+/−" reasons, most important first. */
  explanation: string[];
}

export interface IndependenceSummary {
  /** Distinct newsrooms IFFA believes are independent of each other. */
  families: number;
  /** Raw report count. */
  reports: number;
  /** Reports past the first in any multi-publisher family (i.e. syndicated copies). */
  syndicated: number;
  wireCredits: string[];
  label: string;
}

export type SituationLevel = "normal" | "watch" | "elevated" | "crisis";

export const SITUATION_LABEL: Record<SituationLevel, string> = {
  normal: "Normal",
  watch: "Watch",
  elevated: "Elevated",
  crisis: "Crisis",
};

export interface SituationBar {
  tamilNadu: SituationLevel;
  india: SituationLevel;
  /** The active events the levels are derived from — never a fabricated alert state. */
  derivedFrom: { slug: string; title: string; tier: GeoTier; level: SituationLevel }[];
  generatedAt: string;
}

export interface TimelineEntry {
  at: string;
  sourceName: string;
  publisher: string;
  language: "ta" | "en" | "unknown";
  headline: string;
  /** This entry introduced a fact not present earlier in the cluster. */
  addedNewFact: boolean;
  official: boolean;
}

/** Per-cluster enrichment written by the trend engine. */
export interface ClusterEnrichment {
  category: CategoryId;
  categoryReason: string;
  geoTier: GeoTier;
  trend: TrendSignal;
  independence: IndependenceSummary;
  firstSeenAt: string;
  lastSeenAt: string;
  lastMeaningfulUpdateAt: string;
  timeline: TimelineEntry[];
}
