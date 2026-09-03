/**
 * Headline-framing / emphasis evaluation (v0.11 Phase G).
 *   npm run eval:framing
 *
 * Runs the emphasis detector over evaluation/corpora/framing-gold.json.
 * INDICATIVE — first-pass corpus, humanVerified:false.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compareFraming } from "../src/lib/media-landscape/framing";
import type { LiveArticle, LiveCluster } from "../src/lib/live/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const C = JSON.parse(readFileSync(resolve(ROOT, "evaluation/corpora/framing-gold.json"), "utf8")) as {
  entries: { id: string; headline: string; emphasis: string[]; language: string; humanVerified: boolean }[];
  emphasisLabels: string[];
};

function fakeArticle(headline: string): LiveArticle {
  return {
    id: "a", title: headline, url: "u", sourceId: "s", sourceName: "S", publisher: "S", role: "independent",
    sourceUrl: "u", publishedAt: "2026-09-03T00:00:00Z", fetchedAt: "2026-09-03T00:00:00Z", language: "en",
    scope: "tamil-nadu", districts: [], geo: {} as never, evidenceRole: "independent-report",
    verificationStatus: "single-source", crisisPriority: 30, isCrisis: false, lifecycle: "developing",
  } as LiveArticle;
}
const fakeCluster = { id: "c", slug: "c", title: "t", scope: "tamil-nadu", districts: [], isCrisis: false, crisisPriority: 30, lifecycle: "developing", updatedAt: "x", languages: ["en"], articleIds: [], distinctPublishers: 1, publishers: [], sourceCount: 1, officialCount: 0, independentCount: 1, verificationStatus: "single-source", confidence: "weak", reason: "", isVerifiedComparison: false, commonGround: [], commonGroundPending: true, differences: [], unknowns: [] } as unknown as LiveCluster;

let tp = 0, fp = 0, fn = 0, exact = 0;
const misses: string[] = [];
for (const e of C.entries) {
  const got = new Set<string>(
    compareFraming(fakeCluster, [fakeArticle(e.headline)]).observations[0].emphasis.filter((x) => x !== "uncategorised"),
  );
  const want = new Set(e.emphasis);
  let localTp = 0;
  for (const w of want) {
    if (got.has(w)) {
      tp++;
      localTp++;
    } else fn++;
  }
  for (const g of got) if (!want.has(g)) fp++;
  if (localTp === want.size && got.size === want.size) exact++;
  else misses.push(`  ${e.id} [${e.language}] want {${[...want]}} got {${[...got]}} — ${e.headline.slice(0, 55)}`);
}
const prec = tp + fp ? tp / (tp + fp) : 1;
const rec = tp + fn ? tp / (tp + fn) : 1;
const n = C.entries.length;

const md = [
  "# IFFA headline-framing evaluation (v0.11)",
  "",
  `- corpus: ${n} first-pass single-headline cases (**humanVerified 0 / ${n}**)`,
  `- label-level precision **${(prec * 100).toFixed(0)}%** · recall **${(rec * 100).toFixed(0)}%** · exact-set match **${((exact / n) * 100).toFixed(0)}%**`,
  "- INDICATIVE ONLY.",
  "",
  "## Misses",
  ...misses,
].join("\n");
writeFileSync(resolve(ROOT, "evaluation/reports/framing-latest.md"), md);
writeFileSync(resolve(ROOT, "evaluation/reports/framing-latest.json"), JSON.stringify({ n, precision: prec, recall: rec, exactMatch: exact / n }, null, 2));
console.log(`eval:framing — label precision ${(prec * 100).toFixed(0)}% · recall ${(rec * 100).toFixed(0)}% · exact ${((exact / n) * 100).toFixed(0)}% of ${n} (first-pass, INDICATIVE)`);
