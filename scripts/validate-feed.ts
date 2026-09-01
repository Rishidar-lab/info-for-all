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

// v0.3 claim-layer invariants — the honesty guarantees, enforced.
let claimCount = 0;
for (const c of clusters) {
  const ec = c.claims as
    | { claims?: Record<string, unknown>[]; disputes?: unknown[]; evidence?: Record<string, unknown>[] }
    | undefined;
  if (!ec) continue;
  if (!Array.isArray(ec.claims)) {
    problems.push(`cluster ${c.slug}: claims.claims is not an array`);
    continue;
  }
  for (const cl of ec.claims as Record<string, unknown>[]) {
    claimCount++;
    const status = cl.status as string;
    const groups = (cl.independentSourceGroups as unknown[]) ?? [];
    const pubs = (cl.supportingPublisherIds as unknown[]) ?? [];
    // Never present a single-source claim as consensus.
    if (status === "corroborated" && groups.length < 2) {
      problems.push(`cluster ${c.slug}: claim "${String(cl.canonicalText).slice(0, 40)}" is 'corroborated' with <2 independent groups`);
      break;
    }
    // An attributed statement must never silently become a bare fact.
    if (status === "attributed" && !(cl.provenance as Record<string, unknown>[]).some((p) => p.attribution)) {
      problems.push(`cluster ${c.slug}: 'attributed' claim has no attribution in provenance`);
      break;
    }
    if ((status === "corroborated" || status === "partially-corroborated") && pubs.length < 2) {
      problems.push(`cluster ${c.slug}: '${status}' claim has <2 supporting publishers`);
      break;
    }
  }
  // Evidence is never invented — every record must carry a URL.
  for (const ev of (ec.evidence as Record<string, unknown>[]) ?? []) {
    if (typeof ev.url !== "string" || !/^https?:\/\//.test(ev.url)) {
      problems.push(`cluster ${c.slug}: evidence record has no valid URL`);
      break;
    }
  }
}

if (problems.length) {
  console.error("validate-feed: FAILED\n  - " + problems.join("\n  - "));
  process.exit(1);
}

console.log(
  `validate-feed: OK — health=${data.health} articles=${articles.length} clusters=${clusters.length} claims=${claimCount} generatedAt=${data.generatedAt}`,
);
