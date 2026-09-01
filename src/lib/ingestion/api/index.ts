import type { FeedResult, IngestionAdapter, RawFeedItem } from "../types";

/**
 * Generic news-API adapter.
 *
 * Public news APIs differ in payload shape, so this adapter takes a `mapper`
 * that projects the provider's item shape onto `RawFeedItem`. A concrete
 * provider is a thin wrapper that supplies the endpoint and mapper. The MOCK
 * form below returns caller-supplied items so the pipeline is exercisable with
 * no network and no key (demo mode).
 */
export interface NewsApiInput<TRaw = unknown> {
  endpoint?: string;
  apiKey?: string;
  query?: Record<string, string>;
  mapper?: (raw: TRaw) => RawFeedItem;
  /** Inject items directly (tests / demo). */
  items?: RawFeedItem[];
  fetchImpl?: typeof fetch;
}

export const newsApiAdapter: IngestionAdapter<NewsApiInput> = {
  name: "api",
  async fetch(input: NewsApiInput): Promise<FeedResult> {
    if (input.items) {
      return { adapter: "api", items: input.items };
    }
    if (!input.endpoint || !input.mapper) {
      return { adapter: "api", items: [] };
    }
    const doFetch = input.fetchImpl ?? fetch;
    const url = new URL(input.endpoint);
    for (const [key, value] of Object.entries(input.query ?? {})) url.searchParams.set(key, value);

    const response = await doFetch(url, {
      headers: input.apiKey ? { authorization: `Bearer ${input.apiKey}` } : {},
    });
    if (!response.ok) return { adapter: "api", items: [] };
    const payload = (await response.json()) as { articles?: unknown[]; results?: unknown[] };
    const rawList = payload.articles ?? payload.results ?? [];
    return { adapter: "api", items: rawList.map((raw) => input.mapper!(raw)) };
  },
};
