/**
 * Stance classifier evaluation (v0.11 Phase F).
 *
 *   npm run eval:stance
 *
 * Runs readStance() over evaluation/corpora/stance-gold.json and reports
 * precision / recall / F1 / confusion vs the FIRST-PASS labels. These labels are
 * humanVerified:false — the numbers are INDICATIVE, not a validated accuracy
 * claim (see evaluation/corpora/README.md).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readStance } from "../src/lib/media-landscape/stance";
import { entityById } from "../src/lib/media-landscape/entities";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = JSON.parse(readFileSync(resolve(ROOT, "evaluation/corpora/stance-gold.json"), "utf8")) as {
  entries: { id: string; text: string; entityId: string; authorStance: string; quotedStance?: string; language: string; humanVerified: boolean }[];
};

const MAP: Record<string, string> = {
  supportive: "SUPPORTIVE",
  critical: "CRITICAL",
  "neutral-descriptive": "NEUTRAL_DESCRIPTIVE",
  mixed: "MIXED",
  unclear: "UNCLEAR",
};
const LABELS = ["SUPPORTIVE", "CRITICAL", "NEUTRAL_DESCRIPTIVE", "MIXED", "UNCLEAR"];

const confusion: Record<string, Record<string, number>> = {};
for (const t of LABELS) confusion[t] = Object.fromEntries(LABELS.map((p) => [p, 0]));
const misses: string[] = [];

for (const e of CORPUS.entries) {
  const ent = entityById(e.entityId);
  const got = MAP[readStance(e.text, ent).stance] ?? "UNCLEAR";
  const want = e.authorStance;
  confusion[want][got]++;
  if (got !== want) misses.push(`  ${e.id} [${e.language}] want ${want}, got ${got} — ${e.text.slice(0, 62)}`);
}

const n = CORPUS.entries.length;
let correct = 0;
const perLabel: Record<string, { p: number; r: number; f1: number; support: number }> = {};
for (const l of LABELS) {
  const tp = confusion[l][l];
  const fp = LABELS.reduce((s, t) => s + (t === l ? 0 : confusion[t][l]), 0);
  const fn = LABELS.reduce((s, p) => s + (p === l ? 0 : confusion[l][p]), 0);
  const support = LABELS.reduce((s, p) => s + confusion[l][p], 0);
  const p = tp + fp ? tp / (tp + fp) : 1;
  const r = tp + fn ? tp / (tp + fn) : 1;
  perLabel[l] = { p, r, f1: p + r ? (2 * p * r) / (p + r) : 0, support };
  correct += tp;
}
const macroF1 = LABELS.reduce((s, l) => s + perLabel[l].f1, 0) / LABELS.length;

const md: string[] = [
  "# IFFA stance-classifier evaluation (v0.11)",
  "",
  `- corpus: ${n} first-pass examples (**humanVerified: ${CORPUS.entries.filter((e) => e.humanVerified).length} / ${n}**)`,
  `- **accuracy ${((correct / n) * 100).toFixed(1)}% · macro-F1 ${(macroF1 * 100).toFixed(1)}%**`,
  "- INDICATIVE ONLY — labels are not human-verified; not a v1.0 gate.",
  "",
  "| Label | Support | Precision | Recall | F1 |",
  "|---|---:|---:|---:|---:|",
  ...LABELS.map(
    (l) =>
      `| ${l} | ${perLabel[l].support} | ${(perLabel[l].p * 100).toFixed(0)}% | ${(perLabel[l].r * 100).toFixed(0)}% | ${(perLabel[l].f1 * 100).toFixed(0)}% |`,
  ),
  "",
  "## Confusion (rows = gold, cols = predicted)",
  "",
  `| gold \\ pred | ${LABELS.join(" | ")} |`,
  `|---|${LABELS.map(() => "---:").join("|")}|`,
  ...LABELS.map((g) => `| ${g} | ${LABELS.map((p) => confusion[g][p]).join(" | ")} |`),
  "",
  "## Misses",
  "",
  ...misses,
];
writeFileSync(resolve(ROOT, "evaluation/reports/stance-latest.md"), md.join("\n"));
writeFileSync(
  resolve(ROOT, "evaluation/reports/stance-latest.json"),
  JSON.stringify({ n, humanVerified: CORPUS.entries.filter((e) => e.humanVerified).length, accuracy: correct / n, macroF1, perLabel, confusion }, null, 2),
);
console.log(`eval:stance — accuracy ${((correct / n) * 100).toFixed(1)}% · macro-F1 ${(macroF1 * 100).toFixed(1)}% · ${misses.length} miss(es) of ${n} (first-pass corpus, INDICATIVE)`);
