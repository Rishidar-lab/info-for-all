/**
 * Blindspot engine (v0.10, Phase 6).
 *
 * A blindspot is a COVERAGE ASYMMETRY — one group of sources covers a story far
 * more than another. It says nothing about whether the story is true, and the
 * `description` of every blindspot says so.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Blindspot, BlindspotType, FramingComparison, PublisherProfile } from "./types";

/** Minimum asymmetry ratio + minimum total articles to flag a blindspot. */
const MIN_RATIO = 3;
const MIN_TOTAL = 4;
const ASYMMETRY_NOTE = "This is a coverage asymmetry, not a judgement about whether the story is true.";

interface Ctx {
  profiles: Map<string, PublisherProfile>;
  families: Map<string, string>;
}

function tally(articles: LiveArticle[], key: (a: LiveArticle) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of articles) {
    const k = key(a);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function biggestGap(m: Map<string, number>): { over: string; overN: number; under: string; underN: number } | null {
  const entries = [...m.entries()].filter(([k]) => k !== "unknown" && k !== "").sort((a, b) => b[1] - a[1]);
  if (entries.length < 2) return null;
  const [over, overN] = entries[0];
  const [under, underN] = entries[entries.length - 1];
  return { over, overN, under, underN };
}

function make(
  type: BlindspotType,
  gap: { over: string; overN: number; under: string; underN: number },
  describe: (g: typeof gap, ratio: number) => string,
): Blindspot | null {
  const ratio = gap.overN / Math.max(gap.underN, 1);
  if (ratio < MIN_RATIO) return null;
  return {
    type,
    overCoveredGroup: gap.over,
    overCoveredCount: gap.overN,
    underCoveredGroup: gap.under,
    underCoveredCount: gap.underN,
    ratio: Math.round(ratio * 10) / 10,
    description: `${describe(gap, ratio)} ${ASYMMETRY_NOTE}`,
  };
}

export function detectBlindspots(
  cluster: LiveCluster,
  articles: LiveArticle[],
  ctx: Ctx,
  framing?: FramingComparison,
): Blindspot[] {
  if (articles.length < MIN_TOTAL) return [];
  const out: Blindspot[] = [];
  const add = (b: Blindspot | null) => {
    if (b) out.push(b);
  };

  // ── LANGUAGE ──
  const lang = tally(articles, (a) => (a.language === "ta" ? "Tamil-language" : a.language === "en" ? "English-language" : "unknown"));
  const lg = biggestGap(lang);
  if (lg)
    add(make("LANGUAGE", lg, (g) => `${g.over} sources cover this story (${g.overN}); ${g.under} sources barely do (${g.underN}).`));

  // ── REGIONAL ──
  const region = tally(articles, (a) => {
    const p = ctx.profiles.get(a.publisher);
    if (a.districts.length > 0 || p?.regions.includes("tamil-nadu")) return "Tamil Nadu / regional";
    return "national / non-regional";
  });
  const rg = biggestGap(region);
  if (rg)
    add(make("REGIONAL", rg, (g) => `${g.over} outlets carry this (${g.overN}) far more than ${g.under} outlets (${g.underN}).`));

  // ── OWNERSHIP ──
  const own = tally(articles, (a) => ctx.profiles.get(a.publisher)?.ownership.category ?? "UNKNOWN");
  const og = biggestGap(own);
  if (og && og.over !== "UNKNOWN")
    add(make("OWNERSHIP", og, (g) => `Sources owned by ${g.over.toLowerCase().replace(/_/g, " ")} entities dominate this coverage (${g.overN} vs ${g.underN}).`));

  // ── SOURCE FAMILY ──
  const fam = tally(articles, (a) => ctx.families.get(a.publisher) ?? "unaffiliated");
  const fg = biggestGap(fam);
  if (fg && fg.overN >= 3)
    add(make("SOURCE_FAMILY", fg, (g) => `${g.overN} of ${articles.length} reports come from a single source family (${g.over}).`));

  // ── POLITICAL COVERAGE (needs framing stances) ──
  if (framing) {
    const stance = new Map<string, number>();
    for (const o of framing.observations) {
      const k = o.stance === "supportive" ? "government-favourable" : o.stance === "critical" ? "government-critical" : "mixed / neutral";
      stance.set(k, (stance.get(k) ?? 0) + 1);
    }
    const fav = stance.get("government-favourable") ?? 0;
    const crit = stance.get("government-critical") ?? 0;
    if (fav + crit >= MIN_TOTAL && Math.max(fav, crit) / Math.max(Math.min(fav, crit), 1) >= MIN_RATIO) {
      const over = fav > crit ? "government-favourable" : "government-critical";
      const under = fav > crit ? "government-critical" : "government-favourable";
      out.push({
        type: "POLITICAL_COVERAGE",
        overCoveredGroup: over,
        overCoveredCount: Math.max(fav, crit),
        underCoveredGroup: under,
        underCoveredCount: Math.min(fav, crit),
        ratio: Math.round((Math.max(fav, crit) / Math.max(Math.min(fav, crit), 1)) * 10) / 10,
        description: `Framing in this cluster is heavily ${over} (${Math.max(fav, crit)}) vs ${under} (${Math.min(fav, crit)}). ${ASYMMETRY_NOTE}`,
      });
    }
  }

  return out;
}
