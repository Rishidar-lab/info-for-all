/**
 * IFA claim-quality evaluation.
 *
 *   npm run eval:claims            # run the gold corpus, print + write reports
 *   npm run eval:claims -- --quiet # only write reports
 *
 * Writes:
 *   evaluation/reports/run-<ISO>.json   (archive, gitignored)
 *   evaluation/reports/run-<ISO>.md     (archive, gitignored)
 *   evaluation/reports/latest.json      (tracked — the /methodology/quality page reads this)
 *   evaluation/reports/latest.md        (tracked — human-readable)
 *
 * The harness runs the REAL pipeline; nothing here is mocked.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runCorpus, type CorpusReport } from "../evaluation/claims/harness";
import { FULL_CORPUS as CORPUS } from "../evaluation/claims/corpus-all";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = resolve(ROOT, "evaluation/reports");
/** Trimmed, version-controlled result the public /methodology/quality page imports. */
const PUBLIC_JSON = resolve(ROOT, "src/data/claim-eval.json");
const quiet = process.argv.includes("--quiet");

/** A small, presentational subset — no per-case internals in the client bundle. */
function publicView(r: CorpusReport) {
  return {
    generatedAt: r.generatedAt,
    corpusInstant: r.now,
    provider: r.provider,
    totals: r.totals,
    languageBreakdown: countLanguages(),
    categoryBreakdown: r.byCategory,
    metrics: Object.fromEntries(
      Object.entries(r.metrics).map(([k, m]) => [
        k,
        {
          label: m.label,
          precision: m.precision ?? null,
          recall: m.recall ?? null,
          f1: m.f1 ?? null,
          accuracy: m.accuracy ?? null,
          n: m.n,
        },
      ]),
    ),
    falseCorroboration: r.falseCorroboration,
    failureCounts: tallyFailures(r),
    sampleFailures: r.failures.slice(0, 12),
    languageRecall: languageRecall(r),
    /** Frozen v0.4 result (evaluation/reports/v0.5-baseline.md) for the A/B on the dashboard. */
    v04: {
      cases: 148,
      clean: 127,
      matchingPrecision: 1.0,
      matchingRecall: 0.591,
      tamilMatching: 0.125,
      crossLanguage: null as number | null,
      contradictionRecall: 0.9,
      falseCorroboration: 0,
      falseCorroborationDen: 47,
    },
    /** Frozen v0.5 result (evaluation/reports/v0.6-baseline.md) for the version history. */
    v05: {
      cases: 223,
      clean: 211,
      matchingPrecision: 1.0,
      matchingRecall: 0.892,
      tamilMatching: 0.846,
      crossLanguage: 1.0,
      contradictionRecall: 1.0,
      falseCorroboration: 0,
      falseCorroborationDen: 71,
    },
    /**
     * Frozen v0.6 result. The claim / identity engine was NOT changed in v0.7
     * (Trend Intelligence is an additive layer), so the v0.7 "current" column in
     * the dashboard equals this — the live `metrics` above prove it each run.
     */
    v06: {
      cases: 223,
      clean: 222,
      matchingPrecision: 1.0,
      matchingRecall: 1.0,
      tamilMatching: 1.0,
      crossLanguage: 1.0,
      contradictionRecall: 1.0,
      falseCorroboration: 0,
      falseCorroborationDen: 71,
    },
    /**
     * v0.7 (Trend Intelligence) and v0.8 (Live Signal Intelligence) did not
     * change the claim / identity engine — both equal v0.6 and are proven live
     * each run by the `metrics` block above.
     */
    v07: { cases: 223, clean: 222, matchingPrecision: 1.0, matchingRecall: 1.0, tamilMatching: 1.0, crossLanguage: 1.0, contradictionRecall: 1.0, falseCorroboration: 0, falseCorroborationDen: 71 },
    v08: { cases: 223, clean: 222, matchingPrecision: 1.0, matchingRecall: 1.0, tamilMatching: 1.0, crossLanguage: 1.0, contradictionRecall: 1.0, falseCorroboration: 0, falseCorroborationDen: 71 },
    engineFrozenSince: "v0.6",
  };
}

function languageRecall(r: CorpusReport) {
  const out = { english: { tp: 0, fn: 0 }, tamilTamil: { tp: 0, fn: 0 }, crossLanguage: { tp: 0, fn: 0 } };
  for (const c of r.caseResults) {
    if (c.relation !== "same") continue;
    const bucket = c.category === "L-tamil-english" ? out.crossLanguage : c.category === "K-tamil-tamil" ? out.tamilTamil : out.english;
    if (c.contributes["match-tp"]) bucket.tp++;
    else if (c.contributes["match-fn"]) bucket.fn++;
  }
  const rate = (b: { tp: number; fn: number }) => (b.tp + b.fn ? b.tp / (b.tp + b.fn) : null);
  return {
    english: rate(out.english),
    tamilTamil: rate(out.tamilTamil),
    crossLanguage: rate(out.crossLanguage),
  };
}

function countLanguages() {
  let en = 0;
  let ta = 0;
  let mixed = 0;
  for (const c of CORPUS) {
    const langs = new Set([c.inputA.language, c.inputB?.language].filter(Boolean));
    if (langs.has("ta") && langs.has("en")) mixed++;
    else if (langs.has("ta")) ta++;
    else en++;
  }
  return { english: en, tamil: ta, mixed };
}

function tallyFailures(r: CorpusReport): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of r.failures) out[f.kind] = (out[f.kind] ?? 0) + 1;
  return out;
}

function pct(x: number | undefined): string {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function markdown(r: CorpusReport): string {
  const L: string[] = [];
  L.push(`# IFA claim-quality evaluation`);
  L.push("");
  L.push(`- generated: ${r.generatedAt}`);
  L.push(`- corpus reference instant (NOW): ${r.now}`);
  L.push(`- provider mode: **${r.provider}**`);
  L.push(`- cases: **${r.totals.cases}** · fully clean: **${r.totals.passed}** (${pct(r.totals.passed / r.totals.cases)})`);
  L.push("");
  L.push(`## Headline: false corroboration`);
  L.push("");
  L.push(
    `**${r.falseCorroboration.count} / ${r.falseCorroboration.denominator}** ` +
      `unrelated or cross-language pairs were shown as corroborated — ` +
      `**${pct(r.falseCorroboration.rate)}**.` +
      (r.falseCorroboration.cases.length ? ` (${r.falseCorroboration.cases.join(", ")})` : " None."),
  );
  L.push("");
  L.push(`## Metrics`);
  L.push("");
  L.push(`| Metric | Precision | Recall | F1 | Accuracy | n |`);
  L.push(`|---|---|---|---|---|---|`);
  for (const m of Object.values(r.metrics)) {
    L.push(
      `| ${m.label} | ${pct(m.precision)} | ${pct(m.recall)} | ${pct(m.f1)} | ${pct(m.accuracy)} | ${m.n} |`,
    );
  }
  L.push("");
  L.push(`## By category`);
  L.push("");
  L.push(`| Category | Passed | n |`);
  L.push(`|---|---|---|`);
  for (const [k, v] of Object.entries(r.byCategory)) {
    L.push(`| ${k} | ${v.passed} | ${v.n} |`);
  }
  L.push("");
  L.push(`## Failures (${r.failures.length})`);
  L.push("");
  if (r.failures.length === 0) {
    L.push("_None._");
  } else {
    L.push(`| Case | Category | Kind | Expected | Actual |`);
    L.push(`|---|---|---|---|---|`);
    for (const f of r.failures) {
      L.push(`| ${f.id} | ${f.category} | ${f.kind} | ${f.expected} | ${f.actual} |`);
    }
  }
  L.push("");
  return L.join("\n") + "\n";
}

function main() {
  const report = runCorpus(CORPUS);
  mkdirSync(REPORT_DIR, { recursive: true });

  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const md = markdown(report);

  writeFileSync(resolve(REPORT_DIR, `run-${stamp}.json`), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(resolve(REPORT_DIR, `run-${stamp}.md`), md);
  // `latest.*` is the canonical, version-controlled result.
  writeFileSync(resolve(REPORT_DIR, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(resolve(REPORT_DIR, "latest.md"), md);
  // The trimmed view the public dashboard imports (kept out of evaluation/ so it
  // lives inside the Next module graph).
  writeFileSync(PUBLIC_JSON, JSON.stringify(publicView(report), null, 2) + "\n");

  if (!quiet) {
    console.log(md);
  }
  console.log(
    `eval:claims — ${report.totals.passed}/${report.totals.cases} clean · ` +
      `false-corroboration ${report.falseCorroboration.count}/${report.falseCorroboration.denominator} ` +
      `(${(report.falseCorroboration.rate * 100).toFixed(1)}%) · ${report.failures.length} failure line(s)`,
  );
}

main();
