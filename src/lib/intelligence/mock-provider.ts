import { CLAIM_TYPES, type ClaimType } from "../domain/types";
import {
  clamp,
  contentTokens,
  jaccard,
  normalizeWhitespace,
  round,
  splitSentences,
  toParagraphs,
} from "../text";
import {
  EMBEDDING_DIM,
  type AIProvider,
  type ClaimExtractionInput,
  type ClaimForComparison,
  type ClaimRelationshipFinding,
  type EventSummary,
  type EventSummaryInput,
  type ExtractedClaim,
  type GenerateOptions,
} from "./provider";

/**
 * Deterministic, rule-based provider. No network, no key, no randomness.
 * It is transparent by construction: every heuristic below is inspectable and
 * unit-tested. It is NOT a substitute for a real model — see docs/METHODOLOGY.md
 * for its known limitations.
 */

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ATTRIBUTION_CUE = /\b(said|says|told|according to|stated|announced|confirmed|in a statement|wrote|testified|acknowledged)\b/i;
const OFFICIAL_ENTITY = /\b(government|ministry|department|parliament|congress|senate|commission|agency|court|regulator|white house|central bank|committee)\b/i;
const PREDICTION_CUE = /\b(will|expected to|projected to|plans to|aims to|could|is set to|forecast|would likely|by 20\d\d)\b/i;
const ALLEGATION_CUE = /\b(alleged|allegedly|accused|accusation|claims without evidence|unverified|purported|denied wrongdoing)\b/i;
const OPINION_CUE = /\b(should|must|we believe|it is unacceptable|welcome|condemn|praised|criticised|criticized|argues that|is wrong to)\b/i;
const HISTORICAL_CUE = /\b(since 19\d\d|since 20[0-1]\d|historically|decades ago|in the 19\d\ds|first introduced in)\b/i;
const STAT_CUE = /(\d[\d,.]*\s?(?:%|percent|per cent|million|billion|trillion|thousand)|\$\s?\d|\b\d{2,}\b)/i;
const NEGATION_CUE = /\b(not|no|never|denied|denies|rejected|rejects|refused|without|contrary to|disputes?)\b/i;
const UNIVERSAL_SCOPE = /\b(all|every|any|entire|across the board|blanket|universal)\b/i;
const LIMITED_SCOPE = /\b(only|solely|limited to|restricted to|just|narrowly|high-risk|certain|specific)\b/i;

function classify(sentence: string): ClaimType {
  if (ALLEGATION_CUE.test(sentence)) return "allegation";
  if (STAT_CUE.test(sentence)) return "statistic";
  if (/["“][^"”]{6,}["”]/.test(sentence) && OFFICIAL_ENTITY.test(sentence)) return "official_statement";
  if (ATTRIBUTION_CUE.test(sentence)) return "attribution";
  if (PREDICTION_CUE.test(sentence)) return "prediction";
  if (HISTORICAL_CUE.test(sentence)) return "historical";
  if (OPINION_CUE.test(sentence)) return "opinion";
  return "observation";
}

function extractEntities(text: string, known: string[] = []): string[] {
  const found = new Set<string>();
  for (const name of known) {
    if (name && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
      found.add(name);
    }
  }
  const proper = text.match(/\b([A-Z][a-z0-9]+(?:\s+(?:of|the|and|for)?\s?[A-Z][a-z0-9]+){0,4})\b/g) ?? [];
  for (const candidate of proper) {
    const trimmed = candidate.trim();
    if (trimmed.split(/\s+/).length >= 2 || trimmed.length > 5) found.add(trimmed);
  }
  return [...found].slice(0, 8);
}

function canonicalize(sentence: string): string {
  let s = normalizeWhitespace(sentence).replace(/^(and|but|however|meanwhile|moreover|also|so)\b[,\s]*/i, "");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]["”]?$/.test(s)) s += ".";
  return s;
}

function isClaimLike(sentence: string): boolean {
  const tokens = sentence.split(/\s+/);
  if (tokens.length < 6 || tokens.length > 60) return false;
  if (/^(the following|here is|read more|subscribe|advertisement)/i.test(sentence)) return false;
  return (
    STAT_CUE.test(sentence) ||
    ATTRIBUTION_CUE.test(sentence) ||
    PREDICTION_CUE.test(sentence) ||
    ALLEGATION_CUE.test(sentence) ||
    /["“][^"”]{6,}["”]/.test(sentence) ||
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(sentence)
  );
}

export class MockProvider implements AIProvider {
  readonly name = "mock";

  async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
    const head = normalizeWhitespace(prompt).slice(0, 240);
    return `[mock:${opts?.system ? "sys" : "plain"}] ${head}`;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const vector = new Array<number>(EMBEDDING_DIM).fill(0);
      const tokens = contentTokens(text);
      for (const token of tokens) {
        vector[hash32(token) % EMBEDDING_DIM] += 1;
        const bigramBucket = hash32(`b:${token}`) % EMBEDDING_DIM;
        vector[bigramBucket] += 0.5;
      }
      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
      return vector.map((v) => round(v / norm, 5));
    });
  }

  async extractClaims(input: ClaimExtractionInput): Promise<ExtractedClaim[]> {
    const paragraphs = toParagraphs(input.text.trim() || input.title);
    const seen = new Set<string>();
    const claims: ExtractedClaim[] = [];

    paragraphs.forEach((paragraph, paragraphIndex) => {
      for (const sentence of splitSentences(paragraph)) {
        if (!isClaimLike(sentence)) continue;
        const normalizedMeaning = contentTokens(sentence).sort().join(" ");
        if (!normalizedMeaning || seen.has(normalizedMeaning)) continue;
        seen.add(normalizedMeaning);

        const type = classify(sentence);
        let confidence = 0.55;
        if (STAT_CUE.test(sentence)) confidence += 0.1;
        if (/["“][^"”]{6,}["”]/.test(sentence)) confidence += 0.1;
        if (ATTRIBUTION_CUE.test(sentence)) confidence += 0.06;
        if (paragraphIndex === 0) confidence += 0.08;
        if (sentence.split(/\s+/).length > 40) confidence -= 0.12;
        if (type === "opinion" || type === "allegation") confidence -= 0.08;

        claims.push({
          canonicalText: canonicalize(sentence),
          originalText: normalizeWhitespace(sentence),
          normalizedMeaning,
          type,
          extractionConfidence: round(clamp(confidence, 0.3, 0.95), 2),
          sourceParagraph: paragraphIndex,
          entities: extractEntities(sentence, input.knownEntities),
        });
      }
    });

    return claims.slice(0, 12);
  }

  async summarizeEvent(input: EventSummaryInput): Promise<EventSummary> {
    const ordered = [...input.articles].sort(
      (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime(),
    );
    const provenance: string[] = [];
    const sentences: string[] = [];

    const topClaims = [...(input.keyClaims ?? [])]
      .sort((a, b) => b.corroborationCount - a.corroborationCount)
      .slice(0, 2);
    for (const claim of topClaims) sentences.push(canonicalize(claim.text));

    if (sentences.length === 0 && ordered[0]) {
      sentences.push(canonicalize(ordered[0].title));
    }
    for (const article of ordered.slice(0, 4)) provenance.push(article.id);

    const summary = normalizeWhitespace(sentences.join(" "));
    return {
      summary: summary || "Reporting on this event is still being aggregated.",
      provenanceArticleIds: provenance,
    };
  }

  async detectContradictions(claims: ClaimForComparison[]): Promise<ClaimRelationshipFinding[]> {
    const findings: ClaimRelationshipFinding[] = [];
    for (let i = 0; i < claims.length; i += 1) {
      for (let j = i + 1; j < claims.length; j += 1) {
        const a = claims[i];
        const b = claims[j];
        const overlap = jaccard(a.normalizedMeaning.split(" "), b.normalizedMeaning.split(" "));
        const sharedEntity = a.entities.some((e) => b.entities.includes(e));
        if (overlap < 0.18 && !sharedEntity) continue;

        const aNeg = NEGATION_CUE.test(a.canonicalText);
        const bNeg = NEGATION_CUE.test(b.canonicalText);
        const scopeConflict =
          (UNIVERSAL_SCOPE.test(a.canonicalText) && LIMITED_SCOPE.test(b.canonicalText)) ||
          (UNIVERSAL_SCOPE.test(b.canonicalText) && LIMITED_SCOPE.test(a.canonicalText));
        const numbersA = a.canonicalText.match(/\d[\d,.]*/g) ?? [];
        const numbersB = b.canonicalText.match(/\d[\d,.]*/g) ?? [];
        const numericConflict =
          a.type === "statistic" &&
          b.type === "statistic" &&
          numbersA.length > 0 &&
          numbersB.length > 0 &&
          numbersA[0] !== numbersB[0];

        if ((aNeg !== bNeg && overlap > 0.35) || scopeConflict || (numericConflict && overlap > 0.3)) {
          findings.push({
            fromId: a.id,
            toId: b.id,
            type: "CONTRADICTS",
            confidence: round(clamp(0.45 + overlap * 0.4, 0.4, 0.9), 2),
            rationale: scopeConflict
              ? "Sources describe incompatible scope (universal vs. limited)."
              : numericConflict
                ? "Sources report different figures for the same measure."
                : "One statement negates a claim the other asserts.",
          });
          continue;
        }
        if (overlap >= 0.7) {
          findings.push({
            fromId: a.id,
            toId: b.id,
            type: "DUPLICATES",
            confidence: round(clamp(overlap, 0.6, 0.95), 2),
            rationale: "Near-identical factual content.",
          });
        } else if (overlap >= 0.42) {
          findings.push({
            fromId: a.id,
            toId: b.id,
            type: "REFINES",
            confidence: round(clamp(0.3 + overlap * 0.4, 0.3, 0.7), 2),
            rationale: "One statement adds detail or qualification to the other.",
          });
        }
      }
    }
    return findings;
  }
}

export const CLAIM_TYPE_SET: ReadonlySet<string> = new Set(CLAIM_TYPES);
