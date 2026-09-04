/**
 * v0.13 — the coverage-discovery pass.
 *
 *   npx tsx scripts/discovery-pass.ts
 *       → no network. Only the corpus-rescan provider runs.
 *
 *   DISCOVERY_PROVIDERS=gdelt,corpus-rescan npx tsx scripts/discovery-pass.ts
 *       → GDELT is queried live (self-throttled to 6s), fixtures are refreshed.
 *
 *   DISCOVERY_OFFLINE=1 DISCOVERY_PROVIDERS=gdelt,corpus-rescan npx tsx scripts/discovery-pass.ts
 *       → replay committed GDELT fixtures with zero network.
 *
 * Runs discovery over every eligible single-independent-newsroom cluster and
 * writes src/data/generated/discovery.json — read by the brief / media-landscape
 * / story-page layers. The deploy workflow runs it ONLINE after ingest + research;
 * CI + `npm run build` run it in the no-network default.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LiveArticle, LiveCluster, LiveDataset } from "../src/lib/live/types";
import { resolveSourceFamilies } from "../src/lib/research/independence";
import { discoverForCluster, discoveryEligibility } from "../src/lib/discovery/pipeline";
import { computeDiscoveryMetrics } from "../src/lib/discovery/metrics";
import { loadProviders } from "../src/lib/discovery/providers";
import type { ClusterDiscovery, DiscoveryDataset } from "../src/lib/discovery/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTIVE = resolve(ROOT, "src/data/generated/live-feed.json");
const OUT = resolve(ROOT, "src/data/generated/discovery.json");

const NOW = Date.now();

async function main() {
  const dataset = JSON.parse(readFileSync(ACTIVE, "utf8")) as LiveDataset;
  const byId = new Map(dataset.articles.map((a) => [a.id, a]));
  const arts = (c: LiveCluster): LiveArticle[] =>
    c.articleIds.map((id) => byId.get(id)).filter((a): a is LiveArticle => !!a);

  const providers = loadProviders();
  const providerModes: DiscoveryDataset["providers"] = providers.map((p) => ({
    id: p.id,
    network: p.network,
    mode: !p.network ? "online" : process.env.DISCOVERY_OFFLINE === "1" ? "offline-fixture" : "online",
  }));

  const routable = dataset.clusters.filter((c) => c.slug && (c.trendData?.geoTier ?? "out") !== "out");
  const familiesBeforeByCluster: Record<string, number> = {};
  const bySlug: Record<string, ClusterDiscovery> = {};

  let attempted = 0;
  let rescued = 0;
  const corpus = dataset.articles;

  for (const c of routable) {
    const a = arts(c);
    const res = resolveSourceFamilies(a, { evidence: c.claims?.evidence });
    const familiesBefore = res.genuineIndependentFamilies;
    familiesBeforeByCluster[c.slug] = familiesBefore;

    const gate = discoveryEligibility(c, { now: NOW, familiesBefore });
    if (!gate.eligible) continue;

    const d = await discoverForCluster(c, a, corpus, providers, { now: NOW, familiesBefore });
    if (!d.attempted) continue;
    bySlug[c.slug] = d;
    attempted++;
    if (d.rescued) rescued++;
    const tag = d.rescued ? "RESCUED" : d.reports.length ? "coverage" : "—";
    console.log(
      `  ${tag.padEnd(9)} ${c.slug.slice(0, 46).padEnd(46)} ${familiesBefore}→${d.familiesAfter}  ` +
        `cand ${d.candidatesFound} · same-event ${d.reports.length + d.rejected.filter((r) => r.stage === "independence").length} · indep ${d.reports.filter((r) => r.sourceType === "independent").length}` +
        (d.notes.length ? `  [${d.notes.join("; ")}]` : ""),
    );
  }

  const metrics = computeDiscoveryMetrics({
    familiesBeforeByCluster,
    discoveries: Object.values(bySlug),
  });

  const out: DiscoveryDataset = { generatedAt: new Date(NOW).toISOString(), providers: providerModes, bySlug, metrics };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

  console.log(`\nv0.13 discovery pass · snapshot ${dataset.generatedAt}`);
  console.log(`  providers:                ${providerModes.map((p) => `${p.id}(${p.mode})`).join(", ")}`);
  console.log(`  single-source candidates: ${metrics.singleSourceCandidates}`);
  console.log(`  discovery attempted:      ${attempted}`);
  console.log(`  candidate articles found: ${metrics.candidateArticlesFound}`);
  console.log(`  same-event candidates:    ${metrics.sameEventCandidates}`);
  console.log(`  independent (new family):  ${metrics.independentCandidates}`);
  console.log(`  rescued clusters:         ${rescued}  (rate ${(metrics.coverageRescueRate * 100).toFixed(1)}%)`);
  console.log(`  family dist before:       ${JSON.stringify(metrics.familyDistributionBefore)}`);
  console.log(`  family dist after:        ${JSON.stringify(metrics.familyDistributionAfter)}`);
  console.log(`  wrote ${OUT.replace(ROOT + "/", "")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
