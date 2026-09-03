/**
 * Media-landscape dashboard aggregates (v0.10, Phase 11).
 *
 * Straight counts over the current snapshot. Nothing here gamifies political
 * judgement — it reports what was published, by whom, in what language, with
 * what evidence, and where coverage is asymmetric.
 */
import type { LiveDataset } from "@/lib/live/types";
import { allPublisherProfiles, familyIndex } from "./publishers";
import { computePublisherObserved } from "./observed";
import type { OwnershipCategory } from "./types";
import { OWNERSHIP_CATEGORIES } from "./publishers";

export interface LandscapeSummary {
  generatedAt: string;
  articles: number;
  clusters: number;
  uniquePublishers: number;
  independentSourceFamilies: number;
  tamilArticles: number;
  englishArticles: number;
  ownershipDistribution: Record<OwnershipCategory, number>;
  categoryDistribution: Record<string, number>;
  topEntities: { name: string; stories: number }[];
  mostAsymmetric: { slug: string; title: string; types: string[]; ratio: number }[];
  mostDisputed: { slug: string; title: string; disputed: number }[];
  mostCorroborated: { slug: string; title: string; corroborated: number; families: number }[];
  topPublishers: { id: string; name: string; articles: number }[];
  selectionDivergence: { id: string; name: string; subject: string; deviation: number }[];
  insufficientAlignment: { id: string; name: string; n: number }[];
}

export function buildLandscapeSummary(dataset: LiveDataset, opts?: { tnOnly?: boolean }): LandscapeSummary {
  const clusters = opts?.tnOnly
    ? dataset.clusters.filter((c) => c.scope === "tamil-nadu" || c.trendData?.geoTier === "P0")
    : dataset.clusters;
  const articles = opts?.tnOnly
    ? dataset.articles.filter((a) => clusters.some((c) => c.articleIds.includes(a.id)))
    : dataset.articles;

  const fams = familyIndex(dataset);
  const profiles = allPublisherProfiles(dataset);
  const profByName = new Map(profiles.map((p) => [p.name, p]));

  const ownershipDistribution = Object.fromEntries(OWNERSHIP_CATEGORIES.map((c) => [c, 0])) as Record<OwnershipCategory, number>;
  const categoryDistribution: Record<string, number> = {};
  let tamilArticles = 0;
  let englishArticles = 0;
  const pubArticleCount = new Map<string, number>();

  for (const a of articles) {
    if (a.language === "ta") tamilArticles++;
    if (a.language === "en") englishArticles++;
    ownershipDistribution[profByName.get(a.publisher)?.ownership.category ?? "UNKNOWN"]++;
    pubArticleCount.set(a.publisher, (pubArticleCount.get(a.publisher) ?? 0) + 1);
  }
  for (const c of clusters) {
    const cat = c.trendData?.category ?? "other-relevant";
    categoryDistribution[cat] = (categoryDistribution[cat] ?? 0) + 1;
  }

  const familyIds = new Set<string>();
  for (const pub of pubArticleCount.keys()) familyIds.add(fams.get(pub) ?? "unaffiliated:" + pub);

  // top entities by number of political stories mentioning them
  const entityStories = new Map<string, number>();
  for (const c of clusters) {
    if (c.trendData?.category !== "politics") continue;
    for (const actor of c.trendData?.politicalCoverage?.actors ?? []) {
      entityStories.set(actor, (entityStories.get(actor) ?? 0) + 1);
    }
  }

  const mostAsymmetric = clusters
    .map((c) => ({ c, bs: c.trendData?.mediaLandscape?.blindspots ?? [] }))
    .filter((x) => x.bs.length > 0)
    .sort((a, b) => Math.max(...b.bs.map((x) => x.ratio)) - Math.max(...a.bs.map((x) => x.ratio)))
    .slice(0, 8)
    .map((x) => ({
      slug: x.c.slug,
      title: x.c.title,
      types: x.bs.map((b) => b.type),
      ratio: Math.max(...x.bs.map((b) => b.ratio)),
    }));

  const mostDisputed = clusters
    .map((c) => ({ c, d: c.trendData?.mediaLandscape?.evidenceProfile.byStatus.DISPUTED ?? 0 }))
    .filter((x) => x.d > 0)
    .sort((a, b) => b.d - a.d)
    .slice(0, 6)
    .map((x) => ({ slug: x.c.slug, title: x.c.title, disputed: x.d }));

  const mostCorroborated = clusters
    .map((c) => {
      const ep = c.trendData?.mediaLandscape?.evidenceProfile;
      return {
        c,
        cor: (ep?.byStatus.HIGHLY_CORROBORATED ?? 0) + (ep?.byStatus.CORROBORATED ?? 0),
        fam: ep?.independentFamilies ?? 0,
      };
    })
    .filter((x) => x.cor > 0)
    .sort((a, b) => b.cor - a.cor || b.fam - a.fam)
    .slice(0, 6)
    .map((x) => ({ slug: x.c.slug, title: x.c.title, corroborated: x.cor, families: x.fam }));

  const topPublishers = [...pubArticleCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, n]) => ({ id: profByName.get(name)?.id ?? name, name, articles: n }));

  // selection divergence: publisher's category mix vs corpus category mix
  const corpusCatShare: Record<string, number> = {};
  const totalC = clusters.length || 1;
  for (const [k, v] of Object.entries(categoryDistribution)) corpusCatShare[k] = v / totalC;
  const selectionDivergence: LandscapeSummary["selectionDivergence"] = [];
  for (const p of profiles) {
    const obs = computePublisherObserved(p.name, dataset, "all");
    const total = Object.values(obs.topics).reduce((s, n) => s + n, 0);
    if (total < 8) continue;
    let worst = { subject: "", deviation: 0 };
    for (const [cat, n] of Object.entries(obs.topics)) {
      const dev = n / total - (corpusCatShare[cat] ?? 0);
      if (Math.abs(dev) > Math.abs(worst.deviation)) worst = { subject: cat, deviation: dev };
    }
    if (Math.abs(worst.deviation) >= 0.15) {
      selectionDivergence.push({ id: p.id, name: p.name, subject: worst.subject, deviation: Math.round(worst.deviation * 100) / 100 });
    }
  }
  selectionDivergence.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  const insufficientAlignment = profiles
    .map((p) => ({ id: p.id, name: p.name, n: computePublisherObserved(p.name, dataset, "all").politicalArticles }))
    .filter((x) => x.n < 20 && x.n > 0)
    .sort((a, b) => a.n - b.n)
    .slice(0, 12);

  return {
    generatedAt: dataset.generatedAt,
    articles: articles.length,
    clusters: clusters.length,
    uniquePublishers: pubArticleCount.size,
    independentSourceFamilies: familyIds.size,
    tamilArticles,
    englishArticles,
    ownershipDistribution,
    categoryDistribution,
    topEntities: [...entityStories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, stories]) => ({ name, stories })),
    mostAsymmetric,
    mostDisputed,
    mostCorroborated,
    topPublishers,
    selectionDivergence: selectionDivergence.slice(0, 10),
    insufficientAlignment,
  };
}
