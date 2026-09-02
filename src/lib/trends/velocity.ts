/**
 * Publication velocity over time windows (v0.7, Phase F).
 *
 * Counts DISTINCT INDEPENDENT SOURCE FAMILIES per window — never raw articles —
 * so "40 syndicated copies from one origin" contributes 1, not 40.
 */
import type { LiveArticle } from "@/lib/live/types";
import type { TrendWindows, TrendState, NoveltyClass } from "./types";
import { curveDesc, VELOCITY_CURVE, VELOCITY_BASELINE } from "./weights";

const WINDOWS_MS = {
  m15: 15 * 60_000,
  h1: 60 * 60_000,
  h3: 3 * 3600_000,
  h6: 6 * 3600_000,
  h12: 12 * 3600_000,
  h24: 24 * 3600_000,
} as const;

/**
 * @param familyOf  article id → independent-family key (from analyseIndependence)
 */
export function trendWindows(
  articles: LiveArticle[],
  familyOf: Map<string, string>,
  now: number,
): TrendWindows {
  const count = (ms: number): number => {
    const fams = new Set<string>();
    for (const a of articles) {
      const age = now - Date.parse(a.publishedAt);
      if (age >= 0 && age <= ms) fams.add(familyOf.get(a.id) ?? a.id);
    }
    return fams.size;
  };
  return {
    m15: count(WINDOWS_MS.m15),
    h1: count(WINDOWS_MS.h1),
    h3: count(WINDOWS_MS.h3),
    h6: count(WINDOWS_MS.h6),
    h12: count(WINDOWS_MS.h12),
    h24: count(WINDOWS_MS.h24),
  };
}

export interface VelocityResult {
  score: number;
  /** last-hour family rate ÷ prior-6h family rate */
  acceleration: number;
  measurable: boolean;
}

/**
 * Acceleration = (families in the last hour) ÷ (families/hour over the previous
 * 6 hours). A cluster with < 2 articles or no recent activity gets the baseline.
 */
export function velocityScore(
  articles: LiveArticle[],
  familyOf: Map<string, string>,
  now: number,
): VelocityResult {
  if (articles.length < 2) return { score: VELOCITY_BASELINE, acceleration: 0, measurable: false };

  const lastHour = new Set<string>();
  const prev6h = new Set<string>();
  for (const a of articles) {
    const age = now - Date.parse(a.publishedAt);
    if (age < 0) continue;
    const fam = familyOf.get(a.id) ?? a.id;
    if (age <= WINDOWS_MS.h1) lastHour.add(fam);
    else if (age <= WINDOWS_MS.h1 + WINDOWS_MS.h6) prev6h.add(fam);
  }

  const rateNow = lastHour.size; // families/hour
  const ratePrev = Math.max(prev6h.size / 6, 0.2); // families/hour, floored so a fresh burst still scores
  if (lastHour.size === 0 && prev6h.size === 0) {
    return { score: VELOCITY_BASELINE, acceleration: 0, measurable: false };
  }
  const acceleration = rateNow / ratePrev;
  return { score: curveDesc(acceleration, VELOCITY_CURVE), acceleration, measurable: true };
}

/**
 * Derive the trend state from the measured signals. `priorSeen` = the cluster
 * existed in the previous snapshot; `quietGapHours` = hours between the prior
 * snapshot's last activity and the first article in the current burst.
 */
export function trendState(opts: {
  velocityScore: number;
  acceleration: number;
  noveltyClass: NoveltyClass;
  ageHours: number;
  priorSeen: boolean;
  quietGapHours: number;
}): TrendState {
  const { velocityScore: v, noveltyClass, ageHours, priorSeen, quietGapHours } = opts;

  if (!priorSeen && noveltyClass === "new-event" && ageHours <= 6) return "new";
  if (priorSeen && quietGapHours >= 12 && v >= 0.55) return "resurging";
  if (v >= 0.8) return "fast-rising";
  if (v >= 0.55) return "rising";
  if (v <= 0.26 && ageHours > 6) return "fading";
  return "stable";
}
