/**
 * Append today's compact per-publisher aggregate to the history store
 * (v0.10 Phase 1.5). Runs after `npm run ingest`. The store lives in
 * src/data/generated/history/ (gitignored) and is carried between runs by
 * actions/cache — no repo churn.
 *
 *   npm run history:append
 */
import { mkdirSync, writeFileSync, readdirSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { LiveDataset } from "../src/lib/live/types";
import { computeDailyAggregate } from "../src/lib/media-landscape/history";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = resolve(ROOT, "src/data/generated/live-feed.json");
const DIR = resolve(ROOT, "src/data/generated/history");
const KEEP_DAYS = 100;

function main() {
  if (!existsSync(LIVE)) {
    console.error("history:append — no live-feed.json; run `npm run ingest` first.");
    process.exit(0);
  }
  const dataset = JSON.parse(readFileSync(LIVE, "utf8")) as LiveDataset;
  const agg = computeDailyAggregate(dataset);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(resolve(DIR, `${agg.date}.json`), JSON.stringify(agg));

  // prune anything older than KEEP_DAYS
  const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".json")).sort() : [];
  for (const f of files.slice(0, Math.max(0, files.length - KEEP_DAYS))) {
    try {
      unlinkSync(resolve(DIR, f));
    } catch {
      /* ignore */
    }
  }
  console.log(
    `history:append — wrote ${agg.date}.json (${agg.publishers.length} publishers). History now spans ${files.length || 1} day(s).`,
  );
}

main();
