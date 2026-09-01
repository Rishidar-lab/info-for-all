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
export function computeCgi(
  claims: Claim[],
  evidence: Evidence[],
  disputes: ClaimDispute[],
  independence: EventClaims["independence"],
): EventClaims["cgi"] {
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
  let score = 40;
  score += Math.round((corroborated / n) * 45);
  score += withEvidence > 0 ? 10 : 0;
  score -= Math.round((singleSource / n) * 25);
  score -= Math.round((attributed / n) * 12);
  score -= Math.round((disputed / n) * 30);
  score -= disputes.filter((d) => !d.possiblyTemporalUpdate && d.confidence !== "low").length * 8;
  if (independence.possibleSyndicated > independence.independentGroups) score -= 8;

  // Thin evidence base: a single corroborated headline is not "high common
  // ground". Only let a score reach the high band when there is real breadth —
  // a primary record, several distinct claims, or 3+ independent source groups.
  const hasBreadth =
    withEvidence > 0 || substantive.length >= 3 || independence.independentGroups >= 3;
  if (!hasBreadth) score = Math.min(score, 68);
  score = Math.max(0, Math.min(100, score));

  const band: ConfidenceBand = score >= 70 ? "high" : score >= 45 ? "moderate" : "low";

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
