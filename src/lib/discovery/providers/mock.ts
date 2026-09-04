/**
 * MockProvider — deterministic, network-free discovery for CI / unit tests.
 *
 * Returns pre-registered candidates per slug (or per query-text match) so the
 * same-event + independence gates can be exercised without the network, keys,
 * or quotas. The default demo and `npm test` / `npm run build` never need a
 * paid credential because this provider (plus corpus-rescan) covers them.
 *
 * Usage:
 *   const mock = mockProvider({ "some-slug": [ { url, title, source, ... } ] });
 *   await discoverForCluster(cluster, articles, corpus, [mock], { now, familiesBefore, force: true });
 */
import { canonicaliseUrl } from "../dedupe";
import type {
  DiscoveryCandidate,
  DiscoveryEvent,
  DiscoveryProvider,
  DiscoveryProviderContext,
  DiscoveryQuery,
} from "../types";

export interface MockCandidateSeed {
  url: string;
  title: string;
  source: string;
  domain?: string;
  publishedAt?: string;
  language?: "ta" | "en" | "unknown";
  snippet?: string;
  query?: string;
}

export function mockProvider(
  bySlug: Record<string, MockCandidateSeed[]>,
  opts: { id?: string; fallback?: MockCandidateSeed[] } = {},
): DiscoveryProvider {
  return {
    id: opts.id ?? "mock",
    kind: "corpus_rescan",
    network: false,
    enabled: true,
    description: "Deterministic mock provider for tests and CI. No network.",
    async discover(event: DiscoveryEvent, queries: DiscoveryQuery[], ctx: DiscoveryProviderContext) {
      const seeds = bySlug[event.slug] ?? opts.fallback ?? [];
      const now = new Date(ctx.now).toISOString();
      const candidates: DiscoveryCandidate[] = seeds.map((s) => ({
        url: s.url,
        canonicalUrl: canonicaliseUrl(s.url),
        title: s.title,
        source: s.source,
        domain: s.domain,
        publishedAt: s.publishedAt ?? `${event.anchorDate}T12:00:00.000Z`,
        language: s.language ?? "unknown",
        snippet: s.snippet,
        provider: opts.id ?? "mock",
        query: s.query ?? queries[0]?.text ?? `mock:${event.slug}`,
        discoveredAt: now,
      }));
      return { candidates, notes: [] };
    },
  };
}
