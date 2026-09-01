/**
 * Fail the build if src/data/generated/live-feed.json is missing or malformed.
 *   npx tsx scripts/validate-feed.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/generated/live-feed.json");

if (!existsSync(OUT)) {
  console.error(`validate-feed: ${OUT} does not exist`);
  process.exit(1);
}

let data: Record<string, unknown>;
try {
  data = JSON.parse(readFileSync(OUT, "utf8"));
} catch (e) {
  console.error("validate-feed: not valid JSON —", e);
  process.exit(1);
}

const problems: string[] = [];
const req = (cond: boolean, msg: string) => {
  if (!cond) problems.push(msg);
};

req(typeof data.generatedAt === "string", "generatedAt missing");
req(["live", "degraded", "stale", "empty"].includes(data.health as string), "health invalid");
req(Array.isArray(data.feeds), "feeds not an array");
req(Array.isArray(data.articles), "articles not an array");
req(Array.isArray(data.clusters), "clusters not an array");
req(typeof data.counts === "object" && data.counts !== null, "counts missing");

const articles = (data.articles ?? []) as Record<string, unknown>[];
for (const a of articles.slice(0, 2000)) {
  if (typeof a.url !== "string" || !/^https?:\/\//.test(a.url)) {
    problems.push(`article ${a.id} has no valid URL`);
    break;
  }
  if (typeof a.title !== "string" || a.title.length < 4) {
    problems.push(`article ${a.id} has no title`);
    break;
  }
  if (!["tamil-nadu", "india", "india-relevant", "excluded"].includes(a.scope as string)) {
    problems.push(`article ${a.id} has invalid scope ${String(a.scope)}`);
    break;
  }
}

const clusters = (data.clusters ?? []) as Record<string, unknown>[];
const slugs = clusters.map((c) => c.slug);
if (new Set(slugs).size !== slugs.length) problems.push("duplicate cluster slugs");

if (problems.length) {
  console.error("validate-feed: FAILED\n  - " + problems.join("\n  - "));
  process.exit(1);
}

console.log(
  `validate-feed: OK — health=${data.health} articles=${articles.length} clusters=${clusters.length} generatedAt=${data.generatedAt}`,
);
