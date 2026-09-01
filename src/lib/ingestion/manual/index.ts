import type { FeedResult, IngestionAdapter, RawFeedItem } from "../types";

/**
 * Manual adapter — an editor pastes article details (or a URL plus known
 * metadata). No network access; the pipeline still validates and canonicalizes.
 */
export interface ManualInput {
  url: string;
  title: string;
  summary?: string;
  content?: string;
  author?: string;
  publication?: string;
  publishedAt?: string;
  wireService?: string;
  language?: string;
}

export const manualAdapter: IngestionAdapter<ManualInput> = {
  name: "manual",
  async fetch(input: ManualInput): Promise<FeedResult> {
    const item: RawFeedItem = {
      url: input.url,
      title: input.title,
      summary: input.summary,
      content: input.content,
      author: input.author,
      publication: input.publication,
      publishedAt: input.publishedAt,
      wireService: input.wireService,
      language: input.language,
    };
    return { adapter: "manual", items: [item] };
  },
};
