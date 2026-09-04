/**
 * IFFA v0.13 — deterministic discovery query generation.
 *
 * Directive name for this module is `src/lib/discovery/query.ts`.
 * The implementation lives in `event-query.ts` (event graph → structured
 * intents); this module is the stable public surface the pipeline, the
 * gold set and the unit tests import.
 *
 * Contract (PHASE 3):
 *   - input: headline · entities · district/state · event action/type · date ·
 *     important quantities · org/person names · Tamil + English semantic
 *     representations (via the existing Tamil infrastructure — never invented
 *     translations).
 *   - output: ~2–6 GOOD queries (cap 8 for rich events), never 40 noisy ones.
 *   - Tamil stories produce BOTH a Tamil query and an English semantic query
 *     where adequate signals exist.
 *   - queries are deduplicated · stable (same event → same list) · ordered ·
 *     testable · stored on the discovery run (see `ClusterDiscovery.queriesRun`
 *     + provider `query` provenance on every candidate).
 */
export { buildDiscoveryEvent, buildDiscoveryQueries } from "./event-query";
export type { DiscoveryEvent, DiscoveryQuery, DiscoveryQueryClass } from "./types";
