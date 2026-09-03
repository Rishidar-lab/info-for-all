/**
 * Brief input selection + the withholding gate.
 *
 * Decides whether an event has enough evidence for a native brief at all, and
 * assembles the structured inputs the deterministic synthesizer works from. The
 * frozen v0.6 claim engine and the v0.10 media-landscape layer have already run;
 * this only reads their output.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Claim, EventClaims, Evidence } from "@/lib/claims/types";
import type { MediaLandscape } from "@/lib/media-landscape/types";
import { primaryEntity, type PoliticalEntity } from "@/lib/media-landscape/entities";
import { resolveSourceFamilies, type SourceFamilyResolution } from "@/lib/research/independence";
import type { BriefWithholdReason, BriefCoverage, BriefFamilyMerge } from "./types";

const OFFICIAL_ROLES = new Set(["official-alert", "primary-document", "government-statement"]);

export interface BriefInputs {
  cluster: LiveCluster;
  articles: LiveArticle[];
  claims?: EventClaims;
  ml?: MediaLandscape;
  entity?: PoliticalEntity;
  officialArticles: LiveArticle[];
  newsArticles: LiveArticle[];
  /** Claims worth putting in a brief, ranked (corroborated → attributed → single). */
  usableClaims: Claim[];
  primaryEvidence: Evidence[];
  /** Milestone B §B.1 — the hardened family resolution. */
  independence: SourceFamilyResolution;
  coverage: BriefCoverage;
  withhold?: { reason: BriefWithholdReason; detail: string; familyMerges?: BriefFamilyMerge[] };
}

function claimRank(c: Claim): number {
  const r: Record<string, number> = {
    corroborated: 0,
    "partially-corroborated": 1,
    "official-statement": 1,
    attributed: 2,
    "single-source": 3,
    disputed: 4,
    uncertain: 5,
    outdated: 6,
    retracted: 7,
  };
  return r[c.status] ?? 5;
}

/**
 * A parse artefact / unreliable-template fact that must never reach a brief.
 *   - "₹0 crore was allocated." — figure-parse failure
 *   - "… was allocated." — amount_inr → "allocation" is a guess, often wrong
 *   - "A public holiday was declared." — generic-action rule fires on unrelated text
 *   - "q:inr:…" style raw tokens
 */
export function isJunkFact(text: string): boolean {
  const t = text.trim();
  if (/₹\s*0(?:\.\d+)?\s*(?:crore|lakh)\b/i.test(t)) return true;
  if (/\bwas allocated\.?$/i.test(t)) return true;
  if (/^(a public holiday was declared|a holiday was declared)\.?$/i.test(t)) return true;
  if (/q:(?:inr|len|count):/i.test(t)) return true;
  return false;
}

/** A claim is brief-worthy if it carries real content and is not pure noise. */
function usable(c: Claim): boolean {
  if (c.type === "opinion") return false;
  if (c.status === "outdated" || c.status === "retracted") return false;
  const t = c.canonicalText.trim();
  if (t.length < 8) return false;
  if (isJunkFact(t)) return false;
  return true;
}

export function selectBriefInputs(cluster: LiveCluster, articles: LiveArticle[]): BriefInputs {
  const claims = cluster.claims;
  const ml = cluster.trendData?.mediaLandscape;
  const entity = primaryEntity(articles.map((a) => a.title));

  const officialArticles = articles.filter((a) => OFFICIAL_ROLES.has(a.evidenceRole) || a.role === "official");
  const newsArticles = articles.filter((a) => !officialArticles.includes(a));

  const primaryEvidence = claims?.evidence ?? [];
  // Milestone B §B.1 — the authoritative family picture the withholding gate uses.
  const independence = resolveSourceFamilies(articles, { evidence: primaryEvidence });

  const coverage: BriefCoverage = {
    sources: ml?.coverage.uniquePublishers ?? cluster.distinctPublishers,
    families: independence.familyCount,
    genuineFamilies: independence.genuineIndependentFamilies,
    familyLabel: independence.label,
    tamil: ml?.coverage.tamilCount ?? articles.filter((a) => a.language === "ta").length,
    english: ml?.coverage.englishCount ?? articles.filter((a) => a.language === "en").length,
    official: officialArticles.length,
    primaryDocs: (ml?.evidenceProfile.primaryDocumentSupported ?? 0) || primaryEvidence.length,
  };

  const usableClaims = (claims?.claims ?? [])
    .filter(usable)
    .sort((a, b) => claimRank(a) - claimRank(b) || b.confidence - a.confidence);

  const base: BriefInputs = {
    cluster,
    articles,
    claims,
    ml,
    entity,
    officialArticles,
    newsArticles,
    usableClaims,
    primaryEvidence,
    independence,
    coverage,
  };

  // ── the withholding gate (Milestone B §B.1 — I1: withhold is a success state) ──
  if (articles.length === 0) {
    return { ...base, withhold: { reason: "COLLECTING", detail: "Research is still collecting reports for this event." } };
  }

  const anchorOk =
    independence.primaryRecordCount >= 1 ||
    officialArticles.length > 0 ||
    primaryEvidence.length > 0 ||
    !!cluster.cap;
  const genuineOk = independence.genuineIndependentFamilies >= 2;

  if (!genuineOk && !anchorOk) {
    // One newsroom (or one dispatch reprinted), and no primary record. A single
    // outlet quoting a minister is NOT a primary record — this closes the
    // "has an attributed claim" loophole. Show the reader what was collapsed.
    const g = independence.genuineIndependentFamilies;
    const merges: BriefFamilyMerge[] = independence.downgrades
      .filter((d) => d.publishers.length > 1)
      .map((d) => ({ publishers: d.publishers, reason: d.reason }));
    return {
      ...base,
      withhold: {
        reason: "NO_INDEPENDENT_COVERAGE",
        detail:
          `${g === 0 ? "No independent newsroom" : "Only one independent newsroom"} has this — ` +
          `${independence.label.toLowerCase()} (${coverage.sources} publisher${coverage.sources === 1 ? "" : "s"} across ${independence.familyCount} source famil${independence.familyCount === 1 ? "y" : "ies"}).` +
          (merges.length ? ` Collapsed: ${merges.map((m) => `${m.publishers.join(" + ")} — ${m.reason}`).join("; ")}.` : ""),
        familyMerges: merges.length ? merges : undefined,
      },
    };
  }

  if (usableClaims.length === 0 && !((cluster.trendData?.eventState?.confirmedFacts.length ?? 0) >= 1) && !cluster.cap) {
    return {
      ...base,
      withhold: {
        reason: "INSUFFICIENT_EVIDENCE",
        detail: "IFFA could not extract a structured claim for this event yet — usually a single short report.",
      },
    };
  }

  return base;
}
