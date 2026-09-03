/**
 * IFFA Brief — a native, evidence-grounded explanation of a story (Ground-Parity
 * Milestone A).
 *
 * The product contract changed here. Earlier, the story page said "IFFA does not
 * write its own prose account". From this milestone IFFA DOES: for every
 * sufficiently-covered event it synthesises a readable brief in which EVERY
 * factual sentence is bound to the claims, sources and primary records that
 * support it, and any sentence that cannot be traced to the evidence is dropped
 * before publication (see ./verify.ts).
 *
 * Hard rules:
 *   - Synthesis is DETERMINISTIC and rule-based (./synthesize.ts). No language
 *     model is in the deployed path. An LLM adapter may be added later BEHIND
 *     ./synthesize.ts's interface; the core must work without it.
 *   - Original synthesis only. Sentence templates are IFFA's; article paragraphs
 *     are never copied wholesale — only short, attributed excerpts appear in
 *     `references`.
 *   - A press release is evidence that "the institution stated X", never that X
 *     is objectively true. Attribution is preserved end-to-end.
 *   - Tamil and English briefs are generated from the SAME selected facts and
 *     carry the SAME sentence ids / citations. The factual state is identical.
 *   - If the evidence is too thin, the brief is WITHHELD with a reason — never
 *     padded, never faked.
 */
import type { EvidenceRole } from "@/lib/live/types";

/** What a sentence is bound to. Empty on every axis ⇒ the sentence is dropped. */
export interface CitationBinding {
  /** Article ids in the cluster that support the sentence. */
  sourceIds: string[];
  /** Frozen-engine claim ids the sentence is derived from. */
  claimIds: string[];
  /** Primary-record (Evidence) ids the sentence rests on, if any. */
  evidenceIds: string[];
}

export type BriefSupport = "STRONG" | "MODERATE" | "LIMITED" | "DISPUTED";

export interface BriefSentence {
  id: string;
  text: string;
  citations: CitationBinding;
  support: BriefSupport;
  /** Set on attributed sentences — the named speaker the statement belongs to. */
  attributedTo?: string;
}

/** An uncertainty / open question. Grounded in the frozen engine's own derivation. */
export interface BriefUncertainty {
  id: string;
  text: string;
  /** Where this open question came from — the engine derived it from evidence. */
  derivedFrom: "event-state" | "claim-unknowns" | "single-source" | "no-corroboration";
  citations: CitationBinding;
}

export interface BriefDisagreementPosition {
  value: string;
  sourceIds: string[];
  publishers: string[];
  at?: string;
}

export interface BriefDisagreement {
  topic: string;
  positions: BriefDisagreementPosition[];
  /** The currently best-supported value. NOT a claim of truth. */
  bestSupported?: string;
  reasoning?: string;
  /** True when the split looks like a later update rather than a live conflict. */
  possiblyTemporalUpdate: boolean;
}

export interface BriefReference {
  sourceId: string;
  publisher: string;
  title: string;
  url: string;
  publishedAt: string;
  language: "ta" | "en" | "unknown";
  /** "Official alert" | "Primary document" | "News report" | "Fact-check" | … */
  roleLabel: string;
  evidenceRole: EvidenceRole | "primary-record";
  /** Frozen-engine claim ids this reference supports. */
  supportsClaimIds: string[];
  /** A short, permissible excerpt — never the full article. */
  excerpt?: string;
  isPrimaryRecord: boolean;
}

export type BriefWithholdReason =
  | "COLLECTING"
  | "NO_INDEPENDENT_COVERAGE"
  | "INSUFFICIENT_EVIDENCE"
  | "NO_VERIFIABLE_SENTENCE";

export interface BriefCoverage {
  sources: number;
  families: number;
  tamil: number;
  english: number;
  official: number;
  primaryDocs: number;
}

export interface BriefVerification {
  sentencesConsidered: number;
  sentencesDropped: number;
  dropReasons: string[];
}

export interface IFFABrief {
  eventId: string;
  slug: string;
  generatedAt: string;
  language: "en" | "ta";
  category: string;
  /** IFFA's cleaned working headline for the event. */
  headline: string;
  /** The event's dominant location, when there is one. */
  place?: string;

  shortVersion: BriefSentence[];
  keyFacts: BriefSentence[];
  uncertainties: BriefUncertainty[];
  whyItMatters: BriefSentence[];
  whatChanged: BriefSentence[];
  disagreements: BriefDisagreement[];
  references: BriefReference[];

  withheldReason?: BriefWithholdReason;
  withheldDetail?: string;

  coverage: BriefCoverage;
  verification: BriefVerification;
  synthesizer: "deterministic-v1";
}

/** Compact form for home cards / list shards. */
export interface MicroBrief {
  slug: string;
  /** ~30–60 words, citation markers stripped to [n]. Empty when withheld. */
  text: string;
  /** Reference count backing the micro-brief. */
  citationCount: number;
  withheld: boolean;
  withheldReason?: BriefWithholdReason;
  coverage: BriefCoverage;
}

// ─────────────────────────────────────────────────────────────────────────────
// Perspective Compare (first version — Milestone A)
// ─────────────────────────────────────────────────────────────────────────────

export interface PerspectiveCohort {
  cohort: string;
  sampleSize: number;
  emphasis: string[];
  /** Corroborated claims this cohort's headlines leave out. */
  omittedCorroboratedClaims: string[];
}

export interface PerspectiveCompare {
  slug: string;
  sharedFactualCore: string[];
  tamilMediaEmphasis: string[];
  englishMediaEmphasis: string[];
  officialSourcesEmphasis: string[];
  localMediaEmphasis: string[];
  nationalMediaEmphasis: string[];
  /** Only present when observed-alignment calibration + sample gates are met. */
  politicalCohorts?: PerspectiveCohort[];
  /** Why a dimension is not shown (e.g. political alignment: insufficient data). */
  insufficientDataReasons: string[];
  /** True when there is at least one usable cross-perspective contrast. */
  hasContrast: boolean;
}
