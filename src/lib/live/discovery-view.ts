import raw from "@/data/generated/discovery.json";
import type { ClusterDiscovery, DiscoveredReport, DiscoveryDataset } from "@/lib/discovery/types";

/** Provenance split the reader-facing layers must respect. */
export type ReportProvenance = "INGESTED_REPORT" | "DISCOVERED_REPORT";

const data = raw as unknown as DiscoveryDataset;

export function discoveryForSlug(slug: string): ClusterDiscovery | undefined {
  return data.bySlug[slug];
}

export interface DiscoveredCoverageView {
  attempted: boolean;
  rescued: boolean;
  familiesBefore: number;
  familiesAfter: number;
  /** Same-event, independence-resolved discovered reports (independent only). */
  independent: DiscoveredReport[];
  /** All same-event discovered reports incl. wire/same-family (labelled, never counted as corroboration). */
  all: DiscoveredReport[];
  ingestedCount: number;
  generatedAt: string;
}

/**
 * Reader-facing view of discovery for one story. Returns undefined when
 * discovery was not attempted or found no same-event coverage — the story
 * page then renders nothing (no empty panels, no noise).
 */
export function discoveredCoverageFor(
  slug: string,
  ingestedCount: number,
): DiscoveredCoverageView | undefined {
  const d = data.bySlug[slug];
  if (!d?.attempted || d.reports.length === 0) return undefined;
  return {
    attempted: d.attempted,
    rescued: d.rescued,
    familiesBefore: d.familiesBefore,
    familiesAfter: d.familiesAfter,
    independent: d.reports.filter((r) => r.sourceType === "independent"),
    all: d.reports,
    ingestedCount,
    generatedAt: d.generatedAt,
  };
}

export function provenanceOf(report: DiscoveredReport): ReportProvenance {
  return report.provider ? "DISCOVERED_REPORT" : "INGESTED_REPORT";
}

export { data as discoveryDataset };
