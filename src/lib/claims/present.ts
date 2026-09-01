import type { Claim, ClaimStatus, ConfidenceBand, EventClaims } from "./types";

/** Reader-facing label for each claim status. */
export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  corroborated: "Corroborated",
  "partially-corroborated": "Partly corroborated",
  "single-source": "Single source",
  disputed: "Sources disagree",
  attributed: "Attributed statement",
  uncertain: "Uncertain",
  outdated: "Outdated",
  retracted: "Retracted",
};

export const CLAIM_STATUS_STYLE: Record<ClaimStatus, { text: string; bg: string }> = {
  corroborated: { text: "text-agree", bg: "bg-agree-bg" },
  "partially-corroborated": { text: "text-agree", bg: "bg-agree-bg" },
  "single-source": { text: "text-caution", bg: "bg-caution-bg" },
  disputed: { text: "text-dispute", bg: "bg-dispute-bg" },
  attributed: { text: "text-evidence", bg: "bg-evidence-bg" },
  uncertain: { text: "text-unknown", bg: "bg-surface-2" },
  outdated: { text: "text-ink-3", bg: "bg-surface-2" },
  retracted: { text: "text-dispute", bg: "bg-dispute-bg" },
};

export const CONFIDENCE_BAND_LABEL: Record<ConfidenceBand, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence",
};

export interface EpistemicView {
  /** Corroborated / partly corroborated — what multiple independent sources say. */
  known: Claim[];
  /** Single-source + attributed — reported, but not independently verified. */
  reported: Claim[];
  /** Claims flagged as genuinely disputed. */
  disputed: Claim[];
  /** Outdated / retracted claims, kept visible rather than deleted. */
  historical: Claim[];
}

/** Bucket an event's claims by epistemic status for the comparison detail page. */
export function epistemicView(ec: EventClaims): EpistemicView {
  const known: Claim[] = [];
  const reported: Claim[] = [];
  const disputed: Claim[] = [];
  const historical: Claim[] = [];
  for (const c of ec.claims) {
    if (c.status === "disputed") disputed.push(c);
    else if (c.status === "outdated" || c.status === "retracted") historical.push(c);
    else if (c.status === "corroborated" || c.status === "partially-corroborated") known.push(c);
    else reported.push(c);
  }
  return { known, reported, disputed, historical };
}

/** Short, honest one-liner describing the corroboration behind a claim. */
export function corroborationSummary(c: Claim): string {
  const g = c.independentSourceGroups.length;
  const p = c.supportingPublisherIds.length;
  if (c.status === "attributed") {
    const who = c.provenance.find((x) => x.attribution)?.attribution;
    return `Stated by ${who ?? "a named speaker"}; not independently verified.`;
  }
  if (g >= 2) return `${g} independent source groups (${p} publisher${p === 1 ? "" : "s"}).`;
  if (p >= 2) return `${p} publishers, but likely one upstream source.`;
  return `One source (${c.supportingPublisherIds[0] ?? "unknown"}).`;
}
