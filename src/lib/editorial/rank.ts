/**
 * Editorial surfacing (v0.9, Phase A / J / M).
 *
 * Turns per-cluster EditorialPriority into the home-page surfaces:
 * URGENT / RIGHT NOW / FAST RISING / TAMIL NADU / INDIA / per-category / WATCHING
 * / BACKGROUND — with source-concentration control so one publisher cannot fill
 * the page. OTHER_RELEVANT flows to BACKGROUND, de-emphasised editorially, not
 * misclassified.
 */
import type { LiveCluster } from "@/lib/live/types";
import type { EditorialBand } from "./types";
import { EDITORIAL_BAND_RANK } from "./types";
import { MAX_PER_PUBLISHER_TOP } from "./weights";

export interface EditorialSurfaces {
  urgent: string[];
  rightNow: string[];
  fastRising: string[];
  tamilNadu: string[];
  india: string[];
  byCategory: Record<string, string[]>;
  watching: string[];
  background: string[];
  /** counts by band, for the dashboard. */
  bands: Record<EditorialBand, number>;
  /** publishers capped out of a surface this run. */
  concentrationNotes: string[];
}

function ed(c: LiveCluster) {
  return c.trendData?.editorial;
}
function score(c: LiveCluster): number {
  return ed(c)?.score ?? c.trendData?.trend?.score ?? c.crisisPriority / 2;
}
function band(c: LiveCluster): EditorialBand {
  return (ed(c)?.band ?? "standard") as EditorialBand;
}

/** Sort by editorial score desc, then meaningful recency. */
function byEditorial(a: LiveCluster, b: LiveCluster): number {
  return (
    score(b) - score(a) ||
    Date.parse(b.trendData?.lastMeaningfulUpdateAt ?? b.updatedAt) -
      Date.parse(a.trendData?.lastMeaningfulUpdateAt ?? a.updatedAt)
  );
}

/**
 * Take `limit` clusters, but no more than MAX_PER_PUBLISHER_TOP from a single
 * publisher (the primary publisher = first alphabetically, matching how the
 * cluster lists them). Overflow is deferred, not dropped.
 */
function diversify(sorted: LiveCluster[], limit: number, notes: string[], surface: string): LiveCluster[] {
  const perPub = new Map<string, number>();
  const picked: LiveCluster[] = [];
  const deferred: LiveCluster[] = [];
  for (const c of sorted) {
    if (picked.length >= limit) break;
    const pub = c.publishers[0] ?? "?";
    const n = perPub.get(pub) ?? 0;
    if (n >= MAX_PER_PUBLISHER_TOP && c.distinctPublishers === 1) {
      deferred.push(c);
      if (!notes.some((x) => x.includes(pub) && x.includes(surface))) {
        notes.push(`${surface}: capped ${pub} at ${MAX_PER_PUBLISHER_TOP}`);
      }
      continue;
    }
    perPub.set(pub, n + 1);
    picked.push(c);
  }
  for (const c of deferred) {
    if (picked.length >= limit) break;
    picked.push(c);
  }
  return picked;
}

const ACTIVE = new Set(["active", "update", "developing"]);

export function buildSurfaces(clusters: LiveCluster[]): EditorialSurfaces {
  const withEd = clusters.filter((c) => c.trendData?.editorial);
  const notes: string[] = [];

  const bands: Record<EditorialBand, number> = { urgent: 0, high: 0, standard: 0, background: 0, suppressed: 0 };
  for (const c of withEd) bands[band(c)]++;

  const visible = withEd.filter((c) => band(c) !== "suppressed").sort(byEditorial);

  const urgent = visible.filter((c) => band(c) === "urgent").map((c) => c.slug);

  const rightNow = diversify(
    visible.filter((c) => EDITORIAL_BAND_RANK[band(c)] >= EDITORIAL_BAND_RANK.standard),
    10,
    notes,
    "Right now",
  ).map((c) => c.slug);

  const RISING = new Set(["new", "rising", "fast-rising", "resurging"]);
  const fastRising = diversify(
    visible.filter(
      (c) =>
        RISING.has(c.trendData?.trend?.state ?? "") &&
        EDITORIAL_BAND_RANK[band(c)] >= EDITORIAL_BAND_RANK.standard &&
        !["duplicate", "rephrasing", "minor-detail"].includes(c.trendData?.novelty?.updateKind ?? ""),
    ),
    9,
    notes,
    "Fast rising",
  ).map((c) => c.slug);

  const tamilNadu = diversify(
    visible.filter((c) => c.trendData?.geoTier === "P0"),
    12,
    notes,
    "Tamil Nadu",
  ).map((c) => c.slug);

  const p0 = new Set(tamilNadu);
  const india = diversify(
    visible.filter((c) => c.trendData?.geoTier === "P1" && !p0.has(c.slug)),
    12,
    notes,
    "India",
  ).map((c) => c.slug);

  // Category / geo pages list EVERY non-suppressed event in that domain, ranked
  // editorially — a low-priority politics story still appears on /politics/,
  // just far down. Only the home page is selective.
  const byCategory: Record<string, string[]> = {};
  for (const cat of ["crisis", "politics", "finance", "sports"]) {
    byCategory[cat] = visible
      .filter((c) => c.trendData?.category === cat)
      .sort(byEditorial)
      .slice(0, 60)
      .map((c) => c.slug);
  }

  const surfaced = new Set([...rightNow, ...fastRising, ...urgent]);
  const watching = visible
    .filter(
      (c) =>
        !surfaced.has(c.slug) &&
        band(c) !== "background" &&
        ((c.isCrisis && ACTIVE.has(c.lifecycle)) ||
          (c.trendData?.editorial?.factors.find((f) => f.name === "consequence")?.value ?? 0) >= 0.5 ||
          RISING.has(c.trendData?.trend?.state ?? "")),
    )
    .slice(0, 16)
    .map((c) => c.slug);

  const watchingSet = new Set(watching);
  const background = visible
    .filter((c) => !surfaced.has(c.slug) && !watchingSet.has(c.slug))
    .sort(byEditorial)
    .slice(0, 40)
    .map((c) => c.slug);

  return { urgent, rightNow, fastRising, tamilNadu, india, byCategory, watching, background, bands, concentrationNotes: notes.slice(0, 8) };
}
