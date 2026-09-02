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

const NUMERIC_KINDS = new Set([
  "deaths",
  "injuries",
  "missing",
  "rescued",
  "rainfall_mm",
  "amount_inr",
  "houses_damaged",
  "discharge_cusecs",
  "relief_camps",
  "teams",
  "wind_kmph",
  "flights_delayed",
]);

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

    // Order the two conflicting figures by REPORT TIME, not by value — a
    // developing count can fall (missing found) as well as rise (toll grows).
    const earliestFor = (v: number) =>
      Math.min(...vals.filter((x) => x.v === v).map((x) => Date.parse(x.c.firstSeenAt || x.c.lastSeenAt)));
    const latestFor = (v: number) =>
      Math.max(...vals.filter((x) => x.v === v).map((x) => Date.parse(x.c.lastSeenAt)));
    const ordered = [...distinct].sort((p, q) => earliestFor(p) - earliestFor(q));
    const aV = ordered[0]!;
    const bV = ordered[ordered.length - 1]!;
    if (aV === bV) continue;

    const aSide = vals.filter((x) => x.v === aV);
    const bSide = vals.filter((x) => x.v === bV);
    const aAt = new Date(earliestFor(aV)).toISOString();
    const bAt = new Date(latestFor(bV)).toISOString();
    const gap = Math.abs(Date.parse(bAt) - Date.parse(aAt));
    // Separated clearly in time ⇒ a developing-story update, not a contradiction.
    const temporalUpdate = gap > 45 * 60 * 1000;
    const spread = Math.abs(bV - aV);
    const lo = Math.min(aV, bV);

    disputes.push({
      field: kind.replace(/_/g, " "),
      a: {
        value: `${aV}`,
        publisherIds: [...new Set(aSide.flatMap((x) => x.c.supportingPublisherIds))],
        at: aAt,
      },
      b: {
        value: `${bV}`,
        publisherIds: [...new Set(bSide.flatMap((x) => x.c.supportingPublisherIds))],
        at: bAt,
      },
      reason: temporalUpdate
        ? `Reported ${kind.replace(/_/g, " ")} figure moved from ${aV} to ${bV} over ${Math.round(gap / 3.6e6) || "<1"}h; the later figure is likely an update.`
        : `Sources report different ${kind.replace(/_/g, " ")} figures (${aV} vs ${bV}) with no clear time ordering.`,
      kind: "numeric",
      confidence: temporalUpdate ? "low" : bandFor(spread, lo),
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
