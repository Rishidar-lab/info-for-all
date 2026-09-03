/**
 * Blindspot engine (v0.10, sample-size gated v0.11 Phase J).
 *
 * A blindspot is a COVERAGE ASYMMETRY — one group of sources covers a story far
 * more than another. It says nothing about whether the story is true (every
 * `description` says so), and it is only labelled CLEAR_ASYMMETRY when there is
 * enough coverage to support the claim — otherwise INSUFFICIENT_COVERAGE
 * ("primarily a local / regional story", not an accusation).
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Blindspot, BlindspotConfidence, BlindspotType, FramingComparison, PublisherProfile } from "./types";

const MIN_TOTAL = 4;
const MIN_RATIO = 3;
/** For CLEAR_ASYMMETRY: enough reporting on BOTH sides of the divide. */
const CLEAR_MIN_TOTAL = 8;
const CLEAR_MIN_OVER = 5;
const CLEAR_MIN_UNDER = 2;
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

function confidenceOf(overN: number, underN: number): BlindspotConfidence {
  if (overN + underN < CLEAR_MIN_TOTAL || overN < CLEAR_MIN_OVER) return "INSUFFICIENT_COVERAGE";
  if (underN < CLEAR_MIN_UNDER) return "POSSIBLE_ASYMMETRY"; // barely covered on the other side
  return "CLEAR_ASYMMETRY";
}

function make(
  type: BlindspotType,
  gap: { over: string; overN: number; under: string; underN: number },
  describe: (g: typeof gap, ratio: number, conf: BlindspotConfidence) => string,
): Blindspot | null {
  const ratio = gap.overN / Math.max(gap.underN, 1);
  if (ratio < MIN_RATIO) return null;
  const confidence = confidenceOf(gap.overN, gap.underN);
  return {
    type,
    overCoveredGroup: gap.over,
    overCoveredCount: gap.overN,
    underCoveredGroup: gap.under,
    underCoveredCount: gap.underN,
    ratio: Math.round(ratio * 10) / 10,
    confidence,
    description: `${describe(gap, ratio, confidence)} ${ASYMMETRY_NOTE}`,
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
    add(
      make("LANGUAGE", lg, (g, _r, conf) =>
        conf === "CLEAR_ASYMMETRY"
          ? `${g.over} sources carry this story (${g.overN}); ${g.under} sources barely do (${g.underN}).`
          : `Predominantly covered by ${g.over.replace("-language", "-language")} media (${g.overN} of ${articles.length}).`,
      ),
    );

  // ── REGIONAL ──
  const region = tally(articles, (a) => {
    const p = ctx.profiles.get(a.publisher);
    if (a.districts.length === 1 && !/statewide|national/i.test(a.districts[0])) return `${a.districts[0]} / local`;
    if (a.districts.length > 0 || p?.regions.includes("tamil-nadu")) return "Tamil Nadu / regional";
    return "national / non-regional";
  });
  const rg = biggestGap(region);
  if (rg)
    add(
      make("REGIONAL", rg, (g, _r, conf) =>
        conf === "CLEAR_ASYMMETRY"
          ? `${g.over} outlets carry this (${g.overN}) far more than ${g.under} outlets (${g.underN}).`
          : `Primarily a ${g.over.toLowerCase()} story (${g.overN} of ${articles.length}).`,
      ),
    );

  // OWNERSHIP / SOURCE_FAMILY concentration is only interesting on a
  // consequential story — routine sports / other-relevant content is expected to
  // cluster by family and the flag is just noise (v0.11 manual audit, F3).
  const consequential =
    cluster.isCrisis ||
    (cluster.trendData?.severity?.level ?? "informational") !== "informational" ||
    ["urgent", "high"].includes(cluster.trendData?.editorial?.band ?? "") ||
    ["politics", "crisis", "finance"].includes(cluster.trendData?.category ?? "");

  if (consequential) {
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
  }

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
      add(
        make("POLITICAL_COVERAGE", { over, overN: Math.max(fav, crit), under, underN: Math.min(fav, crit) }, (g, _r, conf) =>
          conf === "CLEAR_ASYMMETRY"
            ? `Framing in this cluster leans ${g.over} (${g.overN}) vs ${g.under} (${g.underN}).`
            : `Framing in this cluster is mostly ${g.over} (${g.overN}), with little ${g.under} coverage (${g.underN}) — small sample.`,
        ),
      );
    }
  }

  return out;
}
