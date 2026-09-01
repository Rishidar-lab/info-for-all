import { round, textSimilarity } from "../text";

/**
 * Source-independence estimation.
 *
 * Ten outlets reprinting one wire dispatch are not ten independent confirmations.
 * This module collapses articles into independent clusters using three signals:
 *   1. shared ownership group / parent company
 *   2. shared upstream wire service
 *   3. near-duplicate body text
 *
 * v1 is deliberately simple and explainable. See docs/METHODOLOGY.md.
 */

export interface IndependenceArticle {
  id: string;
  publication: string;
  sourceDomain: string;
  ownershipGroup?: string | null;
  parentCompany?: string | null;
  wireService?: string | null;
  syndicatedFromSourceId?: string | null;
  text?: string | null;
  publishedAt: Date;
}

export interface IndependenceReport {
  totalArticles: number;
  independentCount: number;
  independenceRatio: number;
  ownershipGroups: string[];
  wireDependentArticles: number;
  duplicateTextPairs: number;
  largestClusterSize: number;
  /** Per-article discounting weight: 1 for a cluster representative, less for followers. */
  weights: Record<string, number>;
  clusters: { key: string; articleIds: string[]; reason: string }[];
}

class UnionFind {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb);
  }
}

function ownershipKey(a: IndependenceArticle): string | null {
  return (a.ownershipGroup || a.parentCompany || "").toLowerCase().trim() || null;
}

export function computeIndependence(articles: IndependenceArticle[]): IndependenceReport {
  const n = articles.length;
  const uf = new UnionFind(n);
  const reasons = new Map<string, string>();
  let duplicateTextPairs = 0;

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const a = articles[i];
      const b = articles[j];

      const oa = ownershipKey(a);
      const ob = ownershipKey(b);
      if (oa && ob && oa === ob) {
        uf.union(i, j);
        reasons.set(`${uf.find(i)}`, `shared ownership group (${a.ownershipGroup ?? a.parentCompany})`);
        continue;
      }

      const wa = (a.wireService || "").toLowerCase().trim();
      const wb = (b.wireService || "").toLowerCase().trim();
      if (wa && wb && wa === wb) {
        uf.union(i, j);
        reasons.set(`${uf.find(i)}`, `both carry the ${a.wireService} wire`);
        continue;
      }
      if (a.syndicatedFromSourceId && a.syndicatedFromSourceId === b.syndicatedFromSourceId) {
        uf.union(i, j);
        reasons.set(`${uf.find(i)}`, "syndicated from the same upstream source");
        continue;
      }

      if (a.text && b.text && textSimilarity(a.text, b.text) > 0.82) {
        uf.union(i, j);
        duplicateTextPairs += 1;
        reasons.set(`${uf.find(i)}`, "near-duplicate body text");
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i += 1) {
    const root = uf.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  const weights: Record<string, number> = {};
  const clusters: IndependenceReport["clusters"] = [];
  let wireDependentArticles = 0;
  let largestClusterSize = 0;

  for (const [root, indices] of groups) {
    largestClusterSize = Math.max(largestClusterSize, indices.length);
    if (indices.length > 1) wireDependentArticles += indices.length - 1;
    for (const idx of indices) weights[articles[idx].id] = round(1 / indices.length, 3);
    clusters.push({
      key: articles[root].ownershipGroup || articles[root].wireService || articles[root].sourceDomain,
      articleIds: indices.map((i) => articles[i].id),
      reason: indices.length > 1 ? (reasons.get(`${root}`) ?? "grouped") : "independent",
    });
  }

  const ownershipGroups = [
    ...new Set(articles.map((a) => a.ownershipGroup || a.parentCompany).filter(Boolean) as string[]),
  ].sort();

  const independentCount = groups.size;
  return {
    totalArticles: n,
    independentCount,
    independenceRatio: n === 0 ? 0 : round(independentCount / n, 3),
    ownershipGroups,
    wireDependentArticles,
    duplicateTextPairs,
    largestClusterSize,
    weights,
    clusters: clusters.sort((a, b) => b.articleIds.length - a.articleIds.length),
  };
}
