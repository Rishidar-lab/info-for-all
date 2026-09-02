/**
 * IFA independence engine (v0.4).
 *
 * "How many DIFFERENT newsrooms actually reported this?" — not "how many URLs do
 * we have". Two papers running the same PTI dispatch are one report; a paper's
 * three follow-ups are one report; two newsrooms that independently sent
 * reporters are two.
 *
 * Every pair of articles is classified with an explicit relation and a reason,
 * then union-find collapses the non-independent pairs into source groups. The
 * classification is deterministic and conservative: when the evidence is thin,
 * the answer is `unknown` — and `unknown` is NEVER treated as independent.
 */
import type { LiveArticle } from "@/lib/live/types";
import { normalisedTitleKey } from "@/lib/live/text";
import { detectWireCredit } from "./wire";

export type IndependenceRelation =
  | "independent"
  | "likely-independent"
  | "syndicated"
  | "likely-syndicated"
  | "unknown";

export interface PairRelation {
  a: string;
  b: string;
  relation: IndependenceRelation;
  reason: string;
}

export interface IndependenceResult {
  /** Article ids grouped by likely-shared upstream newsroom. */
  groups: string[][];
  independentGroups: number;
  /** Reports past the first in any multi-publisher group — i.e. syndicated copies. */
  possibleSyndicated: number;
  /** Every classified pair, for explainability. */
  relations: PairRelation[];
  /** Wire agencies actually credited anywhere in this event's coverage. */
  wireCredits: string[];
  /** Count of pairs whose relation is `unknown` (kept separate, not merged). */
  unknownPairs: number;
}

const TEXTS = (a: LiveArticle): string => `${a.title} ${a.excerpt ?? ""}`;

function longFragments(text: string | undefined): Set<string> {
  if (!text) return new Set();
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 7 <= words.length; i += 3) out.add(words.slice(i, i + 7).join(" "));
  return out;
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

/** Classify one pair. Never returns `independent` for same-publisher pairs. */
export function classifyPair(a: LiveArticle, b: LiveArticle): PairRelation {
  const rel = (relation: IndependenceRelation, reason: string): PairRelation => ({ a: a.id, b: b.id, relation, reason });

  if (a.publisher === b.publisher) {
    return rel("syndicated", `Same publisher (${a.publisher}) — one newsroom's several takes.`);
  }

  const wa = detectWireCredit(TEXTS(a));
  const wb = detectWireCredit(TEXTS(b));
  if (wa && wb && wa === wb) {
    return rel("syndicated", `Both carry a ${wa} credit — one upstream dispatch.`);
  }

  const ka = normalisedTitleKey(a.title);
  const kb = normalisedTitleKey(b.title);
  if (ka.length > 12 && ka === kb) {
    return rel("likely-syndicated", "Near-identical headline — probably one wire copy.");
  }

  if (overlaps(longFragments(a.excerpt), longFragments(b.excerpt))) {
    return rel("likely-syndicated", "Shared verbatim passage — probably copied.");
  }

  // A single wire credit on one side, none on the other: the credited one may be
  // agency copy the other rewrote — cannot tell them apart cleanly.
  if ((wa && !wb) || (wb && !wa)) {
    return rel("unknown", `One report carries a ${wa ?? wb} credit, the other does not — independence unclear.`);
  }

  // Different publishers, different wording, no wire credit, short headlines and
  // no excerpts to compare: genuinely can't tell.
  const thin = !a.excerpt && !b.excerpt && a.title.length < 40 && b.title.length < 40;
  if (thin) {
    return rel("unknown", "Two short headlines, no excerpt to compare — independence unclear.");
  }

  // Different publishers, materially different wording: treat as likely
  // independent, but only "likely" — we did not verify separate sourcing.
  const key = new Set(ka.split(" "));
  const other = new Set(kb.split(" "));
  let inter = 0;
  for (const w of key) if (other.has(w)) inter++;
  const jac = key.size + other.size - inter > 0 ? inter / (key.size + other.size - inter) : 0;
  if (jac >= 0.85) {
    return rel("likely-syndicated", `Headlines ${(jac * 100).toFixed(0)}% identical — probably one source.`);
  }
  return rel("likely-independent", `Different publishers, distinct wording (${(jac * 100).toFixed(0)}% headline overlap).`);
}

const MERGES: Set<IndependenceRelation> = new Set(["syndicated", "likely-syndicated"]);

export function analyseIndependence(articles: LiveArticle[]): IndependenceResult {
  const ids = articles.map((a) => a.id);
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (x: string, y: string) => parent.set(find(x), find(y));

  const relations: PairRelation[] = [];
  let unknownPairs = 0;
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const pr = classifyPair(articles[i], articles[j]);
      relations.push(pr);
      if (pr.relation === "unknown") unknownPairs++;
      if (MERGES.has(pr.relation)) union(pr.a, pr.b);
    }
  }

  const pubOf = new Map(articles.map((a) => [a.id, a.publisher]));
  const byRoot = new Map<string, string[]>();
  for (const id of ids) {
    const r = find(id);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r)!.push(id);
  }
  const groups = [...byRoot.values()];
  const possibleSyndicated = groups.reduce(
    (n, g) => n + Math.max(0, new Set(g.map((id) => pubOf.get(id))).size - 1),
    0,
  );

  const wireCredits = [...new Set(articles.map((a) => detectWireCredit(TEXTS(a))).filter((w): w is string => !!w))];

  return {
    groups,
    independentGroups: groups.length,
    possibleSyndicated,
    relations,
    wireCredits,
    unknownPairs,
  };
}

/** Which independence groups a claim's supporting articles fall into. */
export function independentGroupsFor(supportArticleIds: string[], allGroups: string[][]): string[][] {
  const set = new Set(supportArticleIds);
  const out: string[][] = [];
  for (const g of allGroups) {
    const inClaim = g.filter((id) => set.has(id));
    if (inClaim.length) out.push(inClaim);
  }
  return out;
}

/** A short, honest label for the whole event's independence picture. */
export function independenceLabel(r: IndependenceResult): string {
  if (r.independentGroups >= 3) return "Multiple independent newsrooms";
  if (r.independentGroups === 2) return "Two independent newsrooms";
  if (r.possibleSyndicated > 0) return "One newsroom, syndicated";
  if (r.unknownPairs > 0) return "Independence unclear";
  return "Single newsroom";
}
