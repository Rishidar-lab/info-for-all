import type { ClaimRelationshipType, ClaimType } from "../domain/types";

/**
 * Provider-agnostic intelligence interface.
 *
 * IFA never hard-codes an LLM vendor. Every analytical capability is expressed
 * here; adapters implement it (see mock-provider.ts, anthropic-provider.ts,
 * openai-provider.ts). The MOCK adapter is deterministic and keyless and backs
 * demo mode, development and tests.
 *
 * Every method returns provenance-bearing structures — never a bare conclusion.
 */

export interface GenerateOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaimExtractionInput {
  articleId: string;
  title: string;
  /** Full text or best-available excerpt. Paragraph boundaries are respected. */
  text: string;
  knownEntities?: string[];
}

export interface ExtractedClaim {
  canonicalText: string;
  originalText: string;
  /** Lowercased content-token signature used for corroboration / dedupe matching. */
  normalizedMeaning: string;
  type: ClaimType;
  extractionConfidence: number;
  /** Provenance: paragraph index within the source article (0-based). */
  sourceParagraph: number | null;
  entities: string[];
}

export interface EventSummaryInput {
  articles: { id: string; title: string; excerpt: string | null; publishedAt: Date }[];
  keyClaims?: { text: string; corroborationCount: number }[];
}

export interface EventSummary {
  summary: string;
  /** IDs of the articles that informed the summary. */
  provenanceArticleIds: string[];
}

export interface ClaimForComparison {
  id: string;
  canonicalText: string;
  normalizedMeaning: string;
  type: ClaimType;
  entities: string[];
}

export interface ClaimRelationshipFinding {
  fromId: string;
  toId: string;
  type: ClaimRelationshipType;
  confidence: number;
  rationale: string;
}

export interface AIProvider {
  readonly name: string;
  /** Free-form generation. Used sparingly; provenance is the caller's responsibility. */
  generate(prompt: string, opts?: GenerateOptions): Promise<string>;
  /** Deterministic vector embeddings for similarity search / clustering. */
  embed(texts: string[]): Promise<number[][]>;
  extractClaims(input: ClaimExtractionInput): Promise<ExtractedClaim[]>;
  summarizeEvent(input: EventSummaryInput): Promise<EventSummary>;
  detectContradictions(claims: ClaimForComparison[]): Promise<ClaimRelationshipFinding[]>;
}

export const EMBEDDING_DIM = 256;
