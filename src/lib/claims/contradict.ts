import type { Claim, ClaimDispute, ConfidenceBand } from "./types";

/**
 * Only flag a dispute when there is a GENUINE semantic conflict.
 *
 *  - "3 injured" vs "5 injured"                → numeric conflict (unless a later
 *    figure supersedes an earlier one — then it is an update, not a dispute).
 *  - "Heavy rain in Chennai" vs "Schools closed because of rain" → NOT a conflict.
 *  - "No evacuation ordered" vs "Evacuation ordered at 18:00"    → temporal conflict.
 *
 * False disputes are unacceptable, so thresholds are conservative.
 */

const NUMERIC_KINDS = new Set(["deaths", "injuries", "missing", "rescued", "rainfall_mm", "amount_crore"]);

function bandFor(gap: number, base: number): ConfidenceBand {
  const rel = base > 0 ? gap / base : 1;
  if (rel >= 0.5) return "high";
  if (rel >= 0.2) return "moderate";
  return "low";
}

export function detectDisputes(claims: Claim[]): ClaimDispute[] {
  const disputes: ClaimDispute[] = [];

  // ── numeric conflicts on the same statistic kind ──────────────────
  const byKind = new Map<string, Claim[]>();
  for (const c of claims) {
    if (c.type !== "statistic" && c.type !== "attribution") continue;
    const kind = c.predicates[0];
    if (!kind || !NUMERIC_KINDS.has(kind)) continue;
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind)!.push(c);
  }
  for (const [kind, group] of byKind) {
    // distinct reported values (from canonicalText numbers)
    const vals = group
      .map((c) => ({ c, v: Number((c.objects[0] || "").replace(/[^\d.]/g, "")) }))
      .filter((x) => Number.isFinite(x.v) && x.v > 0);
    const distinct = [...new Set(vals.map((x) => x.v))];
    if (distinct.length < 2) continue;
    const lo = Math.min(...distinct);
    const hi = Math.max(...distinct);
    if (hi === lo) continue;

    const loSide = vals.filter((x) => x.v === lo);
    const hiSide = vals.filter((x) => x.v === hi);
    const loAt = loSide.map((x) => x.c.lastSeenAt).sort().at(-1)!;
    const hiAt = hiSide.map((x) => x.c.lastSeenAt).sort().at(-1)!;
    // If the higher figure is clearly LATER, treat as an update, not a dispute.
    const temporalUpdate = Math.abs(Date.parse(hiAt) - Date.parse(loAt)) > 45 * 60 * 1000 && Date.parse(hiAt) > Date.parse(loAt);

    disputes.push({
      field: kind.replace("_", " "),
      a: {
        value: `${lo}`,
        publisherIds: [...new Set(loSide.flatMap((x) => x.c.supportingPublisherIds))],
        at: loAt,
      },
      b: {
        value: `${hi}`,
        publisherIds: [...new Set(hiSide.flatMap((x) => x.c.supportingPublisherIds))],
        at: hiAt,
      },
      reason: temporalUpdate
        ? `Reported figure rose from ${lo} to ${hi}; the later figure may simply be an update.`
        : `Sources report different ${kind.replace("_", " ")} figures (${lo} vs ${hi}) with no clear time ordering.`,
      kind: "numeric",
      confidence: temporalUpdate ? "low" : bandFor(hi - lo, lo),
      possiblyTemporalUpdate: temporalUpdate,
    });
  }

  // ── explicit negation conflicts (evacuation / order not vs ordered) ──
  const evac = claims.filter((c) => /evacuat/i.test(c.canonicalText));
  const ordered = evac.filter((c) => /\bordered\b/i.test(c.canonicalText) && !/did not/i.test(c.canonicalText));
  const notOrdered = evac.filter((c) => /did not order|no evacuation/i.test(c.canonicalText));
  if (ordered.length && notOrdered.length) {
    const oAt = ordered.map((c) => c.lastSeenAt).sort().at(-1)!;
    const nAt = notOrdered.map((c) => c.lastSeenAt).sort().at(-1)!;
    const temporal = Math.abs(Date.parse(oAt) - Date.parse(nAt)) > 30 * 60 * 1000;
    disputes.push({
      field: "evacuation",
      a: { value: "no evacuation ordered", publisherIds: notOrdered.flatMap((c) => c.supportingPublisherIds), at: nAt },
      b: { value: "evacuation ordered", publisherIds: ordered.flatMap((c) => c.supportingPublisherIds), at: oAt },
      reason: temporal
        ? "One report predates the evacuation order; check chronology before treating as a contradiction."
        : "Sources disagree on whether an evacuation was ordered.",
      kind: "temporal",
      confidence: temporal ? "low" : "moderate",
      possiblyTemporalUpdate: temporal,
    });
  }

  return disputes;
}
