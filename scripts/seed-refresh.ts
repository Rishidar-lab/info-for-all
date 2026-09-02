/**
 * Deliberately promote the current active snapshot to the version-controlled
 * seed.
 *
 *   npm run seed:refresh
 *
 * Run this ONLY when you want the committed fixture to reflect a newer ingest
 * (e.g. the feed shape changed, or the demo data is stale). It is the one place
 * `src/data/fixtures/live-feed.seed.json` is meant to change — a normal
 * `npm run ingest` must never touch version control. See docs/DATA-HYGIENE.md.
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = resolve(ROOT, "src/data/fixtures/live-feed.seed.json");
const ACTIVE = resolve(ROOT, "src/data/generated/live-feed.json");

if (!existsSync(ACTIVE)) {
  console.error("seed:refresh: no active snapshot — run `npm run ingest` first");
  process.exit(1);
}

let parsed: { generatedAt?: string; articles?: unknown[]; clusters?: unknown[] };
try {
  parsed = JSON.parse(readFileSync(ACTIVE, "utf8"));
} catch (e) {
  console.error("seed:refresh: active snapshot is not valid JSON —", e);
  process.exit(1);
}
if (!Array.isArray(parsed.articles) || !Array.isArray(parsed.clusters) || parsed.articles.length === 0) {
  console.error("seed:refresh: active snapshot looks empty / malformed — refusing to overwrite the seed");
  process.exit(1);
}

copyFileSync(ACTIVE, SEED);
console.log(
  `seed:refresh: updated ${SEED}\n  generatedAt=${parsed.generatedAt} articles=${parsed.articles.length} clusters=${parsed.clusters.length}\n` +
    "  → review the diff and commit it intentionally.",
);
