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
  /** Organisation, so "distinct sources" counts publishers, not feeds. */
  publisher: string;
  role: "official" | "independent" | "specialist";
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

  // ── v0.8 source-health detail ──
  /** HEALTHY | DEGRADED | STALE | FAILED | DISABLED — a richer view than `status`. */
  health?: "healthy" | "degraded" | "stale" | "failed" | "disabled";
  /** HTTP status of the last fetch, or a short error class. */
  httpState?: string;
  /** Raw items the parser saw. */
  itemsSeen?: number;
  /** Items that passed normalisation. */
  itemsAccepted?: number;
  /** Items rejected by normalisation (bad URL / date / too short). */
  itemsRejected?: number;
  /** Publication time of the newest item this feed has ever produced. */
  lastItemAt?: string;
  /** Median minutes between an item's publication and IFFA fetching it, if measurable. */
  medianLagMinutes?: number;
  /** Consecutive failed runs (carried across runs). */
  consecutiveFailures?: number;
}

export interface ClusterDifferenceRow {
  field: string;
  observations: { sourceName: string; value: string }[];
}

/** How sure IFA is that a multi-article cluster is really one event. */
export type ClusterConfidence = "strong" | "probable" | "weak";

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
  /** Distinct publishers in this cluster (the number that matters for comparison). */
  distinctPublishers: number;
  publishers: string[];
  /** Kept for continuity; equals distinctPublishers. */
  sourceCount: number;
  officialCount: number;
  independentCount: number;
  verificationStatus: VerificationStatus;
  confidence: ClusterConfidence;
  /** Human-readable justification for why these articles are one cluster. */
  reason: string;
  /** True when 2+ distinct publishers AND confidence is strong/probable. */
  isVerifiedComparison: boolean;
  /** Only explicit shared structured facts. Empty ⇒ show the "pending review" note. */
  commonGround: string[];
  commonGroundPending: boolean;
  differences: ClusterDifferenceRow[];
  unknowns: string[];
  cap?: CapMeta;
  /**
   * v0.3 grounded claim intelligence — structured, provenance-preserving claims
   * derived from this event's coverage. Present only for clusters where it is
   * meaningful (2+ articles, a crisis, or an official alert). See
   * `src/lib/claims/`.
   */
  claims?: import("../claims/types").EventClaims;
  /**
   * v0.5 event-identity — the semantic decisions that joined (or explain the
   * shape of) this cluster, and cross-cluster relationships (PART_OF / FOLLOW_UP
   * / RELATED). Used by the cluster-audit view.
   */
  identity?: {
    /** How each cross-publisher pair inside the cluster was decided. */
    edges: {
      a: string;
      b: string;
      relation: "same" | "related" | "part-of" | "follow-up" | "different" | "uncertain";
      confidence: "high" | "moderate" | "low";
      via: "lexical" | "semantic";
      reason: string;
      blockers: string[];
    }[];
    /** Relationships to OTHER clusters (not merged). */
    related: { otherClusterId: string; relation: "part-of" | "follow-up" | "related"; reason: string }[];
  };

  /**
   * v0.7 Trend Intelligence enrichment (category, geo tier, trend score,
   * independence summary, first-seen, timeline). Written by
   * `src/lib/trends/enrich.ts` during ingestion.
   */
  trendData?: ClusterTrendData;
}

export type FeedHealth = "live" | "degraded" | "stale" | "empty";

/**
 * v0.7 Trend Intelligence enrichment, written onto each cluster by
 * `src/lib/trends/enrich.ts` during ingestion. Optional so the UI stays robust
 * to a snapshot generated before v0.7.
 */
export interface ClusterTrendData {
  /** IFFA news domain — CategoryId from src/lib/domain/categories.ts. */
  category?: string;
  categoryReason?: string;
  /** v0.8 — cross-domain context (e.g. a budget story is finance + politics). */
  secondaryCategories?: string[];
  /** v0.8 — STRONG | MODERATE | WEAK | UNKNOWN (not a probability). */
  categoryConfidence?: string;
  /** v0.8 — the signals that drove the classification. */
  categorySignals?: string[];
  /** v0.9 — structured per-category evidence (primary + each secondary). */
  categoryEvidence?: {
    category: string;
    role: "primary" | "secondary";
    score: number;
    distinctiveSignals: number;
    keywordHits: number;
    signals: string[];
  }[];
  /** Geo priority tier — GeoTier from src/lib/domain/geo-tiers.ts. */
  geoTier?: string;
  /** TrendSignal from src/lib/trends/types.ts (kept loose here to avoid a circular import). */
  trend?: {
    score: number;
    state: string;
    noveltyClass: string;
    recencyScore: number;
    velocityScore: number;
    sourceDiversityScore: number;
    geoScore: number;
    categoryScore: number;
    consequenceScore: number;
    noveltyScore: number;
    corroborationScore: number;
    windows: { m15: number; h1: number; h3: number; h6: number; h12: number; h24: number };
    acceleration: number;
    explanation: string[];
  };
  independence?: {
    families: number;
    reports: number;
    syndicated: number;
    wireCredits: string[];
    label: string;
  };
  firstSeenAt?: string;
  lastSeenAt?: string;
  lastMeaningfulUpdateAt?: string;
  timeline?: {
    at: string;
    sourceName: string;
    publisher: string;
    language: "ta" | "en" | "unknown";
    headline: string;
    addedNewFact: boolean;
    official: boolean;
  }[];
  /** v0.8 — claim-aware novelty: exactly what changed since the previous snapshot. */
  novelty?: {
    updateKind: string;
    meaningfulUpdateScore: number;
    /** v0.9 — NONE | MINOR | MEANINGFUL | MAJOR | CRITICAL (development, not importance). */
    updateSignificance?: string;
    changes: string[];
  };
  /** v0.9 — the compact canonical current state of the event (Event State v3). */
  eventState?: {
    confirmedFacts: string[];
    disputedClaims: string[];
    counterClaims?: string[];
    latestNumbers: string[];
    affectedLocations: string[];
    officialActions: string[];
    corrections?: string[];
    resolvedQuestions?: string[];
    openQuestions?: string[];
    unresolvedQuestions: string[];
    whatChangedSincePreviousSnapshot?: string[];
    updateSignificance?: string;
    lastMeaningfulUpdateAt: string;
  };
  /** v0.8 — EVENT severity (how bad the event is), NOT a probability of truth. */
  severity?: {
    level: "informational" | "watch" | "significant" | "severe" | "critical";
    reason: string;
    peak: { deaths: number; injured: number; evacuated: number };
  };
  /**
   * v0.9 — EDITORIAL priority: a ranking score deciding PROMINENCE. NOT a
   * probability of truth / reliability. Every factor and penalty is exposed.
   */
  editorial?: {
    score: number;
    band: "urgent" | "high" | "standard" | "background" | "suppressed";
    factors: { name: string; value: number; weight: number; contribution: number }[];
    reasons: string[];
    penalties: { name: string; amount: number; reason: string }[];
    suppressedByRule?: string;
  };
}

export interface SituationSnapshot {
  tamilNadu: "normal" | "watch" | "elevated" | "crisis";
  india: "normal" | "watch" | "elevated" | "crisis";
  derivedFrom: { slug: string; title: string; tier: string; level: string }[];
  generatedAt: string;
}

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
    /** Verified multi-source comparisons only (2+ publishers, strong/probable). */
    comparisons: number;
    singleReports: number;
    /** Multi-article pairings that did NOT meet the comparison bar. */
    weakMatchesRejected: number;
    distinctPublishers: number;
    workingFeeds: number;
    failedFeeds: number;
    /** v0.7 — cluster count per IFFA news domain. */
    byCategory?: Record<string, number>;
  };
  /** v0.7 — cluster slugs, trend-ranked. Present once the trend engine has run. */
  trending?: string[];
  /** v0.7 — cluster slugs that matter but lack the evidence to be "trending" yet. */
  watching?: string[];
  /** v0.7 — the Current Situation bar. */
  situation?: SituationSnapshot;
  /**
   * v0.9 — editorial surfaces (which events deserve prominence). The home page
   * reads these, not raw trend order.
   */
  editorial?: {
    urgent: string[];
    rightNow: string[];
    fastRising: string[];
    tamilNadu: string[];
    india: string[];
    byCategory: Record<string, string[]>;
    watching: string[];
    background: string[];
    bands: Record<string, number>;
    concentrationNotes: string[];
  };
}
