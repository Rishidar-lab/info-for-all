/**
 * Types for IFA's live India / Tamil Nadu public-information feed.
 *
 * These describe the OUTPUT of the ingestion pipeline (`scripts/ingest-feeds.ts`
 * → `src/data/generated/live-feed.json`). The UI reads only this shape and never
 * touches the network.
 */

export type GeographicScope =
  | "tamil-nadu"
  | "india"
  | "india-relevant"
  | "excluded";

export type EvidenceRole =
  | "official-alert"
  | "primary-document"
  | "government-statement"
  | "on-ground-report"
  | "independent-report"
  | "expert-analysis"
  | "developing-unverified";

export type VerificationStatus =
  | "official"
  | "corroborated"
  | "single-source"
  | "developing"
  | "disputed"
  | "unverified";

/** Lifecycle of an official alert / tracked event. */
export type AlertLifecycle =
  | "active"
  | "update"
  | "all-clear"
  | "developing"
  | "archived";

/** Priority incident families IFA treats as crisis / public-safety. */
export type CrisisType =
  | "cyclone"
  | "extreme-rain"
  | "flood"
  | "dam-reservoir-warning"
  | "coastal-tsunami-warning"
  | "earthquake"
  | "landslide"
  | "thunderstorm-lightning"
  | "heatwave"
  | "wildfire"
  | "industrial-accident"
  | "transport-accident"
  | "public-health-warning"
  | "infrastructure-outage"
  | "evacuation"
  | "district-emergency-notice";

export interface GeoClassification {
  scope: GeographicScope;
  state?: string;
  districts: string[];
  /** Exact terms from the source text that triggered the classification. */
  matchedTerms: string[];
  /** Human-readable justification, so filtering is explainable. */
  reason: string;
  confidence: "high" | "medium" | "low";
}

/**
 * CAP severity/urgency/certainty are preserved verbatim from the issuing
 * authority when present. IFA never invents these.
 */
export interface CapMeta {
  severity?: string;
  urgency?: string;
  certainty?: string;
  severityColour?: string;
  event?: string;
  senderName?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  areaDescription?: string;
  centroid?: { lat: number; lon: number };
  /** CAP alert identifier (used to merge the SACHET RSS + JSON views). */
  identifier?: string;
}

export interface LiveArticle {
  id: string;
  title: string;
  url: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  fetchedAt: string;
  language: "ta" | "en" | "unknown";
  scope: GeographicScope;
  state?: string;
  districts: string[];
  geo: GeoClassification;
  evidenceRole: EvidenceRole;
  verificationStatus: VerificationStatus;
  excerpt?: string;
  crisisType?: CrisisType;
  /** Deterministic 0–100. Higher = more urgent for a Tamil Nadu reader. */
  crisisPriority: number;
  isCrisis: boolean;
  lifecycle: AlertLifecycle;
  cap?: CapMeta;
}

export interface FeedStatus {
  sourceId: string;
  sourceName: string;
  lastAttemptAt: string;
  lastSuccessAt?: string;
  status: "ok" | "stale" | "failed";
  itemCount: number;
  error?: string;
}

export interface ClusterDifferenceRow {
  field: string;
  observations: { sourceName: string; value: string }[];
}

export interface LiveCluster {
  id: string;
  slug: string;
  title: string;
  scope: GeographicScope;
  state?: string;
  districts: string[];
  crisisType?: CrisisType;
  isCrisis: boolean;
  crisisPriority: number;
  lifecycle: AlertLifecycle;
  updatedAt: string;
  languages: ("ta" | "en" | "unknown")[];
  articleIds: string[];
  sourceCount: number;
  officialCount: number;
  independentCount: number;
  verificationStatus: VerificationStatus;
  /** Only explicit shared structured facts. Empty ⇒ show the "pending review" note. */
  commonGround: string[];
  commonGroundPending: boolean;
  differences: ClusterDifferenceRow[];
  unknowns: string[];
  cap?: CapMeta;
}

export type FeedHealth = "live" | "degraded" | "stale";

export interface LiveDataset {
  /** ISO timestamp of the run that produced this file. */
  generatedAt: string;
  /** Most recent successful fetch across all feeds (ISO), or null. */
  lastSuccessAt: string | null;
  health: FeedHealth;
  feeds: FeedStatus[];
  articles: LiveArticle[];
  clusters: LiveCluster[];
  counts: {
    activeCrisis: number;
    tamilNadu: number;
    india: number;
    comparisons: number;
    workingFeeds: number;
    failedFeeds: number;
  };
}
