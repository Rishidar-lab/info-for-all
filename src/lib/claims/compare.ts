import type { Claim } from "./types";
import { keyOf } from "./extract";

/**
 * Deciding whether two claims are THE SAME assertion (so they corroborate each
 * other) versus merely similar-sounding (so they must stay separate).
 *
 * Deterministic and conservative:
 *   - identical predicate kind + identical normalised object  → same claim
 *   - same rule/statistic matchKey (already grouped upstream) → same claim
 *   - high token-key overlap of the canonical text            → same claim
 * Similar political names, nearby districts or same-topic-different-day items
 * do NOT match here because their predicates / objects / keys differ.
 */
export function claimsEquivalent(a: Claim, b: Claim): boolean {
  if (a.id === b.id) return true;

  const aKind = a.predicates[0];
  const bKind = b.predicates[0];
  if (aKind && bKind && aKind === bKind) {
    const ao = normObj(a.objects[0]);
    const bo = normObj(b.objects[0]);
    if (ao && bo && ao === bo) return true;
  }

  const ak = keyOf(a.canonicalText);
  const bk = keyOf(b.canonicalText);
  if (ak.length > 8 && ak === bk) return true;

  return tokenOverlap(ak, bk) >= 0.7;
}

/** Do two claims make a genuinely conflicting numeric assertion about the same thing? */
export function numericConflict(a: Claim, b: Claim): boolean {
  const ak = a.predicates[0];
  const bk = b.predicates[0];
  if (!ak || ak !== bk) return false;
  const av = Number(normObj(a.objects[0]));
  const bv = Number(normObj(b.objects[0]));
  if (!Number.isFinite(av) || !Number.isFinite(bv)) return false;
  return av > 0 && bv > 0 && av !== bv;
}

function normObj(s: string | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").trim();
}

function tokenOverlap(a: string, b: string): number {
  const as = new Set(a.split(" ").filter(Boolean));
  const bs = new Set(b.split(" ").filter(Boolean));
  if (as.size === 0 || bs.size === 0) return 0;
  let inter = 0;
  for (const t of as) if (bs.has(t)) inter++;
  return inter / (as.size + bs.size - inter);
}
