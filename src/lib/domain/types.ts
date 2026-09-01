/**
 * Shared domain vocabulary. SQLite has no native enums, so these are the
 * single source of truth for the string unions used across the schema,
 * validation, and UI.
 */

export const EVENT_CATEGORIES = [
  "technology",
  "international",
  "science",
  "economics",
  "public_policy",
  "health",
  "environment",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_STATUSES = ["developing", "active", "settled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const SOURCE_CATEGORIES = [
  "public_broadcaster",
  "private_news",
  "government",
  "wire_service",
  "independent_outlet",
  "research_organization",
  "ngo",
  "corporate_publication",
] as const;
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

export const CLAIM_TYPES = [
  "observation",
  "attribution",
  "statistic",
  "prediction",
  "allegation",
  "opinion",
  "official_statement",
  "historical",
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

/** Restrained information-status vocabulary. Never implies more certainty than the evidence supports. */
export const CLAIM_STATUSES = [
  "CONFIRMED",
  "CORROBORATED",
  "PARTIALLY_CORROBORATED",
  "DISPUTED",
  "UNVERIFIED",
  "RETRACTED",
  "OUTDATED",
  "DEVELOPING",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const EVIDENCE_STATUSES = [
  "none",
  "secondary_only",
  "primary_supported",
  "primary_contradicted",
  "primary_mixed",
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const CLAIM_RELATIONSHIP_TYPES = [
  "SUPPORTS",
  "CONTRADICTS",
  "REFINES",
  "DUPLICATES",
] as const;
export type ClaimRelationshipType = (typeof CLAIM_RELATIONSHIP_TYPES)[number];

export const EVIDENCE_TYPES = [
  "article",
  "primary_document",
  "research_paper",
  "official_statement",
  "dataset",
  "public_record",
  "transcript",
  "image",
  "video",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const PRIMARY_EVIDENCE_TYPES: ReadonlySet<EvidenceType> = new Set([
  "primary_document",
  "research_paper",
  "official_statement",
  "dataset",
  "public_record",
  "transcript",
]);

export const ENTITY_TYPES = [
  "person",
  "organization",
  "government_body",
  "location",
  "law",
  "product",
  "event_reference",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const TIMELINE_ENTRY_TYPES = [
  "statement",
  "report",
  "confirmation",
  "reaction",
  "document_published",
  "correction",
  "escalation",
] as const;
export type TimelineEntryType = (typeof TIMELINE_ENTRY_TYPES)[number];

export const EVIDENCE_STANCES = ["supports", "contradicts", "contextualizes"] as const;
export type EvidenceStance = (typeof EVIDENCE_STANCES)[number];

/** Common Ground Index bands — see docs/METHODOLOGY.md. */
export const CGI_BANDS = [
  "very_high",
  "high",
  "mixed",
  "substantial_disagreement",
  "very_low",
] as const;
export type CgiBand = (typeof CGI_BANDS)[number];

export const CGI_BAND_LABELS: Record<CgiBand, string> = {
  very_high: "Very high factual convergence",
  high: "High convergence",
  mixed: "Mixed convergence",
  substantial_disagreement: "Substantial disagreement",
  very_low: "Very low factual convergence",
};

export function cgiBand(score: number): CgiBand {
  if (score >= 90) return "very_high";
  if (score >= 70) return "high";
  if (score >= 50) return "mixed";
  if (score >= 30) return "substantial_disagreement";
  return "very_low";
}

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  CONFIRMED: "Confirmed",
  CORROBORATED: "Corroborated",
  PARTIALLY_CORROBORATED: "Partially corroborated",
  DISPUTED: "Disputed",
  UNVERIFIED: "Unverified",
  RETRACTED: "Retracted",
  OUTDATED: "Outdated",
  DEVELOPING: "Developing",
};
