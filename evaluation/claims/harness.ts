/**
 * IFA claim-quality evaluation harness.
 *
 * Runs the REAL, unmodified deterministic pipeline (`normalizeItem` →
 * `clusterArticles` → `buildEventClaims`) against each labelled corpus case and
 * scores the outcome against the human label. No mocks, no shortcuts — what the
 * harness measures is exactly what production does.
 *
 * `scripts/eval-claims.ts` is the CLI wrapper; `tests/unit/eval.test.ts` imports
 * `runCorpus` directly.
 */
import type { ClaimEvalCase, EvalInput } from "./schema";
import { EVAL_CATEGORY_LABEL, validateCorpus } from "./schema";
import { CORPUS, EVAL_NOW } from "./corpus";
import { normalizeItem } from "../../src/lib/live/normalize";
import { clusterArticles } from "../../src/lib/live/cluster";
import { buildEventClaims } from "../../src/lib/claims";
import { analyseIndependence } from "../../src/lib/claims/corroborate";
import { detectWireCredit } from "../../src/lib/independence/wire";
import { slugify } from "../../src/lib/live/text";
import type { FeedSource } from "../../src/data/feeds";
import type { RawItem } from "../../src/lib/live/parse";
import type { LiveArticle } from "../../src/lib/live/types";
import type { Claim, EventClaims } from "../../src/lib/claims/types";

// ── build a synthetic article exactly as ingestion would ────────────────

function feedFor(input: EvalInput, i: number): FeedSource {
  const isCap = !!input.cap;
  const id = `${slugify(input.source ?? "src", 20)}-${i}`;
  return {
    id,
    name: input.source ?? "Source",
    publisher: input.source ?? "Source",
    homepage: `https://${slugify(input.source ?? "src", 20)}.example`,
    url: `https://${slugify(input.source ?? "src", 20)}.example/feed`,
    kind: isCap ? "sachet-json" : "rss",
    defaultEvidenceRole: isCap ? "official-alert" : "independent-report",
    official: isCap,
    language: input.language === "ta" ? "ta" : "en",
    focus: "tamil-nadu",
    role: isCap ? "official" : "independent",
    enabled: true,
  };
}

function articleFor(input: EvalInput, i: number): LiveArticle {
  const feed = feedFor(input, i);
  const published = input.timestamp ?? new Date(EVAL_NOW - 3_600_000).toISOString();
  // A retrieved CAP record: ingestion synthesises the title from the alert fields.
  const title = input.cap ? `${input.cap.event} alert — ${input.cap.area ?? "Tamil Nadu"}` : input.text;
  const url = `https://${slugify(input.source ?? "src", 20)}.example/${i}/${slugify(input.text, 40)}`;
  const summary = input.wire ? `${input.text}. (${input.wire})` : input.cap ? undefined : input.text;
  const raw: RawItem = {
    title,
    link: url,
    guid: url,
    published,
    summary,
    cap: input.cap
      ? {
          event: input.cap.event,
          severity: input.cap.severity,
          areaDescription: input.cap.area,
          identifier: input.cap.identifier,
          senderName: "TN SDMA",
          effectiveFrom: published,
        }
      : undefined,
  };
  const { article, rejectReason } = normalizeItem(feed, raw, new Date(EVAL_NOW).toISOString(), EVAL_NOW);
  if (!article) throw new Error(`corpus input failed to normalise (${rejectReason}): ${input.text}`);
  return article;
}

// ── observe what the engine did with a case ─────────────────────────────

export interface CaseObservation {
  clusteredTogether: boolean;
  ec?: EventClaims;
  /** Claims from the cluster that contains inputA. */
  claimsA: Claim[];
  /** The specific (non-head) claim shared by A and B, if any. */
  sharedSpecific?: Claim;
  /** A or B share the same event (cluster), head-level or better. */
  sharedEvent: boolean;
  /** status of the shared claim (specific first, else head). */
  sharedStatus?: Claim["status"];
  hardDispute: boolean;
  temporalUpdate: boolean;
  independentGroups: number;
  possibleSyndicated: number;
  wireDetected: boolean;
  /** attribution retained on any claim extracted from inputA. */
  attributionRetained: boolean;
  attributionText?: string;
  attributedFamily: boolean;
  tamilOriginalRetained: boolean;
  /** claim (from A's cluster) whose text best matches inputA. */
  focusClaim?: Claim;
  focusClaimHasEvidence: boolean;
  evidenceCount: number;
  extractedTypes: string[];
}

function isHead(c: Claim): boolean {
  return c.type === "event" && c.predicates.length === 0;
}

function wordSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function bestMatch(claims: Claim[], text: string): Claim | undefined {
  const want = wordSet(text);
  let best: Claim | undefined;
  let bestScore = 0;
  for (const c of claims) {
    if (isHead(c) && claims.length > 1) continue;
    const got = wordSet(c.canonicalText + " " + c.subjects.join(" ") + " " + c.objects.join(" "));
    let inter = 0;
    for (const w of got) if (want.has(w)) inter++;
    if (inter > bestScore) {
      bestScore = inter;
      best = c;
    }
  }
  return best ?? claims[0];
}

export function observe(testCase: ClaimEvalCase): CaseObservation {
  const artA = articleFor(testCase.inputA, 0);
  const arts = testCase.inputB ? [artA, articleFor(testCase.inputB, 1)] : [artA];
  const { clusters } = clusterArticles(arts, EVAL_NOW);

  const clusterA = clusters.find((c) => c.articleIds.includes(artA.id))!;
  const artsA = clusterA.articleIds
    .map((id) => arts.find((a) => a.id === id))
    .filter((a): a is LiveArticle => !!a);
  const ec = buildEventClaims(clusterA, artsA, EVAL_NOW);

  const bId = arts[1]?.id;
  const clusteredTogether = !!bId && clusterA.articleIds.includes(bId);

  let sharedSpecific: Claim | undefined;
  let sharedEvent = false;
  if (bId && clusteredTogether) {
    sharedEvent = true;
    for (const c of ec.claims) {
      if (c.supportingArticleIds.includes(artA.id) && c.supportingArticleIds.includes(bId)) {
        if (!isHead(c)) {
          sharedSpecific = c;
          break;
        }
      }
    }
  }
  const sharedClaim = sharedSpecific ?? (sharedEvent ? ec.claims.find((c) => isHead(c)) : undefined);

  const hardDispute =
    ec.disputes.some((d) => !d.possiblyTemporalUpdate && d.confidence !== "low") ||
    ec.claims.some((c) => c.status === "disputed");
  const temporalUpdate =
    ec.disputes.some((d) => d.possiblyTemporalUpdate) ||
    ec.claims.some((c) => c.updates.length > 0 || c.status === "outdated");

  const ind = analyseIndependence(arts);

  // attribution: look at the claims from A's cluster that came from inputA
  const fromA = ec.claims.filter((c) => c.supportingArticleIds.includes(artA.id));
  const attrProv = fromA.flatMap((c) => c.provenance).find((p) => p.articleId === artA.id && p.attribution);
  const attributionRetained = !!attrProv;
  const attributedFamily = fromA.some(
    (c) => c.status === "attributed" || c.type === "attribution" || c.type === "allegation" || c.type === "prediction",
  );
  const tamilOriginalRetained =
    testCase.inputA.language === "ta" &&
    fromA.some(
      (c) => !!c.canonicalTextOriginal || c.provenance.some((p) => p.articleId === artA.id && !!p.sourceTextOriginal),
    );

  const focusClaim = bestMatch(fromA.length ? fromA : ec.claims, testCase.inputA.text);
  const focusClaimHasEvidence = !!focusClaim && focusClaim.primaryEvidenceIds.length > 0;

  return {
    clusteredTogether,
    ec,
    claimsA: ec.claims,
    sharedSpecific,
    sharedEvent,
    sharedStatus: sharedClaim?.status,
    hardDispute,
    temporalUpdate,
    independentGroups: ind.independentGroups,
    possibleSyndicated: ind.possibleSyndicated,
    wireDetected: [testCase.inputA, testCase.inputB]
      .filter(Boolean)
      .some((inp) => !!detectWireCredit(`${inp!.text}. ${inp!.wire ? `(${inp!.wire})` : ""}`)),
    attributionRetained,
    attributionText: attrProv?.attribution,
    attributedFamily,
    tamilOriginalRetained,
    focusClaim,
    focusClaimHasEvidence,
    evidenceCount: ec.evidence.length,
    extractedTypes: [...new Set(fromA.map((c) => c.type))],
  };
}

// ── scoring ────────────────────────────────────────────────────────────

export type FailureKind =
  | "false-match"
  | "missed-match"
  | "false-contradiction"
  | "missed-contradiction"
  | "attribution-lost"
  | "wrong-temporal-relation"
  | "wrong-independence"
  | "wrong-evidence-link"
  | "missed-evidence-link"
  | "extraction-miss"
  | "false-corroboration"
  | "tamil-original-lost";

export interface CaseResult {
  id: string;
  category: ClaimEvalCase["category"];
  relation: ClaimEvalCase["expected"]["relation"];
  passed: boolean;
  failures: { kind: FailureKind; expected: string; actual: string }[];
  /** metric buckets this case contributes to, with correctness per bucket. */
  contributes: Partial<Record<MetricBucket, boolean>>;
}

export type MetricBucket =
  | "match-tp"
  | "match-fp"
  | "match-fn"
  | "match-tn"
  | "false-corroboration-den"
  | "false-corroboration-hit"
  | "contradiction-tp"
  | "contradiction-fp"
  | "contradiction-fn"
  | "contradiction-tn"
  | "temporal-den"
  | "temporal-hit"
  | "attribution-den"
  | "attribution-hit"
  | "evidence-tp"
  | "evidence-fp"
  | "evidence-fn"
  | "independence-den"
  | "independence-hit"
  | "wire-den"
  | "wire-hit"
  | "extraction-den"
  | "extraction-hit"
  | "tamil-match-den"
  | "tamil-match-hit"
  | "crosslang-den"
  | "crosslang-held"
  | "crosslang-original-den"
  | "crosslang-original-kept";

function expectedTypeSet(t: ClaimEvalCase["expected"]["claimType"]): Set<string> {
  if (!t) return new Set();
  return new Set(Array.isArray(t) ? t : [t]);
}

export function scoreCase(testCase: ClaimEvalCase, o: CaseObservation): CaseResult {
  const { expected } = testCase;
  const failures: CaseResult["failures"] = [];
  const contributes: CaseResult["contributes"] = {};
  const level = expected.matchLevel ?? "specific";
  const engineMatched = level === "event" ? o.sharedEvent : !!o.sharedSpecific;

  // ── matching + false corroboration ───────────────────────────────────
  if (expected.relation === "same") {
    if (engineMatched) contributes["match-tp"] = true;
    else {
      contributes["match-fn"] = true;
      failures.push({ kind: "missed-match", expected: "A and B corroborate", actual: "kept separate" });
    }
  } else if (expected.relation === "different") {
    contributes["false-corroboration-den"] = true;
    if (engineMatched) {
      contributes["match-fp"] = true;
      failures.push({ kind: "false-match", expected: "A and B stay separate", actual: `merged (${o.sharedStatus})` });
    } else {
      contributes["match-tn"] = true;
    }
    const fabricated =
      engineMatched && (o.sharedStatus === "corroborated" || o.sharedStatus === "partially-corroborated");
    if (fabricated) {
      contributes["false-corroboration-hit"] = true;
      failures.push({ kind: "false-corroboration", expected: "no corroboration", actual: `${o.sharedStatus}` });
    }
  } else if (expected.relation === "uncertain") {
    // cross-language without translation: must NOT silently merge, must keep original
    contributes["crosslang-den"] = true;
    contributes["false-corroboration-den"] = true;
    if (!engineMatched) contributes["crosslang-held"] = true;
    else {
      failures.push({ kind: "false-match", expected: "hold (no translation layer)", actual: `merged (${o.sharedStatus})` });
      if (o.sharedStatus === "corroborated" || o.sharedStatus === "partially-corroborated") {
        contributes["false-corroboration-hit"] = true;
        failures.push({ kind: "false-corroboration", expected: "no corroboration across languages", actual: `${o.sharedStatus}` });
      }
    }
    if (testCase.inputA.language === "ta") {
      contributes["crosslang-original-den"] = true;
      if (o.tamilOriginalRetained) contributes["crosslang-original-kept"] = true;
      else failures.push({ kind: "tamil-original-lost", expected: "Tamil original retained", actual: "not retained" });
    }
  }

  // ── contradiction / temporal ─────────────────────────────────────────
  if (expected.relation === "contradicts") {
    if (o.hardDispute) contributes["contradiction-tp"] = true;
    else {
      contributes["contradiction-fn"] = true;
      failures.push({ kind: "missed-contradiction", expected: "flagged disputed", actual: "not flagged" });
    }
  } else if (expected.relation === "supersedes") {
    contributes["temporal-den"] = true;
    if (o.temporalUpdate && !o.hardDispute) {
      contributes["temporal-hit"] = true;
      contributes["contradiction-tn"] = true;
    } else if (o.hardDispute) {
      contributes["contradiction-fp"] = true;
      failures.push({ kind: "wrong-temporal-relation", expected: "supersedes (update)", actual: "flagged as contradiction" });
    } else {
      failures.push({ kind: "wrong-temporal-relation", expected: "supersedes (update)", actual: "no update detected" });
    }
  } else if (expected.relation === "same" || expected.relation === "different") {
    // negatives for contradiction precision
    if (o.hardDispute) {
      contributes["contradiction-fp"] = true;
      failures.push({ kind: "false-contradiction", expected: "no contradiction", actual: "flagged disputed" });
    } else {
      contributes["contradiction-tn"] = true;
    }
  }

  // ── attribution retention ────────────────────────────────────────────
  if (expected.attributionRequired) {
    contributes["attribution-den"] = true;
    const speakerOk =
      !expected.attributionSpeaker ||
      (o.attributionText ?? "").toLowerCase().includes(expected.attributionSpeaker.toLowerCase());
    if (o.attributedFamily && (o.attributionRetained || o.attributedFamily) && speakerOk) {
      contributes["attribution-hit"] = true;
    } else {
      failures.push({
        kind: "attribution-lost",
        expected: `attributed${expected.attributionSpeaker ? ` to ${expected.attributionSpeaker}` : ""}`,
        actual: o.attributedFamily ? `attributed as "${o.attributionText ?? "?"}"` : "promoted to a bare claim / not extracted",
      });
    }
  } else if (expected.relation === "attributed" && expected.attributionRequired === false) {
    // negative control (F14): a direct fact must NOT be tagged attribution
    contributes["attribution-den"] = true;
    if (!o.attributedFamily) contributes["attribution-hit"] = true;
    else failures.push({ kind: "attribution-lost", expected: "direct fact (no speaker)", actual: "wrongly tagged attributed" });
  }

  // ── primary evidence ─────────────────────────────────────────────────
  if (testCase.category === "I-primary-evidence") {
    if (expected.relation === "supports") {
      contributes["evidence-fn"] = true; // denominator for recall
      if (o.evidenceCount > 0 && o.focusClaimHasEvidence) {
        contributes["evidence-tp"] = true;
        delete contributes["evidence-fn"];
      } else {
        failures.push({ kind: "missed-evidence-link", expected: "CAP supports the claim", actual: o.evidenceCount ? "evidence not linked to the claim" : "no evidence extracted" });
      }
    } else {
      // negative: the over-reaching claim must NOT be evidence-backed
      if (o.focusClaimHasEvidence) {
        contributes["evidence-fp"] = true;
        failures.push({ kind: "wrong-evidence-link", expected: "alert does not establish this specific claim", actual: "claim marked evidence-backed" });
      }
    }
  }

  // ── independence / syndication ───────────────────────────────────────
  if (testCase.category === "J-syndication" && testCase.inputB) {
    contributes["independence-den"] = true;
    const wantIndependent = expected.independent === true;
    const gotIndependent = o.independentGroups >= 2;
    if (wantIndependent === gotIndependent) contributes["independence-hit"] = true;
    else
      failures.push({
        kind: "wrong-independence",
        expected: wantIndependent ? "2 independent groups" : "1 group (syndicated)",
        actual: `${o.independentGroups} group(s)`,
      });
  }
  if (testCase.inputA.wire || testCase.inputB?.wire) {
    contributes["wire-den"] = true;
    if (o.wireDetected) contributes["wire-hit"] = true;
    else failures.push({ kind: "wrong-independence", expected: "wire credit detected", actual: "wire credit missed" });
  }

  // ── extraction (does the expected claim type come out for inputA) ─────
  if (expected.claimType) {
    contributes["extraction-den"] = true;
    const want = expectedTypeSet(expected.claimType);
    const attrLike = want.has("attribution") || want.has("allegation") || want.has("prediction");
    const got =
      o.extractedTypes.some((t) => want.has(t)) ||
      (attrLike && o.attributedFamily) ||
      // statistic expectation is satisfied by a disputed/outdated numeric claim too
      (want.has("statistic") && o.claimsA.some((c) => c.predicates.length > 0 && /^\d/.test(c.objects[0] ?? "")));
    if (got) contributes["extraction-hit"] = true;
    else failures.push({ kind: "extraction-miss", expected: [...want].join("|"), actual: o.extractedTypes.join(",") || "none" });
  }

  // ── Tamil ────────────────────────────────────────────────────────────
  if (testCase.category === "K-tamil-tamil" && testCase.inputB) {
    contributes["tamil-match-den"] = true;
    const want = expected.relation === "same";
    if (want === engineMatched) contributes["tamil-match-hit"] = true;
  }

  const passed = failures.length === 0;
  return { id: testCase.id, category: testCase.category, relation: expected.relation, passed, failures, contributes };
}

// ── aggregate ──────────────────────────────────────────────────────────

export interface Metric {
  label: string;
  precision?: number;
  recall?: number;
  f1?: number;
  accuracy?: number;
  n: number;
  detail?: string;
}

function pr(tp: number, fp: number, fn: number) {
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

export interface CorpusReport {
  generatedAt: string;
  now: string;
  provider: "rule-only" | "model-assisted";
  totals: { cases: number; passed: number };
  byCategory: Record<string, { n: number; passed: number }>;
  metrics: Record<string, Metric>;
  falseCorroboration: { count: number; denominator: number; rate: number; cases: string[] };
  failures: { id: string; category: string; kind: FailureKind; expected: string; actual: string }[];
  caseResults: CaseResult[];
}

export function runCorpus(cases: ClaimEvalCase[] = CORPUS): CorpusReport {
  const structural = validateCorpus(cases);
  if (structural.length) throw new Error("corpus invalid:\n  " + structural.join("\n  "));

  const results = cases.map((c) => scoreCase(c, observe(c)));
  const sum = (b: MetricBucket) => results.filter((r) => r.contributes[b]).length;

  const match = pr(sum("match-tp"), sum("match-fp"), sum("match-fn"));
  const contra = pr(sum("contradiction-tp"), sum("contradiction-fp"), sum("contradiction-fn"));
  const evd = pr(sum("evidence-tp"), sum("evidence-fp"), sum("evidence-fn"));

  const acc = (hit: MetricBucket, den: MetricBucket) => {
    const d = sum(den);
    return d ? sum(hit) / d : 1;
  };

  const fcDen = sum("false-corroboration-den");
  const fcHit = sum("false-corroboration-hit");

  const metrics: Record<string, Metric> = {
    claimMatching: {
      label: "Claim matching",
      ...match,
      n: sum("match-tp") + sum("match-fp") + sum("match-fn") + sum("match-tn"),
      detail: `TP ${sum("match-tp")} · FP ${sum("match-fp")} · FN ${sum("match-fn")} · TN ${sum("match-tn")}`,
    },
    claimExtraction: {
      label: "Claim extraction (expected type recovered)",
      accuracy: acc("extraction-hit", "extraction-den"),
      recall: acc("extraction-hit", "extraction-den"),
      n: sum("extraction-den"),
    },
    contradiction: {
      label: "Contradiction detection",
      ...contra,
      n: sum("contradiction-tp") + sum("contradiction-fp") + sum("contradiction-fn") + sum("contradiction-tn"),
      detail: `TP ${sum("contradiction-tp")} · FP ${sum("contradiction-fp")} · FN ${sum("contradiction-fn")} · TN ${sum("contradiction-tn")}`,
    },
    temporalUpdate: {
      label: "Temporal-update classification",
      accuracy: acc("temporal-hit", "temporal-den"),
      n: sum("temporal-den"),
    },
    attribution: {
      label: "Attribution retention",
      accuracy: acc("attribution-hit", "attribution-den"),
      n: sum("attribution-den"),
    },
    primaryEvidence: {
      label: "Primary-evidence linking",
      precision: evd.precision,
      recall: evd.recall,
      f1: evd.f1,
      n: sum("evidence-tp") + sum("evidence-fp") + sum("evidence-fn"),
      detail: `TP ${sum("evidence-tp")} · FP ${sum("evidence-fp")} · FN ${sum("evidence-fn")}`,
    },
    independence: {
      label: "Source-independence classification",
      accuracy: acc("independence-hit", "independence-den"),
      n: sum("independence-den"),
    },
    wireDetection: {
      label: "Wire / agency credit detection",
      accuracy: acc("wire-hit", "wire-den"),
      n: sum("wire-den"),
    },
    tamilMatching: {
      label: "Tamil ↔ Tamil matching",
      accuracy: acc("tamil-match-hit", "tamil-match-den"),
      n: sum("tamil-match-den"),
    },
    crossLanguageHeld: {
      label: "Tamil ↔ English held without silent merge",
      accuracy: acc("crosslang-held", "crosslang-den"),
      n: sum("crosslang-den"),
    },
    tamilOriginalKept: {
      label: "Tamil original text preserved",
      accuracy: acc("crosslang-original-kept", "crosslang-original-den"),
      n: sum("crosslang-original-den"),
    },
  };

  const byCategory: CorpusReport["byCategory"] = {};
  for (const r of results) {
    const key = EVAL_CATEGORY_LABEL[r.category];
    byCategory[key] ??= { n: 0, passed: 0 };
    byCategory[key].n++;
    if (r.passed) byCategory[key].passed++;
  }

  const failures = results.flatMap((r) =>
    r.failures.map((f) => ({ id: r.id, category: EVAL_CATEGORY_LABEL[r.category], ...f })),
  );

  return {
    generatedAt: new Date().toISOString(),
    now: new Date(EVAL_NOW).toISOString(),
    provider: "rule-only",
    totals: { cases: cases.length, passed: results.filter((r) => r.passed).length },
    byCategory,
    metrics,
    falseCorroboration: {
      count: fcHit,
      denominator: fcDen,
      rate: fcDen ? fcHit / fcDen : 0,
      cases: results.filter((r) => r.contributes["false-corroboration-hit"]).map((r) => r.id),
    },
    failures,
    caseResults: results,
  };
}
