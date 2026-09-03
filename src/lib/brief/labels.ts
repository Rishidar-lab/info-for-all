import type { BriefSupport, BriefWithholdReason } from "./types";

export const WITHHOLD_LABEL: Record<BriefWithholdReason, string> = {
  COLLECTING: "Research is still collecting evidence",
  NO_INDEPENDENT_COVERAGE: "Only one independent report is available",
  INSUFFICIENT_EVIDENCE: "Not enough structured evidence yet",
  NO_VERIFIABLE_SENTENCE: "No sentence could be verified against the sources",
  SINGLE_SOURCE_NO_RECORD: "One newsroom; official sources checked, none carry it",
  SOLE_REPORT_ECHOES_OFFICIAL_RECORD: "The only report restates a government release",
};

export const SUPPORT_LABEL: Record<BriefSupport, string> = {
  STRONG: "Corroborated by 3+ independent source families",
  MODERATE: "Corroborated across independent sources",
  LIMITED: "Single source or one speaker — not independently confirmed",
  DISPUTED: "Sources disagree",
};

export const SUPPORT_TONE: Record<BriefSupport, string> = {
  STRONG: "text-agree",
  MODERATE: "text-agree",
  LIMITED: "text-caution",
  DISPUTED: "text-dispute",
};
