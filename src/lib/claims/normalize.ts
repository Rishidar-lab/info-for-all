import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Claim, ClaimStatus } from "./types";
import { clean, stableId } from "@/lib/live/text";
import { stripHeadlinePrefix } from "@/lib/live/entities";
import type { ClaimCandidate } from "./extract";
import { extractCandidates } from "./extract";
import { independentGroupsFor } from "./corroborate";
import type { IndependenceResult } from "./corroborate";
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

    // "attributed" requires a real speaker on every candidate — otherwise a
    // forecast / allegation we could not pin to a speaker stays "single-source"
    // (still never a bare fact: its `type` carries that).
    const allAttributed = group.length > 0 && group.every((c) => c.attribution);
    const attributedFamily = group.some(
      (c) => c.type === "attribution" || c.type === "allegation" || c.type === "prediction",
    );
    let status: ClaimStatus;
    if (allAttributed) status = "attributed";
    else if (attributedFamily && group.some((c) => c.attribution)) status = "attributed";
    else if (attributedFamily) status = supportPublishers.length >= 2 ? "partially-corroborated" : "single-source";
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
    const canonicalIsTamil = canonical.language === "ta";
    const taOrig =
      canonicalIsTamil && canonical.sourceTextOriginal ? canonical.sourceTextOriginal : undefined;
    // v0.4 Phase 14: IFA has no translation layer. When the canonical wording is
    // Tamil we keep it Tamil rather than fabricate an English rendering; when an
    // English candidate exists it is preferred as canonical (pickCanonical) and
    // the Tamil is retained per-article in provenance.
    const canonicalLanguage: "ta" | "en" = canonicalIsTamil ? "ta" : "en";
    const translationMethod: "none" | "not-applicable" = canonicalIsTamil ? "none" : "not-applicable";
    const corrections = detectCorrections(group, artById);

    drafts.push({
      id: stableId("claim", key),
      eventId: cluster.id,
      canonicalText: canonical.canonicalText,
      canonicalTextOriginal: taOrig ?? (canonicalIsTamil ? canonical.canonicalText : undefined),
      originalLanguage: canonicalIsTamil ? "ta" : undefined,
      canonicalLanguage,
      translationMethod,
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

  return mergeByIdentity(drafts, independence);
}

/**
 * Phase 13 — claim identity. Two attributed / allegation / prediction drafts that
 * clearly say the same thing (e.g. "IMD expects heavy rain" from two papers, or
 * "the minister said 10,000 got aid" reported twice) should be ONE claim even
 * though their rule-derived match keys differ. Conservative: statistic and
 * official-action claims are never merged here (they already share keys when
 * equivalent, and numeric conflicts must stay separate).
 */
function mergeByIdentity(drafts: ClaimDraft[], independence: IndependenceResult): ClaimDraft[] {
  const MERGEABLE = new Set(["attribution", "allegation", "prediction"]);
  const out: ClaimDraft[] = [];
  for (const d of drafts) {
    if (!MERGEABLE.has(d.type)) {
      out.push(d);
      continue;
    }
    const host = out.find(
      (o) =>
        MERGEABLE.has(o.type) &&
        o.type === d.type &&
        !numericallyConflicting(o, d) &&
        sameAssertion(o.canonicalText, d.canonicalText),
    );
    if (!host) {
      out.push(d);
      continue;
    }
    host.supportingArticleIds = uniq([...host.supportingArticleIds, ...d.supportingArticleIds]);
    host.supportingPublisherIds = uniq([...host.supportingPublisherIds, ...d.supportingPublisherIds]);
    host.provenance = [...host.provenance, ...d.provenance];
    host.subjects = uniq([...host.subjects, ...d.subjects]).filter(Boolean);
    host.corrections = [...host.corrections, ...d.corrections];
    host.independentSourceGroups = independentGroupsFor(host.supportingArticleIds, independence.groups);
    const times = [host.firstSeenAt, host.lastSeenAt, d.firstSeenAt, d.lastSeenAt].sort();
    host.firstSeenAt = times[0]!;
    host.lastSeenAt = times[times.length - 1]!;
    // An attributed claim is never promoted past "attributed" by corroboration —
    // two papers quoting the same speaker is still one speaker. Only mark it
    // "attributed" when a speaker is actually recorded in provenance.
    if (host.provenance.some((p) => p.attribution)) host.status = "attributed";
    else if (host.supportingPublisherIds.length >= 2 && host.status === "single-source") {
      host.status = "partially-corroborated";
    }
  }
  return out;
}

function assertionTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/^[a-z .'-]+?\b(?:said|stated|alleged|expect|expects|forecast|announced|noted)\b:?\s*/i, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !IDENTITY_STOP.has(w)),
  );
}

const IDENTITY_STOP = new Set([
  "said", "says", "stated", "alleged", "expect", "expects", "expected", "forecast", "would",
  "will", "that", "this", "have", "been", "from", "with", "over", "into", "after", "amid",
  "tamil", "nadu", "india", "state", "government",
]);

/** Two claims that assert DIFFERENT values for the same numeric predicate must never merge. */
function numericallyConflicting(a: ClaimDraft, b: ClaimDraft): boolean {
  const pa = a.predicates[0];
  const pb = b.predicates[0];
  if (!pa || pa !== pb) return false;
  const va = Number(a.objects[0]);
  const vb = Number(b.objects[0]);
  return Number.isFinite(va) && Number.isFinite(vb) && va !== vb;
}

function sameAssertion(a: string, b: string): boolean {
  const ta = assertionTokens(a);
  const tb = assertionTokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jac = inter / (ta.size + tb.size - inter);
  // Both drafts already come from ONE cluster (same event), so 3+ shared
  // content words is a strong same-assertion signal.
  return jac >= 0.5 || (inter >= 3 && jac >= 0.25) || (inter >= 2 && jac >= 0.4);
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
