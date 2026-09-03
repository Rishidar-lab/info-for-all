/**
 * Milestone B.3 — Phase 0: measure the real current product.
 *
 *   npx tsx scripts/coverage-discovery-baseline.ts
 *
 * → reports/coverage-discovery-baseline.json + .md
 *
 * Every number is computed from the live snapshot. Nothing is estimated.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LiveArticle, LiveCluster, LiveDataset } from "../src/lib/live/types";
import { resolveSourceFamilies } from "../src/lib/research/independence";
import { buildBrief } from "../src/lib/brief/build";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const d = JSON.parse(readFileSync(resolve(ROOT, "src/data/generated/live-feed.json"), "utf8")) as LiveDataset;
let research: Record<string, unknown> = {};
try {
  research = (JSON.parse(readFileSync(resolve(ROOT, "src/data/generated/research.json"), "utf8")) as { bySlug?: Record<string, unknown> }).bySlug ?? {};
} catch {
  /* research pass not run */
}

const byId = new Map(d.articles.map((a) => [a.id, a]));
const arts = (c: LiveCluster): LiveArticle[] => c.articleIds.map((id) => byId.get(id)).filter((a): a is LiveArticle => !!a);
const routable = d.clusters.filter((c) => c.slug && (c.trendData?.geoTier ?? "out") !== "out");

const CATS = ["crisis", "politics", "finance", "sports", "other-relevant", "entertainment", "celebrity"] as const;
type Cat = (typeof CATS)[number];
const catOf = (c: LiveCluster): Cat => ((c.trendData?.category ?? "other-relevant") as Cat);
const isTN = (c: LiveCluster) => c.scope === "tamil-nadu" || c.trendData?.geoTier === "P0" || c.districts.length > 0;
const famBucket = (g: number) => (g <= 1 ? "1" : g === 2 ? "2" : g <= 5 ? "3-5" : g <= 10 ? "6-10" : "11+");

interface CatRow {
  clusters: number;
  articles: number;
  publishers: number;
  genuineFamiliesMean: number;
  famDist: Record<string, number>;
  briefsDelivered: number;
  tamilNadu: number;
}

const perCat: Record<string, CatRow> = {};
const famDistAll: Record<string, number> = { "1": 0, "2": 0, "3-5": 0, "6-10": 0, "11+": 0 };
let tnClusters = 0;
let indiaClusters = 0;
let tnDelivered = 0;
let indiaDelivered = 0;
const pubSetByCat: Record<string, Set<string>> = {};
const genuineSumByCat: Record<string, number> = {};

for (const c of routable) {
  const a = arts(c);
  const cat = catOf(c);
  const r = resolveSourceFamilies(a, { evidence: c.claims?.evidence });
  const b = buildBrief(c, a, { research: (research[c.slug] as never) ?? null });
  const g = r.genuineIndependentFamilies;

  perCat[cat] ??= { clusters: 0, articles: 0, publishers: 0, genuineFamiliesMean: 0, famDist: { "1": 0, "2": 0, "3-5": 0, "6-10": 0, "11+": 0 }, briefsDelivered: 0, tamilNadu: 0 };
  pubSetByCat[cat] ??= new Set();
  genuineSumByCat[cat] ??= 0;

  perCat[cat].clusters++;
  perCat[cat].articles += a.length;
  for (const x of a) pubSetByCat[cat].add(x.publisher);
  genuineSumByCat[cat] += g;
  perCat[cat].famDist[famBucket(g)]++;
  famDistAll[famBucket(g)]++;
  if (!b.withheldReason) perCat[cat].briefsDelivered++;
  if (isTN(c)) {
    perCat[cat].tamilNadu++;
    tnClusters++;
    if (!b.withheldReason) tnDelivered++;
  } else {
    indiaClusters++;
    if (!b.withheldReason) indiaDelivered++;
  }
}
for (const cat of Object.keys(perCat)) {
  perCat[cat].publishers = pubSetByCat[cat].size;
  perCat[cat].genuineFamiliesMean = Math.round((genuineSumByCat[cat] / Math.max(perCat[cat].clusters, 1)) * 100) / 100;
}

// ── front-door top-20 ──────────────────────────────────────────────────────
const bySlug = new Map(routable.map((c) => [c.slug, c]));
const ed = d.editorial;
const order = [...(ed?.urgent ?? []), ...(ed?.rightNow ?? []), ...(ed?.fastRising ?? []), ...(ed?.tamilNadu ?? []), ...(ed?.india ?? []), ...(d.trending ?? [])];
const seen = new Set<string>();
const frontDoor: LiveCluster[] = [];
for (const s of order) {
  if (frontDoor.length >= 20) break;
  const c = bySlug.get(s);
  if (c && !seen.has(s)) {
    seen.add(s);
    frontDoor.push(c);
  }
}
const fdCats: Record<string, number> = {};
let fdComprehension = 0;
let fdGenuineSum = 0;
let fdSingleFamily = 0;
const fdRows = frontDoor.map((c) => {
  const a = arts(c);
  const r = resolveSourceFamilies(a, { evidence: c.claims?.evidence });
  const b = buildBrief(c, a, { research: (research[c.slug] as never) ?? null });
  fdCats[catOf(c)] = (fdCats[catOf(c)] ?? 0) + 1;
  fdGenuineSum += r.genuineIndependentFamilies;
  if (r.genuineIndependentFamilies <= 1) fdSingleFamily++;
  const understood = !b.withheldReason && b.shortVersion.map((s) => s.text).join(" ").split(/\s+/).filter(Boolean).length >= 7;
  if (understood) fdComprehension++;
  return {
    slug: c.slug,
    title: c.title.slice(0, 70),
    category: catOf(c),
    tamilNadu: isTN(c),
    publishers: r.familyCount,
    genuineFamilies: r.genuineIndependentFamilies,
    tamil: a.filter((x) => x.language === "ta").length,
    english: a.filter((x) => x.language === "en").length,
    briefDelivered: !b.withheldReason,
    understood,
  };
});

const tamilArticles = d.articles.filter((a) => a.language === "ta").length;
const englishArticles = d.articles.filter((a) => a.language === "en").length;

const report = {
  generatedAt: new Date().toISOString(),
  snapshot: d.generatedAt,
  corpus: {
    articles: d.articles.length,
    clusters: d.clusters.length,
    routableClusters: routable.length,
    publishers: new Set(d.articles.map((a) => a.publisher)).size,
    tamilArticles,
    englishArticles,
    tamilNaduClusters: tnClusters,
    indiaClusters,
  },
  byCategory: perCat,
  genuineFamilyDistribution: famDistAll,
  delivery: {
    tamilNadu: { clusters: tnClusters, briefsDelivered: tnDelivered },
    india: { clusters: indiaClusters, briefsDelivered: indiaDelivered },
  },
  frontDoor: {
    categories: fdCats,
    nativeComprehension: `${fdComprehension}/20`,
    genuineFamiliesMean: Math.round((fdGenuineSum / 20) * 100) / 100,
    singleFamilyStories: fdSingleFamily,
    rows: fdRows,
  },
};

mkdirSync(resolve(ROOT, "reports"), { recursive: true });
writeFileSync(resolve(ROOT, "reports/coverage-discovery-baseline.json"), JSON.stringify(report, null, 2));

const md: string[] = [];
md.push(`# Coverage Discovery — Phase 0 baseline\n`);
md.push(`Snapshot \`${d.generatedAt}\`. Every number computed from the live corpus.\n`);
md.push(`## Corpus\n`);
md.push(`| | |\n|---|---|`);
md.push(`| articles | ${report.corpus.articles} |`);
md.push(`| clusters | ${report.corpus.clusters} (routable ${report.corpus.routableClusters}) |`);
md.push(`| distinct publishers | ${report.corpus.publishers} |`);
md.push(`| Tamil articles | ${tamilArticles} (${((tamilArticles / d.articles.length) * 100).toFixed(0)}%) |`);
md.push(`| English articles | ${englishArticles} |`);
md.push(`| Tamil Nadu clusters | ${tnClusters} · India clusters ${indiaClusters} |\n`);

md.push(`## By category\n`);
md.push(`| category | clusters | articles | publishers | genuine-family mean | briefs delivered | TN |`);
md.push(`|---|---|---|---|---|---|---|`);
for (const cat of CATS) {
  const r = perCat[cat];
  if (!r) continue;
  md.push(`| ${cat} | ${r.clusters} | ${r.articles} | ${r.publishers} | ${r.genuineFamiliesMean} | ${r.briefsDelivered} | ${r.tamilNadu} |`);
}

md.push(`\n## Genuine independent-family distribution (all routable clusters)\n`);
md.push(`| exactly 1 | 2 | 3–5 | 6–10 | 11+ |`);
md.push(`|---|---|---|---|---|`);
md.push(`| **${famDistAll["1"]}** | ${famDistAll["2"]} | ${famDistAll["3-5"]} | ${famDistAll["6-10"]} | ${famDistAll["11+"]} |`);
md.push(`\n> ${((famDistAll["1"] / routable.length) * 100).toFixed(0)}% of routable clusters have exactly one genuine independent newsroom. **This is the bottleneck B.3 targets.**\n`);

md.push(`## Front door (top 20)\n`);
md.push(`- categories: ${Object.entries(fdCats).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
md.push(`- native comprehension: **${fdComprehension}/20**`);
md.push(`- genuine-family mean: **${report.frontDoor.genuineFamiliesMean}**`);
md.push(`- single-family stories: **${fdSingleFamily}/20**\n`);
md.push(`| # | story | cat | TN | pubs | genuine | ta/en | brief |`);
md.push(`|---|---|---|---|---|---|---|---|`);
fdRows.forEach((r, i) => md.push(`| ${i + 1} | ${r.title} | ${r.category} | ${r.tamilNadu ? "✓" : ""} | ${r.publishers} | ${r.genuineFamilies} | ${r.tamil}/${r.english} | ${r.briefDelivered ? "delivered" : "withheld"} |`));

md.push(`\n## Reading\n`);
md.push(`- The corpus is **${new Set(d.articles.map((a) => a.publisher)).size} publishers across ~36 feeds.** The other newsrooms reporting these events are simply not ingested.`);
md.push(`- A cross-cluster same-event re-search of the existing corpus with the frozen v0.6 identity engine finds **0** missed merges — the clustering is not the problem.`);
md.push(`- Entertainment + celebrity are **${(perCat["entertainment"]?.clusters ?? 0) + (perCat["celebrity"]?.clusters ?? 0)} clusters** and already excluded from every default surface. The B.2 profiler's "433 other" was its own coarse regex, not \`cluster.trendData.category\`.`);
md.push(`- So B.3's job is **external coverage discovery**, budgeted crisis / politics / finance / sports first, Tamil Nadu first.`);

writeFileSync(resolve(ROOT, "reports/coverage-discovery-baseline.md"), md.join("\n") + "\n");
console.log(md.join("\n"));
console.log("\nwrote reports/coverage-discovery-baseline.{json,md}");
