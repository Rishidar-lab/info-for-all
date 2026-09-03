/**
 * §B.2 — the research pass.
 *
 *   npx tsx scripts/research-pass.ts            (offline — uses committed fixtures + corpus_official only)
 *   RESEARCH_ONLINE=1 npx tsx scripts/research-pass.ts   (fetches PIB / TN DIPR; refreshes fixtures)
 *
 * Runs the §B.2.4 trigger over every routable withheld cluster, queries the top-3
 * adapters, and writes src/data/generated/research.json — which the brief layer
 * reads. The deploy workflow runs it ONLINE after ingest; CI runs it OFFLINE.
 *
 * Every fetched record's raw bytes are cached under tests/fixtures/research/ so
 * the whole path replays with zero network in CI.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LiveArticle, LiveCluster, LiveDataset } from "../src/lib/live/types";
import type { AdapterContext, ClusterResearch } from "../src/lib/research/types";
import { ADAPTERS } from "../src/lib/research/adapters";
import { researchTriggerFires, runResearch } from "../src/lib/research/pass";
import { resolveSourceFamilies } from "../src/lib/research/independence";
import { buildBrief } from "../src/lib/brief/build";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTIVE = resolve(ROOT, "src/data/generated/live-feed.json");
const OUT = resolve(ROOT, "src/data/generated/research.json");
const FIXTURE_DIR = resolve(ROOT, "tests/fixtures/research");

const OFFLINE = process.env.RESEARCH_ONLINE !== "1";
const NOW = Date.now();

async function main() {
  const dataset = JSON.parse(readFileSync(ACTIVE, "utf8")) as LiveDataset;
  const byId = new Map(dataset.articles.map((a) => [a.id, a]));
  const arts = (c: LiveCluster): LiveArticle[] => c.articleIds.map((id) => byId.get(id)).filter((a): a is LiveArticle => !!a);

  const corpusOfficialArticles = dataset.articles
    .filter((a) => a.role === "official" || ["official-alert", "primary-document", "government-statement"].includes(a.evidenceRole))
    .map((a) => ({ id: a.id, publisher: a.publisher, title: a.title, excerpt: a.excerpt ?? "", url: a.url, publishedAt: a.publishedAt, evidenceRole: a.evidenceRole }));

  const ctx: AdapterContext = { corpusOfficialArticles, offline: OFFLINE, fixtureDir: FIXTURE_DIR, now: NOW };

  const routable = dataset.clusters.filter((c) => c.slug && (c.trendData?.geoTier ?? "out") !== "out");
  const results: Record<string, ClusterResearch> = {};

  let triggered = 0;
  let withRecord = 0;
  let corroborated = 0;
  let contradicted = 0;

  for (const c of routable) {
    const a = arts(c);
    const b = buildBrief(c, a);
    if (!b.withheldReason) continue;
    const res = resolveSourceFamilies(a, { evidence: c.claims?.evidence });
    const hasAnchor = res.primaryRecordCount >= 1 || !!c.cap || a.some((x) => x.role === "official");
    if (!researchTriggerFires(c, a, { now: NOW, genuineFamilies: res.genuineIndependentFamilies, hasPrimaryAnchor: hasAnchor })) continue;
    triggered++;
    const r = await runResearch(c, a, ADAPTERS, ctx);
    results[c.slug] = r;
    if (r.records.length) withRecord++;
    if (r.matches.some((m) => m.outcome === "corroborated")) corroborated++;
    if (r.matches.some((m) => m.outcome === "contradicted")) contradicted++;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date(NOW).toISOString(), offline: OFFLINE, snapshot: dataset.generatedAt, bySlug: results }, null, 2));

  console.log(`\n§B.2 research pass — ${OFFLINE ? "OFFLINE (fixtures only)" : "ONLINE"} · snapshot ${dataset.generatedAt}`);
  console.log(`  trigger fired:        ${triggered} withheld clusters`);
  console.log(`  a record was found:   ${withRecord}`);
  console.log(`  a claim corroborated: ${corroborated}`);
  console.log(`  a claim contradicted: ${contradicted}`);
  console.log(`  wrote ${OUT.replace(ROOT + "/", "")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
