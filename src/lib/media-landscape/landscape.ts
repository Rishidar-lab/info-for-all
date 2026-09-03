/**
 * Media landscape bundle assembler (v0.10).
 *
 * One call per cluster during ingestion. Produces the `MediaLandscape` object
 * that the story page, the story cards, /landscape and /source pages all read.
 */
import type { LiveArticle, LiveCluster, LiveDataset } from "@/lib/live/types";
import type { MediaLandscape } from "./types";
import { buildCoverageLandscape, coverageContext, type CoverageContext } from "./coverage";
import { compareFraming } from "./framing";
import { detectBlindspots } from "./blindspot";
import { buildClaimEvidence, buildEvidenceProfile, evidenceStrength } from "./evidence";

export function buildLandscapeContext(dataset: LiveDataset): CoverageContext {
  return coverageContext(dataset);
}

export function buildMediaLandscape(
  cluster: LiveCluster,
  articles: LiveArticle[],
  ctx: CoverageContext,
): MediaLandscape {
  const claims = cluster.claims;
  const framing = compareFraming(cluster, articles, claims);
  const coverage = buildCoverageLandscape(cluster, articles, ctx);
  const blindspots = detectBlindspots(cluster, articles, ctx, framing);
  const evidence = buildClaimEvidence(claims);
  const evidenceProfile = buildEvidenceProfile(evidence, claims);
  const strength = evidenceStrength(evidence);

  return {
    coverage,
    framing,
    blindspots,
    evidence,
    evidenceProfile,
    evidenceStrength: strength,
    discourse: [], // Phase 9
    emergingClaims: [], // Phase 9
  };
}
