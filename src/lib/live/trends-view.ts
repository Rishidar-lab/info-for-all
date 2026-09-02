/**
 * Read-side helpers for the v0.7 Trend Intelligence enrichment on the snapshot.
 *
 * All of these degrade gracefully to the v0.6 ordering (crisis priority, then
 * recency) when a snapshot without `trendData` is loaded — so the UI never
 * breaks on an older seed.
 */
import { dataset } from "./dataset";
import type { LiveCluster } from "./types";
import type { CategoryId } from "@/lib/domain/categories";
import { CATEGORY_ORDER, DEFAULT_ENABLED } from "@/lib/domain/categories";
import type { GeoTier } from "@/lib/domain/geo-tiers";
import type { SituationSnapshot } from "./types";

export function hasTrendData(): boolean {
  return dataset.clusters.some((c) => c.trendData?.trend);
}

export function trendScore(c: LiveCluster): number {
  return c.trendData?.trend?.score ?? c.crisisPriority / 2;
}

export function categoryOf(c: LiveCluster): CategoryId {
  return (c.trendData?.category as CategoryId) ?? "other-relevant";
}

export function tierOf(c: LiveCluster): GeoTier {
  return (
    (c.trendData?.geoTier as GeoTier) ??
    (c.scope === "tamil-nadu" ? "P0" : c.scope === "excluded" ? "out" : "P1")
  );
}

export function isDefaultVisible(c: LiveCluster): boolean {
  return DEFAULT_ENABLED[categoryOf(c)] !== false && tierOf(c) !== "out";
}

const bySlug = new Map(dataset.clusters.map((c) => [c.slug, c]));

function fromSlugs(slugs: string[] | undefined): LiveCluster[] {
  if (!slugs) return [];
  return slugs.map((s) => bySlug.get(s)).filter((c): c is LiveCluster => !!c);
}

/** trend score desc, then recency. */
export function byTrend(a: LiveCluster, b: LiveCluster): number {
  return trendScore(b) - trendScore(a) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

export function trendingClusters(limit = 24): LiveCluster[] {
  const explicit = fromSlugs(dataset.trending);
  if (explicit.length) return explicit.slice(0, limit);
  return [...dataset.clusters].filter(isDefaultVisible).sort(byTrend).slice(0, limit);
}

export function watchingClusters(limit = 16): LiveCluster[] {
  const explicit = fromSlugs(dataset.watching);
  if (explicit.length) return explicit.slice(0, limit);
  const trending = new Set(trendingClusters(30).map((c) => c.slug));
  return [...dataset.clusters]
    .filter((c) => isDefaultVisible(c) && !trending.has(c.slug))
    .filter((c) => (c.isCrisis && (c.lifecycle === "developing" || c.lifecycle === "active")) || trendScore(c) >= 14)
    .sort(byTrend)
    .slice(0, limit);
}

const RISING = new Set(["new", "rising", "fast-rising", "resurging"]);

export function fastRisingClusters(limit = 12): LiveCluster[] {
  return trendingClusters(40)
    .filter((c) => RISING.has(c.trendData?.trend?.state ?? ""))
    .slice(0, limit);
}

export function clustersByCategory(cat: CategoryId, limit = 30): LiveCluster[] {
  return [...dataset.clusters]
    .filter((c) => categoryOf(c) === cat && tierOf(c) !== "out")
    .sort(byTrend)
    .slice(0, limit);
}

export function clustersByTier(tier: GeoTier | "P0+P1", limit = 30): LiveCluster[] {
  return [...dataset.clusters]
    .filter((c) => {
      const t = tierOf(c);
      if (tier === "P0+P1") return t === "P0" || t === "P1";
      return t === tier;
    })
    .filter((c) => DEFAULT_ENABLED[categoryOf(c)] !== false)
    .sort(byTrend)
    .slice(0, limit);
}

export function situation(): SituationSnapshot | undefined {
  return dataset.situation;
}

export function categoryCounts(): Record<CategoryId, number> {
  const explicit = dataset.counts.byCategory;
  const out = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<CategoryId, number>;
  if (explicit) {
    for (const [k, v] of Object.entries(explicit)) if (k in out) out[k as CategoryId] = v;
    return out;
  }
  for (const c of dataset.clusters) out[categoryOf(c)]++;
  return out;
}

/** All clusters that should get their own /story page (superset of routableClusters). */
export function trendRoutableSlugs(): Set<string> {
  const s = new Set<string>();
  for (const c of [
    ...trendingClusters(40),
    ...watchingClusters(24),
    ...CATEGORY_ORDER.flatMap((cat) => clustersByCategory(cat, 24)),
    ...clustersByTier("P0", 30),
    ...clustersByTier("P1", 30),
  ]) {
    s.add(c.slug);
  }
  return s;
}
