/**
 * Perspective Compare — first version (Ground-Parity Milestone A).
 *
 * How does coverage of one story differ across groups? IFFA does NOT use the US
 * Left/Center/Right axis. It compares along axes it can actually evidence:
 *   - the shared factual core (corroborated claims every framing agrees on)
 *   - Tamil-language vs English-language emphasis
 *   - official / primary sources vs news reporting
 *   - local / Tamil Nadu vs national outlets
 *   - political cohorts — ONLY when observed-alignment calibration + sample gates
 *     are met (they are not yet, so this is reported as INSUFFICIENT DATA and the
 *     language / locality contrasts are shown instead)
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { FramingObservation, HeadlineEmphasis } from "@/lib/media-landscape/types";
import { publisherByName } from "@/data/publishers";
import type { PerspectiveCompare } from "./types";

const EMPHASIS_LABEL: Record<HeadlineEmphasis, string> = {
  "government-action": "the government's action",
  "political-causation": "what prompted the move",
  "opposition-pressure": "opposition pressure",
  "measurement-data": "the numbers",
  "human-impact": "the human impact",
  "conflict-dispute": "the political conflict",
  "process-procedure": "the process / procedure",
  "reaction-quote": "reactions and quotes",
  accusation: "the accusation",
  "outcome-result": "the outcome",
  uncategorised: "the basic facts",
};

function emphasisOf(obs: FramingObservation[]): string[] {
  const counts = new Map<HeadlineEmphasis, number>();
  for (const o of obs) for (const e of o.emphasis) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([e]) => e !== "uncategorised")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => EMPHASIS_LABEL[e]);
}

function isRegional(a: LiveArticle): boolean {
  const p = publisherByName(a.publisher);
  return a.districts.length > 0 || a.scope === "tamil-nadu" || (p?.regions.includes("tamil-nadu") ?? false);
}

export function buildPerspectiveCompare(cluster: LiveCluster, articles: LiveArticle[]): PerspectiveCompare {
  const ml = cluster.trendData?.mediaLandscape;
  const framing = ml?.framing;
  const obs = framing?.observations ?? [];
  const byId = new Map(obs.map((o) => [o.articleId, o]));

  const reasons: string[] = [];
  const dim = (arts: LiveArticle[], label: string): string[] => {
    const o = arts.map((a) => byId.get(a.id)).filter((x): x is FramingObservation => !!x);
    if (o.length < 2) {
      reasons.push(`${label}: too few articles (${o.length}) to compare emphasis.`);
      return [];
    }
    return emphasisOf(o);
  };

  const tamil = articles.filter((a) => a.language === "ta");
  const english = articles.filter((a) => a.language === "en");
  const official = articles.filter((a) => a.role === "official" || a.evidenceRole === "official-alert" || a.evidenceRole === "primary-document" || a.evidenceRole === "government-statement");
  const local = articles.filter(isRegional);
  const national = articles.filter((a) => !isRegional(a));

  const tamilMediaEmphasis = dim(tamil, "Tamil-language coverage");
  const englishMediaEmphasis = dim(english, "English-language coverage");
  const officialSourcesEmphasis = (() => {
    if (official.length === 0) {
      reasons.push("Official sources: no official or primary-document report in this cluster.");
      return [];
    }
    const facts = cluster.trendData?.eventState?.officialActions ?? [];
    return facts.slice(0, 3).map((f) => f.slice(0, 120));
  })();
  const localMediaEmphasis = dim(local, "Local / Tamil Nadu outlets");
  const nationalMediaEmphasis = dim(national, "National outlets");

  // political cohorts — gated on observed alignment (not yet calibrated)
  reasons.push(
    "Political alignment: INSUFFICIENT DATA — IFFA's observed-alignment calibration is below the sample threshold, so cohorts are not shown. Language and local/national differences are shown instead.",
  );

  const sharedFactualCore = (framing?.sharedFactualCore ?? []).slice(0, 6);

  const hasContrast =
    (tamilMediaEmphasis.length > 0 && englishMediaEmphasis.length > 0 && !sameSet(tamilMediaEmphasis, englishMediaEmphasis)) ||
    (localMediaEmphasis.length > 0 && nationalMediaEmphasis.length > 0 && !sameSet(localMediaEmphasis, nationalMediaEmphasis)) ||
    officialSourcesEmphasis.length > 0;

  return {
    slug: cluster.slug,
    sharedFactualCore,
    tamilMediaEmphasis,
    englishMediaEmphasis,
    officialSourcesEmphasis,
    localMediaEmphasis,
    nationalMediaEmphasis,
    insufficientDataReasons: reasons,
    hasContrast,
  };
}

function sameSet(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  return a.length === b.length && b.every((x) => sa.has(x));
}
