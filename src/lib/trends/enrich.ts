/**
 * Trend-engine orchestrator (v0.7, Phase E/F).
 *
 * Consumes a clustered `LiveDataset` and ADDS enrichment — category, geo tier,
 * independence summary, timeline, first-seen tracking and the interpretable
 * trend score — to every cluster, plus dataset-level `trending` / `watching` /
 * `situation` / `counts.byCategory`.
 *
 * It never edits the identity / claims / clustering engines: it only reads
 * `LiveArticle[]` and `LiveCluster[]` and writes new fields. Pure and
 * deterministic given (dataset, now, previous).
 */
import type { LiveArticle, LiveCluster, LiveDataset, ClusterTrendData } from "@/lib/live/types";
import { analyseIndependence, independenceLabel } from "@/lib/independence";
import { type CategoryId, CATEGORY_ORDER, DEFAULT_ENABLED } from "@/lib/domain/categories";
import { classifyEvent } from "@/lib/domain/classify";
import { buildSignature } from "@/lib/event-identity";
import { geoTierOf, type GeoTier } from "@/lib/domain/geo-tiers";
import { resolveDistricts } from "@/lib/domain/districts";
import { buildTimeline, lastMeaningfulUpdate } from "./timeline";
import { trendWindows, velocityScore, trendState } from "./velocity";
import { computeTrend } from "./score";
import { buildSituation } from "./situation";
import { TREND_MIN } from "./weights";
import type { IndependenceSummary } from "./types";
import { assessNovelty, buildEventState } from "./novelty";
import { assessSeverity } from "@/lib/domain/severity";
import { computeEditorialPriority, buildSurfaces } from "@/lib/editorial";

const OFFICIAL_PRIMARY = new Set(["official-alert", "primary-document"]);

export interface EnrichOptions {
  now?: number;
  /** The previous snapshot, for first-seen tracking and novelty. */
  previous?: Pick<LiveDataset, "clusters"> | null;
}

function articlesOf(cluster: LiveCluster, byId: Map<string, LiveArticle>): LiveArticle[] {
  return cluster.articleIds.map((id) => byId.get(id)).filter((a): a is LiveArticle => !!a);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

/** Match a current cluster to one in the previous snapshot. */
function matchPrevious(
  cluster: LiveCluster,
  prev: LiveCluster[],
  prevBySlug: Map<string, LiveCluster>,
): LiveCluster | undefined {
  const bySlug = prevBySlug.get(cluster.slug);
  if (bySlug) return bySlug;
  let best: { c: LiveCluster; j: number } | undefined;
  for (const p of prev) {
    const j = jaccard(cluster.articleIds, p.articleIds);
    if (j >= 0.5 && (!best || j > best.j)) best = { c: p, j };
  }
  return best?.c;
}

export interface EnrichedDataset extends LiveDataset {
  trending: string[];
  watching: string[];
}

export function enrichDataset(dataset: LiveDataset, opts: EnrichOptions = {}): EnrichedDataset {
  const now = opts.now ?? Date.now();
  const hasPrev = !!opts.previous;
  const prevClusters = opts.previous?.clusters ?? [];
  const prevBySlug = new Map(prevClusters.map((c) => [c.slug, c]));
  const byId = new Map(dataset.articles.map((a) => [a.id, a]));

  const byCategory: Record<string, number> = {};
  const situationInput: Parameters<typeof buildSituation>[0] = [];

  for (const cluster of dataset.clusters) {
    const articles = articlesOf(cluster, byId);
    if (articles.length === 0) continue;

    const excerptBlob = articles
      .map((a) => a.excerpt ?? "")
      .join(" ")
      .slice(0, 600);

    // ── v0.8: multi-signal classification over ALL cluster members ──
    // Union entities / concepts / actions from every member's signature, and
    // classify the concatenated headlines + excerpts, not just the title.
    const titleBlob = articles.map((a) => a.title).join("  ·  ").slice(0, 800);
    const sigEntities = new Set<string>();
    const sigConcepts = new Set<string>();
    const sigActions = new Set<string>();
    for (const a of articles.slice(0, 6)) {
      const sig = buildSignature({
        title: a.title,
        excerpt: a.excerpt,
        publishedAt: a.publishedAt,
        language: a.language,
        districts: a.districts,
        crisisType: a.crisisType,
      });
      for (const e of sig.entities) sigEntities.add(e);
      for (const c of sig.concepts) sigConcepts.add(c);
      for (const f of sig.actions) sigActions.add(f);
    }
    const anyTamil = articles.some((a) => a.language === "ta");
    const cat = classifyEvent({
      title: titleBlob,
      excerpt: excerptBlob,
      language: anyTamil ? "ta" : "en",
      entities: [...sigEntities],
      concepts: [...sigConcepts],
      actions: [...sigActions],
      districts: cluster.districts,
      state: cluster.state,
      crisisType: cluster.crisisType,
    });
    // A cluster that names a Tamil Nadu district is P0 even if the feed's own
    // scope stayed "india" (common for national CAP alerts that list TN districts).
    const namesTNDistrict =
      cluster.districts.length > 0 ||
      resolveDistricts(`${cluster.title} ${excerptBlob}`).length > 0;
    const tier = namesTNDistrict && cluster.scope !== "excluded"
      ? { tier: "P0" as GeoTier, reason: "Names a Tamil Nadu district." }
      : geoTierOf({ scope: cluster.scope, title: cluster.title, excerpt: excerptBlob });

    const ind = analyseIndependence(articles);
    const independence: IndependenceSummary = {
      families: ind.independentGroups,
      reports: articles.length,
      syndicated: ind.possibleSyndicated,
      wireCredits: ind.wireCredits,
      label: independenceLabel(ind),
    };
    const familyOf = new Map<string, string>();
    for (const g of ind.groups) for (const id of g) familyOf.set(id, g[0]);

    const timeline = buildTimeline(articles);
    const lastSeenAt = articles.reduce((m, a) => (a.publishedAt > m ? a.publishedAt : m), articles[0].publishedAt);
    const lastMeaningfulUpdateAt = lastMeaningfulUpdate(timeline);
    const earliest = articles.reduce((m, a) => (a.publishedAt < m ? a.publishedAt : m), articles[0].publishedAt);

    const prev = matchPrevious(cluster, prevClusters, prevBySlug);
    const firstSeenAt = prev?.trendData?.firstSeenAt
      ? prev.trendData.firstSeenAt < earliest
        ? prev.trendData.firstSeenAt
        : earliest
      : earliest;

    const novelty = assessNovelty(cluster, articles, prev, hasPrev, now);
    const { noveltyClass, quietGapHours } = novelty;
    const sev = assessSeverity(cluster, articles);

    const windows = trendWindows(articles, familyOf, now);
    const vel = velocityScore(articles, familyOf, now);
    const ageHours = (now - Date.parse(lastMeaningfulUpdateAt)) / 3_600_000;
    const state = trendState({
      velocityScore: vel.score,
      acceleration: vel.acceleration,
      noveltyClass,
      ageHours,
      priorSeen: !!prev,
      quietGapHours,
    });

    const hasOfficialPrimary = articles.some((a) => OFFICIAL_PRIMARY.has(a.evidenceRole));
    const trend = computeTrend({
      cluster,
      category: cat.category,
      geoTier: tier.tier,
      independence,
      hasOfficialPrimary,
      velocityScore: vel.score,
      acceleration: vel.acceleration,
      windows,
      noveltyClass,
      minutesSinceMeaningful: Math.max(0, (now - Date.parse(lastMeaningfulUpdateAt)) / 60_000),
      state,
    });

    const trendData: ClusterTrendData = {
      category: cat.category,
      categoryReason: cat.reason,
      secondaryCategories: cat.secondaryCategories,
      categoryConfidence: cat.confidenceClass,
      categorySignals: cat.matchedSignals,
      categoryEvidence: cat.categoryEvidence,
      geoTier: tier.tier,
      trend,
      independence,
      firstSeenAt,
      lastSeenAt,
      lastMeaningfulUpdateAt,
      timeline,
      novelty: {
        updateKind: novelty.updateKind,
        meaningfulUpdateScore: novelty.meaningfulUpdateScore,
        updateSignificance: novelty.updateSignificance,
        changes: novelty.changes,
      },
      eventState: buildEventState(cluster, articles, lastMeaningfulUpdateAt, novelty),
      severity: { level: sev.severity, reason: sev.reason, peak: sev.peak },
    };
    cluster.trendData = trendData;

    // ── v0.9: editorial priority (which events deserve prominence) ──
    cluster.trendData.editorial = computeEditorialPriority({ cluster, articles, now });

    byCategory[cat.category] = (byCategory[cat.category] ?? 0) + 1;
    situationInput.push({
      slug: cluster.slug,
      title: cluster.title,
      tier: tier.tier,
      isCrisis: cluster.isCrisis,
      crisisPriority: cluster.crisisPriority,
      lifecycle: cluster.lifecycle,
      officialCount: cluster.officialCount,
      independentFamilies: independence.families,
      districtCount: cluster.districts.length,
      capSeverity: cluster.cap?.severity,
      severity: sev.severity,
    });
  }

  const { trending, watching } = rankTrendingWatching(dataset.clusters);
  const situation = buildSituation(situationInput, dataset.generatedAt);
  const editorial = buildSurfaces(dataset.clusters);

  const enriched: EnrichedDataset = {
    ...dataset,
    counts: { ...dataset.counts, byCategory },
    // v0.7 trending/watching kept for continuity; v0.9 surfaces are authoritative
    trending: editorial.rightNow.length ? editorial.rightNow : trending,
    watching: editorial.watching.length ? editorial.watching : watching,
    situation,
    editorial,
  };
  return enriched;
}

const ACTIVE_LIFECYCLE = new Set(["active", "update", "developing"]);

function rankTrendingWatching(clusters: LiveCluster[]): { trending: string[]; watching: string[] } {
  const withTrend = clusters.filter((c) => c.trendData?.trend);
  const enabled = (c: LiveCluster) =>
    DEFAULT_ENABLED[(c.trendData!.category ?? "other-relevant") as CategoryId] !== false &&
    c.trendData!.geoTier !== "out";

  const trendingC = withTrend
    .filter(enabled)
    .filter((c) => {
      const t = c.trendData!;
      const fam = t.independence?.families ?? 1;
      const official = c.officialCount > 0;
      return t.trend!.score >= TREND_MIN && (fam >= 2 || official);
    })
    .sort((a, b) => b.trendData!.trend!.score - a.trendData!.trend!.score);

  const trendingSlugs = new Set(trendingC.map((c) => c.slug));

  const watchingC = withTrend
    .filter(enabled)
    .filter((c) => !trendingSlugs.has(c.slug))
    .filter((c) => {
      const t = c.trendData!.trend!;
      const consequential = t.consequenceScore >= 0.55;
      const active = c.isCrisis && ACTIVE_LIFECYCLE.has(c.lifecycle);
      const emerging = t.state === "new" || t.state === "rising" || t.state === "fast-rising";
      return consequential || active || emerging;
    })
    .sort(
      (a, b) =>
        b.trendData!.trend!.consequenceScore - a.trendData!.trend!.consequenceScore ||
        Date.parse(b.trendData!.lastSeenAt ?? b.updatedAt) - Date.parse(a.trendData!.lastSeenAt ?? a.updatedAt),
    );

  // stable ordering by category priority within equal trend score is already
  // handled by the score itself (categoryScore is a factor).
  void CATEGORY_ORDER;

  return {
    trending: trendingC.slice(0, 30).map((c) => c.slug),
    watching: watchingC.slice(0, 20).map((c) => c.slug),
  };
}
