/**
 * Milestone B §B.1 — impact of the hardened source-family resolver.
 *
 *   npx tsx scripts/independence-impact.ts
 *
 * For every routable cluster: what did the OLD family count say (registry
 * familyKey, via ml.coverage.independentSourceFamilies), what does the NEW
 * resolver say (genuine independent families + primary anchor), and does the
 * brief withholding decision change?
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LiveArticle, LiveCluster, LiveDataset } from "../src/lib/live/types";
import { resolveSourceFamilies } from "../src/lib/research/independence";
import { buildBrief } from "../src/lib/brief/build";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const d = JSON.parse(readFileSync(resolve(ROOT, "src/data/generated/live-feed.json"), "utf8")) as LiveDataset;
const byId = new Map(d.articles.map((a) => [a.id, a]));
const arts = (c: LiveCluster): LiveArticle[] => c.articleIds.map((id) => byId.get(id)).filter((a): a is LiveArticle => !!a);

const routable = d.clusters.filter((c) => c.slug && (c.trendData?.geoTier ?? "out") !== "out");

let oldDelivered = 0;
let newDelivered = 0;
let flippedToWithheld = 0;
let flippedToDelivered = 0;
const kinds: Record<string, number> = {};
const merges: Record<string, number> = {};
const flips: string[] = [];

for (const c of routable) {
  const a = arts(c);
  const oldFam = c.trendData?.mediaLandscape?.coverage.independentSourceFamilies ?? c.trendData?.independence?.families ?? 1;
  const oldOfficial = a.some((x) => x.role === "official" || ["official-alert", "primary-document", "government-statement"].includes(x.evidenceRole)) || !!c.cap;
  const oldWouldDeliver = oldFam >= 2 || oldOfficial;

  const res = resolveSourceFamilies(a, { evidence: c.claims?.evidence });
  for (const f of res.families) kinds[f.kind] = (kinds[f.kind] ?? 0) + 1;
  for (const m of res.downgrades) merges[m.reason.replace(/\d+/g, "N").slice(0, 44)] = (merges[m.reason.replace(/\d+/g, "N").slice(0, 44)] ?? 0) + 1;

  const b = buildBrief(c, a);
  const newDeliver = !b.withheldReason;

  if (oldWouldDeliver) oldDelivered++;
  if (newDeliver) newDelivered++;
  if (oldWouldDeliver && !newDeliver) {
    flippedToWithheld++;
    const b1 = b.withheldReason === "NO_INDEPENDENT_COVERAGE" ? "§B.1 gate" : `unchanged ${b.withheldReason} gate`;
    flips.push(`  − ${c.slug.slice(0, 46)}  oldFam=${oldFam} genuine=${res.genuineIndependentFamilies} anchor=${res.primaryRecordCount}  withheld by: ${b1}`);
  }
  if (!oldWouldDeliver && newDeliver) {
    flippedToDelivered++;
    flips.push(`  + ${c.slug.slice(0, 46)}  now delivered — ${res.label}`);
  }
}

console.log(`\nMilestone B §B.1 — hardened resolver impact · ${routable.length} routable clusters · snapshot ${d.generatedAt}\n`);
console.log(`old heuristic would deliver: ${oldDelivered}`);
console.log(`new resolver delivers:       ${newDelivered}`);
console.log(`  flipped delivered → withheld: ${flippedToWithheld}`);
console.log(`  flipped withheld → delivered: ${flippedToDelivered}`);
if (flips.length) {
  console.log("\nflips:");
  for (const f of flips) console.log(f);
}
console.log("\nfamily kinds across all routable clusters:");
for (const [k, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log("\nmerges applied past the registry:");
const me = Object.entries(merges).sort((a, b) => b[1] - a[1]);
if (me.length === 0) console.log("  (none — no visible wire credit or ≥85% excerpt overlap in this snapshot)");
for (const [k, n] of me) console.log(`  ${String(n).padStart(4)}  ${k}`);
