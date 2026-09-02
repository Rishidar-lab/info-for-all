/**
 * IFFA v0.8 category-classifier evaluation.
 *
 *   npx tsx scripts/eval-category.ts [--quiet]
 *
 * Runs the real `classifyEvent()` over the hand-labelled corpus and reports
 * per-category precision / recall / F1 + a confusion matrix. Writes
 * evaluation/reports/category-latest.{json,md}.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORY_CORPUS } from "../evaluation/category/corpus";
import { classifyEvent } from "../src/lib/domain/classify";
import { isDigestHeadline } from "../src/lib/live/entities";
import { CATEGORY_ORDER, type CategoryId } from "../src/lib/domain/categories";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const quiet = process.argv.includes("--quiet");

const CATS: CategoryId[] = [...CATEGORY_ORDER];

const confusion: Record<string, Record<string, number>> = {};
for (const a of CATS) {
  confusion[a] = {};
  for (const b of CATS) confusion[a][b] = 0;
}

interface Miss {
  title: string;
  expected: CategoryId;
  got: CategoryId;
  confidence: string;
  signals: string[];
}
const misses: Miss[] = [];
let correct = 0;
let secondaryHit = 0;
let secondaryTotal = 0;
// strict precision/recall over cases that declare their FULL secondary set
let secTP = 0;
let secFP = 0;
let secFN = 0;
const secErrors: string[] = [];

for (const c of CATEGORY_CORPUS) {
  // digests are handled by the pipeline before classification; mirror that here
  const predicted = c.digest || isDigestHeadline(c.title)
    ? ("other-relevant" as CategoryId)
    : classifyEvent({ title: c.title, excerpt: c.excerpt, language: c.language }).primaryCategory;

  confusion[c.primary][predicted]++;
  if (predicted === c.primary) correct++;
  else {
    const r = classifyEvent({ title: c.title, excerpt: c.excerpt, language: c.language });
    misses.push({ title: c.title, expected: c.primary, got: predicted, confidence: r.confidenceClass, signals: r.matchedSignals.slice(0, 3) });
  }

  if (c.secondary) {
    secondaryTotal++;
    const r = classifyEvent({ title: c.title, excerpt: c.excerpt, language: c.language });
    if (r.secondaryCategories.includes(c.secondary) || r.primaryCategory === c.secondary) secondaryHit++;
  }

  if (c.secondaries) {
    const r = classifyEvent({ title: c.title, excerpt: c.excerpt, language: c.language });
    const expected = new Set(c.secondaries);
    const got = new Set(r.secondaryCategories.filter((s) => s !== r.primaryCategory));
    for (const g of got) {
      if (expected.has(g)) {
        secTP++;
      } else {
        secFP++;
        secErrors.push(`FP  ${g}\t${c.title.slice(0, 66)}`);
      }
    }
    for (const e of expected) {
      if (!got.has(e)) {
        secFN++;
        secErrors.push(`FN  ${e}\t${c.title.slice(0, 66)}`);
      }
    }
  }
}

const perCat = CATS.map((cat) => {
  const tp = confusion[cat][cat];
  const fp = CATS.reduce((s, other) => s + (other === cat ? 0 : confusion[other][cat]), 0);
  const fn = CATS.reduce((s, other) => s + (other === cat ? 0 : confusion[cat][other]), 0);
  const support = CATEGORY_CORPUS.filter((c) => c.primary === cat).length;
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const f1 = precision != null && recall != null && precision + recall ? (2 * precision * recall) / (precision + recall) : null;
  return { cat, support, tp, fp, fn, precision, recall, f1 };
}).filter((r) => r.support > 0);

const accuracy = correct / CATEGORY_CORPUS.length;
const macroF1 = perCat.reduce((s, r) => s + (r.f1 ?? 0), 0) / perCat.length;

const pct = (x: number | null) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);

const md: string[] = [];
md.push("# IFFA category-classifier evaluation");
md.push("");
md.push(`- generated: ${new Date().toISOString()}`);
md.push(`- corpus: ${CATEGORY_CORPUS.length} hand-labelled real headlines`);
md.push(`- **accuracy ${pct(accuracy)} · macro-F1 ${pct(macroF1)}**`);
md.push(`- secondary-category recall: ${secondaryTotal ? pct(secondaryHit / secondaryTotal) : "—"} (${secondaryHit}/${secondaryTotal})`);
const secP = secTP + secFP ? secTP / (secTP + secFP) : null;
const secR = secTP + secFN ? secTP / (secTP + secFN) : null;
md.push(
  `- secondary-set strict precision ${pct(secP)} · recall ${pct(secR)} (TP ${secTP} / FP ${secFP} / FN ${secFN}, over cases with a declared secondary set)`,
);
if (secErrors.length) {
  md.push("");
  md.push("### Secondary-set errors");
  md.push("");
  for (const e of secErrors) md.push(`- \`${e}\``);
}
md.push("");
md.push("| Category | Support | Precision | Recall | F1 |");
md.push("|---|---:|---:|---:|---:|");
for (const r of perCat) md.push(`| ${r.cat} | ${r.support} | ${pct(r.precision)} | ${pct(r.recall)} | ${pct(r.f1)} |`);
md.push("");
md.push("## Confusion matrix (rows = true, cols = predicted)");
md.push("");
md.push(`| true \\ pred | ${perCat.map((r) => r.cat).join(" | ")} |`);
md.push(`|---|${perCat.map(() => "---:").join("|")}|`);
for (const t of perCat.map((r) => r.cat)) {
  md.push(`| ${t} | ${perCat.map((r) => confusion[t][r.cat]).join(" | ")} |`);
}
md.push("");
md.push(`## Misclassifications (${misses.length})`);
md.push("");
for (const m of misses) md.push(`- **${m.expected} → ${m.got}** (${m.confidence}) — ${m.title.slice(0, 80)}  ·  ${m.signals.join(" / ")}`);

const mdOut = md.join("\n") + "\n";
writeFileSync(resolve(ROOT, "evaluation/reports/category-latest.md"), mdOut);
writeFileSync(
  resolve(ROOT, "evaluation/reports/category-latest.json"),
  JSON.stringify(
    { corpusSize: CATEGORY_CORPUS.length, accuracy, macroF1, perCat, confusion, misses, secondaryHit, secondaryTotal, secTP, secFP, secFN, secErrors },
    null,
    2,
  ) + "\n",
);

if (!quiet) console.log(mdOut);
console.log(
  `eval:category — accuracy ${pct(accuracy)} · macro-F1 ${pct(macroF1)} · ${misses.length} miss(es) of ${CATEGORY_CORPUS.length}`,
);

// Release gate — the classifier must not regress past this bar.
const MIN_ACCURACY = 0.9;
const MIN_MACRO_F1 = 0.88;
if (accuracy < MIN_ACCURACY || macroF1 < MIN_MACRO_F1) {
  console.error(`eval:category FAILED — accuracy ${pct(accuracy)} < ${pct(MIN_ACCURACY)} or macro-F1 ${pct(macroF1)} < ${pct(MIN_MACRO_F1)}`);
  process.exit(1);
}
