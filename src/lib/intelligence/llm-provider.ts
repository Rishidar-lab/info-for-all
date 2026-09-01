import { CLAIM_TYPES, type ClaimType } from "../domain/types";
import { clamp, normalizeWhitespace, round } from "../text";
import { logger } from "../logger";
import { MockProvider } from "./mock-provider";
import {
  type AIProvider,
  type ClaimExtractionInput,
  type ClaimForComparison,
  type ClaimRelationshipFinding,
  type EventSummary,
  type EventSummaryInput,
  type ExtractedClaim,
  type GenerateOptions,
} from "./provider";

const log = logger.child({ module: "intelligence" });
const CLAIM_TYPE_SET = new Set<string>(CLAIM_TYPES);
const REL_TYPES = new Set(["SUPPORTS", "CONTRADICTS", "REFINES", "DUPLICATES"]);

/**
 * Base class for real LLM providers. Subclasses implement `generate` and `embed`;
 * the analytical methods are expressed as constrained generation calls whose JSON
 * output is validated. Any failure (network, parse, schema) degrades to the
 * deterministic MockProvider so IFA never blocks on model availability, and
 * provenance is always attached by the caller regardless of provider.
 */
export abstract class LlmProvider implements AIProvider {
  abstract readonly name: string;
  protected readonly fallback = new MockProvider();

  abstract generate(prompt: string, opts?: GenerateOptions): Promise<string>;
  abstract embed(texts: string[]): Promise<number[][]>;

  protected async generateJson<T>(prompt: string, system: string): Promise<T | null> {
    try {
      const raw = await this.generate(prompt, { system, temperature: 0, maxTokens: 2000 });
      const match = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (!match) return null;
      return JSON.parse(match[0]) as T;
    } catch (err) {
      log.warn("intelligence.json_parse_failed", {
        provider: this.name,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async extractClaims(input: ClaimExtractionInput): Promise<ExtractedClaim[]> {
    const mockClaims = await this.fallback.extractClaims(input);
    const system =
      "You extract discrete, checkable factual claims from news text. " +
      "Return ONLY a JSON array. Each item: {canonicalText, originalText, type, confidence, paragraph}. " +
      `type is one of: ${CLAIM_TYPES.join(", ")}. Do not editorialize or infer beyond the text.`;
    const prompt =
      `TITLE: ${input.title}\n\nTEXT:\n${input.text}\n\n` +
      "Extract up to 12 claims as JSON.";
    const parsed = await this.generateJson<
      { canonicalText: string; originalText?: string; type?: string; confidence?: number; paragraph?: number }[]
    >(prompt, system);
    if (!Array.isArray(parsed) || parsed.length === 0) return mockClaims;

    const byNormalized = new Map(mockClaims.map((c) => [c.normalizedMeaning, c] as const));
    return parsed
      .filter((item) => item && typeof item.canonicalText === "string")
      .slice(0, 12)
      .map((item): ExtractedClaim => {
        const canonicalText = normalizeWhitespace(item.canonicalText);
        const type: ClaimType = CLAIM_TYPE_SET.has(item.type ?? "")
          ? (item.type as ClaimType)
          : "observation";
        const normalizedMeaning = canonicalText.toLowerCase();
        const enriched = byNormalized.get(normalizedMeaning);
        return {
          canonicalText,
          originalText: normalizeWhitespace(item.originalText ?? item.canonicalText),
          normalizedMeaning: enriched?.normalizedMeaning ?? normalizedMeaning,
          type,
          extractionConfidence: round(clamp(item.confidence ?? 0.6, 0.3, 0.95), 2),
          sourceParagraph:
            typeof item.paragraph === "number" ? item.paragraph : (enriched?.sourceParagraph ?? null),
          entities: enriched?.entities ?? [],
        };
      });
  }

  async summarizeEvent(input: EventSummaryInput): Promise<EventSummary> {
    const provenanceArticleIds = [...input.articles]
      .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())
      .slice(0, 4)
      .map((a) => a.id);
    const system =
      "You write a two-to-three sentence neutral factual summary of a news event. " +
      "No adjectives of judgement, no speculation, no attribution of motive. Return ONLY {summary}.";
    const prompt =
      `ARTICLES:\n${input.articles.map((a) => `- ${a.title}: ${a.excerpt ?? ""}`).join("\n")}\n\n` +
      `KEY CLAIMS:\n${(input.keyClaims ?? []).map((c) => `- ${c.text}`).join("\n")}`;
    const parsed = await this.generateJson<{ summary?: string }>(prompt, system);
    const summary = parsed?.summary ? normalizeWhitespace(parsed.summary) : null;
    if (!summary) return this.fallback.summarizeEvent(input);
    return { summary, provenanceArticleIds };
  }

  async detectContradictions(claims: ClaimForComparison[]): Promise<ClaimRelationshipFinding[]> {
    const mock = await this.fallback.detectContradictions(claims);
    const system =
      "You compare factual claims about one event and identify relationships. " +
      "Return ONLY a JSON array of {fromId, toId, type, confidence, rationale}. " +
      "type is one of: SUPPORTS, CONTRADICTS, REFINES, DUPLICATES. Only report clear relationships.";
    const prompt = `CLAIMS:\n${claims.map((c) => `${c.id}: ${c.canonicalText}`).join("\n")}`;
    const parsed = await this.generateJson<
      { fromId?: string; toId?: string; type?: string; confidence?: number; rationale?: string }[]
    >(prompt, system);
    if (!Array.isArray(parsed) || parsed.length === 0) return mock;

    const ids = new Set(claims.map((c) => c.id));
    const findings = parsed
      .filter(
        (r) =>
          r && ids.has(r.fromId ?? "") && ids.has(r.toId ?? "") && REL_TYPES.has(r.type ?? ""),
      )
      .map(
        (r): ClaimRelationshipFinding => ({
          fromId: r.fromId as string,
          toId: r.toId as string,
          type: r.type as ClaimRelationshipFinding["type"],
          confidence: round(clamp(r.confidence ?? 0.6, 0.3, 0.95), 2),
          rationale: normalizeWhitespace(r.rationale ?? "Model-identified relationship."),
        }),
      );
    return findings.length > 0 ? findings : mock;
  }
}
