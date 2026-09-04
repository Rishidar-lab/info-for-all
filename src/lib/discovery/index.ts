/**
 * Coverage Discovery Engine (IFFA v0.13).
 *
 * When an important event appears with only one genuine independent newsroom,
 * IFFA actively discovers other independent coverage, verifies it describes the
 * SAME event (frozen identity engine), deduplicates wire / corporate /
 * press-release echoes, and gives the reader a defensible cross-source picture.
 *
 * DISCOVERY ≠ INGESTION. No article bodies are fetched, stored or republished.
 * No publisher access control (robots / auth / paywall / anti-bot) is bypassed.
 */
export type {
  DiscoveryEvent,
  DiscoveryQuery,
  DiscoveryCandidate,
  DiscoveryResult,
  DiscoveryResolution,
  EventMatchVerdict,
  DiscoveryProvider,
  DiscoveryProviderContext,
  CandidateMatch,
  MatchVerdict,
  DiscoveredReport,
  DiscoveredSourceType,
  RejectedCandidate,
  ClusterDiscovery,
  DiscoveryDataset,
  DiscoveryMetrics,
} from "./types";

export { buildDiscoveryEvent, buildDiscoveryQueries } from "./event-query";
export { buildDiscoveryEvent as buildDiscoveryEventFromCluster } from "./event-query";
export { verifySameEvent } from "./match";
export { canonicaliseUrl, isOpaqueRedirect, dedupeCandidates } from "./dedupe";
export { normalizeCandidate, normalizeCandidates } from "./normalize";
export { resolveOutlet, DISCOVERY_DOMAIN_MAP } from "./publisher-resolve";
export { resolveDiscoveredReports } from "./resolve";
export { discoverForCluster, discoveryEligibility } from "./pipeline";
export { computeDiscoveryMetrics } from "./metrics";
export { loadProviders } from "./providers";
export { mockProvider } from "./providers/mock";
