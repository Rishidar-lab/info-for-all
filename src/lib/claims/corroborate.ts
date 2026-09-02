/**
 * Publication count is NOT independent-corroboration count.
 *
 * The classification logic now lives in `src/lib/independence/` (v0.4): every
 * pair of articles gets an explicit relation — independent / likely-independent
 * / syndicated / likely-syndicated / unknown — and only the non-independent
 * pairs are collapsed into one source group. `unknown` is never treated as
 * independent.
 *
 * This module keeps the historical import surface (`analyseIndependence`,
 * `independentGroupsFor`, `IndependenceResult`) stable for the claim pipeline.
 */
export {
  analyseIndependence,
  independentGroupsFor,
  classifyPair,
  independenceLabel,
} from "@/lib/independence";
export type {
  IndependenceResult,
  IndependenceRelation,
  PairRelation,
} from "@/lib/independence";
