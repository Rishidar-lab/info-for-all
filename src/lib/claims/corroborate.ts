import type { LiveArticle } from "@/lib/live/types";
import { normalisedTitleKey } from "@/lib/live/text";

/**
 * Publication count is NOT independent-corroboration count.
 *
 * Groups a set of articles into clusters that are likely to share upstream
 * material (a wire report, a copied paragraph). Deterministic: two articles are
 * in the same group if their normalised headlines are near-identical OR they
 * share a long verbatim excerpt fragment. Each group counts as ONE independent
 * confirmation.
 */
export interface IndependenceResult {
  /** Article ids grouped by likely shared upstream source. */
  groups: string[][];
  independentGroups: number;
  possibleSyndicated: number;
}

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

  const pubOf = new Map(articles.map((a) => [a.id, a.publisher]));
  const titleKey = new Map(articles.map((a) => [a.id, normalisedTitleKey(a.title)]));
  const frags = new Map(articles.map((a) => [a.id, longFragments(a.excerpt)]));

  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const a = articles[i];
      const b = articles[j];
      // 1. One publisher's several stories about an event are NOT independent of
      //    each other — collapse them into a single source group.
      if (a.publisher === b.publisher) {
        union(a.id, b.id);
        continue;
      }
      // 2. Two DIFFERENT publishers with a near-identical headline or a shared
      //    7-word run are almost certainly one wire copy, not two confirmations.
      const sameTitle =
        titleKey.get(a.id)!.length > 12 && titleKey.get(a.id) === titleKey.get(b.id);
      const sharedFrag = overlaps(frags.get(a.id)!, frags.get(b.id)!);
      if (sameTitle || sharedFrag) union(a.id, b.id);
    }
  }

  const byRoot = new Map<string, string[]>();
  for (const id of ids) {
    const r = find(id);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r)!.push(id);
  }
  const groups = [...byRoot.values()];
  // A group that spans more than one publisher = likely syndication: every
  // publisher past the first is a copy, not an extra confirmation.
  const possibleSyndicated = groups.reduce(
    (n, g) => n + Math.max(0, new Set(g.map((id) => pubOf.get(id))).size - 1),
    0,
  );
  return { groups, independentGroups: groups.length, possibleSyndicated };
}

/** Which independence-group does each publisher fall into, for one claim's supporters. */
export function independentGroupsFor(supportArticleIds: string[], allGroups: string[][]): string[][] {
  const set = new Set(supportArticleIds);
  const out: string[][] = [];
  for (const g of allGroups) {
    const inClaim = g.filter((id) => set.has(id));
    if (inClaim.length) out.push(inClaim);
  }
  return out;
}
