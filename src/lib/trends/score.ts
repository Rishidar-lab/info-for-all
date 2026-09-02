/**
 * The interpretable trend score (v0.7, Phase F).
 *
 *   score = 100 · Π_i ( subScore_i ^ w_i )        Σ w_i = 1   (weighted geometric mean)
 *
 * Each sub-score is 0–1 and is returned alongside the composite so `/trends` can
 * explain exactly why something is ranked where it is. Nothing here is opaque.
 */
import type { CategoryId } from "@/lib/domain/categories";
import { CATEGORY_WEIGHT, CATEGORY_LABEL } from "@/lib/domain/categories";
import type { GeoTier } from "@/lib/domain/geo-tiers";
import { GEO_WEIGHT, GEO_TIER_LABEL } from "@/lib/domain/geo-tiers";
import type { LiveCluster } from "@/lib/live/types";
import type { TrendSignal, TrendWindows, NoveltyClass, IndependenceSummary, TrendState } from "./types";
import {
  TREND_WEIGHTS,
  SUBSCORE_FLOOR,
  DIVERSITY_CAP,
  RECENCY_CURVE,
  NOVELTY_SCORE,
  curve,
} from "./weights";

export interface ScoreInput {
  cluster: Pick<
    LiveCluster,
    "crisisPriority" | "districts" | "verificationStatus" | "isCrisis" | "officialCount"
  >;
  category: CategoryId;
  geoTier: GeoTier;
  independence: IndependenceSummary;
  hasOfficialPrimary: boolean;
  velocityScore: number;
  acceleration: number;
  windows: TrendWindows;
  noveltyClass: NoveltyClass;
  /** minutes since the last article that added a new fact */
  minutesSinceMeaningful: number;
  state: TrendState;
}

function recencyScore(minutes: number): number {
  return curve(minutes, RECENCY_CURVE);
}

function diversityScore(families: number): number {
  if (families >= DIVERSITY_CAP) return 1;
  return Math.max(0, (families - 1) / (DIVERSITY_CAP - 1));
}

function consequenceScore(i: ScoreInput): number {
  let s = Math.min(1, i.cluster.crisisPriority / 100);
  if (i.hasOfficialPrimary) s += 0.15;
  if (i.cluster.districts.length >= 3) s += 0.1;
  if (i.cluster.verificationStatus === "official" || i.cluster.verificationStatus === "corroborated") s += 0.1;
  return Math.min(1, s);
}

function corroborationScore(i: ScoreInput): number {
  const fam = i.independence.families;
  if (i.hasOfficialPrimary && fam >= 1) return 1;
  if (fam >= 3) return 0.9;
  if (fam === 2) return 0.65;
  if (i.hasOfficialPrimary) return 0.5;
  return 0.2;
}

export function computeTrend(input: ScoreInput): TrendSignal {
  const sub = {
    recencyScore: recencyScore(input.minutesSinceMeaningful),
    velocityScore: input.velocityScore,
    sourceDiversityScore: diversityScore(input.independence.families),
    geoScore: GEO_WEIGHT[input.geoTier],
    categoryScore: CATEGORY_WEIGHT[input.category],
    consequenceScore: consequenceScore(input),
    noveltyScore: NOVELTY_SCORE[input.noveltyClass],
    corroborationScore: corroborationScore(input),
  };

  // weighted geometric mean; geo is allowed a true zero (removes the item)
  let logSum = 0;
  const pairs: [keyof typeof sub, keyof typeof TREND_WEIGHTS][] = [
    ["recencyScore", "recency"],
    ["velocityScore", "velocity"],
    ["sourceDiversityScore", "diversity"],
    ["geoScore", "geo"],
    ["categoryScore", "category"],
    ["consequenceScore", "consequence"],
    ["noveltyScore", "novelty"],
    ["corroborationScore", "corroboration"],
  ];
  let hardZero = false;
  for (const [k, w] of pairs) {
    const raw = sub[k];
    if (k === "geoScore" && raw === 0) hardZero = true;
    const s = Math.max(raw, SUBSCORE_FLOOR);
    logSum += TREND_WEIGHTS[w] * Math.log(s);
  }
  const score = hardZero ? 0 : Math.round(100 * Math.exp(logSum) * 10) / 10;

  return {
    score,
    state: input.state,
    noveltyClass: input.noveltyClass,
    ...sub,
    windows: input.windows,
    acceleration: Math.round(input.acceleration * 100) / 100,
    explanation: explain(sub, input),
  };
}

function explain(sub: Omit<TrendSignal, "score" | "state" | "noveltyClass" | "windows" | "acceleration" | "explanation">, i: ScoreInput): string[] {
  const out: { weight: number; text: string }[] = [];
  const add = (weight: number, text: string) => out.push({ weight, text });

  if (sub.geoScore === 0) add(99, "− outside India with no stated India / Tamil Nadu consequence");
  else add(sub.geoScore, `+ ${GEO_TIER_LABEL[i.geoTier]} relevance`);

  add(sub.categoryScore, `+ ${CATEGORY_LABEL[i.category]}`);

  if (i.independence.families >= 3) add(sub.sourceDiversityScore, `+ ${i.independence.families} independent source families`);
  else if (i.independence.families === 2) add(sub.sourceDiversityScore, "+ two independent source families");
  else add(-0.5, "− single source family so far");

  if (i.independence.syndicated > 0)
    add(-0.4, `− ${i.independence.syndicated} report(s) are syndicated copies, not independent confirmation`);

  if (sub.velocityScore >= 0.66) add(sub.velocityScore, `+ publication accelerating (${i.acceleration.toFixed(1)}× the prior rate)`);
  else if (sub.velocityScore <= 0.26 && i.state === "fading") add(-0.5, "− publication has slowed");

  if (i.noveltyClass === "new-event") add(sub.noveltyScore, "+ a new event");
  else if (i.noveltyClass === "new-fact") add(sub.noveltyScore, "+ a new factual development since the last update");
  else if (i.noveltyClass === "correction") add(sub.noveltyScore, "+ an official correction / update");
  else if (i.noveltyClass === "more-of-same") add(-0.4, "− mostly repeats facts already reported");

  if (i.hasOfficialPrimary) add(sub.corroborationScore, "+ official / primary source present");
  if (sub.consequenceScore >= 0.7) add(sub.consequenceScore, "+ high public-safety consequence");
  if (sub.recencyScore >= 0.9) add(sub.recencyScore, "+ updated in the last hour");
  else if (sub.recencyScore <= 0.18) add(-0.4, "− no meaningful update in over a day");

  return out.sort((a, b) => b.weight - a.weight).map((x) => x.text);
}
