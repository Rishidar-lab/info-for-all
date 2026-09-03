/**
 * Ensure the ACTIVE live-feed snapshot exists before lint / typecheck / test /
 * build / ingest.
 *
 *   npx tsx scripts/prepare-data.ts [--force]
 *
 * Data-hygiene rule (docs/DATA-HYGIENE.md):
 *
 *   src/data/fixtures/live-feed.seed.json   — version-controlled, deterministic
 *                                             seed. Refreshed deliberately via
 *                                             `npm run seed:refresh`.
 *   src/data/generated/live-feed.json       — the volatile active snapshot.
 *                                             GITIGNORED. `npm run ingest`
 *                                             overwrites it every run, so it must
 *                                             never create repository churn.
 *
 * This script copies the seed into the generated slot when the generated file is
 * absent (fresh clone, cleaned tree, CI cache miss) or when `--force` is passed.
 * It never overwrites a snapshot that ingestion already produced.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = resolve(ROOT, "src/data/fixtures/live-feed.seed.json");
const ACTIVE = resolve(ROOT, "src/data/generated/live-feed.json");

const force = process.argv.includes("--force");

if (!existsSync(SEED)) {
  console.error(`prepare-data: seed missing at ${SEED}`);
  process.exit(1);
}

if (existsSync(ACTIVE) && !force) {
  const age = (Date.now() - statSync(ACTIVE).mtimeMs) / 3_600_000;
  console.log(`prepare-data: active snapshot present (${age.toFixed(1)}h old) — leaving it in place`);
  process.exit(0);
}

mkdirSync(dirname(ACTIVE), { recursive: true });
copyFileSync(SEED, ACTIVE);
console.log(`prepare-data: seeded ${ACTIVE} from the version-controlled fixture`);

// Milestone B §B.2 — the research pass output follows the same seed pattern.
const RESEARCH_SEED = resolve(ROOT, "src/data/fixtures/research.seed.json");
const RESEARCH_ACTIVE = resolve(ROOT, "src/data/generated/research.json");
if (existsSync(RESEARCH_SEED) && (!existsSync(RESEARCH_ACTIVE) || force)) {
  copyFileSync(RESEARCH_SEED, RESEARCH_ACTIVE);
  console.log(`prepare-data: seeded ${RESEARCH_ACTIVE} from the version-controlled fixture`);
}
