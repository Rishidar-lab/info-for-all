import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Claim, ClaimStatus } from "./types";
import { clean, stableId } from "@/lib/live/text";
import { stripHeadlinePrefix } from "@/lib/live/entities";
import type { ClaimCandidate } from "./extract";
import { extractCandidates } from "./extract";
import { independentGroupsFor, type IndependenceResult } from "./corroborate";
import { detectCorrections, toProvenance } from "./provenance";

/** A claim before confidence scoring is applied (see confidence.ts + index.ts). */
export type ClaimDraft = Omit<Claim, "confidence" | "confidenceBand" | "rationale">;

const uniq = <T,>(xs: T[]): T[] => [...new Set(xs)];

/**
 * Group raw candidates (one per article sentence) into canonical claims.
 *
 * Conservative status assignment — the whole point of v0.3:
 *   - every candidate attributed to a speaker   → "attributed"   (never a bare fact)
 *   - support in ≥2 independent source groups   → "corroborated"
 *   - support in 1 group but ≥2 publishers      → "partially-corroborated"
 *   - otherwise                                  → "single-source"
 * A claim is only promoted to "disputed" later, and only on a genuine conflict.
 */
export function normaliseClaims(
  cluster: LiveCluster,
  articles: LiveArticle[],
  independence: IndependenceResult,
  now: number,
): ClaimDraft[] {
  const generatedAt = new Date(now).toISOString();
  const artById = new Map(articles.map((a) => [a.id, a]));

  const byKey = new Map<string, ClaimCandidate[]>();
  for (const c of extractCandidates(cluster, articles)) {
    const list = byKey.get(c.matchKey);
    if (list) list.push(c);
    else byKey.set(c.matchKey, [c]);
  }

  const representative = clean(stripHeadlinePrefix(cluster.title), 200);

  const drafts: ClaimDraft[] = [];
  for (const [key, group] of byKey) {
    const supportArticleIds = uniq(group.map((c) => c.articleId));
    const supportPublishers = uniq(group.map((c) => c.publisherId));
    const groups = independentGroupsFor(supportArticleIds, independence.groups);
    const times = group
      .map((c) => artById.get(c.articleId)?.publishedAt ?? generatedAt)
      .sort();

    const allAttributed = group.every((c) => c.attribution);
    let status: ClaimStatus;
    if (allAttributed) status = "attributed";
    else if (groups.length >= 2) status = "corroborated";
    else if (supportPublishers.length >= 2) status = "partially-corroborated";
    else status = "single-source";

    // For the event-level "head" claim, the cluster's verified representative
    // headline is the preferred wording — unless it is itself a pipe-delimited
    // TV-segment title, in which case fall back to the cleanest candidate.
    const repClean = !/\s[|•]\s/.test(representative);
    const canonical =
      key.endsWith(":head") && repClean
        ? group.find((c) => c.canonicalText === representative) ?? pickCanonical(group)
        : pickCanonical(group);
    // Only carry an original-language rendering when the CANONICAL wording itself
    // came from a Tamil source — never bolt an unrelated Tamil headline onto an
    // English canonical. Per-article Tamil text is still kept in provenance.
    const taOrig =
      canonical.language === "ta" && canonical.sourceTextOriginal
        ? canonical.sourceTextOriginal
        : undefined;
    const corrections = detectCorrections(group, artById);

    drafts.push({
      id: stableId("claim", key),
      eventId: cluster.id,
      canonicalText: canonical.canonicalText,
      canonicalTextOriginal: taOrig,
      originalLanguage: taOrig ? "ta" : undefined,
      type: canonical.type,
      status,
      subjects: uniq(group.flatMap((c) => c.subjects)).filter(Boolean),
      predicates: uniq(group.flatMap((c) => c.predicates)).filter(Boolean),
      objects: uniq(group.flatMap((c) => c.objects)).filter(Boolean),
      supportingArticleIds: supportArticleIds,
      contradictingArticleIds: [],
      supportingPublisherIds: supportPublishers,
      independentSourceGroups: groups,
      primaryEvidenceIds: [],
      firstSeenAt: times[0],
      lastSeenAt: times[times.length - 1],
      provenance: group.map((c) =>
        toProvenance(c, artById.get(c.articleId)?.publishedAt ?? generatedAt),
      ),
      updates: [],
      corrections,
      notes: [],
    });
  }

  return drafts;
}

/**
 * Prefer a direct (non-attributed), clean, higher-confidence rendering as the
 * canonical text. "Clean" penalises pipe-delimited TV-segment headlines
 * ("CM Vijay | … | News18") in favour of a real sentence headline.
 */
function pickCanonical(group: ClaimCandidate[]): ClaimCandidate {
  const pipes = (s: string) => (s.match(/\s[|•]\s/g) ?? []).length;
  const sorted = [...group].sort(
    (a, b) =>
      (a.attribution ? 1 : 0) - (b.attribution ? 1 : 0) ||
      pipes(a.canonicalText) - pipes(b.canonicalText) ||
      b.extractionConfidence - a.extractionConfidence ||
      b.canonicalText.length - a.canonicalText.length,
  );
  return sorted[0]!;
}
