import type { LiveArticle } from "@/lib/live/types";
import type { Claim, ClaimCorrection, ClaimProvenance } from "./types";
import type { ClaimCandidate } from "./extract";

/**
 * Provenance is preserved at every step: EVENT → CLAIM → ARTICLE → SOURCE, and
 * CLAIM → PRIMARY EVIDENCE. Nothing here invents a link — every record traces
 * back to a specific article sentence that was actually ingested.
 */

export function toProvenance(c: ClaimCandidate, seenAt: string): ClaimProvenance {
  return {
    articleId: c.articleId,
    publisherId: c.publisherId,
    sourceUrl: c.sourceUrl,
    sourceText: c.sourceText,
    sourceTextOriginal: c.sourceTextOriginal,
    language: c.language,
    attribution: c.attribution,
    extractionMethod:
      c.matchKey.includes(":stat:") || c.matchKey.includes(":rule:") ? "rule" : "structured-feed",
    confidence: c.extractionConfidence,
    seenAt,
  };
}

const CORRECTION_CUES =
  /\b(corrected?|correction|an earlier version|we earlier reported|revised (?:figure|to)|updated to correct|clarif(?:y|ication)|rectif)/i;

/**
 * A publisher-issued correction: the source text itself signals that a previous
 * value was wrong. We record it — we never silently overwrite history.
 */
export function detectCorrections(group: ClaimCandidate[], articles: Map<string, LiveArticle>): ClaimCorrection[] {
  const out: ClaimCorrection[] = [];
  for (const c of group) {
    if (!CORRECTION_CUES.test(c.sourceText)) continue;
    const nums = c.sourceText.match(/\b[\d,]+(?:\.\d+)?\b/g) ?? [];
    if (nums.length < 2) continue;
    const original = nums[0] ?? "";
    const corrected = nums[nums.length - 1] ?? "";
    out.push({
      publisherId: c.publisherId,
      articleId: c.articleId,
      at: articles.get(c.articleId)?.publishedAt ?? c.sourceText,
      original,
      corrected,
    });
  }
  return out;
}

export interface ProvenanceStep {
  label: string;
  detail: string;
  url?: string;
}

/** EVENT → CLAIM → ARTICLE → SOURCE, for the claim-detail UI. Structured, not model CoT. */
export function provenanceChain(claim: Claim): ProvenanceStep[] {
  const steps: ProvenanceStep[] = [
    { label: "Event", detail: claim.eventId },
    {
      label: "Claim",
      detail: `${claim.canonicalText} — classified ${claim.status.replace("-", " ")}`,
    },
  ];
  for (const p of claim.provenance) {
    steps.push({
      label: "Article",
      detail: `${p.publisherId}${p.attribution ? ` — attributed to ${p.attribution}` : ""}: “${p.sourceText ?? ""}”`,
      url: p.sourceUrl,
    });
  }
  return steps;
}
