/**
 * Coverage-rescue metrics — the v0.13 north-star numbers.
 *
 * Never inflated with multiple URLs from one publisher, wire copies, corporate
 * siblings, press-release echoes, or unrelated events sharing keywords — every
 * such candidate has already been removed by the pipeline before it reaches
 * here. This module only counts what survived.
 */
import type { ClusterDiscovery, DiscoveryMetrics } from "./types";

type Bucket = "1" | "2" | "3-5" | "6-10" | "11+";
function bucket(n: number): Bucket {
  if (n <= 1) return "1";
  if (n === 2) return "2";
  if (n <= 5) return "3-5";
  if (n <= 10) return "6-10";
  return "11+";
}

export interface RescueInput {
  /** Every routable cluster's independent-family count BEFORE discovery. */
  familiesBeforeByCluster: Record<string, number>;
  /** Discovery result per cluster that was a single-source candidate. */
  discoveries: ClusterDiscovery[];
}

export function computeDiscoveryMetrics(input: RescueInput): DiscoveryMetrics {
  const before: Record<Bucket, number> = { "1": 0, "2": 0, "3-5": 0, "6-10": 0, "11+": 0 };
  const after: Record<Bucket, number> = { "1": 0, "2": 0, "3-5": 0, "6-10": 0, "11+": 0 };
  const byId = new Map(input.discoveries.map((d) => [d.slug, d]));

  for (const [slug, fam] of Object.entries(input.familiesBeforeByCluster)) {
    before[bucket(fam)]++;
    const d = byId.get(slug);
    after[bucket(d && d.attempted ? d.familiesAfter : fam)]++;
  }

  const singleSourceCandidates = Object.entries(input.familiesBeforeByCluster).filter(([, f]) => f <= 1).length;
  const attempted = input.discoveries.filter((d) => d.attempted);
  const eligibleSingleSourceCandidates = attempted.length + input.discoveries.filter((d) => !d.attempted && d.familiesBefore <= 1 && d.skippedReason === "no usable query could be built from the event graph").length;

  const candidateArticlesFound = attempted.reduce((s, d) => s + d.candidatesFound, 0);
  const sameEventCandidates = attempted.reduce(
    (s, d) => s + d.reports.length + d.rejected.filter((r) => r.stage === "independence").length,
    0,
  );
  const uncertainCandidates = attempted.reduce(
    (s, d) => s + d.rejected.filter((r) => r.stage === "identity" && r.verdict === "UNCERTAIN").length,
    0,
  );
  const independentCandidates = attempted.reduce((s, d) => s + d.reports.filter((r) => r.sourceType === "independent").length, 0);
  const rescued = attempted.filter((d) => d.rescued);

  const rescueByLanguage: DiscoveryMetrics["rescueByLanguage"] = { "ta->ta": 0, "ta->en": 0, "en->ta": 0, "en->en": 0 };
  for (const d of rescued) {
    for (const dir of d.rescueLanguages) {
      if (dir in rescueByLanguage) rescueByLanguage[dir as keyof typeof rescueByLanguage]++;
    }
  }

  const denom = attempted.length || 1;
  const meanRescued =
    rescued.length > 0
      ? rescued.reduce((s, d) => s + d.familiesAfter, 0) / rescued.length
      : 0;

  return {
    singleSourceCandidates,
    eligibleSingleSourceCandidates,
    discoveryAttempted: attempted.length,
    candidateArticlesFound,
    sameEventCandidates,
    uncertainCandidates,
    independentCandidates,
    rescuedClusters: rescued.length,
    coverageRescueRate: Math.round((rescued.length / denom) * 1000) / 1000,
    falseMatchRate: 0, // set by the gold-set evaluation, not the live pass
    meanSourcesPerRescuedCluster: Math.round(meanRescued * 100) / 100,
    familyDistributionBefore: before,
    familyDistributionAfter: after,
    rescueByLanguage,
  };
}
