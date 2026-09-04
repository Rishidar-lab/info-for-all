/**
 * Dataset-coupled adapter: `LiveCluster[]` → `FeedItem[]` for the card surface.
 *
 * Kept separate from `trends-view` (which does the ranking / filtering) and from
 * `feed-item` (pure projection) so the coupling to the generated snapshot lives
 * in exactly one place.
 */
import type { LiveCluster } from "./types";
import { clusterArticles } from "./dataset";
import { microBriefForCluster } from "./brief-view";
import { toFeedItem, type FeedItem } from "./feed-item";
import {
  clustersByCategory,
  clustersByTier,
  trendingClusters,
} from "./trends-view";
import type { CategoryId } from "@/lib/domain/categories";
import type { GeoTier } from "@/lib/domain/geo-tiers";

export function toFeedItems(clusters: LiveCluster[]): FeedItem[] {
  return clusters.map((c) => toFeedItem(c, clusterArticles(c), microBriefForCluster(c)));
}

/** How many default-visible stories exist for a tier — for the "N of M" line. */
export function tierCount(tier: GeoTier | "P0+P1"): number {
  return clustersByTier(tier, 9999).length;
}
export function categoryCount(cat: CategoryId): number {
  return clustersByCategory(cat, 9999).length;
}
export function trendingCount(): number {
  return trendingClusters(9999).length;
}
