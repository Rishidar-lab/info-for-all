/**
 * Ingestion contracts. Every adapter (RSS, manual, API, …) converts its native
 * payload into `RawFeedItem`s; the normalizer turns those into `NormalizedArticle`s
 * that the pipeline can persist.
 */

export interface RawFeedItem {
  /** Canonical link to the article. */
  url: string;
  title: string;
  summary?: string;
  content?: string;
  author?: string;
  /** ISO-8601 string or anything `Date` can parse. */
  publishedAt?: string;
  imageUrl?: string;
  language?: string;
  /** Publisher display name if the feed provides one. */
  publication?: string;
  /** Upstream wire service credited in the item, if any. */
  wireService?: string;
  guid?: string;
}

export interface FeedResult {
  adapter: AdapterName;
  sourceHint?: { name?: string; domain?: string };
  items: RawFeedItem[];
}

export type AdapterName = "rss" | "manual" | "api";

export interface NormalizedArticle {
  url: string;
  canonicalUrl: string | null;
  title: string;
  description: string | null;
  contentExcerpt: string | null;
  publication: string;
  author: string | null;
  publishedAt: Date;
  language: string;
  imageUrl: string | null;
  wireService: string | null;
  sourceDomain: string;
  /** Stable de-duplication key derived from canonical URL. */
  dedupeKey: string;
  metadata: Record<string, unknown>;
}

export interface IngestionAdapter<TInput> {
  readonly name: AdapterName;
  fetch(input: TInput): Promise<FeedResult>;
}
