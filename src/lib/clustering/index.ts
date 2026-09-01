import { contentTokens, cosineBag, jaccard, round, termFrequency } from "../text";

/**
 * Story clustering — groups articles that describe the same underlying event.
 *
 * v1 is a transparent heuristic blend of title overlap, entity overlap, body
 * keyword similarity and temporal proximity. It implements `ClusteringService`
 * so an embedding / learned reranker can replace it without touching the
 * ingestion pipeline. See docs/METHODOLOGY.md.
 */

export interface ClusterArticle {
  id?: string;
  title: string;
  text: string;
  publishedAt: Date;
  entities: string[];
}

export interface ClusterEvent {
  id: string;
  title: string;
  representativeText: string;
  entities: string[];
  startedAt: Date;
  latestUpdateAt: Date;
}

export interface SimilarityBreakdown {
  title: number;
  entity: number;
  keyword: number;
  temporal: number;
  score: number;
}

export interface ClusterAssignment {
  eventId: string | null;
  similarity: number;
  breakdown: SimilarityBreakdown;
  method: string;
}

export interface ClusteringService {
  readonly method: string;
  readonly joinThreshold: number;
  assign(article: ClusterArticle, events: ClusterEvent[]): ClusterAssignment;
}

const WEIGHTS = { title: 0.4, entity: 0.35, keyword: 0.15, temporal: 0.1 } as const;

function normEntity(name: string): string {
  return name.toLowerCase().replace(/^the\s+/, "").trim();
}

export function similarityBreakdown(
  a: { title: string; text: string; publishedAt: Date; entities: string[] },
  b: { title: string; text: string; publishedAt: Date; entities: string[] },
): SimilarityBreakdown {
  const title = jaccard(contentTokens(a.title), contentTokens(b.title));
  const entity = jaccard(a.entities.map(normEntity), b.entities.map(normEntity));
  const keyword = cosineBag(
    termFrequency(contentTokens(a.text).slice(0, 400)),
    termFrequency(contentTokens(b.text).slice(0, 400)),
  );
  const hoursApart = Math.abs(a.publishedAt.getTime() - b.publishedAt.getTime()) / 3_600_000;
  const temporal = Math.exp(-hoursApart / 72);

  const score =
    WEIGHTS.title * title +
    WEIGHTS.entity * entity +
    WEIGHTS.keyword * keyword +
    WEIGHTS.temporal * temporal;

  return {
    title: round(title, 3),
    entity: round(entity, 3),
    keyword: round(keyword, 3),
    temporal: round(temporal, 3),
    score: round(score, 3),
  };
}

export class HeuristicClustering implements ClusteringService {
  readonly method = "heuristic-v1(title.40+entity.35+keyword.15+temporal.10)";
  readonly joinThreshold = 0.38;

  assign(article: ClusterArticle, events: ClusterEvent[]): ClusterAssignment {
    let best: { event: ClusterEvent; breakdown: SimilarityBreakdown } | null = null;

    for (const event of events) {
      const breakdown = similarityBreakdown(
        article,
        {
          title: event.title,
          text: event.representativeText,
          publishedAt: event.latestUpdateAt,
          entities: event.entities,
        },
      );
      if (!best || breakdown.score > best.breakdown.score) best = { event, breakdown };
    }

    if (!best) {
      return {
        eventId: null,
        similarity: 0,
        breakdown: { title: 0, entity: 0, keyword: 0, temporal: 0, score: 0 },
        method: this.method,
      };
    }

    const sharedEntity = article.entities
      .map(normEntity)
      .some((e) => best!.event.entities.map(normEntity).includes(e));
    const strongTitle = best.breakdown.title >= 0.5;
    const joins = best.breakdown.score >= this.joinThreshold && (sharedEntity || strongTitle);

    return {
      eventId: joins ? best.event.id : null,
      similarity: best.breakdown.score,
      breakdown: best.breakdown,
      method: this.method,
    };
  }
}

export const defaultClustering: ClusteringService = new HeuristicClustering();
