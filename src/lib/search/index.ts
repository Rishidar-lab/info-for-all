import { contentTokens, normalizeWhitespace, round, truncate } from "../text";

/**
 * Cross-entity search.
 *
 * v1 is an in-memory TF-IDF ranker over a corpus the caller assembles from the
 * database (events, articles, claims, sources, entities, topics). It implements
 * `SearchService` so it can be swapped for Postgres full-text search or a vector
 * index (pgvector) later — the API contract does not change. See
 * docs/ARCHITECTURE.md § Search.
 */

export type SearchResultType = "event" | "article" | "claim" | "source" | "entity" | "topic";

export interface SearchDoc {
  type: SearchResultType;
  id: string;
  title: string;
  body: string;
  url: string;
  /** Type-level prior — events rank above raw articles for the same match. */
  weight?: number;
  meta?: Record<string, unknown>;
}

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  snippet: string;
  url: string;
  score: number;
  meta: Record<string, unknown>;
}

export interface SearchOptions {
  limit?: number;
  types?: SearchResultType[];
}

export interface SearchService {
  readonly method: string;
  index(docs: SearchDoc[]): void;
  search(query: string, options?: SearchOptions): SearchResult[];
}

const DEFAULT_WEIGHT: Record<SearchResultType, number> = {
  event: 1.35,
  claim: 1.1,
  topic: 1.05,
  source: 1.0,
  entity: 0.95,
  article: 0.9,
};

interface IndexedDoc extends SearchDoc {
  titleTokens: string[];
  bodyTokens: string[];
  haystack: string;
}

export class InMemorySearch implements SearchService {
  readonly method = "tfidf-v1";
  private docs: IndexedDoc[] = [];
  private df = new Map<string, number>();

  index(docs: SearchDoc[]): void {
    this.docs = docs.map((doc) => {
      const titleTokens = contentTokens(doc.title);
      const bodyTokens = contentTokens(doc.body);
      return {
        ...doc,
        titleTokens,
        bodyTokens,
        haystack: normalizeWhitespace(`${doc.title} ${doc.body}`).toLowerCase(),
      };
    });
    this.df = new Map();
    for (const doc of this.docs) {
      for (const token of new Set([...doc.titleTokens, ...doc.bodyTokens])) {
        this.df.set(token, (this.df.get(token) ?? 0) + 1);
      }
    }
  }

  private idf(token: string): number {
    const n = this.docs.length || 1;
    return Math.log(1 + n / ((this.df.get(token) ?? 0) + 1));
  }

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const limit = options.limit ?? 20;
    const queryTokens = contentTokens(query);
    const phrase = normalizeWhitespace(query).toLowerCase();
    if (queryTokens.length === 0) return [];

    const scored: SearchResult[] = [];
    for (const doc of this.docs) {
      if (options.types && !options.types.includes(doc.type)) continue;

      let score = 0;
      for (const token of queryTokens) {
        const idf = this.idf(token);
        const titleTf = doc.titleTokens.filter((t) => t === token).length;
        const bodyTf = doc.bodyTokens.filter((t) => t === token).length;
        if (titleTf === 0 && bodyTf === 0) continue;
        score += idf * (titleTf * 3 + bodyTf) * 0.6;
        if (doc.titleTokens.includes(token)) score += idf * 0.8;
      }
      if (score === 0) continue;
      if (phrase.length > 2 && doc.haystack.includes(phrase)) score += 4;

      score *= doc.weight ?? DEFAULT_WEIGHT[doc.type];
      scored.push({
        type: doc.type,
        id: doc.id,
        title: doc.title,
        snippet: this.snippet(doc, queryTokens),
        url: doc.url,
        score: round(score, 3),
        meta: doc.meta ?? {},
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private snippet(doc: IndexedDoc, queryTokens: string[]): string {
    const body = normalizeWhitespace(doc.body);
    if (!body) return truncate(doc.title, 160);
    const lower = body.toLowerCase();
    let at = -1;
    for (const token of queryTokens) {
      const idx = lower.indexOf(token);
      if (idx !== -1 && (at === -1 || idx < at)) at = idx;
    }
    if (at === -1) return truncate(body, 200);
    const start = Math.max(0, at - 80);
    const slice = body.slice(start, start + 240);
    return `${start > 0 ? "…" : ""}${slice.trim()}${start + 240 < body.length ? "…" : ""}`;
  }
}

export function createSearchService(): SearchService {
  return new InMemorySearch();
}
