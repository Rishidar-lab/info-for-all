import type { Claim, ClaimDispute, ConfidenceBand, Evidence, EventClaims } from "./types";

/**
 * Common Ground Index — EXPERIMENTAL.
 *
 * A summary of the STRUCTURED EVIDENCE for one event, not of headline
 * similarity. It answers: "across the claims IFA extracted, how much is
 * independently corroborated, contradicted, or resting on a single voice?"
 *
 * It deliberately does NOT use any political "left / centre / right" label, and
 * it is never presented as a verdict on the event — only on the state of
 * reporting about it.
 */

/** Tunable CGI weights. The defaults ship; `npm run eval:cgi` sweeps ±20%. */
export interface CgiWeights {
  base: number;
  corroboratedGain: number;
  evidenceBonus: number;
  singleSourcePenalty: number;
  attributedPenalty: number;
  disputedPenalty: number;
  hardDisputePenalty: number;
  syndicationPenalty: number;
  thinBaseCap: number;
  highBand: number;
  moderateBand: number;
}

export const DEFAULT_CGI_WEIGHTS: CgiWeights = {
  base: 40,
  corroboratedGain: 45,
  evidenceBonus: 10,
  singleSourcePenalty: 25,
  attributedPenalty: 12,
  disputedPenalty: 30,
  hardDisputePenalty: 8,
  syndicationPenalty: 8,
  thinBaseCap: 68,
  highBand: 70,
  moderateBand: 45,
};

export function computeCgi(
  claims: Claim[],
  evidence: Evidence[],
  disputes: ClaimDispute[],
  independence: EventClaims["independence"],
  weights: CgiWeights = DEFAULT_CGI_WEIGHTS,
): EventClaims["cgi"] {
  const w = weights;
  // CGI is about agreement ACROSS sources — meaningless with only one publisher.
  if (independence.distinctPublishers < 2) return null;

  // A bare "the event happened" headline claim (no predicate) is not enough
  // structured substance for a common-ground index — we need at least one
  // specific extracted claim (a statistic, an official action, a rule-derived
  // fact, or an attributed statement).
  const substantive = claims.filter(
    (c) =>
      c.predicates.length > 0 ||
      c.type === "statistic" ||
      c.type === "attribution" ||
      c.type === "allegation" ||
      c.type === "prediction" ||
      c.type === "official-statement" ||
      c.primaryEvidenceIds.length > 0 ||
      (c.type === "event" && c.independentSourceGroups.length >= 2),
  );
  if (substantive.length < 1) return null;

  const corroborated = substantive.filter(
    (c) => c.status === "corroborated" || c.status === "partially-corroborated",
  ).length;
  const singleSource = substantive.filter((c) => c.status === "single-source").length;
  const attributed = substantive.filter((c) => c.status === "attributed").length;
  const disputed = substantive.filter((c) => c.status === "disputed").length;
  const withEvidence = substantive.filter((c) => c.primaryEvidenceIds.length > 0).length;

  const n = substantive.length;
  let score = w.base;
  score += Math.round((corroborated / n) * w.corroboratedGain);
  score += withEvidence > 0 ? w.evidenceBonus : 0;
  score -= Math.round((singleSource / n) * w.singleSourcePenalty);
  score -= Math.round((attributed / n) * w.attributedPenalty);
  score -= Math.round((disputed / n) * w.disputedPenalty);
  score -= disputes.filter((d) => !d.possiblyTemporalUpdate && d.confidence !== "low").length * w.hardDisputePenalty;
  if (independence.possibleSyndicated > independence.independentGroups) score -= w.syndicationPenalty;

  // Thin evidence base: a single corroborated headline is not "high common
  // ground". Only let a score reach the high band when there is real breadth —
  // a primary record, several distinct claims, or 3+ independent source groups.
  const hasBreadth =
    withEvidence > 0 || substantive.length >= 3 || independence.independentGroups >= 3;
  if (!hasBreadth) score = Math.min(score, w.thinBaseCap);
  score = Math.max(0, Math.min(100, score));

  const band: ConfidenceBand = score >= w.highBand ? "high" : score >= w.moderateBand ? "moderate" : "low";

  const positive: string[] = [];
  const negative: string[] = [];
  if (corroborated) positive.push(`${corroborated} of ${n} claims corroborated by more than one independent source`);
  if (withEvidence) positive.push(`${withEvidence} claim(s) backed by a primary record`);
  if (!disputed && !disputes.length) positive.push("No genuine contradiction detected between sources");
  if (independence.independentGroups >= 3) positive.push(`${independence.independentGroups} independent source groups cover the event`);

  if (singleSource) negative.push(`${singleSource} claim(s) rest on a single source`);
  if (attributed) negative.push(`${attributed} statement(s) are attributed to a speaker and not independently confirmed`);
  if (disputed) negative.push(`${disputed} claim(s) are disputed between sources`);
  if (independence.possibleSyndicated) negative.push(`${independence.possibleSyndicated} report(s) look like syndicated copies, not extra confirmation`);
  if (evidence.length === 0) negative.push("No primary government record retrieved for this event");

  return { score, band, drivers: { positive, negative } };
}
