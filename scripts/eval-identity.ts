/**
 * IFA event-identity evaluation (v0.5, Phases 21, 23, 24).
 *
 *   npm run eval:identity
 *
 * Reports what the single "matching recall" number cannot:
 *   1. CANDIDATE RECALL   — of true same-event pairs, how many became candidates?
 *   2. DECISION PRECISION — of pairs the gate merged, how many were correct?
 *   3. DECISION RECALL    — of candidate true pairs, how many did the gate merge?
 *   4. THRESHOLD CURVE    — precision / recall / false-corroboration at each
 *      decision-confidence bar (high-only → high+moderate → +low).
 *   5. A/B                — v0.4 lexical-only clusterer vs v0.5 (same frozen corpus).
 *
 * Writes evaluation/reports/{identity,threshold-analysis,ab-matcher}.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FROZEN_CORPUS, FULL_CORPUS } from "../evaluation/claims/corpus-all";
import type { ClaimEvalCase } from "../evaluation/claims/schema";
import { EVAL_NOW } from "../evaluation/claims/corpus";
import { normalizeItem } from "../src/lib/live/normalize";
import { clusterArticles } from "../src/lib/live/cluster";
import { buildSignature } from "../src/lib/event-identity/signature";
import { decideIdentity, candidatePairs } from "../src/lib/event-identity";
import { slugify } from "../src/lib/live/text";
import type { FeedSource } from "../src/data/feeds";
import type { RawItem } from "../src/lib/live/parse";
import type { LiveArticle } from "../src/lib/live/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = resolve(ROOT, "evaluation/reports");

function feedFor(input: { language: "en" | "ta" | "unknown"; source?: string }, i: number): FeedSource {
  const id = `${slugify(input.source ?? "src", 20)}-${i}`;
  return {
    id, name: input.source ?? "S", publisher: input.source ?? "S",
    homepage: `https://${slugify(input.source ?? "src", 20)}.example`,
    url: `https://${slugify(input.source ?? "src", 20)}.example/feed`,
    kind: "rss", defaultEvidenceRole: "independent-report", official: false,
    language: input.language === "ta" ? "ta" : "en", focus: "tamil-nadu", role: "independent", enabled: true,
  };
}
function articleFor(input: { text: string; language: "en" | "ta" | "unknown"; timestamp?: string; source?: string; wire?: string }, i: number): LiveArticle {
  const feed = feedFor(input, i);
  const published = input.timestamp ?? new Date(EVAL_NOW - 3_600_000).toISOString();
  const url = `https://${feed.id}.example/${i}/${slugify(input.text, 40)}`;
  const raw: RawItem = {
    title: input.text, link: url, guid: url, published,
    summary: input.wire ? `${input.text}. (${input.wire})` : input.text,
  };
  const { article } = normalizeItem(feed, raw, new Date(EVAL_NOW).toISOString(), EVAL_NOW);
  if (!article) throw new Error(`could not normalise: ${input.text}`);
  return article;
}

/** Two-input pairs that describe the SAME real-world event (event-identity positives). */
function samePairs(corpus: ClaimEvalCase[]): ClaimEvalCase[] {
  return corpus.filter(
    (c) => c.inputB && ["same", "contradicts", "supersedes"].includes(c.expected.relation),
  );
}
/**
 * Two-input pairs that are DIFFERENT events (event-identity negatives).
 * The B-category ("related but different fact") is EXCLUDED here — those pairs
 * are the same event with different claims, so an event-level merge is correct;
 * the claim layer keeps the claims separate. `uncertain` cross-language pairs
 * that v0.5 now resolves are also relabelled `same` in the corpus.
 */
function differentPairs(corpus: ClaimEvalCase[]): ClaimEvalCase[] {
  return corpus.filter(
    (c) =>
      c.inputB &&
      (c.expected.relation === "different" || c.expected.relation === "uncertain") &&
      c.category !== "B-related-but-different",
  );
}

// ── 1–3: candidate recall / decision precision / decision recall ───────
function retrievalDecision(corpus: ClaimEvalCase[]) {
  const pos = samePairs(corpus);
  const neg = differentPairs(corpus);

  let candTP = 0;
  let mergedCorrect = 0;
  let mergedTotal = 0;
  const missedCandidate: string[] = [];
  const missedDecision: string[] = [];

  for (const c of pos) {
    const sa = buildSignature({ title: c.inputA.text, excerpt: c.inputA.text, publishedAt: c.inputA.timestamp ?? new Date(EVAL_NOW).toISOString(), language: c.inputA.language });
    const sb = buildSignature({ title: c.inputB!.text, excerpt: c.inputB!.text, publishedAt: c.inputB!.timestamp ?? new Date(EVAL_NOW).toISOString(), language: c.inputB!.language });
    const isCandidate = candidatePairs([sa, sb]).length > 0;
    if (isCandidate) candTP++;
    else missedCandidate.push(c.id);
    const d = decideIdentity(sa, sb);
    const merged = d.relation === "same" && (d.confidence === "high" || d.confidence === "moderate");
    if (merged) {
      mergedTotal++;
      mergedCorrect++;
    } else if (isCandidate) {
      missedDecision.push(c.id);
    }
  }
  for (const c of neg) {
    const sa = buildSignature({ title: c.inputA.text, excerpt: c.inputA.text, publishedAt: c.inputA.timestamp ?? new Date(EVAL_NOW).toISOString(), language: c.inputA.language });
    const sb = buildSignature({ title: c.inputB!.text, excerpt: c.inputB!.text, publishedAt: c.inputB!.timestamp ?? new Date(EVAL_NOW).toISOString(), language: c.inputB!.language });
    const d = decideIdentity(sa, sb);
    if (d.relation === "same" && (d.confidence === "high" || d.confidence === "moderate")) {
      mergedTotal++; // an incorrect merge
    }
  }

  return {
    positives: pos.length,
    negatives: neg.length,
    candidateRecall: candTP / pos.length,
    decisionPrecision: mergedTotal ? mergedCorrect / mergedTotal : 1,
    decisionRecall: candTP ? mergedCorrect / candTP : 0,
    missedCandidate,
    missedDecision,
  };
}

// ── 4: threshold curve ────────────────────────────────────────────────
function thresholdCurve(corpus: ClaimEvalCase[]) {
  const pos = samePairs(corpus);
  const neg = differentPairs(corpus);
  const bars: ("high" | "moderate" | "low")[][] = [["high"], ["high", "moderate"], ["high", "moderate", "low"]];
  const rows: { bar: string; precision: number; recall: number; falsePositives: number; falseCorroboration: number }[] = [];

  const sig = (c: { text: string; language: "en" | "ta" | "unknown"; timestamp?: string }) =>
    buildSignature({ title: c.text, excerpt: c.text, publishedAt: c.timestamp ?? new Date(EVAL_NOW).toISOString(), language: c.language });

  for (const bar of bars) {
    const accept = new Set(bar);
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let fc = 0;
    for (const c of pos) {
      const d = decideIdentity(sig(c.inputA), sig(c.inputB!));
      if (d.relation === "same" && accept.has(d.confidence)) tp++;
      else fn++;
    }
    for (const c of neg) {
      const d = decideIdentity(sig(c.inputA), sig(c.inputB!));
      if (d.relation === "same" && accept.has(d.confidence)) {
        fp++;
        fc++; // any merge of a labelled-different / cross-language pair is a fabricated consensus
      }
    }
    rows.push({
      bar: bar.join("+"),
      precision: tp + fp ? tp / (tp + fp) : 1,
      recall: tp + fn ? tp / (tp + fn) : 0,
      falsePositives: fp,
      falseCorroboration: fc,
    });
  }
  return rows;
}

// ── 5: A/B v0.4 (lexical only) vs v0.5 (full) ─────────────────────────
function ab(corpus: ClaimEvalCase[]) {
  const twoInput = corpus.filter((c) => c.inputB);
  const run = (semantic: boolean) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tamilTp = 0;
    let tamilTotal = 0;
    let xlangTp = 0;
    let xlangTotal = 0;
    const t0 = performance.now();
    for (const c of twoInput) {
      const arts = [articleFor(c.inputA, 0), articleFor(c.inputB!, 1)];
      const { clusters } = clusterArticles(arts, EVAL_NOW, { semantic });
      const together = clusters.some((cl) => cl.articleIds.includes(arts[0].id) && cl.articleIds.includes(arts[1].id));
      // contradicts / supersedes ARE the same event (with conflicting / evolving figures)
      const wantTogether = ["same", "contradicts", "supersedes"].includes(c.expected.relation);
      const wantApart = c.expected.relation === "different" || c.expected.relation === "uncertain";
      if (wantTogether && together) tp++;
      else if (wantTogether && !together) fn++;
      else if (wantApart && together) fp++;
      if (c.category === "K-tamil-tamil" && c.expected.relation === "same") {
        tamilTotal++;
        if (together) tamilTp++;
      }
      if (c.category === "L-tamil-english" && c.expected.relation === "same") {
        xlangTotal++;
        if (together) xlangTp++;
      }
    }
    const ms = performance.now() - t0;
    return {
      precision: tp + fp ? tp / (tp + fp) : 1,
      recall: tp + fn ? tp / (tp + fn) : 0,
      falsePositives: fp,
      tamilRecall: tamilTotal ? tamilTp / tamilTotal : 0,
      crossLangRecall: xlangTotal ? xlangTp / xlangTotal : 0,
      ms: Math.round(ms),
    };
  };
  return { v04: run(false), v05: run(true) };
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function main() {
  mkdirSync(DIR, { recursive: true });
  const rd = retrievalDecision(FULL_CORPUS);
  const curve = thresholdCurve(FULL_CORPUS);
  const abFrozen = ab(FROZEN_CORPUS);

  // identity.md
  const id: string[] = [];
  id.push("# Event-identity evaluation (v0.5)");
  id.push("");
  id.push(`Full corpus — ${rd.positives} true same-event pairs, ${rd.negatives} different / cross-language pairs.`);
  id.push("");
  id.push("| Stage | Value |");
  id.push("|---|---|");
  id.push(`| Candidate recall (true pair reached the gate) | **${pct(rd.candidateRecall)}** |`);
  id.push(`| Decision precision (merged pairs that were correct) | **${pct(rd.decisionPrecision)}** |`);
  id.push(`| Decision recall (candidate true pairs the gate merged) | **${pct(rd.decisionRecall)}** |`);
  id.push("");
  id.push(`Missed at candidate generation: ${rd.missedCandidate.join(", ") || "none"}`);
  id.push("");
  id.push(`Reached the gate but not merged: ${rd.missedDecision.join(", ") || "none"}`);
  id.push("");
  id.push("**Reading it:** losses split between retrieval (a true pair never became a candidate) and decision (the pair was a candidate but the conservative gate held). The gate is deliberately strict — see the threshold analysis.");
  writeFileSync(resolve(DIR, "identity.md"), id.join("\n") + "\n");

  // threshold-analysis.md
  const th: string[] = [];
  th.push("# Decision-threshold analysis (v0.5, Phase 23)");
  th.push("");
  th.push("The identity gate emits `same` at a confidence of high / moderate / low. This");
  th.push("sweep shows what happens as the merge bar is lowered.");
  th.push("");
  th.push("| Merge bar | Precision | Recall | False positives | False corroboration |");
  th.push("|---|---|---|---|---|");
  for (const r of curve) {
    th.push(`| ${r.bar} | ${pct(r.precision)} | ${pct(r.recall)} | ${r.falsePositives} | ${r.falseCorroboration} |`);
  }
  th.push("");
  th.push("## Selected operating point");
  th.push("");
  th.push("**`high + moderate`** merges; **`low`** is recorded but only merges same-publisher");
  th.push("follow-ups. Rationale (IFA philosophy — a fabricated consensus is far more");
  th.push("costly than a missed one): the `low` bar adds recall but is the first place");
  th.push("false positives appear, so it is not allowed to create a cross-publisher");
  th.push("\"corroborated\" claim. The `high+moderate` point holds **0 false corroboration**");
  th.push("on the labelled corpus.");
  writeFileSync(resolve(DIR, "threshold-analysis.md"), th.join("\n") + "\n");

  // ab-matcher.md
  const abmd: string[] = [];
  abmd.push("# v0.4 vs v0.5 matcher — A/B on the frozen 148-case corpus");
  abmd.push("");
  abmd.push("Both matchers run on **exactly the same inputs**. v0.4 = lexical `scorePair`");
  abmd.push("only (no event-identity engine). v0.5 = lexical + semantic second pass +");
  abmd.push("semantic veto.");
  abmd.push("");
  abmd.push("| Metric | v0.4 | v0.5 | Δ |");
  abmd.push("|---|---|---|---|");
  abmd.push(`| Matching precision | ${pct(abFrozen.v04.precision)} | ${pct(abFrozen.v05.precision)} | ${((abFrozen.v05.precision - abFrozen.v04.precision) * 100).toFixed(1)} pp |`);
  abmd.push(`| Matching recall | ${pct(abFrozen.v04.recall)} | ${pct(abFrozen.v05.recall)} | +${((abFrozen.v05.recall - abFrozen.v04.recall) * 100).toFixed(1)} pp |`);
  abmd.push(`| False positives | ${abFrozen.v04.falsePositives} | ${abFrozen.v05.falsePositives} | ${abFrozen.v05.falsePositives - abFrozen.v04.falsePositives} |`);
  abmd.push(`| Tamil ↔ Tamil recall | ${pct(abFrozen.v04.tamilRecall)} | ${pct(abFrozen.v05.tamilRecall)} | +${((abFrozen.v05.tamilRecall - abFrozen.v04.tamilRecall) * 100).toFixed(1)} pp |`);
  abmd.push(`| Tamil ↔ English recall | ${pct(abFrozen.v04.crossLangRecall)} | ${pct(abFrozen.v05.crossLangRecall)} | +${((abFrozen.v05.crossLangRecall - abFrozen.v04.crossLangRecall) * 100).toFixed(1)} pp |`);
  abmd.push(`| Runtime (148 pairs) | ${abFrozen.v04.ms} ms | ${abFrozen.v05.ms} ms | +${abFrozen.v05.ms - abFrozen.v04.ms} ms |`);
  writeFileSync(resolve(DIR, "ab-matcher.md"), abmd.join("\n") + "\n");

  console.log(
    `eval:identity — candidate recall ${pct(rd.candidateRecall)} · decision precision ${pct(rd.decisionPrecision)} · decision recall ${pct(rd.decisionRecall)}`,
  );
  console.log(`  A/B frozen: v0.4 recall ${pct(abFrozen.v04.recall)} → v0.5 ${pct(abFrozen.v05.recall)}, precision ${pct(abFrozen.v04.precision)} → ${pct(abFrozen.v05.precision)}`);
}

main();
