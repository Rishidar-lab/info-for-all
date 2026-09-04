/**
 * Coverage Discovery Engine — types (IFFA v0.13).
 *
 * DISCOVERY ≠ INGESTION. A `DiscoveryProvider` turns ONE known event into a set
 * of POSSIBLE related URLs plus their public metadata. IFFA never trusts,
 * ingests, or republishes them. Every candidate must survive:
 *
 *   canonicalise → publisher-resolve → SAME-EVENT identity (frozen engine)
 *   → dedupe (wire / verbatim / same-publisher) → source-family independence
 *
 * before it counts as coverage on a story.
 *
 * A discovery ORIGIN (GDELT, a publisher topic feed) is NOT the publisher and is
 * NEVER represented as corroboration. The publisher behind the discovered URL is
 * the publisher; the origin is provenance only.
 */
import type { CategoryId } from "@/lib/domain/categories";

// ─────────────────────────────────────────────────────────────────────────────
// The canonical event a provider searches coverage for
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoveryEvent {
  slug: string;
  title: string;
  category: CategoryId | string;
  scope: string;
  districts: string[];
  /** Strong named entities (people, orgs, bodies) from the frozen signature. */
  entities: string[];
  /** Canonical place names (districts, towns, dams, rivers). */
  places: string[];
  /** Numbers-with-units that identify the event ("1200 crore", "16 districts"). */
  numbers: string[];
  /** Date phrases the reporting anchors the event to. */
  dates: string[];
  /** ISO date (YYYY-MM-DD) the event is anchored to, for time-windowing. */
  anchorDate: string;
  languages: ("ta" | "en" | "unknown")[];
  /** Publishers already reporting this event in IFFA's corpus. */
  knownPublishers: string[];
  /** Genuine independent newsroom families already on the story (frozen resolver). */
  knownGenuineFamilies: number;
  /** True when the event has a Tamil Nadu tie (scope / district / TN publisher). */
  tamilNadu: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured search intents
// ─────────────────────────────────────────────────────────────────────────────

export type DiscoveryQueryClass =
  | "headline_core"
  | "entity_action"
  | "entity_place"
  | "entity_date"
  | "tamil_cross_language"
  | "english_cross_language"
  | "local_coverage"
  | "national_coverage"
  | "counter_response";

export interface DiscoveryQuery {
  cls: DiscoveryQueryClass;
  /** Provider-agnostic query text — built from the event graph, never a paraphrase. */
  text: string;
  language: "ta" | "en" | "any";
  /** ISO date the event is anchored to, for the provider's time window. */
  anchorDate: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider abstraction
// ─────────────────────────────────────────────────────────────────────────────

/** One possible related URL as a provider returned it. UNTRUSTED. */
export interface DiscoveryCandidate {
  /** As returned by the provider (may be a redirect / AMP / mobile URL). */
  url: string;
  /** Canonicalised (redirect-followed where safe, tracking params stripped). */
  canonicalUrl: string;
  title: string;
  /** Publisher / outlet name as the provider saw it; registry-resolved later. */
  source: string;
  /** Publisher domain, when the provider supplies one. */
  domain?: string;
  publishedAt?: string;
  language?: "ta" | "en" | "unknown";
  /** Short description / snippet ONLY when the provider lawfully supplies it. */
  snippet?: string;
  /** The provider that surfaced this candidate. */
  provider: string;
  /** The exact query text that surfaced it — stored for replay + audit. */
  query: string;
  discoveredAt: string;
}

export type DiscoveryProviderKind =
  | "news_index_api" // GDELT and similar public metadata indexes
  | "publisher_feed" // a publisher's own topic / section RSS
  | "corpus_rescan" // re-search of articles IFFA already ingested — no network
  | "official_api";

export interface DiscoveryProviderContext {
  /** No network — replay committed fixtures only. */
  offline: boolean;
  /** Directory holding `<providerId>/<queryHash>.json` fixtures. */
  fixtureDir: string;
  now: number;
  /** Full ingested article pool, for the corpus-rescan provider. */
  corpusArticles?: import("@/lib/live/types").LiveArticle[];
  /** Minimum ms between this provider's network calls (provider sets its own). */
  throttleMs?: number;
}

export interface DiscoveryProvider {
  id: string;
  kind: DiscoveryProviderKind;
  /** Does this provider touch the network? */
  network: boolean;
  /** Human-readable one-liner for the provider-audit doc + diagnostics. */
  description: string;
  /**
   * Set false to keep a provider in the tree but out of every run. Feature-gated
   * per provider so a legal / reliability problem with one never blocks the rest.
   */
  enabled: boolean;
  /** ONE event → possible related URLs. No trust, no ingestion. */
  discover(
    event: DiscoveryEvent,
    queries: DiscoveryQuery[],
    ctx: DiscoveryProviderContext,
  ): Promise<{ candidates: DiscoveryCandidate[]; notes: string[] }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Directive bridge types (v0.13 PHASE 2 contract names)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PHASE 2 contract: one untrusted provider hit.
 * Implemented by `DiscoveryCandidate` (richer: keeps raw + canonical URL,
 * domain, query provenance). This alias keeps the directive's name working.
 */
export type DiscoveryResult = DiscoveryCandidate;

/** Directive name for the provider-hit headline field. */
export type DiscoveryResultHeadline = DiscoveryCandidate["title"];

/**
 * PHASE 2 contract: a candidate after the same-event + independence gates.
 * Implemented by the pipeline as a `{ result, eventMatch, ... }` view over
 * the stored `DiscoveredReport` / `RejectedCandidate` rows.
 */
export type EventMatchVerdict = MatchVerdict;

export interface DiscoveryResolution {
  result: DiscoveryCandidate;
  eventMatch: MatchVerdict;
  identityReasons: string[];
  /** Registry / ownership family key the candidate resolves to. */
  sourceFamily: string;
  /** `DiscoveredSourceType` for admitted reports; "" while rejected. */
  independenceKind: DiscoveredSourceType | "";
  accepted: boolean;
  rejectionReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Same-event verification (frozen event-identity engine)
// ─────────────────────────────────────────────────────────────────────────────

export type MatchVerdict = "MATCH" | "NO_MATCH" | "UNCERTAIN";

export interface CandidateMatch {
  verdict: MatchVerdict;
  /** Best `decideIdentity` relation seen against any seed article. */
  relation: string;
  confidence: "high" | "moderate" | "low";
  /** 0–1 — the strongest same-event signal against the seed set. */
  score: number;
  reasons: string[];
  blockers: string[];
  /** Which seed article produced the best decision. */
  againstArticleId?: string;
  crossLanguage: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline output
// ─────────────────────────────────────────────────────────────────────────────

export type DiscoveredSourceType =
  | "independent" // its own newsroom, not a wire / echo / sister title
  | "wire" // carries a PTI / ANI / Reuters / AP credit
  | "syndication" // verbatim repost of another candidate
  | "same-family" // same corporate family as a publisher already on the story
  | "official-primary"
  | "unregistered"; // outlet not in IFFA's registry — independence unresolved

export interface DiscoveredReport {
  canonicalUrl: string;
  title: string;
  /** Publisher name (registry-resolved where possible). */
  publisher: string;
  /** Registry id, or "" when unregistered. */
  publisherId: string;
  registered: boolean;
  language: "ta" | "en" | "unknown";
  publishedAt?: string;
  /** Source-family key — reports sharing a key are ONE family. */
  familyKey: string;
  sourceType: DiscoveredSourceType;
  match: CandidateMatch;
  provider: string;
  query: string;
  discoveredAt: string;
}

export interface RejectedCandidate {
  canonicalUrl: string;
  title: string;
  source: string;
  stage: "canonicalise" | "identity" | "dedupe" | "independence" | "policy";
  reason: string;
  /** Present when identity ran. */
  verdict?: MatchVerdict;
}

export interface ClusterDiscovery {
  slug: string;
  generatedAt: string;
  /** Was discovery run for this cluster at all (eligibility gate)? */
  attempted: boolean;
  /** Why not, when `attempted` is false. */
  skippedReason?: string;
  queriesRun: number;
  providersRun: string[];
  candidatesFound: number;
  candidatesAdmitted: number;
  candidatesRejected: number;
  /** Same-event, deduped, independence-resolved reports NOT already on the story. */
  reports: DiscoveredReport[];
  rejected: RejectedCandidate[];
  /** Genuine independent newsroom families BEFORE discovery (frozen resolver). */
  familiesBefore: number;
  /** Genuine independent families AFTER folding in discovered `independent` reports. */
  familiesAfter: number;
  /** True when discovery took a single-family story to ≥2 genuine independent families. */
  rescued: boolean;
  /** Cross-language rescue directions observed (e.g. "en→ta"). */
  rescueLanguages: string[];
  notes: string[];
}

/** The committed discovery artifact — `src/data/generated/discovery.json`. */
export interface DiscoveryDataset {
  generatedAt: string;
  /** Provider ids that ran, with their mode. */
  providers: { id: string; network: boolean; mode: "online" | "offline-fixture" | "skipped" }[];
  bySlug: Record<string, ClusterDiscovery>;
  metrics: DiscoveryMetrics;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-rescue metrics — the v0.13 north star
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoveryMetrics {
  /** Routable clusters that started with ≤1 genuine independent newsroom. */
  singleSourceCandidates: number;
  /** Of those, the ones eligible for auto-discovery (priority-tier budget). */
  eligibleSingleSourceCandidates: number;
  discoveryAttempted: number;
  candidateArticlesFound: number;
  sameEventCandidates: number;
  uncertainCandidates: number;
  independentCandidates: number;
  rescuedClusters: number;
  /** rescuedClusters / eligibleSingleSourceCandidates. */
  coverageRescueRate: number;
  falseMatchRate: number;
  meanSourcesPerRescuedCluster: number;
  /** Independent-family distribution BEFORE discovery (all routable clusters). */
  familyDistributionBefore: Record<"1" | "2" | "3-5" | "6-10" | "11+", number>;
  /** Independent-family distribution AFTER discovery. */
  familyDistributionAfter: Record<"1" | "2" | "3-5" | "6-10" | "11+", number>;
  /** Cross-language rescue counts. */
  rescueByLanguage: Record<"ta->ta" | "ta->en" | "en->ta" | "en->en", number>;
}
