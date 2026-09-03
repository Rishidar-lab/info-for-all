/**
 * Claim Evidence Matrix (v0.10, Phase 7) — IFFA's differentiator.
 *
 * Re-projects the frozen v0.6 claim engine's output into a per-story evidence
 * view: every substantive claim with its supporting/contradicting sources,
 * primary documents, fact-checks, independent-family counts, and a status.
 *
 * A press release is evidence that "the institution stated X" — never automatic
 * proof that X is objectively true. The Evidence Profile is COUNTS, not "X%
 * true". The optional EvidenceStrengthScore is an internal ranking and carries
 * a disclaimer wherever it is stored.
 */
import type { Claim, EventClaims, Evidence, EvidenceType } from "@/lib/claims/types";
import type {
  ClaimEvidence,
  ClaimEvidenceStatus,
  EvidenceProfile,
  EvidenceStrengthScore,
  PrimaryEvidenceKind,
  PrimaryEvidenceRef,
} from "./types";

const EV_KIND: Record<EvidenceType, PrimaryEvidenceKind> = {
  "government-alert": "official-statement",
  "government-document": "government-order",
  "official-statement": "official-statement",
  "weather-alert": "weather-bulletin",
  "public-record": "official-dataset",
  research: "other-primary",
  dataset: "official-dataset",
  other: "other-primary",
};

const ALL_STATUSES: ClaimEvidenceStatus[] = [
  "HIGHLY_CORROBORATED",
  "CORROBORATED",
  "PARTIALLY_CORROBORATED",
  "SINGLE_SOURCE",
  "DISPUTED",
  "UNVERIFIED",
  "CORRECTED",
  "RETRACTED",
  "SUPERSEDED",
];

function statusOf(c: Claim): ClaimEvidenceStatus {
  if (c.status === "retracted") return "RETRACTED";
  if (c.corrections.length > 0) return "CORRECTED";
  if (c.status === "outdated" || c.updates.some((u) => u.supersedes)) return "SUPERSEDED";
  if (c.status === "disputed") return "DISPUTED";
  if (c.status === "corroborated") return c.independentSourceGroups.length >= 3 ? "HIGHLY_CORROBORATED" : "CORROBORATED";
  if (c.status === "partially-corroborated") return "PARTIALLY_CORROBORATED";
  if (c.status === "single-source") return "SINGLE_SOURCE";
  return "UNVERIFIED"; // attributed / uncertain
}

function primaryRefs(c: Claim, evidence: Evidence[]): PrimaryEvidenceRef[] {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const refs: PrimaryEvidenceRef[] = [];
  for (const id of c.primaryEvidenceIds) {
    const e = byId.get(id);
    if (!e) continue;
    refs.push({
      kind: EV_KIND[e.type] ?? "other-primary",
      authority: e.publisher,
      establishes: `${e.publisher} record: ${e.title}`,
      url: e.url,
    });
  }
  return refs;
}

export function buildClaimEvidence(claims: EventClaims | undefined): ClaimEvidence[] {
  if (!claims) return [];
  return claims.claims
    .filter((c) => c.type !== "opinion")
    .map((c) => {
      const primaries = primaryRefs(c, claims.evidence);
      const officialStatements = primaries.filter((p) => p.kind === "official-statement");
      const primaryDocs = primaries.filter((p) => p.kind !== "official-statement");
      return {
        claimId: c.id,
        canonicalClaim: c.canonicalText,
        claimType: c.type,
        entities: [...new Set([...c.subjects, ...c.objects])].slice(0, 6),
        numbers: (c.canonicalText.match(/\b\d[\d,.]*\s?(?:crore|lakh|cusecs|mm|%|per cent|dead|killed|injured|points|runs|wickets)?\b/gi) ?? []).slice(0, 4),
        time: c.firstSeenAt,
        location: c.objects.find((o) => /district|nadu|chennai|india/i.test(o)),
        supportingArticles: c.supportingArticleIds,
        contradictingArticles: c.contradictingArticleIds,
        primaryEvidence: primaryDocs,
        officialStatements,
        factChecks: [], // wired by the fact-check registry (src/lib/factcheck/)
        sourceFamilies: c.independentSourceGroups.map((g) => g.join(" + ")),
        independentSupportCount: c.independentSourceGroups.length,
        independentContradictionCount: c.contradictingArticleIds.length > 0 ? 1 : 0,
        status: statusOf(c),
      };
    });
}

export function buildEvidenceProfile(matrix: ClaimEvidence[], claims: EventClaims | undefined): EvidenceProfile {
  const byStatus = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<ClaimEvidenceStatus, number>;
  for (const m of matrix) byStatus[m.status]++;
  return {
    substantiveClaims: matrix.length,
    byStatus,
    independentFamilies: claims?.independence.independentGroups ?? Math.max(...matrix.map((m) => m.independentSupportCount), 0),
    primaryDocumentSupported: matrix.filter((m) => m.primaryEvidence.length > 0 || m.officialStatements.length > 0).length,
    corrections: matrix.filter((m) => m.status === "CORRECTED" || m.status === "RETRACTED").length,
  };
}

/**
 * Internal ranking only. NOT a truth probability. Returns null when there are
 * too few claims to say anything.
 */
export function evidenceStrength(matrix: ClaimEvidence[]): EvidenceStrengthScore | null {
  if (matrix.length < 2) return null;
  const n = matrix.length;
  const frac = (p: (m: ClaimEvidence) => boolean) => matrix.filter(p).length / n;

  const independentCorroboration = frac((m) => m.independentSupportCount >= 2) * 30;
  const primaryEvidence = frac((m) => m.primaryEvidence.length > 0 || m.officialStatements.length > 0) * 25;
  const sourceReliability = 15; // neutral until observed reliability is available (Phase 5)
  const claimAgreement = frac((m) => m.status === "HIGHLY_CORROBORATED" || m.status === "CORROBORATED") * 20;
  const contradictionPenalty = -frac((m) => m.status === "DISPUTED") * 20;
  const singleSourcePenalty = -frac((m) => m.status === "SINGLE_SOURCE") * 10;
  const correctionPenalty = -frac((m) => m.status === "CORRECTED" || m.status === "RETRACTED") * 15;

  const raw =
    independentCorroboration +
    primaryEvidence +
    sourceReliability +
    claimAgreement +
    contradictionPenalty +
    singleSourcePenalty +
    correctionPenalty;

  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    components: {
      independentCorroboration: Math.round(independentCorroboration),
      primaryEvidence: Math.round(primaryEvidence),
      sourceReliability,
      claimAgreement: Math.round(claimAgreement),
      contradictionPenalty: Math.round(contradictionPenalty),
      singleSourcePenalty: Math.round(singleSourcePenalty),
      correctionPenalty: Math.round(correctionPenalty),
    },
    disclaimer:
      "Evidence strength — an internal ranking of how well-supported the claims are. NOT a probability that the story is true.",
  };
}
