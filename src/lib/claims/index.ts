import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Claim, ClaimStatus, Evidence, EventClaims } from "./types";
import { analyseIndependence, independenceLabel } from "./corroborate";
import { normaliseClaims, type ClaimDraft } from "./normalize";
import { detectDisputes } from "./contradict";
import { extractEvidence } from "./evidence";
import { scoreClaim } from "./confidence";
import { computeCgi } from "./cgi";

export * from "./types";
export { CONFIDENCE_LABEL } from "./confidence";
export { provenanceChain, type ProvenanceStep } from "./provenance";
export { claimsEquivalent, numericConflict } from "./compare";

/**
 * Turn one verified multi-source event into structured, provenance-preserving
 * claims: coverage → claims → corroboration → disagreements → primary evidence →
 * uncertainty → an explainable common-ground summary.
 *
 * Deterministic and rule-based. Never requires a paid model.
 */
export function buildEventClaims(cluster: LiveCluster, articles: LiveArticle[], now = Date.now()): EventClaims {
  const generatedAt = new Date(now).toISOString();
  const independence = analyseIndependence(articles);
  const evidence = extractEvidence(cluster, articles);

  const pubByArticle = new Map(articles.map((a) => [a.id, a.publisher]));
  const syndicated = (c: { independentSourceGroups: string[][] }) =>
    c.independentSourceGroups.some(
      (g) => new Set(g.map((id) => pubByArticle.get(id))).size > 1,
    );
  const relsFor = (c: { supportingArticleIds: string[] }) => {
    const set = new Set(c.supportingArticleIds);
    return independence.relations.filter((r) => set.has(r.a) && set.has(r.b)).map((r) => r.relation);
  };
  const scoreOpts = (c: Claim | ClaimDraft, isDisputed: boolean) => ({
    isDisputed,
    syndicated: syndicated(c),
    now,
    independenceRelations: relsFor(c),
  });

  const drafts = normaliseClaims(cluster, articles, independence, now);
  const claims: Claim[] = drafts.map((d) => finalise(d, scoreOpts(d, false)));

  // ── disputes: only genuine semantic conflicts ────────────────────
  const disputes = detectDisputes(claims);
  const hardDisputeFields = new Set(
    disputes.filter((d) => !d.possiblyTemporalUpdate && d.confidence !== "low").map((d) => d.field),
  );
  for (const c of claims) {
    const field = c.predicates[0]?.replace(/_/g, " ");
    if (field && hardDisputeFields.has(field) && c.status !== "attributed") {
      c.status = "disputed";
      rescore(c, scoreOpts(c, true));
    }
  }

  // ── developing story: a later, higher figure supersedes an earlier one ──
  // Shown as an evolution — the earlier claim becomes OUTDATED, not "false".
  resolveTemporalUpdates(claims, disputes);

  // ── link primary evidence to the claims it actually supports ─────
  linkEvidence(claims, evidence);
  for (const c of claims) {
    if (c.primaryEvidenceIds.length) rescore(c, scoreOpts(c, c.status === "disputed"));
  }

  claims.sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.confidence - a.confidence);

  const unknowns = deriveUnknowns(cluster, claims, evidence);

  const primarySources =
    new Set(
      articles
        .filter((a) => a.evidenceRole === "official-alert" || a.evidenceRole === "primary-document")
        .map((a) => a.publisher),
    ).size + evidence.length;

  const independenceSummary = {
    reports: articles.length,
    distinctPublishers: cluster.distinctPublishers,
    independentGroups: independence.independentGroups,
    possibleSyndicated: independence.possibleSyndicated,
    primarySources,
    label: independenceLabel(independence),
    wireCredits: independence.wireCredits,
    unknownPairs: independence.unknownPairs,
  };

  const cgi = computeCgi(claims, evidence, disputes, independenceSummary);

  return {
    eventId: cluster.id,
    generatedAt,
    claims,
    evidence,
    disputes,
    unknowns,
    independence: independenceSummary,
    cgi,
  };
}

interface ClaimScoreOpts {
  isDisputed: boolean;
  syndicated: boolean;
  now: number;
  independenceRelations: import("@/lib/independence").IndependenceRelation[];
}

function finalise(d: ClaimDraft, opts: ClaimScoreOpts): Claim {
  const { score, band, rationale } = scoreClaim(d, {
    hasPrimaryEvidence: d.primaryEvidenceIds.length > 0,
    isDisputed: opts.isDisputed,
    syndicationCollapsed: opts.syndicated,
    now: opts.now,
    independenceRelations: opts.independenceRelations,
  });
  return { ...d, confidence: score, confidenceBand: band, rationale };
}

function rescore(c: Claim, opts: ClaimScoreOpts): void {
  const { score, band, rationale } = scoreClaim(c, {
    hasPrimaryEvidence: c.primaryEvidenceIds.length > 0,
    isDisputed: opts.isDisputed,
    syndicationCollapsed: opts.syndicated,
    now: opts.now,
    independenceRelations: opts.independenceRelations,
  });
  c.confidence = score;
  c.confidenceBand = band;
  c.rationale = rationale;
}

/** Words too generic to establish that a CAP alert supports a specific claim. */
const EV_STOP = new Set([
  "heavy", "very", "rain", "rainfall", "flood", "flash", "alert", "warning", "moderate",
  "thunderstorms", "thunderstorm", "surface", "wind", "lightning", "extremely", "with",
  "severe", "weather", "storm", "cyclone",
]);

function linkEvidence(claims: Claim[], evidence: Evidence[]): void {
  const eventClaims = claims.filter((c) => c.type === "event" && c.predicates.length === 0);
  const soleEventClaim = eventClaims.length === 1 ? eventClaims[0] : undefined;

  for (const ev of evidence) {
    const evWords = String(ev.provenance.event ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !EV_STOP.has(w));
    for (const c of claims) {
      if (c.type !== "official-statement" && c.type !== "event" && c.type !== "statistic") continue;
      const hay = `${c.canonicalText} ${c.subjects.join(" ")} ${c.objects.join(" ")}`.toLowerCase();
      const specificMatch = evWords.some((w) => hay.includes(w));
      const weatherMatch =
        ev.type === "government-alert" && (c.predicates.includes("warn") || c.predicates.includes("issued"));
      // When the cluster has exactly one generic "the event" claim and this is a
      // CAP alert, the alert obviously concerns that event.
      const obviousAlert = ev.type === "government-alert" && c === soleEventClaim;
      if (specificMatch || weatherMatch || obviousAlert) {
        if (!ev.supportsClaimIds.includes(c.id)) ev.supportsClaimIds.push(c.id);
        if (!c.primaryEvidenceIds.includes(ev.id)) c.primaryEvidenceIds.push(ev.id);
      }
    }
  }
}

function resolveTemporalUpdates(claims: Claim[], disputes: EventClaims["disputes"]): void {
  for (const d of disputes) {
    if (!d.possiblyTemporalUpdate) continue;
    const kind = d.field.replace(/ /g, "_");
    const same = claims.filter((c) => c.predicates[0] === kind && (c.type === "statistic" || c.type === "attribution"));
    if (same.length < 2) continue;
    // d.a is the chronologically EARLIER figure, d.b the LATER one (contradict.ts).
    const earlierVal = Number(d.a.value);
    const laterVal = Number(d.b.value);
    const earlier = same.find((c) => Number(c.objects[0]) === earlierVal);
    const later = same.find((c) => Number(c.objects[0]) === laterVal);
    if (!earlier || !later || earlier === later) continue;
    if (earlier.status !== "disputed") earlier.status = "outdated";
    earlier.notes.push(`Superseded by a later figure of ${laterVal} (${d.b.at}).`);
    later.updates.push({
      at: d.b.at,
      publisherId: later.supportingPublisherIds[0] ?? "unknown",
      articleId: later.supportingArticleIds[0] ?? "unknown",
      change: `${d.field}: ${earlierVal} → ${laterVal}`,
      supersedes: true,
    });
  }
}

function deriveUnknowns(cluster: LiveCluster, claims: Claim[], evidence: Evidence[]): string[] {
  const out: string[] = [];
  if (cluster.isCrisis && !claims.some((c) => /killed|injured|casualt|missing|evacuat/i.test(c.canonicalText))) {
    out.push("No casualty, evacuation or damage figure has been reported by any source.");
  }
  if (cluster.isCrisis && evidence.length === 0) {
    out.push("No official primary record (CAP alert or government statement) was retrieved for this event.");
  }
  if (claims.some((c) => c.status === "single-source")) {
    out.push("Some statements below rest on a single source and are not independently confirmed.");
  }
  if (claims.some((c) => c.status === "attributed")) {
    out.push("Some statements below are attributed to a speaker; the underlying facts are not separately verified.");
  }
  for (const u of cluster.unknowns ?? []) {
    if (!/claim-by-claim comparison awaits review/i.test(u)) out.push(u);
  }
  return [...new Set(out)];
}

function statusRank(s: ClaimStatus): number {
  const r: Record<ClaimStatus, number> = {
    corroborated: 0,
    "partially-corroborated": 1,
    disputed: 2,
    attributed: 3,
    "single-source": 4,
    uncertain: 5,
    outdated: 6,
    retracted: 7,
  };
  return r[s] ?? 5;
}
