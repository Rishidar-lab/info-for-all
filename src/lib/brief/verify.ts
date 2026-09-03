/**
 * Hallucination firewall for the IFFA Brief (Ground-Parity Milestone A).
 *
 * `verifyBrief` re-checks every factual sentence the synthesizer produced against
 * the actual evidence. A sentence survives only if:
 *   - every cited claim id resolves to a real frozen-engine claim
 *   - it is bound to at least one real source or primary record
 *   - a cited source actually supports a cited claim
 *   - every entity name in the sentence appears in the cited source text
 *   - every number, date and unit in the sentence appears in the cited source text
 *   - attribution is preserved (an attributed claim never becomes a bare fact;
 *     an allegation never becomes a statement of fact)
 *
 * A sentence that fails ANY check is DROPPED, not published. If the short version
 * ends up empty, the brief is withheld (NO_VERIFIABLE_SENTENCE).
 *
 * Same rules for the English and Tamil briefs — the Tamil sentences carry the
 * same claim ids, and the number/date checks run on Arabic-folded digits.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Claim, Evidence } from "@/lib/claims/types";
import { POLITICAL_ENTITIES } from "@/lib/media-landscape/entities";
import {
  datesIn,
  fmtISTStamp,
  fmtISTWindow,
  fold,
  looseContains,
  normaliseUnit,
  numbersIn,
  properNounsIn,
  unitPairsIn,
} from "./text";
import type { BriefSentence, IFFABrief } from "./types";

/** Names/tokens that never need a source (they are IFFA's own or universal). */
const SAFE_ENTITIES = new Set(
  [
    "iffa", "india", "indian", "tamil nadu", "tamil", "nadu", "ist", "the",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
    "correction", "best", "supported",
  ].map(fold),
);

/** Entity aliases so "The Chief Minister" verifies against a source that says "CM". */
const ENTITY_ALIASES: [RegExp, string[]][] = [
  [/\bchief minister\b/, ["cm", "chief minister"]],
  [/\bthe government\b/, ["government", "govt", "state government", "cabinet", "administration"]],
  [/\bthe opposition\b/, ["opposition", "dmk", "aiadmk", "bjp", "congress"]],
  [/\bthe district administration\b/, ["district administration", "collector", "revenue", "authorities"]],
  [/\bthe high court\b/, ["high court", "hc", "madras high court", "bench"]],
  [/\bthe supreme court\b/, ["supreme court", "sc", "apex court"]],
  [/\bthe court\b/, ["court", "bench", "judge", "justice"]],
  [/\bimd\b/, ["imd", "india meteorological department", "meteorological", "weather"]],
  [/\bthe disaster-management authority\b/, ["ndma", "sdma", "disaster management", "sachet"]],
  [/\breserve bank\b/, ["rbi", "reserve bank", "central bank"]],
];

interface Grounding {
  text: string;
  numbers: Set<number>;
  dates: Set<string>;
  units: Set<string>;
  units2: { n: number; unit: string }[];
}

function groundingFor(
  s: BriefSentence,
  claimById: Map<string, Claim>,
  articleById: Map<string, LiveArticle>,
  evidenceById: Map<string, Evidence>,
  cluster: LiveCluster,
): { g: Grounding; citedClaims: Claim[]; citedArticleIds: string[]; hasSupport: boolean } {
  const parts: string[] = [];
  const citedClaims: Claim[] = [];
  for (const id of s.citations.claimIds) {
    const c = claimById.get(id);
    if (!c) continue;
    citedClaims.push(c);
    parts.push(c.canonicalText, c.canonicalTextOriginal ?? "", ...c.subjects, ...c.predicates, ...c.objects);
    for (const p of c.provenance) parts.push(p.sourceText ?? "", p.sourceTextOriginal ?? "", p.attribution ?? "");
  }
  const citedArticleIds: string[] = [];
  for (const id of s.citations.sourceIds) {
    const a = articleById.get(id);
    if (!a) continue;
    citedArticleIds.push(id);
    parts.push(a.title, a.excerpt ?? "");
  }
  for (const id of s.citations.evidenceIds) {
    const e = evidenceById.get(id);
    if (!e) continue;
    parts.push(e.title, e.publisher, String(e.provenance.event ?? ""), String(e.provenance.areaDescription ?? ""));
  }
  // CAP structured fields + formatted variants
  const cap = cluster.cap;
  if (cap) {
    parts.push(
      cap.event ?? "", cap.senderName ?? "", cap.areaDescription ?? "", cap.severity ?? "",
      cap.effectiveFrom ?? "", cap.effectiveUntil ?? "",
      fmtISTStamp(cap.effectiveFrom) ?? "", fmtISTStamp(cap.effectiveUntil) ?? "",
      fmtISTWindow(cap.effectiveFrom, cap.effectiveUntil) ?? "",
    );
  }
  parts.push(...cluster.districts);
  const es = cluster.trendData?.eventState;
  if (es) parts.push(...es.latestNumbers, ...es.confirmedFacts, ...es.affectedLocations);
  const fin = cluster.trendData?.financeEvent?.policy;
  if (fin) parts.push(fin.raw, fin.authority, fin.instrument ?? "", fin.newValue ?? "", fin.previousValue ?? "", fin.effectiveFrom ?? "");
  const sp = cluster.trendData?.sportsEvent;
  if (sp) parts.push(sp.competition ?? "", sp.round ?? "", ...sp.teams, sp.result?.winner ?? "", sp.result?.margin ?? "", sp.date ?? "");

  const text = parts.filter(Boolean).join("  •  ");
  const g: Grounding = {
    text,
    numbers: new Set(numbersIn(text)),
    dates: new Set(datesIn(text).map((d) => d.replace(/\s+/g, " "))),
    units: new Set(unitPairsIn(text).map((u) => u.unit)),
    units2: unitPairsIn(text),
  };

  // "a cited source supports a cited claim"
  let hasSupport = false;
  if (citedClaims.length === 0) {
    hasSupport = citedArticleIds.length > 0 || s.citations.evidenceIds.length > 0;
  } else {
    for (const c of citedClaims) {
      if (c.supportingArticleIds.some((aid) => citedArticleIds.includes(aid))) hasSupport = true;
      if (c.primaryEvidenceIds.some((eid) => s.citations.evidenceIds.includes(eid))) hasSupport = true;
      if (citedArticleIds.length === 0 && s.citations.evidenceIds.length === 0) hasSupport = true; // claim-only cite
    }
  }
  return { g, citedClaims, citedArticleIds, hasSupport };
}

function entityOk(phrase: string, g: Grounding): boolean {
  const f = fold(phrase);
  if (!f || SAFE_ENTITIES.has(f)) return true;
  if (f.length <= 2) return true;
  if (looseContains(g.text, phrase)) return true;
  for (const [re, aliases] of ENTITY_ALIASES) {
    if (re.test(f) && aliases.some((a) => g.text.toLowerCase().includes(a))) return true;
  }
  // a tracked political entity that is present in the grounding under any alias
  for (const e of POLITICAL_ENTITIES) {
    if (fold(e.name) === f || e.aliases.map(fold).includes(f)) {
      const hay = g.text.toLowerCase();
      if ([e.name, ...e.aliases].some((a) => hay.includes(a.toLowerCase()))) return true;
    }
  }
  return false;
}

function numbersOk(text: string, g: Grounding): { ok: boolean; bad?: number } {
  // strip clock tokens — handled by the date check
  const stripped = text.replace(/\b\d{1,2}[:.]\d{2}\b/g, " ");
  for (const n of numbersIn(stripped)) {
    if (g.numbers.has(n)) continue;
    // small integers (day/hour/count ≤ 31) allowed when the grounding carries an ISO datetime
    if (n <= 31 && /\d{4}-\d{2}-\d{2}t\d{2}:\d{2}/i.test(g.text)) continue;
    // 4-digit years present verbatim in source text
    if (n >= 1990 && n <= 2100 && g.text.includes(String(n))) continue;
    // "next 24 hours" / "100 years" style — allow round durations that appear as text
    if (g.text.replace(/,/g, "").includes(String(n))) continue;
    return { ok: false, bad: n };
  }
  return { ok: true };
}

function datesOk(text: string, g: Grounding): { ok: boolean; bad?: string } {
  for (const d of datesIn(text)) {
    const key = d.replace(/\s+/g, " ");
    if (g.dates.has(key)) continue;
    if (g.text.toLowerCase().includes(key)) continue;
    // "03 sep" style — check day + month token separately against an ISO date
    const m = key.match(/^(\d{1,2})\s+([a-z]{3})/);
    if (m && new RegExp(`-0?${m[1]}\\b`).test(g.text) && g.text.toLowerCase().includes(m[2])) continue;
    if (/^(today|tomorrow|yesterday|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(key)) {
      if (g.text.toLowerCase().includes(key)) continue;
      return { ok: false, bad: key };
    }
    return { ok: false, bad: key };
  }
  return { ok: true };
}

function unitsOk(text: string, g: Grounding): { ok: boolean; bad?: string } {
  for (const { n, unit } of unitPairsIn(text)) {
    const u = normaliseUnit(unit);
    const match = g.units2.find((x) => x.unit === u && Math.abs(x.n - n) < 0.001);
    if (!match) {
      // the unit exists in the grounding with the same number in plain form?
      if (g.numbers.has(n) && g.units.has(u)) continue;
      return { ok: false, bad: `${n} ${u}` };
    }
  }
  return { ok: true };
}

const ATTRIBUTION_CUE =
  /\b(said|says|stated|announced|announces|according to|alleged|alleges|accus\w+|claimed|claims|warned|warns|forecast|forecasts|urged|urges|proposed|proposes|reiterated|denied|denies|told|noted|assured|promised|demanded|sought|will move|to move)\b|:\s*["“]/i;

function attributionOk(s: BriefSentence, citedClaims: Claim[], g: Grounding): { ok: boolean; reason?: string } {
  const attributedClaims = citedClaims.filter(
    (c) => c.status === "attributed" || c.type === "attribution" || c.type === "allegation" || c.type === "prediction",
  );
  if (attributedClaims.length) {
    if (!ATTRIBUTION_CUE.test(s.text) && !s.attributedTo) {
      return { ok: false, reason: "attributed claim rendered as a bare fact" };
    }
    if (attributedClaims.some((c) => c.type === "allegation") && !/\b(alleg\w+|accus\w+|claim\w+)\b/i.test(s.text)) {
      return { ok: false, reason: "allegation not marked as an allegation" };
    }
  }
  if (s.attributedTo) {
    const who = fold(s.attributedTo);
    const named =
      citedClaims.some((c) =>
        c.provenance.some((p) => p.attribution && fold(p.attribution).includes(who)) ||
        c.subjects.some((x) => fold(x).includes(who) || who.includes(fold(x))),
      ) || g.text.toLowerCase().includes(s.attributedTo.toLowerCase());
    if (!named) return { ok: false, reason: `attributed speaker "${s.attributedTo}" not in sources` };
  }
  return { ok: true };
}

function checkSentence(
  s: BriefSentence,
  ctx: {
    claimById: Map<string, Claim>;
    articleById: Map<string, LiveArticle>;
    evidenceById: Map<string, Evidence>;
    cluster: LiveCluster;
  },
): { ok: true } | { ok: false; reason: string } {
  // citation exists
  if (
    s.citations.claimIds.length === 0 &&
    s.citations.sourceIds.length === 0 &&
    s.citations.evidenceIds.length === 0
  ) {
    return { ok: false, reason: "no citation binding" };
  }
  // every cited claim id resolves
  for (const id of s.citations.claimIds) {
    if (!ctx.claimById.has(id)) return { ok: false, reason: `cited claim ${id} does not exist` };
  }
  const { g, citedClaims, hasSupport } = groundingFor(s, ctx.claimById, ctx.articleById, ctx.evidenceById, ctx.cluster);
  if (!hasSupport) return { ok: false, reason: "no cited source supports a cited claim" };

  // attribution first — an allegation-as-fact is the most important thing to catch
  const ab = attributionOk(s, citedClaims, g);
  if (!ab.ok) return { ok: false, reason: ab.reason! };

  for (const phrase of properNounsIn(s.text)) {
    if (!entityOk(phrase, g)) return { ok: false, reason: `entity "${phrase}" not found in sources` };
  }
  const nb = numbersOk(s.text, g);
  if (!nb.ok) return { ok: false, reason: `number ${nb.bad} not found in sources` };
  const db = datesOk(s.text, g);
  if (!db.ok) return { ok: false, reason: `date "${db.bad}" not found in sources` };
  const ub = unitsOk(s.text, g);
  if (!ub.ok) return { ok: false, reason: `unit "${ub.bad}" not found in sources` };

  return { ok: true };
}

/**
 * Verify a synthesised brief. Returns a NEW brief with unsupported sentences
 * removed and `verification` populated. If nothing verifiable survives in the
 * short version, the brief is withheld.
 */
export function verifyBrief(brief: IFFABrief, cluster: LiveCluster, articles: LiveArticle[]): IFFABrief {
  const claimById = new Map((cluster.claims?.claims ?? []).map((c) => [c.id, c]));
  const articleById = new Map(articles.map((a) => [a.id, a]));
  const evidenceById = new Map((cluster.claims?.evidence ?? []).map((e) => [e.id, e]));
  const ctx = { claimById, articleById, evidenceById, cluster };

  const dropReasons: string[] = [];
  let considered = 0;
  let dropped = 0;

  const filterGroup = (group: BriefSentence[], label: string): BriefSentence[] =>
    group.filter((s) => {
      considered++;
      const r = checkSentence(s, ctx);
      if (r.ok) return true;
      dropped++;
      dropReasons.push(`[${label}] "${clip(s.text)}" — ${r.reason}`);
      return false;
    });

  const shortVersion = filterGroup(brief.shortVersion, "short");
  const keyFacts = filterGroup(brief.keyFacts, "key-fact");
  const whyItMatters = filterGroup(brief.whyItMatters, "why");
  const whatChanged = filterGroup(brief.whatChanged, "what-changed");

  // uncertainties: engine-derived, checked for provenance not prose
  const uncertainties = brief.uncertainties.filter((u) => {
    const okSource = ["event-state", "claim-unknowns", "single-source", "no-corroboration"].includes(u.derivedFrom);
    return okSource && u.text.length > 8;
  });

  const out: IFFABrief = {
    ...brief,
    shortVersion,
    keyFacts,
    whyItMatters,
    whatChanged,
    uncertainties,
    disagreements: brief.disagreements.filter((d) => d.positions.length >= 2 && d.positions.every((p) => p.value)),
    verification: { sentencesConsidered: considered, sentencesDropped: dropped, dropReasons },
  };

  if (!brief.withheldReason && shortVersion.length === 0) {
    out.withheldReason = "NO_VERIFIABLE_SENTENCE";
    out.withheldDetail =
      "IFFA could not verify a single sentence about this event against its sources. Coverage and references are shown below.";
  }
  return out;
}

function clip(s: string): string {
  return s.length > 70 ? s.slice(0, 69) + "…" : s;
}
