/**
 * Claim-evidence-status evaluation (v0.11 Phase K).
 *   npm run eval:evidence
 *
 * Runs statusOf() over evaluation/corpora/evidence-gold.json. INDICATIVE —
 * first-pass corpus, humanVerified:false. DISPUTED / CORRECTED / RETRACTED are
 * inspected individually; overall accuracy is not the target.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { statusOf } from "../src/lib/media-landscape/evidence";
import type { Claim } from "../src/lib/claims/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const C = JSON.parse(readFileSync(resolve(ROOT, "evaluation/corpora/evidence-gold.json"), "utf8")) as {
  entries: {
    id: string; claim: string; status: string; independentGroups: number; contradicting: number;
    corrections: number; supersedes: boolean; type: string; expected: string; humanVerified: boolean;
  }[];
};

function toClaim(e: (typeof C.entries)[number]): Claim {
  return {
    id: e.id, eventId: "ev", canonicalText: e.claim, type: e.type as Claim["type"], status: e.status as Claim["status"],
    subjects: [], predicates: [], objects: [], supportingArticleIds: Array.from({ length: e.independentGroups }, (_, i) => `a${i}`),
    contradictingArticleIds: Array.from({ length: e.contradicting }, (_, i) => `c${i}`),
    supportingPublisherIds: Array.from({ length: e.independentGroups }, (_, i) => `p${i}`),
    independentSourceGroups: Array.from({ length: e.independentGroups }, (_, i) => [`p${i}`]),
    primaryEvidenceIds: [], confidence: 50, confidenceBand: "moderate", rationale: [],
    firstSeenAt: "2026-09-03T00:00:00Z", lastSeenAt: "2026-09-03T01:00:00Z", provenance: [],
    updates: e.supersedes ? [{ at: "x", publisherId: "p", articleId: "a", change: "x", supersedes: true }] : [],
    corrections: Array.from({ length: e.corrections }, () => ({ publisherId: "p", articleId: "a", at: "x", original: "o", corrected: "c" })),
    notes: [],
  };
}

const STATUSES = ["HIGHLY_CORROBORATED", "CORROBORATED", "PARTIALLY_CORROBORATED", "SINGLE_SOURCE", "DISPUTED", "UNVERIFIED", "CORRECTED", "RETRACTED", "SUPERSEDED"];
const conf: Record<string, Record<string, number>> = {};
for (const s of STATUSES) conf[s] = Object.fromEntries(STATUSES.map((p) => [p, 0]));
const misses: string[] = [];
let correct = 0;
for (const e of C.entries) {
  const got = statusOf(toClaim(e));
  conf[e.expected][got]++;
  if (got === e.expected) correct++;
  else misses.push(`  ${e.id} want ${e.expected}, got ${got} — ${e.claim.slice(0, 55)}`);
}
const n = C.entries.length;
const critical = ["DISPUTED", "CORRECTED", "RETRACTED"];
const critReport = critical.map((s) => {
  const support = STATUSES.reduce((a, p) => a + conf[s][p], 0);
  const tp = conf[s][s];
  const fp = STATUSES.reduce((a, g) => a + (g === s ? 0 : conf[g][s]), 0);
  return `- **${s}**: recall ${support ? ((tp / support) * 100).toFixed(0) : "—"}% (${tp}/${support}) · precision ${tp + fp ? ((tp / (tp + fp)) * 100).toFixed(0) : "—"}%`;
});

const md = [
  "# IFFA claim-evidence-status evaluation (v0.11)",
  "",
  `- corpus: ${n} first-pass claim situations (**humanVerified 0 / ${n}**)`,
  `- **overall accuracy ${((correct / n) * 100).toFixed(0)}%** (not the target metric)`,
  "- INDICATIVE ONLY.",
  "",
  "## Critical statuses (individually inspected)",
  ...critReport,
  "",
  "## Confusion (rows gold, cols predicted)",
  `| gold \\ pred | ${STATUSES.map((s) => s.slice(0, 6)).join(" | ")} |`,
  `|---|${STATUSES.map(() => "---:").join("|")}|`,
  ...STATUSES.map((g) => `| ${g.slice(0, 10)} | ${STATUSES.map((p) => conf[g][p]).join(" | ")} |`),
  "",
  "## Misses",
  ...misses,
].join("\n");
writeFileSync(resolve(ROOT, "evaluation/reports/evidence-latest.md"), md);
writeFileSync(resolve(ROOT, "evaluation/reports/evidence-latest.json"), JSON.stringify({ n, accuracy: correct / n, confusion: conf }, null, 2));
console.log(`eval:evidence — accuracy ${((correct / n) * 100).toFixed(0)}% of ${n} · ${critical.join("/")} inspected (first-pass, INDICATIVE)`);
