import type { CgiBand, ClaimStatus, ClaimType } from "./domain/types";

/** Presentation helpers shared by server and client components (no DB imports). */

export const BAND_STYLE: Record<CgiBand, { text: string; bg: string; label: string; short: string }> = {
  very_high: { text: "text-agree", bg: "bg-agree-bg", label: "Very high factual convergence", short: "Very high" },
  high: { text: "text-agree", bg: "bg-agree-bg", label: "High convergence", short: "High" },
  mixed: { text: "text-caution", bg: "bg-caution-bg", label: "Mixed convergence", short: "Mixed" },
  substantial_disagreement: { text: "text-dispute", bg: "bg-dispute-bg", label: "Substantial disagreement", short: "Substantial disagreement" },
  very_low: { text: "text-dispute", bg: "bg-dispute-bg", label: "Very low factual convergence", short: "Very low" },
};

export const STATUS_STYLE: Record<ClaimStatus, { text: string; bg: string; label: string }> = {
  CONFIRMED: { text: "text-agree", bg: "bg-agree-bg", label: "Confirmed" },
  CORROBORATED: { text: "text-agree", bg: "bg-agree-bg", label: "Corroborated" },
  PARTIALLY_CORROBORATED: { text: "text-caution", bg: "bg-caution-bg", label: "Partially corroborated" },
  DISPUTED: { text: "text-dispute", bg: "bg-dispute-bg", label: "Disputed" },
  UNVERIFIED: { text: "text-unknown", bg: "bg-surface-2", label: "Unverified" },
  RETRACTED: { text: "text-dispute", bg: "bg-dispute-bg", label: "Retracted" },
  OUTDATED: { text: "text-unknown", bg: "bg-surface-2", label: "Outdated" },
  DEVELOPING: { text: "text-caution", bg: "bg-caution-bg", label: "Developing" },
};

export const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  observation: "Observation",
  attribution: "Attribution",
  statistic: "Statistic",
  prediction: "Prediction",
  allegation: "Allegation",
  opinion: "Opinion",
  official_statement: "Official statement",
  historical: "Historical claim",
};

export const CATEGORY_LABEL: Record<string, string> = {
  technology: "Technology",
  international: "International affairs",
  science: "Science",
  economics: "Economics",
  public_policy: "Public policy",
  health: "Health",
  environment: "Environment",
};

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  public_broadcaster: "Public broadcaster",
  private_news: "Private news organisation",
  government: "Government",
  wire_service: "Wire service",
  independent_outlet: "Independent outlet",
  research_organization: "Research organisation",
  ngo: "NGO",
  corporate_publication: "Corporate publication",
};

export const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  article: "Journalism",
  primary_document: "Primary document",
  research_paper: "Research paper",
  official_statement: "Official statement",
  dataset: "Dataset",
  public_record: "Public record",
  transcript: "Transcript",
  image: "Image",
  video: "Video",
};

export function labelize(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
