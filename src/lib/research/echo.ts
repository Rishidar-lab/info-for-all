/**
 * §B.2.1 — the echo-collapse gate.
 *
 * §B.1 opened the delivery path "1 newsroom + 1 primary anchor delivers". This
 * gate makes sure that newsroom is not itself an unmarked echo of the very
 * record being used as the anchor — otherwise IFFA delivers a brief built on
 * one source counted twice, with a citation trail that only looks rigorous.
 *
 * When a primary record is attached to a cluster, re-run press-release-echo
 * detection on every article excerpt AGAINST THE RECORD'S FULL TEXT (not against
 * other excerpts). An article that collapses is reclassified `press-release-echo`
 * and stops counting as a genuine independent family.
 *
 * DETERMINISTIC. No model.
 */
import type { LiveArticle } from "@/lib/live/types";
import type { PrimaryRecord } from "./types";
import type { SourceFamilyResolution } from "./independence";

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9%.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
function shingles(toks: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= toks.length; i++) out.add(toks.slice(i, i + n).join(" "));
  return out;
}
function firstSentence(s: string): string {
  return s.split(/(?<=[.!?])\s+/)[0] ?? s;
}
function numbersIn(s: string): string[] {
  return [...new Set((s.match(/\d[\d,]*(?:\.\d+)?\s*(?:%|per cent|crore|lakh|mm|cusecs?|kmph|bps|points?)?/gi) ?? []).map((x) => x.replace(/\s+/g, "").toLowerCase()).filter((x) => /\d/.test(x)))];
}
function datesIn(s: string): string[] {
  return [...new Set((s.match(/\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}|\b\d{4}-\d{2}-\d{2}\b/gi) ?? []).map((x) => x.toLowerCase()))];
}
function properNounsIn(s: string): string[] {
  return [...new Set((s.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3}/g) ?? []).map((x) => x.toLowerCase()))].filter(
    (x) => !["the", "a ", "an ", "on ", "in ", "at "].some((p) => x.startsWith(p)),
  );
}

export interface EchoDecision {
  collapses: boolean;
  reason: string;
}

/** Does this article's excerpt collapse into the record (one source counted twice)? */
export function articleEchoesRecord(article: LiveArticle, record: PrimaryRecord): EchoDecision {
  // An OCR'd record not yet human-confirmed cannot pull an article into it.
  if (record.requiresOcr && (record.ocrConfidence == null)) {
    return { collapses: false, reason: "record is unconfirmed OCR" };
  }
  const ex = (article.excerpt ?? "").trim();
  const recText = record.text;
  const recLower = recText.toLowerCase();

  // 1. ≥60% of the excerpt's content 5-grams appear in the record
  if (record.bodyAvailable && ex.length >= 40) {
    const exSh = shingles(tokens(ex), 5);
    if (exSh.size >= 3) {
      let hit = 0;
      for (const g of exSh) if (recLower.includes(g)) hit++;
      const frac = hit / exSh.size;
      if (frac >= 0.6) return { collapses: true, reason: `${(frac * 100).toFixed(0)}% of the report's phrasing is in the record` };
    }
  }

  // 2. headline ≥70% token-overlap with the record title or its first sentence
  const hTok = new Set(tokens(article.title).filter((w) => w.length > 3));
  if (hTok.size >= 3) {
    for (const cand of [record.title, firstSentence(recText)]) {
      const cTok = new Set(tokens(cand).filter((w) => w.length > 3));
      let inter = 0;
      for (const w of hTok) if (cTok.has(w)) inter++;
      if (inter / hTok.size >= 0.7) return { collapses: true, reason: `headline restates the record's ${cand === record.title ? "title" : "opening"}` };
    }
  }

  // 3. every number/date/entity in the excerpt is in the record, and the excerpt
  //    introduces no entity the record lacks
  if (record.bodyAvailable && ex.length >= 30) {
    const exNums = numbersIn(ex);
    const exDates = datesIn(ex);
    const exEnts = properNounsIn(`${article.title} ${ex}`);
    const recNums = new Set(numbersIn(recText));
    const recDates = new Set(datesIn(recText));
    const numsOk = exNums.every((n) => recNums.has(n) || recLower.replace(/\s+/g, "").includes(n));
    const datesOk = exDates.every((dt) => recDates.has(dt) || recLower.includes(dt));
    const noNewEntity = exEnts.every((e) => recLower.includes(e));
    const hadSomething = exNums.length + exDates.length + exEnts.length > 0;
    if (hadSomething && numsOk && datesOk && noNewEntity) {
      return { collapses: true, reason: "every figure, date and name in the report is in the record; nothing new is added" };
    }
  }

  // 4. published after the record and adds no observation the record lacks
  //    (approximated: excerpt is short and its content tokens are a subset of the record)
  if (record.bodyAvailable && ex.length > 0 && ex.length < 220 && Date.parse(article.publishedAt) >= Date.parse(record.publishedAt) - 6 * 3600_000) {
    const exContent = tokens(ex).filter((w) => w.length > 4);
    if (exContent.length >= 4) {
      const recTok = new Set(tokens(recText));
      const novel = exContent.filter((w) => !recTok.has(w));
      if (novel.length / exContent.length <= 0.15) {
        return { collapses: true, reason: "published after the record and adds nothing it does not already state" };
      }
    }
  }

  return { collapses: false, reason: "the report carries observation or detail the record does not" };
}

export type GateOutcome =
  | "deliver_independent" // ≥2 genuine independent newsrooms (record strengthens)
  | "deliver_one_plus_record" // 1 independent newsroom + a primary anchor — the §B.2 win
  | "deliver_official_record_only" // 0 newsrooms, a primary anchor — labelled as a record, not journalism
  | "withhold_sole_report_echoes_record" // the only report restates the record — one source twice
  | "withhold_no_record"; // still nothing

export interface EchoCollapseResult {
  /** The resolution after collapsing echoing articles. */
  resolution: SourceFamilyResolution;
  /** Article ids reclassified press-release-echo by this pass. */
  collapsedArticleIds: string[];
  collapseReasons: string[];
  outcome: GateOutcome;
  /** True when a record states a different value than the reporting — surfaced as a disagreement. */
  hasContradiction: boolean;
}

/**
 * Apply echo collapse for a cluster given its attached primary records, then
 * decide the gate outcome. `records` are only those with `bodyAvailable` OR a
 * confirmed OCR — a headline-only PIB entry still counts as an anchor for the
 * "official record exists" outcome but cannot collapse an article.
 */
export function applyEchoCollapse(
  articles: LiveArticle[],
  records: PrimaryRecord[],
  resolution: SourceFamilyResolution,
  opts: { hasContradiction?: boolean } = {},
): EchoCollapseResult {
  const anchors = records.filter((r) => !(r.requiresOcr && r.ocrConfidence == null));
  const hasAnchor = anchors.length > 0 || resolution.primaryRecordCount > 0;

  if (anchors.length === 0) {
    // no usable record — nothing to collapse; the gate is whatever §B.1 said
    return {
      resolution,
      collapsedArticleIds: [],
      collapseReasons: [],
      outcome:
        resolution.genuineIndependentFamilies >= 2
          ? "deliver_independent"
          : hasAnchor
            ? resolution.genuineIndependentFamilies >= 1
              ? "deliver_one_plus_record"
              : "deliver_official_record_only"
            : "withhold_no_record",
      hasContradiction: !!opts.hasContradiction,
    };
  }

  const collapsedArticleIds: string[] = [];
  const collapseReasons: string[] = [];
  const byId = new Map(articles.map((a) => [a.id, a]));

  // re-classify each family
  const families = resolution.families.map((f) => {
    if (f.kind !== "independent") return f;
    const arts = f.articleIds.map((id) => byId.get(id)).filter((a): a is LiveArticle => !!a);
    const allEcho =
      arts.length > 0 &&
      arts.every((a) => anchors.some((r) => articleEchoesRecord(a, r).collapses));
    if (allEcho) {
      for (const a of arts) {
        collapsedArticleIds.push(a.id);
        const rec = anchors.find((r) => articleEchoesRecord(a, r).collapses)!;
        collapseReasons.push(`${a.publisher}: ${articleEchoesRecord(a, rec).reason}`);
      }
      return { ...f, kind: "press-release-echo" as const, basis: `echoes ${anchors[0].authority}'s record` };
    }
    return f;
  });

  const genuineIndependentFamilies = families.filter((f) => f.kind === "independent").length;
  const primaryRecordCount = Math.max(resolution.primaryRecordCount, anchors.length);

  const collapsed: SourceFamilyResolution = {
    ...resolution,
    families,
    familyCount: families.length,
    genuineIndependentFamilies,
    primaryRecordCount,
    label:
      genuineIndependentFamilies >= 2
        ? "Multiple independent newsrooms + an official record"
        : genuineIndependentFamilies === 1
          ? "One independent newsroom + an official record"
          : "Official record only",
  };

  let outcome: GateOutcome;
  if (genuineIndependentFamilies >= 2) outcome = "deliver_independent";
  else if (genuineIndependentFamilies === 1) outcome = "deliver_one_plus_record";
  else if (collapsedArticleIds.length > 0) outcome = "withhold_sole_report_echoes_record";
  else outcome = "deliver_official_record_only";

  return { resolution: collapsed, collapsedArticleIds, collapseReasons, outcome, hasContradiction: !!opts.hasContradiction };
}
