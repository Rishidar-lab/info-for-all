/**
 * Coverage Discovery Engine — types (Milestone B.3 Phase 2).
 *
 * DISCOVERY ≠ INGESTION. A `CoverageDiscoveryAdapter` turns ONE known event into
 * a set of POSSIBLE related URLs. It never trusts or ingests them. Every
 * candidate must then survive canonicalisation → publisher resolution → event
 * identity → time / entity compatibility → dedupe → source-family resolution
 * before it joins a story (Phase 8).
 *
 * A discovery origin (GDELT, a search index) is NOT the publisher and is NEVER
 * represented as corroboration. The publisher behind the discovered URL is the
 * publisher.
 */

/** One possible related URL, as returned by an adapter. Untrusted. */
export interface DiscoveryCandidate {
  url: string;
  title: string;
  /** Domain / outlet name as the adapter saw it — resolved to a registry publisher later. */
  source: string;
  publishedAt?: string;
  language?: string;
  snippet?: string;
  adapter: string;
  /** The exact query string that surfaced this candidate — stored for replay. */
  query: string;
  discoveredAt: string;
}

export type DiscoveryQueryClass =
  | "headline_core"
  | "entity_action"
  | "entity_location"
  | "entity_date"
  | "tamil_entity_action"
  | "english_entity_action"
  | "local_coverage"
  | "national_coverage"
  | "counterclaim"
  | "factcheck";

export interface DiscoveryQuery {
  cls: DiscoveryQueryClass;
  /** The provider-agnostic query text. */
  text: string;
  language: "ta" | "en" | "any";
  /** ISO date the event is anchored to, for time-windowing. */
  anchorDate?: string;
}

/** The canonical event description an adapter discovers coverage for. */
export interface DiscoveryEvent {
  slug: string;
  title: string;
  category: string;
  scope: string;
  districts: string[];
  entities: string[];
  places: string[];
  numbers: string[];
  dates: string[];
  anchorDate: string;
  languages: ("ta" | "en" | "unknown")[];
  /** publishers already reporting this event in IFFA's corpus. */
  knownPublishers: string[];
}

export interface DiscoveryAdapterContext {
  offline: boolean;
  fixtureDir: string;
  now: number;
}

export interface CoverageDiscoveryAdapter {
  id: string;
  network: boolean;
  /** ONE event → possible related URLs. No trust, no ingestion. */
  discover(event: DiscoveryEvent, queries: DiscoveryQuery[], ctx: DiscoveryAdapterContext): Promise<DiscoveryCandidate[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch policy (Phase 7)
// ─────────────────────────────────────────────────────────────────────────────

export type FetchPolicyOutcome =
  | "ALLOW_METADATA" // title / date / domain only
  | "ALLOW_VERIFICATION_TEXT" // full text may be fetched, VERIFICATION-ONLY, never republished
  | "RSS_ONLY" // use the publisher's own feed, not a page fetch
  | "DISCOVERY_ONLY" // record the URL exists; do not fetch anything
  | "BLOCKED_POLICY"
  | "BLOCKED_ROBOTS"
  | "BLOCKED_AUTH"
  | "BLOCKED_PAYWALL"
  | "BLOCKED_ANTIBOT"
  | "UNKNOWN"; // default — do NOT fetch full text

export interface FetchDecision {
  outcome: FetchPolicyOutcome;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline output (Phase 8)
// ─────────────────────────────────────────────────────────────────────────────

/** A discovered report that survived validation and matched the event. */
export interface DiscoveredReport {
  url: string;
  title: string;
  publisher: string;
  /** registry publisher id, or "" when the outlet is not in IFFA's registry. */
  publisherId: string;
  registered: boolean;
  language: "ta" | "en" | "unknown";
  publishedAt?: string;
  sourceFamily: string;
  /** 0–1 event-identity confidence this is the same event. */
  matchScore: number;
  matchConfidence: "high" | "moderate" | "low";
  adapter: string;
  query: string;
  fetchOutcome: FetchPolicyOutcome;
  discoveredAt: string;
}

export interface RejectedCandidate {
  url: string;
  title: string;
  source: string;
  reason: string;
}

export interface DiscoveryResult {
  slug: string;
  generatedAt: string;
  queriesRun: number;
  candidatesFound: number;
  candidatesAdmitted: number;
  candidatesRejected: number;
  /** same-event reports, deduped, diversity-reranked. */
  reports: DiscoveredReport[];
  rejected: RejectedCandidate[];
  /** genuine independent families before / after (registered publishers only). */
  familiesBefore: number;
  familiesAfter: number;
  /** provider-level notes (e.g. "gdelt: unreachable"). */
  notes: string[];
}
