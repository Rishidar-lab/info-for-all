/**
 * Media Landscape Intelligence — typed models (v0.10).
 *
 * IFFA's job in this layer: for any story, show WHO is reporting it, WHO is not,
 * WHO owns those sources, HOW their framing differs, WHICH claims agree, WHICH
 * are disputed, and WHICH have primary evidence.
 *
 * Hard rules encoded here (see docs/METHODOLOGY.md):
 *   - Ownership is metadata. It never determines bias. Every assertion carries
 *     provenance. UNKNOWN is valid and common. Never inferred.
 *   - There is NO single bias score. Alignment is a set of separate, evidence-
 *     backed observations, and it is entity-specific and corpus-derived — never
 *     a US left/right axis.
 *   - External ratings and IFFA-observed metrics are ALWAYS kept in separate,
 *     labelled fields. They are never blended.
 *   - Reliability is not a "truth score". Bias is not falsehood.
 *   - Sample size is always exposed. Below the minimum, alignment is withheld.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Ownership
// ─────────────────────────────────────────────────────────────────────────────

export type OwnershipCategory =
  | "INDEPENDENT"
  | "MEDIA_CONGLOMERATE"
  | "CORPORATION"
  | "GOVERNMENT"
  | "INDIVIDUAL"
  | "TRUST_FOUNDATION"
  | "POLITICAL_ORGANISATION"
  | "PUBLIC_BROADCASTER"
  | "OTHER"
  | "UNKNOWN";

export type FundingType =
  | "advertising"
  | "subscription"
  | "mixed-commercial"
  | "public-funding"
  | "grant-philanthropy"
  | "government-budget"
  | "party-funded"
  | "unknown";

/** Provenance for a single ownership assertion. Required — nothing is inferred. */
export interface OwnershipProvenance {
  /** Where this was read from — a filing, an about page, a regulator, a report. */
  source: string;
  /** URL of that source, when public. */
  url?: string;
  /** ISO date the assertion was last checked against the source. */
  verifiedAt: string;
  /** How confident IFFA is that this is current and correct. */
  confidence: "high" | "moderate" | "low";
  /** Anything qualifying the assertion (e.g. "structure changed in 2024"). */
  note?: string;
}

export interface PublisherOwnership {
  category: OwnershipCategory;
  /** The directly-owning entity, if known. */
  owner?: string;
  /** The parent above the owner, if known. */
  parent?: string;
  /** The ultimate controlling entity, if known. */
  ultimateParent?: string;
  fundingType: FundingType;
  provenance: OwnershipProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source families / relationships
// ─────────────────────────────────────────────────────────────────────────────

export interface SourceFamily {
  id: string;
  /** Display name of the family (usually the parent/owner). */
  name: string;
  /** Publisher ids in this family. */
  publisherIds: string[];
  /** Why they are one family — shared owner, shared newsroom, wire syndication. */
  reason: "shared-owner" | "shared-newsroom" | "wire-syndication" | "co-published";
}

export interface SourceRelationship {
  a: string;
  b: string;
  relation: "same-owner" | "same-parent" | "syndication-partner" | "content-sharing" | "competitor" | "unrelated";
  provenance?: OwnershipProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// External ratings (attributed, never invented)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExternalBiasRating {
  /** The rating organisation — always shown with the rating. */
  provider: string;
  providerUrl?: string;
  /** The provider's own label, reproduced verbatim (do not normalise away nuance). */
  rating: string;
  /** The provider's own scale description, when available. */
  scale?: string;
  /** A factuality/reliability label from the same provider, if it publishes one. */
  factuality?: string;
  /** ISO date this rating was recorded from the provider. */
  recordedAt: string;
  methodologyUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// IFFA observed metrics (corpus-derived — separate from external ratings)
// ─────────────────────────────────────────────────────────────────────────────

export type SampleBand = "INSUFFICIENT" | "LOW_CONFIDENCE" | "MODERATE_SAMPLE" | "SUBSTANTIAL_SAMPLE";

/** Thresholds are documented and adjustable — see MIN_SAMPLE in ./alignment.ts. */
export interface SampleContext {
  /** Number of evaluable items behind the metric. */
  n: number;
  band: SampleBand;
  /** Observation window this was computed over. */
  window: "7d" | "30d" | "90d" | "all";
  /** ISO timestamp of the snapshot this was last computed from. */
  computedAt: string;
}

export type CoverageStance = "supportive" | "critical" | "neutral-descriptive" | "mixed" | "unclear";

/** How one publisher covered one political entity over a window. */
export interface EntityAlignmentObservation {
  entityId: string;
  entityName: string;
  articleCount: number;
  evaluatedArticleCount: number;
  supportiveCoverage: number; // fraction 0–1 of evaluated
  criticalCoverage: number;
  neutralDescriptiveCoverage: number;
  mixedCoverage: number;
  unclearCoverage: number;
  sample: SampleContext;
}

export interface StorySelectionObservation {
  /** Topic / entity this deviation is about. */
  subject: string;
  /** This publisher's share of its output on the subject. */
  publisherShare: number;
  /** The cross-source corpus share on the subject. */
  corpusShare: number;
  /** publisherShare − corpusShare. Positive = over-covers; negative = under-covers. */
  deviation: number;
  sample: SampleContext;
}

/** A publisher's full observed-alignment record. */
export interface ObservedAlignment {
  publisherId: string;
  window: "7d" | "30d" | "90d";
  entities: EntityAlignmentObservation[];
  storySelection: StorySelectionObservation[];
  /** Mean headline-framing divergence from the cross-source factual core, 0–1. */
  headlineFramingDivergence: number | null;
  /** Diversity of actors/institutions quoted, 0–1 (higher = more balanced). */
  quotationDiversity: number | null;
  /** Fraction of widely-corroborated event claims this publisher omitted, 0–1. */
  claimOmissionRate: number | null;
  /** Fraction of this publisher's headlines with loaded/absolute language, 0–1. */
  sensationalismRate: number | null;
  sample: SampleContext;
  /** A one-line, non-motive-attributing summary. */
  note: string;
}

/** IFFA-observed reliability signals. NOT a truth score. NOT external ratings. */
export interface ReliabilityObservation {
  publisherId: string;
  /** Fraction of this publisher's claims that cite a primary document, 0–1. */
  primarySourceUsage: number | null;
  /** Mean identifiable-support count per substantive claim. */
  citationDensity: number | null;
  /** Fraction of attributed claims that keep a named speaker, 0–1. */
  attributionQuality: number | null;
  /** Fraction of headlines with loaded/emotional/absolute language, 0–1. */
  sensationalismRate: number | null;
  /** Rate at which this publisher's claims are later contradicted by the corpus. */
  historicalContradictionRate: number | null;
  /** Rate of rendered claims with no identifiable support, 0–1. */
  unsupportedClaimRate: number | null;
  /** Count of recorded corrections/retractions attributed to this publisher. */
  correctionCount: number;
  sample: SampleContext;
}

export interface CorrectionObservation {
  publisherId: string;
  clusterSlug: string;
  claimId?: string;
  at: string;
  kind: "correction" | "retraction" | "superseded";
  summary: string;
  sourceUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Publisher profile
// ─────────────────────────────────────────────────────────────────────────────

export interface ReliabilityProfile {
  /** External factuality labels, each attributed to its provider. */
  externalFactuality: ExternalBiasRating[];
  /** IFFA-observed reliability, or null when there is not enough evidence. */
  observed: ReliabilityObservation | null;
}

export interface PublisherProfile {
  id: string;
  name: string;
  domain: string;
  languages: ("ta" | "en" | "mixed")[];
  regions: ("tamil-nadu" | "india" | "kerala" | "global")[];
  /** Sub-state locality when the publisher is district/city-specific. */
  locality?: string;
  ownership: PublisherOwnership;
  parentCompany?: string;
  owner?: string;
  fundingType: FundingType;
  /** External bias/reliability ratings — always attributed, may be empty. */
  externalRatings: ExternalBiasRating[];
  /** IFFA-observed alignment per window, or null until sufficiently sampled. */
  observedAlignment: {
    "7d": ObservedAlignment | null;
    "30d": ObservedAlignment | null;
    "90d": ObservedAlignment | null;
  };
  reliabilityProfile: ReliabilityProfile;
  sourceFamilyId: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  articleCount: number;
  /** Publisher kind, from the feed registry. */
  kind: "newspaper" | "digital_native" | "public_broadcaster" | "official" | "data_feed" | "wire" | "other";
  official: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-cluster coverage landscape
// ─────────────────────────────────────────────────────────────────────────────

export type AlignmentGroupId = "government-favourable" | "mixed-unclear" | "government-critical" | "entity-specific";

export interface AlignmentGroup {
  id: AlignmentGroupId;
  label: string;
  /** Publisher ids placed in this group for THIS story. */
  publisherIds: string[];
  /** Fraction of the cluster's articles from this group, 0–1. */
  share: number;
}

export interface CoverageLandscape {
  totalArticles: number;
  uniquePublishers: number;
  independentSourceFamilies: number;
  languages: ("ta" | "en" | "unknown")[];
  tamilCount: number;
  englishCount: number;
  regionalCount: number;
  nationalCount: number;
  officialCount: number;
  alternativeMediaCount: number;
  /** Distribution of articles by owning-entity category. */
  ownershipDistribution: Record<OwnershipCategory, number>;
  /** Distribution of articles by external-factuality band (or "unrated"). */
  reliabilityDistribution: Record<string, number>;
  /** Alignment groups for this story, or null when no defensible grouping exists. */
  alignment: AlignmentGroup[] | null;
  /** Why alignment is null, when it is. */
  alignmentUnavailableReason?: string;
  languageDistribution: Record<string, number>;
  localityDistribution: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Framing / headline comparison
// ─────────────────────────────────────────────────────────────────────────────

export type HeadlineEmphasis =
  | "government-action"
  | "political-causation"
  | "opposition-pressure"
  | "measurement-data"
  | "human-impact"
  | "conflict-dispute"
  | "process-procedure"
  | "reaction-quote"
  | "accusation"
  | "outcome-result"
  | "uncategorised";

export interface FramingObservation {
  articleId: string;
  publisherId: string;
  headline: string;
  language: "ta" | "en" | "unknown";
  /** Where this article sits on the story's relevant stance axis. */
  stance: CoverageStance;
  emphasis: HeadlineEmphasis[];
  /** Loaded/absolute/emotional headline phrases detected (verbatim). */
  loadedPhrases: string[];
  /** Widely-corroborated claims from the cluster that this article's headline omits. */
  omittedKeyClaims: string[];
}

export interface FramingComparison {
  observations: FramingObservation[];
  /** Facts every framing shares (from the claim engine's corroborated set). */
  sharedFactualCore: string[];
  /** The distinct framing choices, described neutrally. */
  framingDifferences: string[];
  /** Claims that appear in only one source. */
  uniqueClaims: { claim: string; publisherId: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Blindspots (coverage asymmetry ≠ truth)
// ─────────────────────────────────────────────────────────────────────────────

export type BlindspotType =
  | "POLITICAL_COVERAGE"
  | "LANGUAGE"
  | "REGIONAL"
  | "OWNERSHIP"
  | "SOURCE_FAMILY";

/** How much statistical support a blindspot label has (v0.11 Phase J). */
export type BlindspotConfidence = "INSUFFICIENT_COVERAGE" | "POSSIBLE_ASYMMETRY" | "CLEAR_ASYMMETRY";

export interface Blindspot {
  type: BlindspotType;
  /** e.g. "Tamil-language" or "government-critical aligned" or "Kasturi & Sons". */
  overCoveredGroup: string;
  overCoveredCount: number;
  underCoveredGroup: string;
  underCoveredCount: number;
  /** overCovered / max(underCovered, 1) — the asymmetry ratio. */
  ratio: number;
  /**
   * v0.11 — how strong the evidence is. Below a minimum publisher / family
   * count the label is INSUFFICIENT_COVERAGE ("primarily a local story", not a
   * blindspot claim). No dramatic label without statistical support.
   */
  confidence: BlindspotConfidence;
  /** A neutral, one-line description. Always ends with the asymmetry-≠-truth note. */
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Claim evidence matrix (IFFA's differentiator)
// ─────────────────────────────────────────────────────────────────────────────

export type ClaimEvidenceStatus =
  | "HIGHLY_CORROBORATED"
  | "CORROBORATED"
  | "PARTIALLY_CORROBORATED"
  | "SINGLE_SOURCE"
  | "DISPUTED"
  | "UNVERIFIED"
  | "CORRECTED"
  | "RETRACTED"
  | "SUPERSEDED";

export type PrimaryEvidenceKind =
  | "government-order"
  | "court-judgment"
  | "election-result"
  | "rbi-release"
  | "sebi-order"
  | "official-dataset"
  | "weather-bulletin"
  | "company-filing"
  | "sports-governing-body-result"
  | "police-release"
  | "official-statement"
  | "other-primary";

export interface PrimaryEvidenceRef {
  kind: PrimaryEvidenceKind;
  authority: string;
  /** What the document establishes — "the institution stated X", not "X is true". */
  establishes: string;
  url?: string;
  articleId?: string;
}

export interface FactCheckRef {
  factChecker: string;
  factCheckerUrl?: string;
  verdict: string;
  claim: string;
  publishedAt: string;
  methodologyRef?: string;
  matchedClaim: string;
  matchConfidence: "high" | "moderate" | "low";
}

export interface ClaimEvidence {
  claimId: string;
  canonicalClaim: string;
  claimType: string;
  entities: string[];
  numbers: string[];
  time?: string;
  location?: string;
  supportingArticles: string[];
  contradictingArticles: string[];
  primaryEvidence: PrimaryEvidenceRef[];
  officialStatements: PrimaryEvidenceRef[];
  factChecks: FactCheckRef[];
  sourceFamilies: string[];
  independentSupportCount: number;
  independentContradictionCount: number;
  status: ClaimEvidenceStatus;
}

/** Counts, not a percentage-true. Displayed as-is. */
export interface EvidenceProfile {
  substantiveClaims: number;
  byStatus: Record<ClaimEvidenceStatus, number>;
  independentFamilies: number;
  primaryDocumentSupported: number;
  corrections: number;
}

/**
 * An OPTIONAL internal aggregate. NOT a truth probability. Every component is
 * exposed. It is not rendered as "X% true" anywhere until a calibration study
 * proves it is probabilistically calibrated.
 */
export interface EvidenceStrengthScore {
  /** 0–100, internal ranking use only. */
  score: number;
  components: {
    independentCorroboration: number;
    primaryEvidence: number;
    sourceReliability: number;
    claimAgreement: number;
    contradictionPenalty: number;
    singleSourcePenalty: number;
    correctionPenalty: number;
  };
  /** Explicit disclaimer carried with the number wherever it is stored. */
  disclaimer: "Evidence strength — an internal ranking of how well-supported the claims are. NOT a probability that the story is true.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Public discourse (never counts as factual corroboration)
// ─────────────────────────────────────────────────────────────────────────────

export type DiscoursePlatform = "reddit" | "youtube" | "podcast" | "public-social" | "forum" | "livestream";

export interface DiscourseMention {
  id: string;
  platform: DiscoursePlatform;
  /** Channel / subreddit / author handle — a source, not a person's identity. */
  channel: string;
  url: string;
  publishedAt: string;
  /** Public engagement metadata, when available. Never used for scoring. */
  engagement?: { score?: number; comments?: number; views?: number };
  title: string;
  text?: string;
  /** Cluster slug this mention was matched to, if any. */
  matchedEventSlug?: string;
  /** Claims asserted in the mention (extracted, not verified). */
  claims: string[];
  /** Evidence ids this mention links to, if any. */
  linkedEvidence: string[];
  stance: CoverageStance;
  language: "ta" | "en" | "unknown";
}

/** A claim seen repeatedly in discourse but not in news / primary sources. */
export interface EmergingClaim {
  claim: string;
  discourseMentions: number;
  distinctChannels: number;
  newsReports: number;
  primarySources: number;
  independentVerifiedReports: number;
  firstSeenAt: string;
  /** Always "EMERGING / UNVERIFIED PUBLIC CLAIM" until it gains real corroboration. */
  label: "EMERGING_UNVERIFIED";
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrichment bundle attached to a cluster
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaLandscape {
  coverage: CoverageLandscape;
  framing: FramingComparison;
  blindspots: Blindspot[];
  evidence: ClaimEvidence[];
  evidenceProfile: EvidenceProfile;
  evidenceStrength: EvidenceStrengthScore | null;
  discourse: DiscourseMention[];
  emergingClaims: EmergingClaim[];
}
