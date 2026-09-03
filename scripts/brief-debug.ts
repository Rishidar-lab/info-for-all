import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LiveArticle, LiveCluster, LiveDataset } from "../src/lib/live/types";
import { synthesizeBrief } from "../src/lib/brief/synthesize";
import { verifyBrief } from "../src/lib/brief/verify";
import { buildPerspectiveCompare } from "../src/lib/brief/perspective";
import { toTamilBrief } from "../src/lib/brief/tamil";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataset = JSON.parse(readFileSync(resolve(ROOT, "src/data/generated/live-feed.json"), "utf8")) as LiveDataset;
const artById = new Map(dataset.articles.map((a) => [a.id, a]));
const arts = (c: LiveCluster): LiveArticle[] => c.articleIds.map((id) => artById.get(id)).filter((a): a is LiveArticle => !!a);

const slugs = process.argv.slice(2);
for (const slug of slugs) {
  const c = dataset.clusters.find((x) => x.slug === slug);
  if (!c) {
    console.log("NOT FOUND:", slug);
    continue;
  }
  const a = arts(c);
  const raw = synthesizeBrief(c, a, { language: "en" });
  const b = verifyBrief(raw, c, a);
  console.log("\n================", slug, "================");
  console.log("headline:", b.headline, "| place:", b.place, "| withheld:", b.withheldReason ?? "-");
  console.log("\nRAW short:", raw.shortVersion.map((s) => s.text));
  console.log("RAW keyFacts:", raw.keyFacts.map((s) => s.text));
  console.log("\nSHORT:");
  for (const s of b.shortVersion) console.log(`  [${s.support}] ${s.text}   ⟪claims:${s.citations.claimIds.length} src:${s.citations.sourceIds.length}⟫`);
  console.log("KEY FACTS:");
  for (const s of b.keyFacts) console.log(`  [${s.support}] ${s.text}`);
  console.log("WHY:");
  for (const s of b.whyItMatters) console.log(`  ${s.text}`);
  console.log("WHAT CHANGED:");
  for (const s of b.whatChanged) console.log(`  ${s.text}`);
  console.log("UNCERTAIN:");
  for (const u of b.uncertainties) console.log(`  ? ${u.text}`);
  console.log("DISAGREEMENTS:");
  for (const d of b.disagreements) console.log(`  ${d.topic}: ${d.positions.map((p) => `${p.value} (${p.publishers.join(",")})`).join("  vs  ")} → best: ${d.bestSupported ?? "-"} (${d.reasoning ?? ""})`);
  console.log(`VERIFY: considered=${b.verification.sentencesConsidered} dropped=${b.verification.sentencesDropped}`);
  for (const r of b.verification.dropReasons) console.log("   ✗", r);
  const ta = verifyBrief(toTamilBrief(b, c, a), c, a);
  console.log("TAMIL:", ta.withheldReason ?? `${ta.shortVersion.length} short / ${ta.keyFacts.length} facts`);
  for (const s of ta.shortVersion) console.log("   த:", s.text);
  const pc = buildPerspectiveCompare(c, a);
  console.log("PERSPECTIVE hasContrast:", pc.hasContrast, "| TA:", pc.tamilMediaEmphasis, "| EN:", pc.englishMediaEmphasis, "| official:", pc.officialSourcesEmphasis.length);
}
