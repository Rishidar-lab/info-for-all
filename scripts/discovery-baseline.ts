/**
 * IFFA v0.13 — PHASE 1: measure the actual coverage problem.
 *
 *   npm run discovery:baseline
 *
 * Reads the live snapshot (src/data/generated/live-feed.json, seeded from the
 * version-controlled fixture when absent) plus the committed research pass, and
 * computes — measured, never estimated — the distribution the discovery engine
 * must rescue:
 *
 *   total routable clusters · 1 / 2 / 3 / 4+ genuine independent families ·
 *   Tamil Nadu important · India important · crisis / politics / finance /
 *   sports · singleSourceImportant · multiSourceImportant · briefDelivered /
 *   briefWithheldForCoverage · article URLs · publishers · ownership groups ·
 *   genuine independent families · URL count != independent coverage demo.
 *
 * Writes machine-readable JSON + a human-readable markdown report to
 * evaluation/reports/v0.13-discovery-baseline.{json,md}.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LiveArticle, LiveCluster, LiveDataset } from "../src/lib/live/types";
import { resolveSourceFamilies } from "../src/lib/research/independence";
import { buildBrief } from "../src/lib/brief/build";
import { eligibleForAutoResearch, priorityTier } from "../src/lib/editorial/priority-tier";
import { publisherByName } from "../src/data/publishers";
import { FEED_SOURCES } from "../src/data/feeds";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LIVE = resolve(ROOT, "src/data/generated/live-feed.json");
const RESEARCH = resolve(ROOT, "src/data/generated/research.json");
const OUT_JSON = resolve(ROOT, "evaluation/reports/v0.13-discovery-baseline.json");
const OUT_MD = resolve(ROOT, "evaluation/reports/v0.13-discovery-baseline.md");

const d = JSON.parse(readFileSync(LIVE, "utf8")) as LiveDataset;
let research: Record<string, unknown> = {};
try {
  research = (JSON.parse(readFileSync(RESEARCH, "utf8")) as { bySlug?: Record<string, unknown> }).bySlug ?? {};
} catch {
  /* research pass not run — briefs build without it */
}

const byId = new Map(d.articles.map((a) => [a.id, a]));
const arts = (c: LiveCluster): LiveArticle[] =>
  c.articleIds.map((id) => byId.get(id)).filter((a): a is LiveArticle => !!a);

// Routable = has a slug and is in scope (same definition as the story pages).
const routable = d.clusters.filter((c) => c.slug && (c.trendData?.geoTier ?? "out") !== "out");

const isTN = (c: LiveCluster) =>
  c.scope === "tamil-nadu" || c.trendData?.geoTier === "P0" || c.districts.length > 0;
const isImportant = (c: LiveCluster) => eligibleForAutoResearch(c);
const catOf = (c: LiveCluster): string => (c.trendData?.category ?? "other-relevant") as string;

const feedOwnership = new Map<string, string>();
for (const f of FEED_SOURCES) if (f.ownershipGroup) feedOwnership.set(f.publisher, f.ownershipGroup);

function familyKeyOfPublisher(publisher: string): string {
  const p = publisherByName(publisher);
  if (p) return `reg:${p.familyKey}`;
  const og = feedOwnership.get(publisher);
  if (og) return `og:${og}`;
  return `pub:${publisher}`;
}

// ── per-cluster pass ─────────────────────────────────────────────────────
interface Row {
  slug: string;
  title: string;
  category: string;
  tamilNadu: boolean;
  important: boolean;
  tier: string;
  articles: number;
  urls: number;
  publishers: number;
  ownershipGroups: number;
  genuineFamilies: number;
  briefDelivered: boolean;
  tamil: number;
  english: number;
}

const rows: Row[] = [];
for (const c of routable) {
  const a = arts(c);
  const r = resolveSourceFamilies(a, { evidence: c.claims?.evidence });
  const b = buildBrief(c, a, { research: (research[c.slug] as never) ?? null });
  const pubs = [...new Set(a.map((x) => x.publisher))];
  const ogs = new Set(pubs.map(familyKeyOfPublisher));
  rows.push({
    slug: c.slug,
    title: c.title.slice(0, 80),
    category: catOf(c),
    tamilNadu: isTN(c),
    important: isImportant(c),
    tier: priorityTier(c),
    articles: a.length,
    urls: new Set(a.map((x) => x.url)).size,
    publishers: pubs.length,
    ownershipGroups: ogs.size,
    genuineFamilies: r.genuineIndependentFamilies,
    briefDelivered: !b.withheldReason,
    tamil: a.filter((x) => x.language === "ta").length,
    english: a.filter((x) => x.language === "en").length,
  });
}

const count = (fn: (r: Row) => boolean) => rows.filter(fn).length;
const fam = (n: number) => (r: Row) => r.genuineFamilies === n;
const famGte = (n: number) => (r: Row) => r.genuineFamilies >= n;

const importantRows = rows.filter((r) => r.important);
const tnImportant = importantRows.filter((r) => r.tamilNadu);
const indiaImportant = importantRows.filter((r) => !r.tamilNadu);

const byCategory: Record<string, { clusters: number; singleFamily: number; multiFamily: number; briefsDelivered: number }> = {};
for (const r of importantRows) {
  byCategory[r.category] ??= { clusters: 0, singleFamily: 0, multiFamily: 0, briefsDelivered: 0 };
  byCategory[r.category].clusters++;
  if (r.genuineFamilies <= 1) byCategory[r.category].singleFamily++;
  else byCategory[r.category].multiFamily++;
  if (r.briefDelivered) byCategory[r.category].briefsDelivered++;
}

// Corpus-wide URL != coverage demo.
const allUrls = new Set(d.articles.map((a) => a.url)).size;
const allPublishers = new Set(d.articles.map((a) => a.publisher)).size;
const allOwnershipGroups = new Set(d.articles.map((a) => familyKeyOfPublisher(a.publisher))).size;
const genuineFamilyKeys = new Set<string>();
for (const c of routable) {
  const a = arts(c);
  const r = resolveSourceFamilies(a, { evidence: c.claims?.evidence });
  for (const f of r.families) {
    if (f.kind === "independent") genuineFamilyKeys.add(`${c.slug}::${f.id}`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  snapshot: d.generatedAt,
  corpus: {
    articles: d.articles.length,
    articleUrls: allUrls,
    publishers: allPublishers,
    ownershipGroups: allOwnershipGroups,
    genuineIndependentFamilyInstances: genuineFamilyKeys.size,
    clusters: d.clusters.length,
    routableClusters: routable.length,
    tamilArticles: d.articles.filter((a) => a.language === "ta").length,
    englishArticles: d.articles.filter((a) => a.language === "en").length,
  },
  familyDistribution: {
    "1": count(fam(0)) + count(fam(1)),
    "2": count(fam(2)),
    "3": count(fam(3)),
    "4+": count(famGte(4)),
    detail: {
      exactly0: count(fam(0)),
      exactly1: count(fam(1)),
      exactly2: count(fam(2)),
      exactly3: count(fam(3)),
      gte4: count(famGte(4)),
    },
  },
  important: {
    total: importantRows.length,
    tamilNadu: tnImportant.length,
    india: indiaImportant.length,
    singleSourceImportantClusters: count((r) => r.important && r.genuineFamilies <= 1),
    multiSourceImportantClusters: count((r) => r.important && r.genuineFamilies >= 2),
    byCategory,
    tamilNaduByCategory: Object.fromEntries(
      ["crisis", "politics", "finance", "sports"].map((cat) => [
        cat,
        {
          clusters: tnImportant.filter((r) => r.category === cat).length,
          singleFamily: tnImportant.filter((r) => r.category === cat && r.genuineFamilies <= 1).length,
        },
      ]),
    ),
    indiaByCategory: Object.fromEntries(
      ["crisis", "politics", "finance", "sports"].map((cat) => [
        cat,
        {
          clusters: indiaImportant.filter((r) => r.category === cat).length,
          singleFamily: indiaImportant.filter((r) => r.category === cat && r.genuineFamilies <= 1).length,
        },
      ]),
    ),
  },
  briefs: {
    delivered: count((r) => r.briefDelivered),
    withheld: count((r) => !r.briefDelivered),
    deliveredImportant: count((r) => r.important && r.briefDelivered),
    withheldForCoverageImportant: count((r) => r.important && !r.briefDelivered),
  },
  urlVsCoverage: {
    note: "URL count != independent coverage: many URLs collapse to one family via wire / corporate / syndication / echo gates.",
    articleUrls: allUrls,
    publishers: allPublishers,
    ownershipGroups: allOwnershipGroups,
    routableClusters: routable.length,
    singleFamilyClusters: count((r) => r.genuineFamilies <= 1),
    singleFamilyShare: Math.round((count((r) => r.genuineFamilies <= 1) / Math.max(routable.length, 1)) * 1000) / 10,
  },
};

mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");

const pct = (n: number, den: number) => ((n / Math.max(den, 1)) * 100).toFixed(1);
const md: string[] = [];
md.push(`# IFFA v0.13 — Discovery Baseline (PHASE 1, measured)`);
md.push(``);
md.push(`Snapshot \`${d.generatedAt}\` · measured ${report.generatedAt}. Every number computed from the live snapshot + frozen independence resolver. No estimates.`);
md.push(``);
md.push(`## Corpus`);
md.push(``);
md.push(`| metric | n |`);
md.push(`|---|---|`);
md.push(`| articles | ${report.corpus.articles} |`);
md.push(`| article URLs (distinct) | ${report.corpus.articleUrls} |`);
md.push(`| publishers | ${report.corpus.publishers} |`);
md.push(`| ownership groups (registry family keys) | ${report.corpus.ownershipGroups} |`);
md.push(`| genuine independent family instances (cluster-scoped) | ${report.corpus.genuineIndependentFamilyInstances} |`);
md.push(`| clusters (routable) | ${report.corpus.clusters} (${report.corpus.routableClusters}) |`);
md.push(`| Tamil / English articles | ${report.corpus.tamilArticles} / ${report.corpus.englishArticles} |`);
md.push(``);
md.push(`## Family distribution (all routable clusters)`);
md.push(``);
md.push(`| 1 family | 2 families | 3 families | 4+ families |`);
md.push(`|---|---|---|---|`);
md.push(`| **${report.familyDistribution["1"]}** | ${report.familyDistribution["2"]} | ${report.familyDistribution["3"]} | ${report.familyDistribution["4+"]} |`);
md.push(``);
md.push(`> ${report.urlVsCoverage.singleFamilyShare}% of routable clusters have ≤1 genuine independent family. Detail: 0=${report.familyDistribution.detail.exactly0} · 1=${report.familyDistribution.detail.exactly1} · 2=${report.familyDistribution.detail.exactly2} · 3=${report.familyDistribution.detail.exactly3} · ≥4=${report.familyDistribution.detail.gte4}.`);
md.push(``);
md.push(`## Important clusters (discovery-eligible tiers P0–P3)`);
md.push(``);
md.push(`| slice | clusters | single-family | multi-family |`);
md.push(`|---|---|---|---|`);
md.push(`| all important | ${report.important.total} | ${report.important.singleSourceImportantClusters} | ${report.important.multiSourceImportantClusters} |`);
md.push(`| Tamil Nadu important | ${report.important.tamilNadu} | ${tnImportant.filter((r) => r.genuineFamilies <= 1).length} | ${tnImportant.filter((r) => r.genuineFamilies >= 2).length} |`);
md.push(`| India important | ${report.important.india} | ${indiaImportant.filter((r) => r.genuineFamilies <= 1).length} | ${indiaImportant.filter((r) => r.genuineFamilies >= 2).length} |`);
md.push(``);
md.push(`### Important by category (crisis / politics / finance / sports)`);
md.push(``);
md.push(`| category | important clusters | single-family | briefs delivered |`);
md.push(`|---|---|---|---|`);
for (const cat of ["crisis", "politics", "finance", "sports"]) {
  const b = byCategory[cat] ?? { clusters: 0, singleFamily: 0, briefsDelivered: 0 };
  md.push(`| ${cat} | ${b.clusters} | ${b.singleFamily} | ${b.briefsDelivered} |`);
}
md.push(``);
md.push(`### Tamil Nadu important by category`);
md.push(``);
md.push(`| category | clusters | single-family |`);
md.push(`|---|---|---|`);
for (const cat of ["crisis", "politics", "finance", "sports"]) {
  const b = (report.important.tamilNaduByCategory as Record<string, { clusters: number; singleFamily: number }>)[cat];
  md.push(`| ${cat} | ${b.clusters} | ${b.singleFamily} |`);
}
md.push(``);
md.push(`## Briefs`);
md.push(``);
md.push(`| | delivered | withheld |`);
md.push(`|---|---|---|`);
md.push(`| all routable | ${report.briefs.delivered} | ${report.briefs.withheld} |`);
md.push(`| important | ${report.briefs.deliveredImportant} | ${report.briefs.withheldForCoverageImportant} |`);
md.push(``);
md.push(`## Why URL count != independent coverage`);
md.push(``);
md.push(`- ${report.urlVsCoverage.articleUrls} distinct article URLs from ${report.urlVsCoverage.publishers} publishers collapse through the wire / corporate-family / syndication / press-release-echo gates to **${report.urlVsCoverage.singleFamilyClusters} single-family clusters** (${report.urlVsCoverage.singleFamilyShare}%).`);
md.push(`- Ownership collapse alone: ${report.corpus.publishers} publishers → ${report.corpus.ownershipGroups} registry family keys.`);
md.push(`- Discovery success is therefore defined as a NEW GENUINE INDEPENDENT FAMILY, never a new URL.`);
md.push(``);
md.push(`## Rescue surface`);
md.push(``);
md.push(`- singleSourceImportantClusters: **${report.important.singleSourceImportantClusters}** of ${report.important.total} important (${pct(report.important.singleSourceImportantClusters, report.important.total)}%).`);
md.push(`- multiSourceImportantClusters: ${report.important.multiSourceImportantClusters}.`);
md.push(`- briefWithheldForCoverage (important, withheld): ${report.briefs.withheldForCoverageImportant}.`);
md.push(`- These ${report.important.singleSourceImportantClusters} single-family important clusters are the v0.13 discovery queue, Tamil Nadu first, crisis/politics/finance/sports first.`);

writeFileSync(OUT_MD, md.join("\n") + "\n");
console.log(md.join("\n"));
console.log(`\nwrote ${OUT_JSON.replace(ROOT + "/", "")} + ${OUT_MD.replace(ROOT + "/", "")}`);
