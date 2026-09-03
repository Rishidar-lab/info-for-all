/**
 * v0.10 media-landscape metrics for /methodology/quality.
 *
 * Straight counts over the current snapshot + the registry. Coverage numbers
 * (ownership completeness, external-ratings coverage, alignment-qualified) are
 * honest fractions — they are meant to expose how much of the landscape layer
 * is real data vs "insufficient" / "no record".
 */
import { dataset } from "@/lib/live/dataset";
import { PUBLISHERS } from "@/data/publishers";
import { allPublisherProfiles, buildSourceFamilies } from "./publishers";
import { computePublisherObserved } from "./observed";

export interface V010Metrics {
  publishersProfiled: number;
  publishersIngested: number;
  ownershipKnown: number;
  ownershipUnknown: number;
  ownershipCompletenessPct: number;
  externalRatingsCoveragePct: number;
  sourceFamilies: number;
  multiPublisherFamilies: number;
  alignmentQualified: number;
  alignmentTotal: number;
  clustersWithLandscape: number;
  clustersTotal: number;
  clustersWithBlindspot: number;
  clustersWithEvidenceMatrix: number;
  primaryDocSupportedClaims: number;
  totalMatrixClaims: number;
  disputedClaims: number;
  corroboratedClaims: number;
  discourseMentions: number;
  emergingClaims: number;
}

export function v010Metrics(): V010Metrics {
  const ingested = [...new Set(dataset.articles.map((a) => a.publisher))];
  const known = PUBLISHERS.filter((p) => p.ownership.category !== "UNKNOWN").length;
  const withRatings = PUBLISHERS.filter((p) => p.externalRatings.length > 0).length;
  const families = buildSourceFamilies(dataset);

  const profiles = allPublisherProfiles(dataset).filter((p) => ingested.includes(p.name));
  let alignmentQualified = 0;
  for (const p of profiles) {
    if (computePublisherObserved(p.name, dataset, "all").politicalArticles >= 20) alignmentQualified++;
  }

  let clustersWithLandscape = 0;
  let clustersWithBlindspot = 0;
  let clustersWithEvidenceMatrix = 0;
  let primaryDocSupportedClaims = 0;
  let totalMatrixClaims = 0;
  let disputedClaims = 0;
  let corroboratedClaims = 0;
  let discourseMentions = 0;
  let emergingClaims = 0;

  for (const c of dataset.clusters) {
    const ml = c.trendData?.mediaLandscape;
    if (!ml) continue;
    clustersWithLandscape++;
    if (ml.blindspots.length > 0) clustersWithBlindspot++;
    if (ml.evidence.length > 0) clustersWithEvidenceMatrix++;
    totalMatrixClaims += ml.evidence.length;
    primaryDocSupportedClaims += ml.evidence.filter((e) => e.primaryEvidence.length > 0 || e.officialStatements.length > 0).length;
    disputedClaims += ml.evidenceProfile.byStatus.DISPUTED;
    corroboratedClaims += ml.evidenceProfile.byStatus.HIGHLY_CORROBORATED + ml.evidenceProfile.byStatus.CORROBORATED;
    discourseMentions += ml.discourse.length;
    emergingClaims += ml.emergingClaims.length;
  }

  return {
    publishersProfiled: PUBLISHERS.length,
    publishersIngested: ingested.length,
    ownershipKnown: known,
    ownershipUnknown: PUBLISHERS.length - known,
    ownershipCompletenessPct: Math.round((known / PUBLISHERS.length) * 100),
    externalRatingsCoveragePct: Math.round((withRatings / PUBLISHERS.length) * 100),
    sourceFamilies: families.length,
    multiPublisherFamilies: families.filter((f) => f.publisherIds.length > 1).length,
    alignmentQualified,
    alignmentTotal: profiles.length,
    clustersWithLandscape,
    clustersTotal: dataset.clusters.length,
    clustersWithBlindspot,
    clustersWithEvidenceMatrix,
    primaryDocSupportedClaims,
    totalMatrixClaims,
    disputedClaims,
    corroboratedClaims,
    discourseMentions,
    emergingClaims,
  };
}
