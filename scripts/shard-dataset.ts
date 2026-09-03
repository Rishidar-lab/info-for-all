/**
 * v0.11 Phase N — data sharding.
 *
 *   npx tsx scripts/shard-dataset.ts        (npm run shard)
 *
 * Reads the enriched active snapshot (`src/data/generated/live-feed.json`) and
 * writes SMALL, SERVED shards under `public/data/` so pages that only need a
 * summary do not inline the whole corpus.
 *
 *   public/data/meta.json               generatedAt / health / counts
 *   public/data/search/index.json       compact per-cluster search rows
 *   public/data/index/latest.json       compact cluster list (no media-landscape internals)
 *   public/data/landscape/latest.json   India + Tamil Nadu landscape summary
 *   public/data/sources/index.json      per-publisher profile summary
 *
 * MEASURED, not guessed: `live-feed.json` is a BUILD INPUT and is never served.
 * The shards below are the served surface. `public/data/` is gitignored — it is
 * regenerated on every build (prebuild) and every ingest.
 *
 * Next copies `public/` verbatim into `out/`, so a shard at
 * `public/data/x.json` is fetchable at `<basePath>/data/x.json`.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLandscapeSummary } from "../src/lib/media-landscape/dashboard";
import { PUBLISHERS } from "../src/data/publishers";
import type { LiveCluster, LiveDataset } from "../src/lib/live/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTIVE = resolve(ROOT, "src/data/generated/live-feed.json");
const OUT = resolve(ROOT, "public/data");

const dataset = JSON.parse(readFileSync(ACTIVE, "utf8")) as LiveDataset;

function write(rel: string, data: unknown): number {
  const p = resolve(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  const json = JSON.stringify(data);
  writeFileSync(p, json);
  return Buffer.byteLength(json);
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

// Fresh tree every run so a removed shard never lingers in `out/`.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const artById = new Map(dataset.articles.map((a) => [a.id, a]));
const clusterArts = (c: LiveCluster) => c.articleIds.map((id) => artById.get(id)).filter((a): a is NonNullable<typeof a> => !!a);

// ── meta ──────────────────────────────────────────────────────────────────
const metaBytes = write("meta.json", {
  generatedAt: dataset.generatedAt,
  lastSuccessAt: dataset.lastSuccessAt,
  health: dataset.health,
  counts: dataset.counts,
});

// ── search index ──────────────────────────────────────────────────────────
// Exactly the fields <Search> needs — nothing else. This was the single
// largest client-serialised blob on the site (≈350 KB inlined into /search).
const searchRows = dataset.clusters
  .filter((c) => c.slug)
  .map((c) => {
    const arts = clusterArts(c);
    const ml = c.trendData?.mediaLandscape;
    return {
      slug: c.slug,
      title: c.title,
      category: c.trendData?.category ?? "other-relevant",
      scope: c.scope,
      publishers: [...new Set(arts.map((a) => a.publisher))],
      districts: c.districts,
      urls: arts.map((a) => a.url),
      sources: ml?.coverage.uniquePublishers ?? c.distinctPublishers,
      families: ml?.coverage.independentSourceFamilies ?? 1,
    };
  });
const searchBytes = write("search/index.json", { generatedAt: dataset.generatedAt, entries: searchRows });

// ── compact cluster index ─────────────────────────────────────────────────
// List/card views need a coverage SUMMARY, not the framing-observation arrays
// or the per-claim evidence matrix. Keep the three fields <StoryCard> reads.
const compactClusters = dataset.clusters.map((c) => {
  const td = c.trendData;
  const ml = td?.mediaLandscape;
  return {
    slug: c.slug,
    title: c.title,
    scope: c.scope,
    districts: c.districts,
    lifecycle: c.lifecycle,
    isCrisis: c.isCrisis,
    isVerifiedComparison: c.isVerifiedComparison,
    distinctPublishers: c.distinctPublishers,
    updatedAt: c.updatedAt,
    category: td?.category ?? null,
    editorialBand: td?.editorial?.band ?? null,
    severity: td?.severity?.level ?? null,
    coverage: ml
      ? {
          uniquePublishers: ml.coverage.uniquePublishers,
          independentSourceFamilies: ml.coverage.independentSourceFamilies,
          tamilCount: ml.coverage.tamilCount,
          englishCount: ml.coverage.englishCount,
          alignment: ml.coverage.alignment,
          alignmentUnavailableReason: ml.coverage.alignmentUnavailableReason ?? null,
        }
      : null,
    evidenceProfile: ml?.evidenceProfile ?? null,
    blindspots: ml?.blindspots ?? [],
  };
});
const indexBytes = write("index/latest.json", { generatedAt: dataset.generatedAt, clusters: compactClusters });

// ── landscape summary ─────────────────────────────────────────────────────
const landscapeBytes = write("landscape/latest.json", {
  generatedAt: dataset.generatedAt,
  india: buildLandscapeSummary(dataset),
  tamilNadu: buildLandscapeSummary(dataset, { tnOnly: true }),
});

// ── source profile summary ────────────────────────────────────────────────
const seen = new Map<string, number>();
for (const a of dataset.articles) seen.set(a.publisher, (seen.get(a.publisher) ?? 0) + 1);
const sourceRows = PUBLISHERS.map((p) => ({
  id: p.id,
  name: p.name,
  languages: p.languages,
  regions: p.regions,
  ownershipCategory: p.ownership.category,
  ownershipConfidence: p.ownership.provenance.confidence,
  familyKey: p.familyKey,
  articlesInSnapshot: seen.get(p.id) ?? 0,
}));
const sourcesBytes = write("sources/index.json", { generatedAt: dataset.generatedAt, sources: sourceRows });

// ── report ────────────────────────────────────────────────────────────────
const total = metaBytes + searchBytes + indexBytes + landscapeBytes + sourcesBytes;
console.log("shard-dataset — served shards under public/data/");
console.log(`  meta.json              ${kb(metaBytes)}`);
console.log(`  search/index.json      ${kb(searchBytes)}   (${searchRows.length} rows)`);
console.log(`  index/latest.json      ${kb(indexBytes)}   (${compactClusters.length} clusters)`);
console.log(`  landscape/latest.json  ${kb(landscapeBytes)}`);
console.log(`  sources/index.json     ${kb(sourcesBytes)}   (${sourceRows.length} sources)`);
console.log(`  ── total               ${kb(total)}`);
