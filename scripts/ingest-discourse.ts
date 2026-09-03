/**
 * Public-discourse ingestion (v0.10, Phase 9) — SEPARATE from news ingestion.
 *
 *   npm run ingest:discourse
 *
 * Fetches Reddit's public RSS feeds for a fixed set of Tamil Nadu / India
 * subreddits, with a descriptive User-Agent, one request per subreddit, a
 * courteous delay, and graceful 429 handling. Writes
 * src/data/generated/discourse.json (gitignored). Best-effort: a failed run
 * leaves the previous file in place and the news pipeline is unaffected.
 *
 * Discourse NEVER counts as factual corroboration (see src/lib/discourse/).
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAllSubreddits } from "../src/lib/discourse/reddit";
import type { DiscourseDataset } from "../src/lib/discourse";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/data/generated/discourse.json");
const SEED = resolve(ROOT, "src/data/fixtures/discourse.seed.json");

async function main() {
  console.log("ingest:discourse — fetching Reddit public RSS…");
  const { mentions, sources } = await fetchAllSubreddits();

  for (const s of sources) console.log(`  ${s.channel.padEnd(22)} ${s.status}  items=${s.itemsSeen}`);

  const ok = sources.filter((s) => s.itemsSeen > 0).length;
  if (ok === 0) {
    console.warn("ingest:discourse — no subreddit returned items (rate-limited?).");
    if (existsSync(OUT)) {
      console.warn("  keeping the existing discourse.json.");
      return;
    }
    if (existsSync(SEED)) {
      console.warn("  seeding from discourse.seed.json.");
      writeFileSync(OUT, readFileSync(SEED));
      return;
    }
  }

  const out: DiscourseDataset = {
    generatedAt: new Date().toISOString(),
    mentions,
    sources,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`ingest:discourse — wrote ${mentions.length} mentions from ${ok}/${sources.length} subreddits.`);
}

main().catch((err) => {
  console.error("ingest:discourse failed:", err);
  // non-fatal — the news pipeline does not depend on this
  process.exit(0);
});
