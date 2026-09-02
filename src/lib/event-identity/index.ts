/**
 * IFA event-identity engine (v0.5).
 *
 * "Do two articles describe the same real-world event?" — separate from claim
 * identity (`src/lib/claim-identity/`) and claim support.
 *
 *   buildSignature(article)  →  structured, language-neutral features
 *   decideIdentity(a, b)     →  explainable IdentityDecision
 *   candidatePairs(...)      →  permissive blocking (Phase 3, Phase 25)
 */
export { buildSignature } from "./signature";
export type { EventSignature, SignatureInput } from "./signature";
export { computeSignals } from "./similarity";
export type { SignalScores } from "./similarity";
export { decideIdentity } from "./decide";
export type { IdentityDecision, EventRelation } from "./decide";

import type { EventSignature } from "./signature";
import { decideIdentity } from "./decide";
import { cosine } from "@/lib/semantic/embeddings";
import { GENERIC_CONCEPTS, conceptOverlap } from "@/lib/semantic/concepts";

const SPECIFIC_CONCEPT_EXCLUDE = new Set([...GENERIC_CONCEPTS, "rain", "flood", "cyclone"]);

/**
 * Quantity dimensions distinctive enough that two reports citing the SAME value
 * are very likely the same event ("90 kmph winds", "16 districts", "12000
 * cusecs", "Rs 500 crore"). Rainfall length and bare people-counts are too
 * common to block on.
 */
const DISTINCTIVE_QTY_DIMS = new Set(["district-count", "speed", "volume-rate", "currency", "temperature"]);

export interface CandidatePair {
  i: number;
  j: number;
  blockKey: string;
}

/**
 * PERMISSIVE candidate generation (Phase 3). Blocking keeps this well under
 * O(N²): a pair is only a candidate if it shares a blocking key —
 *   - a district / canonical place, OR
 *   - a strong named entity, OR
 *   - (same crisis type) AND (embedding cosine above a low bar)
 * within a time window. Missing a candidate here is a false negative, so the
 * bar is low; the conservative decision gate does the real filtering.
 */
export function candidatePairs(
  sigs: EventSignature[],
  opts: { windowMs?: number; embedFloor?: number } = {},
): CandidatePair[] {
  const windowMs = opts.windowMs ?? 40 * 3600 * 1000;
  const embedFloor = opts.embedFloor ?? 0.45;
  const n = sigs.length;

  // index by district and by strong entity
  const byDistrict = new Map<string, number[]>();
  const byEntity = new Map<string, number[]>();
  const byPlace = new Map<string, number[]>();
  const byCrisis = new Map<string, number[]>();
  const byQuantity = new Map<string, number[]>();
  // "Tamil Nadu" / "India" / a state name are far too hot to block on — dozens
  // of unrelated stories a day share them. Districts, specific places (dams,
  // towns), and strong named entities carry the signal.
  const HOT = new Set(["Tamil Nadu", "India", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"]);
  for (let i = 0; i < n; i++) {
    for (const d of sigs[i].districts) push(byDistrict, d, i);
    for (const e of sigs[i].entities) push(byEntity, e, i);
    for (const p of sigs[i].places) {
      if (p.place.type === "state" || HOT.has(p.place.canonical)) continue;
      push(byPlace, p.place.canonical, i);
    }
    if (sigs[i].crisisType) push(byCrisis, sigs[i].crisisType!, i);
    for (const q of sigs[i].quantities) {
      if (DISTINCTIVE_QTY_DIMS.has(q.dimension)) push(byQuantity, `${q.dimension}:${Math.round(q.value)}`, i);
    }
  }

  const seen = new Set<number>();
  const out: CandidatePair[] = [];
  const consider = (i: number, j: number, key: string) => {
    if (i === j) return;
    const [a, b] = i < j ? [i, j] : [j, i];
    const pk = a * n + b;
    if (seen.has(pk)) return;
    if (Math.abs(Date.parse(sigs[a].publishedAt) - Date.parse(sigs[b].publishedAt)) > windowMs) return;
    seen.add(pk);
    out.push({ i: a, j: b, blockKey: key });
  };

  for (const [k, idxs] of byDistrict) for (const [x, y] of pairsOf(idxs)) consider(x, y, `district:${k}`);
  for (const [k, idxs] of byEntity) for (const [x, y] of pairsOf(idxs)) consider(x, y, `entity:${k}`);
  for (const [k, idxs] of byPlace) for (const [x, y] of pairsOf(idxs)) consider(x, y, `place:${k}`);
  for (const [k, idxs] of byQuantity) for (const [x, y] of pairsOf(idxs)) consider(x, y, `qty:${k}`);
  // crisis-type block, gated by a cheap embedding check
  for (const [k, idxs] of byCrisis) {
    for (const [x, y] of pairsOf(idxs)) {
      if (cosine(sigs[x].embedding, sigs[y].embedding) >= embedFloor) consider(x, y, `crisis:${k}`);
    }
  }
  // state-level pairs: candidates only when they are embedding-close AND share a
  // SPECIFIC (non-generic) concept — enough to catch "TN rain toll 6" ↔ "6 rain
  // deaths across TN", filters "TN weather" ↔ "TN Assembly".
  const stateIdx: number[] = [];
  for (let i = 0; i < n; i++) if (sigs[i].places.some((p) => p.place.type === "state" || HOT.has(p.place.canonical))) stateIdx.push(i);
  for (const [x, y] of pairsOf(stateIdx)) {
    // conceptOverlap reports tokens from its first argument, so run it both ways
    // and union — the candidate set must not depend on article order.
    const shared = [
      ...new Set([
        ...conceptOverlap(sigs[x].concepts, sigs[y].concepts).shared,
        ...conceptOverlap(sigs[y].concepts, sigs[x].concepts).shared,
      ]),
    ].filter((c) => !SPECIFIC_CONCEPT_EXCLUDE.has(c));
    // embedding-close with one shared specific concept, OR two shared specific
    // concepts at any cosine — enough to catch "TN rain hits air & rail" pairs,
    // still filters "TN weather" ↔ "TN Assembly".
    if (
      (shared.length >= 1 && cosine(sigs[x].embedding, sigs[y].embedding) >= 0.6) ||
      shared.length >= 2
    ) {
      consider(x, y, "state+concept");
    }
  }
  return out;
}

function push<K>(m: Map<K, number[]>, k: K, v: number): void {
  const l = m.get(k);
  if (l) l.push(v);
  else m.set(k, [v]);
}
function* pairsOf(idxs: number[]): Generator<[number, number]> {
  // cap the fan-out for a very hot block key (e.g. many "Chennai" stories in a day)
  const capped = idxs.length > 60 ? idxs.slice(0, 60) : idxs;
  for (let a = 0; a < capped.length; a++) for (let b = a + 1; b < capped.length; b++) yield [capped[a], capped[b]];
}

/** Convenience: signature both, decide. */
export { decideIdentity as decide };
export function relationForPair(a: EventSignature, b: EventSignature) {
  return decideIdentity(a, b);
}
