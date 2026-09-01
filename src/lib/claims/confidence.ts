import type { Claim, ConfidenceBand } from "./types";

/**
 * Claim confidence — 0–100, plus a coarse band (High / Moderate / Low) which is
 * what readers see. No fake precision.
 *
 * Formula (documented in docs/CLAIM-CONFIDENCE.md):
 *
 *   start                                     30
 *   + independent source groups   (0,1,2,3+)  +0 / +14 / +24 / +32
 *   + a supporting primary evidence record            +18
 *   + direct (not attributed) reporting               +6
 *   + recency (last seen < 6h / < 24h / older)  +6 / +2 / 0
 *   - claim is an attributed statement               -16
 *   - claim is disputed                               -22
 *   - all support in ONE syndication group (>1 pub)   -8
 *   - extraction confidence < 0.5                      -6
 *   clamp 0–100
 *
 * Bands:  >= 70 High   |   40–69 Moderate   |   < 40 Low
 */
export function scoreClaim(
  claim: Omit<Claim, "confidence" | "confidenceBand" | "rationale">,
  opts: { hasPrimaryEvidence: boolean; isDisputed: boolean; syndicationCollapsed: boolean; now?: number },
): { score: number; band: ConfidenceBand; rationale: string[] } {
  const now = opts.now ?? Date.now();
  const rationale: string[] = [];
  let s = 30;

  const groups = claim.independentSourceGroups.length;
  if (groups >= 3) {
    s += 32;
    rationale.push(`${groups} independent source groups support this.`);
  } else if (groups === 2) {
    s += 24;
    rationale.push("Two independent source groups support this.");
  } else if (groups === 1 && claim.supportingPublisherIds.length >= 1) {
    s += 14;
    rationale.push("Reported, but all support traces to one source group.");
  } else {
    rationale.push("No independent corroboration yet.");
  }

  if (opts.hasPrimaryEvidence) {
    s += 18;
    rationale.push("A primary record (e.g. an official alert) supports this.");
  }

  const anyDirect = claim.provenance.some((p) => !p.attribution);
  if (anyDirect && claim.type !== "attribution") {
    s += 6;
  } else if (claim.type === "attribution") {
    s -= 16;
    rationale.push("This is an attributed statement, reported as a claim by its speaker — not an established fact.");
  }

  const ageH = (now - Date.parse(claim.lastSeenAt)) / 3_600_000;
  if (ageH < 6) s += 6;
  else if (ageH < 24) s += 2;

  if (opts.isDisputed) {
    s -= 22;
    rationale.push("Sources disagree on part of this claim.");
  }
  if (opts.syndicationCollapsed) {
    s -= 8;
    rationale.push("Several reports appear to share upstream material.");
  }
  const avgExtract =
    claim.provenance.reduce((a, p) => a + p.confidence, 0) / Math.max(1, claim.provenance.length);
  if (avgExtract < 0.5) {
    s -= 6;
    rationale.push("Extracted with lower confidence — wording may not be exact.");
  }

  const score = Math.max(0, Math.min(100, Math.round(s)));
  const band: ConfidenceBand = score >= 70 ? "high" : score >= 40 ? "moderate" : "low";
  return { score, band, rationale };
}

export const CONFIDENCE_LABEL: Record<ConfidenceBand, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
};
