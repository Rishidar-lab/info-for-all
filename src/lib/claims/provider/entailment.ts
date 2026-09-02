/**
 * Hallucination / entailment guard for model-generated claims (v0.4, Phase 9).
 *
 * A model-generated claim is only admitted if the SUPPLIED SOURCE TEXT actually
 * supports it. The guard is deliberately strict and mechanical — it checks
 * traceability, not plausibility:
 *
 *   - the supporting excerpt must exist inside the source text
 *   - key named entities in the claim must appear (or normalise) in the source
 *   - every quantity in the claim must be traceable to a number in the source
 *   - an attributed speaker must be named in the source
 *   - the model may not invent primary evidence
 *
 * On failure the claim is REJECTED (or, for softer failures, forced to
 * `status: "uncertain"`). It is never silently accepted.
 */
import type { ModelClaim } from "./schema";
import { scanForInjection } from "./sanitize";

export interface EntailmentInput {
  /** Everything the model was actually shown for this article (title + excerpt). */
  sourceText: string;
  claim: ModelClaim;
}

export interface EntailmentResult {
  verdict: "admit" | "downgrade" | "reject";
  reasons: string[];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Loose containment: does `needle` appear in `hay` allowing minor gaps? */
function contains(hay: string, needle: string): boolean {
  const h = norm(hay);
  const n = norm(needle);
  if (!n) return false;
  if (h.includes(n)) return true;
  // token-subset fallback for lightly reworded excerpts
  const nt = n.split(" ").filter((w) => w.length > 3);
  if (nt.length === 0) return false;
  const hit = nt.filter((w) => h.includes(w)).length;
  return hit / nt.length >= 0.8;
}

/** Numbers present in a string, normalised (commas stripped). */
function numbersIn(s: string): Set<number> {
  const out = new Set<number>();
  for (const m of s.matchAll(/\b\d[\d,]*(?:\.\d+)?\b/g)) {
    const n = Number(m[0].replace(/,/g, ""));
    if (Number.isFinite(n)) out.add(n);
  }
  return out;
}

export function checkEntailment({ sourceText, claim }: EntailmentInput): EntailmentResult {
  const reasons: string[] = [];
  let downgrade = false;

  // 0. the claim text itself must not smuggle an injection artefact
  if (!scanForInjection(claim.canonicalText).clean || !scanForInjection(claim.supportingExcerpt).clean) {
    return { verdict: "reject", reasons: ["claim or excerpt contains prompt-manipulation text"] };
  }

  // 1. the supporting excerpt must be in the source
  if (!contains(sourceText, claim.supportingExcerpt)) {
    return { verdict: "reject", reasons: ["supporting excerpt not found in the supplied source text"] };
  }

  // 2. key entities must be traceable
  const missingEntities = claim.entities
    .filter((e) => e.kind === "place" || e.kind === "person" || e.kind === "organisation")
    .filter((e) => !contains(sourceText, e.text))
    .map((e) => e.text);
  if (missingEntities.length) {
    reasons.push(`entities not in source: ${missingEntities.join(", ")}`);
    downgrade = true;
  }

  // 3. quantities must be traceable to a number in the source
  const srcNums = numbersIn(sourceText);
  const untraceable = claim.quantities.filter((q) => {
    if (srcNums.has(q.value)) return false;
    // allow unit conversions (120 mm ↔ 12 cm) and thousands separators
    for (const n of srcNums) {
      if (n === 0) continue;
      const r = q.value / n;
      if ([1, 10, 100, 1000, 0.1, 0.01, 0.001, 1e5, 1e7].some((f) => Math.abs(r - f) < 1e-6)) return false;
    }
    return true;
  });
  if (untraceable.length) {
    return { verdict: "reject", reasons: [`quantities not traceable to the source: ${untraceable.map((q) => q.raw).join(", ")}`] };
  }

  // 4. an attributed speaker must be named in the source
  if (claim.attribution && !contains(sourceText, claim.attribution)) {
    reasons.push(`attributed speaker "${claim.attribution}" not named in source`);
    downgrade = true;
  }

  // 5. the model may not assert primary evidence — that only comes from a
  //    retrieved government record, never from the model.
  if (/\b(cap alert|sachet|official record|government document|gazette notification)\b/i.test(claim.canonicalText)) {
    return { verdict: "reject", reasons: ["model asserted primary evidence it cannot have retrieved"] };
  }

  // 6. a bare "fact" that is actually attributed in the source must not slip through
  if (claim.type === "fact" && /\b(said|says|alleged|claimed|according to|expects?|warned)\b/i.test(claim.supportingExcerpt)) {
    reasons.push("source excerpt is attributed but claim typed as a bare fact");
    downgrade = true;
  }

  if (reasons.length && downgrade) return { verdict: "downgrade", reasons };
  return { verdict: "admit", reasons };
}
