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
import { applyEchoCollapse, type GateOutcome } from "@/lib/research/echo";
import type { ClusterResearch, PrimaryRecord } from "@/lib/research/types";
import type { BriefWithholdReason, BriefCoverage, BriefFamilyMerge, BriefResearchTrail } from "./types";

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
  /** Milestone B §B.1 — the hardened family resolution (after §B.2.1 echo collapse). */
  independence: SourceFamilyResolution;
  /** §B.2.1 gate outcome, when research ran for this cluster. */
  gateOutcome?: GateOutcome;
  researchTrail?: BriefResearchTrail;
  officialRecordOnly?: boolean;
  /** Articles reclassified as press-release echoes by §B.2.1. */
  echoCollapsedArticleIds: string[];
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

export function selectBriefInputs(
  cluster: LiveCluster,
  articles: LiveArticle[],
  research?: ClusterResearch | null,
): BriefInputs {
  const claims = cluster.claims;
  const ml = cluster.trendData?.mediaLandscape;
  const entity = primaryEntity(articles.map((a) => a.title));

  const officialArticles = articles.filter((a) => OFFICIAL_ROLES.has(a.evidenceRole) || a.role === "official");
  const newsArticles = articles.filter((a) => !officialArticles.includes(a));

  const primaryEvidence = claims?.evidence ?? [];
  // Milestone B §B.1 — the authoritative family picture the withholding gate uses.
  const baseIndependence = resolveSourceFamilies(articles, { evidence: primaryEvidence });

  // ── Milestone B §B.2.1 — echo-collapse gate ────────────────────────────
  // A record that requires OCR and has no confirmed confidence can never anchor.
  const usableRecords: PrimaryRecord[] = (research?.records ?? []).filter((r) => !(r.requiresOcr && r.ocrConfidence == null));
  const contradictMatch = (research?.matches ?? []).find((m) => m.outcome === "contradicted");
  const corroboratingRecordIds = new Set((research?.matches ?? []).filter((m) => m.outcome === "corroborated").map((m) => m.recordId));
  const anchorRecords = usableRecords.filter((r) => corroboratingRecordIds.has(r.id));

  const echo = applyEchoCollapse(articles, anchorRecords.length ? anchorRecords : usableRecords, baseIndependence, {
    hasContradiction: !!contradictMatch,
  });
  const independence = echo.resolution;
  const gateOutcome = research ? echo.outcome : undefined;

  const researchTrail: BriefResearchTrail | undefined = research
    ? {
        checkedSources: research.checkedSources,
        recordsFound: research.records.length,
        contradiction: contradictMatch?.conflict
          ? { ...contradictMatch.conflict, authority: usableRecords.find((r) => r.id === contradictMatch.recordId)?.authority ?? "an official record" }
          : undefined,
      }
    : undefined;

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

  const officialRecordOnly = gateOutcome === "deliver_official_record_only";

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
    gateOutcome,
    researchTrail,
    officialRecordOnly,
    echoCollapsedArticleIds: echo.collapsedArticleIds,
    coverage,
  };

  // ── the withholding gate (§B.1 + §B.2.1 — I1: withhold is a success state) ──
  if (articles.length === 0) {
    return { ...base, withhold: { reason: "COLLECTING", detail: "Research is still collecting reports for this event." } };
  }

  const anchorOk =
    independence.primaryRecordCount >= 1 ||
    officialArticles.length > 0 ||
    primaryEvidence.length > 0 ||
    !!cluster.cap ||
    anchorRecords.length > 0;
  const genuineOk = independence.genuineIndependentFamilies >= 2;

  const merges: BriefFamilyMerge[] = independence.downgrades
    .filter((d) => d.publishers.length > 1)
    .map((d) => ({ publishers: d.publishers, reason: d.reason }));
  const collapsedLine = merges.length ? ` Collapsed: ${merges.map((m) => `${m.publishers.join(" + ")} — ${m.reason}`).join("; ")}.` : "";

  // §B.2.1 — the only report restates a government release: one source counted twice.
  if (gateOutcome === "withhold_sole_report_echoes_record") {
    const auth = researchTrail?.checkedSources[0] ?? "a government release";
    return {
      ...base,
      withhold: {
        reason: "SOLE_REPORT_ECHOES_OFFICIAL_RECORD",
        detail: `The only report we have restates ${auth}. That is one source, not two — ${echo.collapseReasons[0] ?? "the report adds nothing the record does not already state"}.`,
        familyMerges: merges.length ? merges : undefined,
      },
    };
  }

  if (!genuineOk && !anchorOk) {
    const g = independence.genuineIndependentFamilies;
    // §B.2.5 — name the sources we ACTUALLY checked (a real feed, not a "no feed
    // exists" placeholder), so the reader learns something concrete.
    const realSources = (researchTrail?.checkedSources ?? []).filter((s) => !/^no press-release feed/i.test(s));
    if (research && realSources.length > 0 && research.exhausted) {
      return {
        ...base,
        withhold: {
          reason: "SINGLE_SOURCE_NO_RECORD",
          detail:
            `${g === 0 ? "No independent newsroom" : "One newsroom"} reported this. We checked ${realSources.length} official source${realSources.length === 1 ? "" : "s"} — ${realSources.join("; ")} — and ${realSources.length === 1 ? "it does not" : "none"} carry it.` +
            collapsedLine,
          familyMerges: merges.length ? merges : undefined,
        },
      };
    }
    return {
      ...base,
      withhold: {
        reason: "NO_INDEPENDENT_COVERAGE",
        detail:
          `${g === 0 ? "No independent newsroom" : "Only one independent newsroom"} has this — ` +
          `${independence.label.toLowerCase()} (${coverage.sources} publisher${coverage.sources === 1 ? "" : "s"} across ${independence.familyCount} source famil${independence.familyCount === 1 ? "y" : "ies"}).` +
          collapsedLine,
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
