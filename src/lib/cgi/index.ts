import { cgiBand, CGI_BAND_LABELS, type CgiBand, type ClaimStatus } from "../domain/types";
import { clamp, round } from "../text";

/**
 * Common Ground Index (CGI) — an EXPERIMENTAL, fully explainable measure of how
 * far independently sourced reporting converges on an event's core factual
 * claims.
 *
 * It is NOT a political neutrality score and NOT a truth score. Every point is
 * attributable to a named component with a stated raw value and weight; the
 * component rows are persisted (see schema `cgi_components`) so the formula can
 * change without losing history. See docs/METHODOLOGY.md for the rationale and
 * known weaknesses.
 */

export const CGI_FORMULA_VERSION = "cgi-v0.1";

interface ComponentSpec {
  key: string;
  label: string;
  weight: number;
  direction: "positive" | "negative";
}

/** Versioned weight table. A new version = a new object, not an edit. */
export const CGI_WEIGHTS_V0_1 = {
  base: 36,
  components: [
    { key: "independent_corroboration", label: "Independent corroboration of core claims", weight: 24, direction: "positive" },
    { key: "corroborating_publications", label: "Breadth of publications reporting", weight: 7, direction: "positive" },
    { key: "source_independence", label: "Independence of the source pool", weight: 11, direction: "positive" },
    { key: "primary_evidence_support", label: "Primary-evidence support for core claims", weight: 11, direction: "positive" },
    { key: "article_diversity", label: "Diversity of ownership, type and geography", weight: 7, direction: "positive" },
    { key: "recency", label: "Recency of the latest corroborated update", weight: 4, direction: "positive" },
    { key: "contradiction_density", label: "Density of direct contradictions among core claims", weight: 26, direction: "negative" },
    { key: "unresolved_claims", label: "Share of core claims still unresolved", weight: 19, direction: "negative" },
  ] satisfies ComponentSpec[],
} as const;

const UNRESOLVED_STATUSES: ReadonlySet<ClaimStatus> = new Set([
  "UNVERIFIED",
  "DEVELOPING",
  "DISPUTED",
]);

export interface CgiKeyClaim {
  independentCorroboratingSources: number;
  hasPrimaryEvidence: boolean;
  status: ClaimStatus;
  contradictionCount: number;
  singleAnonymousSource?: boolean;
}

export interface CgiInput {
  keyClaims: CgiKeyClaim[];
  totalArticles: number;
  independentSourceCount: number;
  ownershipGroupCount: number;
  sourceCategoryCount: number;
  countryCount: number;
  primaryEvidenceCount: number;
  contradictionPairs: number;
  latestUpdateAt: Date;
  now?: Date;
}

export interface CgiComponentResult {
  key: string;
  label: string;
  rawValue: number;
  weight: number;
  contribution: number;
  direction: "positive" | "negative";
  explanation: string;
}

export interface CgiResult {
  score: number;
  band: CgiBand;
  bandLabel: string;
  formulaVersion: string;
  base: number;
  components: CgiComponentResult[];
  inputs: Record<string, number>;
  narrative: { positives: string[]; negatives: string[] };
}

function share(list: boolean[]): number {
  if (list.length === 0) return 0;
  return list.filter(Boolean).length / list.length;
}

export function computeCgi(input: CgiInput): CgiResult {
  const now = input.now ?? new Date();
  const claims = input.keyClaims;
  const claimCount = Math.max(claims.length, 1);

  const corroboratedShare = share(claims.map((c) => c.independentCorroboratingSources >= 2));
  const primaryShare = share(claims.map((c) => c.hasPrimaryEvidence));
  const unresolvedShare = share(claims.map((c) => UNRESOLVED_STATUSES.has(c.status)));
  const contradictionDensity = clamp(input.contradictionPairs / claimCount, 0, 1);

  const publicationBreadth = clamp(
    Math.log10(input.totalArticles + 1) / Math.log10(25),
    0,
    1,
  );
  const independenceRatio =
    input.totalArticles === 0 ? 0 : clamp(input.independentSourceCount / input.totalArticles, 0, 1);
  const diversity =
    (clamp(input.ownershipGroupCount / 6, 0, 1) +
      clamp(input.sourceCategoryCount / 4, 0, 1) +
      clamp(input.countryCount / 5, 0, 1)) /
    3;
  const hoursSinceUpdate = Math.max(0, (now.getTime() - input.latestUpdateAt.getTime()) / 3_600_000);
  const recency = Math.exp(-hoursSinceUpdate / 168);

  const rawByKey: Record<string, number> = {
    independent_corroboration: corroboratedShare,
    corroborating_publications: publicationBreadth,
    source_independence: independenceRatio,
    primary_evidence_support: primaryShare,
    article_diversity: diversity,
    recency,
    contradiction_density: contradictionDensity,
    unresolved_claims: unresolvedShare,
  };

  const corroboratedCount = claims.filter((c) => c.independentCorroboratingSources >= 2).length;
  const primaryCount = claims.filter((c) => c.hasPrimaryEvidence).length;
  const unresolvedCount = claims.filter((c) => UNRESOLVED_STATUSES.has(c.status)).length;

  const explmain: Record<string, string> = {
    independent_corroboration: `${corroboratedCount} of ${claims.length} core claims corroborated by 2+ independent sources.`,
    corroborating_publications: `${input.totalArticles} publications are reporting this event.`,
    source_independence: `${input.independentSourceCount} of ${input.totalArticles} reports are independent (distinct ownership / not wire-derived).`,
    primary_evidence_support: `${primaryCount} of ${claims.length} core claims are supported by a primary document.`,
    article_diversity: `Coverage spans ${input.ownershipGroupCount} ownership groups, ${input.sourceCategoryCount} source types and ${input.countryCount} countries.`,
    recency: `Latest corroborated update was ${Math.round(hoursSinceUpdate)}h ago.`,
    contradiction_density: `${input.contradictionPairs} direct contradiction${input.contradictionPairs === 1 ? "" : "s"} across ${claims.length} core claims.`,
    unresolved_claims: `${unresolvedCount} of ${claims.length} core claims remain disputed, developing or unverified.`,
  };

  const components: CgiComponentResult[] = CGI_WEIGHTS_V0_1.components.map((spec) => {
    const raw = round(rawByKey[spec.key], 3);
    const magnitude = spec.weight * raw;
    const contribution = round(spec.direction === "negative" ? -magnitude : magnitude, 2);
    return {
      key: spec.key,
      label: spec.label,
      rawValue: raw,
      weight: spec.weight,
      contribution,
      direction: spec.direction,
      explanation: explain(spec.key, explmain),
    };
  });

  const total = CGI_WEIGHTS_V0_1.base + components.reduce((sum, c) => sum + c.contribution, 0);
  const score = Math.round(clamp(total, 0, 100));
  const band = cgiBand(score);

  const positives = components
    .filter((c) => c.contribution >= 1.5)
    .sort((a, b) => b.contribution - a.contribution)
    .map((c) => `+ ${c.explanation}`);
  const negatives = components
    .filter((c) => c.contribution <= -1.5)
    .sort((a, b) => a.contribution - b.contribution)
    .map((c) => `− ${c.explanation}`);

  const anonymous = claims.filter((c) => c.singleAnonymousSource).length;
  if (anonymous > 0) {
    negatives.push(
      `− ${anonymous} core claim${anonymous === 1 ? "" : "s"} rest on a single anonymous source.`,
    );
  }

  return {
    score,
    band,
    bandLabel: CGI_BAND_LABELS[band],
    formulaVersion: CGI_FORMULA_VERSION,
    base: CGI_WEIGHTS_V0_1.base,
    components,
    inputs: {
      keyClaimCount: claims.length,
      totalArticles: input.totalArticles,
      independentSourceCount: input.independentSourceCount,
      ownershipGroupCount: input.ownershipGroupCount,
      sourceCategoryCount: input.sourceCategoryCount,
      countryCount: input.countryCount,
      primaryEvidenceCount: input.primaryEvidenceCount,
      contradictionPairs: input.contradictionPairs,
      corroboratedClaimCount: corroboratedCount,
      unresolvedClaimCount: unresolvedCount,
      hoursSinceUpdate: round(hoursSinceUpdate, 1),
    },
    narrative: { positives, negatives },
  };
}

function explain(key: string, table: Record<string, string>): string {
  return table[key] ?? key;
}
