/**
 * Corpus re-scan — a no-network discovery provider.
 *
 * IFFA already ingests ~40 feeds every 15 minutes. Clustering is deliberately
 * conservative, so an article about an event can sit in the pool without being
 * merged onto that event's cluster. This provider re-searches the FULL ingested
 * article pool for the seed event and returns any article, from a publisher not
 * already on the story, that plausibly describes it — leaving the strict
 * SAME-EVENT gate (`match.ts`) to make the call.
 *
 * Lawful by construction (data IFFA already holds), free, deterministic. It is
 * the floor of the discovery stack; network providers add reach on top.
 */
import type { LiveArticle } from "@/lib/live/types";
import { canonicaliseUrl } from "../dedupe";
import type { DiscoveryCandidate, DiscoveryEvent, DiscoveryProvider, DiscoveryProviderContext, DiscoveryQuery } from "../types";

function tokenSet(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9஀-௿\s]/g, " ").split(/\s+/).filter((w) => w.length > 2),
  );
}

/** Cheap pre-filter — the identity engine is the real gate. */
function plausible(event: DiscoveryEvent, a: LiveArticle): boolean {
  const text = `${a.title} ${a.excerpt ?? ""}`;
  const toks = tokenSet(text);
  const lower = text.toLowerCase();

  const placeHit =
    event.places.some((p) => lower.includes(p.toLowerCase())) ||
    event.districts.some((d) => a.districts.includes(d));
  const entityHit = event.entities.filter((e) => e.length > 3 && lower.includes(e.toLowerCase())).length;
  const coreHit = [...tokenSet(event.title)].filter((t) => toks.has(t)).length;

  return (placeHit && (entityHit >= 1 || coreHit >= 3)) || entityHit >= 2 || coreHit >= 5;
}

export function corpusRescanProvider(enabled: boolean): DiscoveryProvider {
  return {
    id: "corpus-rescan",
    kind: "corpus_rescan",
    network: false,
    enabled,
    description: "Re-search of IFFA's already-ingested article pool for the seed event. No network.",
    async discover(event: DiscoveryEvent, _queries: DiscoveryQuery[], ctx: DiscoveryProviderContext) {
      const pool = ctx.corpusArticles ?? [];
      const known = new Set(event.knownPublishers);
      const anchor = Date.parse(`${event.anchorDate}T00:00:00Z`);
      const candidates: DiscoveryCandidate[] = [];
      const seen = new Set<string>();

      for (const a of pool) {
        if (known.has(a.publisher)) continue;
        if (a.scope === "excluded") continue;
        if (Number.isFinite(anchor)) {
          const dt = Date.parse(a.publishedAt);
          if (Number.isFinite(dt) && Math.abs(dt - anchor) > 12 * 86_400_000) continue;
        }
        if (!plausible(event, a)) continue;
        const url = canonicaliseUrl(a.url);
        if (seen.has(url)) continue;
        seen.add(url);
        candidates.push({
          url: a.url,
          canonicalUrl: url,
          title: a.title,
          source: a.publisher,
          domain: undefined,
          publishedAt: a.publishedAt,
          language: a.language,
          snippet: a.excerpt,
          provider: "corpus-rescan",
          query: `pool:${event.slug}`,
          discoveredAt: new Date(ctx.now).toISOString(),
        });
      }
      return { candidates: candidates.slice(0, 20), notes: [] };
    },
  };
}
