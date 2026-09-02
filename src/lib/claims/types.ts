/**
 * IFA v0.3 — grounded claim intelligence.
 *
 * A Claim is a first-class, provenance-preserving representation of ONE
 * assertion made about a verified multi-source event. It is never a raw
 * extracted sentence: an attributed statement stays attributed, a single-source
 * report stays single-source, and nothing is promoted to "corroborated" unless
 * independent evidence supports it.
 */

export type ClaimStatus =
  | "corroborated"
  | "partially-corroborated"
  | "single-source"
  | "disputed"
  | "attributed"
  | "uncertain"
  | "outdated"
  | "retracted";

export type ClaimType =
  | "fact"
  | "event"
  | "statistic"
  | "attribution"
  | "official-statement"
  | "allegation"
  | "prediction"
  | "opinion"
  | "historical";

export type ExtractionMethod = "structured-feed" | "rule" | "model" | "manual";

export type ConfidenceBand = "high" | "moderate" | "low";

export interface ClaimProvenance {
  articleId: string;
  publisherId: string;
  sourceUrl: string;
  /** The sentence / clause the claim was drawn from, verbatim. */
  sourceText?: string;
  /** Original-language source text, when the article is not in English. */
  sourceTextOriginal?: string;
  language?: "ta" | "en" | "unknown";
  /** Who the source attributes the statement to ("Tamil Nadu CM", "police", "IMD"). */
  attribution?: string;
  extractionMethod: ExtractionMethod;
  /** 0–1 — how confident the extractor is that this provenance supports the claim. */
  confidence: number;
  seenAt: string;
}

/** A superseding update to a claim (developing story). */
export interface ClaimUpdate {
  at: string;
  publisherId: string;
  articleId: string;
  /** e.g. "injuryCount: 2 -> 4" */
  change: string;
  supersedes: boolean;
}

/** A publisher-issued correction to something earlier reported. */
export interface ClaimCorrection {
  publisherId: string;
  articleId: string;
  at: string;
  original: string;
  corrected: string;
}

export interface Claim {
  id: string;
  eventId: string;

  /** The canonical rendering of the assertion (English when available). */
  canonicalText: string;
  /** Original-language rendering, preserved when a source is in Tamil. */
  canonicalTextOriginal?: string;
  originalLanguage?: "ta" | "en";
  /** Language `canonicalText` is actually in (v0.4). */
  canonicalLanguage?: "ta" | "en";
  /** How `canonicalText` was produced from a non-English original. */
  translationMethod?: "none" | "dictionary" | "model" | "not-applicable";
  /** 0–1 confidence in the translation; undefined when translationMethod is n/a or none. */
  translationConfidence?: number;

  type: ClaimType;
  status: ClaimStatus;

  /** Lightweight structure — subjects/predicates/objects of the assertion. */
  subjects: string[];
  predicates: string[];
  objects: string[];

  supportingArticleIds: string[];
  contradictingArticleIds: string[];

  supportingPublisherIds: string[];
  /**
   * Groups of sources believed to be independent of each other. Two publishers
   * running the same wire copy are ONE group, not two confirmations.
   */
  independentSourceGroups: string[][];

  primaryEvidenceIds: string[];

  /** 0–100 numeric, plus the coarse band actually shown to readers. */
  confidence: number;
  confidenceBand: ConfidenceBand;
  /** Plain-English reasons for the status + confidence (structured, not model CoT). */
  rationale: string[];

  firstSeenAt: string;
  lastSeenAt: string;

  provenance: ClaimProvenance[];
  updates: ClaimUpdate[];
  corrections: ClaimCorrection[];

  notes: string[];
}

export type EvidenceType =
  | "government-alert"
  | "government-document"
  | "official-statement"
  | "weather-alert"
  | "public-record"
  | "research"
  | "dataset"
  | "other";

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  publisher: string;
  url: string;
  publishedAt?: string;
  supportsClaimIds: string[];
  /** Verbatim structured fields from the source (e.g. CAP severity/area/window). */
  provenance: Record<string, unknown>;
}

/** A claim disagreement between two sources — only genuine semantic conflicts. */
export interface ClaimDispute {
  field: string;
  a: { value: string; publisherIds: string[]; at: string };
  b: { value: string; publisherIds: string[]; at: string };
  reason: string;
  /** "numeric" | "temporal" | "categorical" */
  kind: "numeric" | "temporal" | "categorical";
  confidence: ConfidenceBand;
  /** True when the two values are separated in time (an update, not a conflict). */
  possiblyTemporalUpdate: boolean;
}

/** Everything IFA derived for one verified event. Attached to its LiveCluster. */
export interface EventClaims {
  eventId: string;
  generatedAt: string;
  claims: Claim[];
  evidence: Evidence[];
  disputes: ClaimDispute[];
  unknowns: string[];
  /** Independence breakdown for the whole event. */
  independence: {
    reports: number;
    distinctPublishers: number;
    independentGroups: number;
    possibleSyndicated: number;
    primarySources: number;
    /** Short honest label ("Two independent newsrooms", "Independence unclear"). */
    label?: string;
    /** Wire agencies actually credited in this event's coverage ("PTI", "Reuters"). */
    wireCredits?: string[];
    /** Pairs the engine could not classify as independent OR syndicated. */
    unknownPairs?: number;
  };
  /** Experimental Common Ground Index, computed from the claim layer. */
  cgi: {
    score: number;
    band: ConfidenceBand;
    drivers: { positive: string[]; negative: string[] };
  } | null;
}
