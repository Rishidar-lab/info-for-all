/**
 * Brief build orchestration — synthesise → verify → (Tamil) → compact.
 *
 * The one entry point the story page, the story cards and the audit use.
 * Pure: takes a cluster + its articles, returns briefs. No dataset import.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { ClusterResearch } from "@/lib/research/types";
import { synthesizeBrief } from "./synthesize";
import { verifyBrief } from "./verify";
import { toTamilBrief } from "./tamil";
import { clipWords } from "./text";
import type { IFFABrief, MicroBrief } from "./types";

export interface BuildBriefOptions {
  now?: number;
  /** Also build the Tamil brief (only meaningful for Tamil Nadu stories). */
  tamil?: boolean;
  /** §B.2 — committed research result for this cluster. */
  research?: ClusterResearch | null;
}

export interface BuiltBriefs {
  en: IFFABrief;
  ta?: IFFABrief;
}

/** English brief: synthesised then run through the hallucination firewall. */
export function buildBrief(
  cluster: LiveCluster,
  articles: LiveArticle[],
  opts: { now?: number; research?: ClusterResearch | null } = {},
): IFFABrief {
  const raw = synthesizeBrief(cluster, articles, { language: "en", now: opts.now, research: opts.research });
  return verifyBrief(raw, cluster, articles);
}

export function buildBriefs(cluster: LiveCluster, articles: LiveArticle[], opts: BuildBriefOptions = {}): BuiltBriefs {
  const en = buildBrief(cluster, articles, { now: opts.now, research: opts.research });
  const wantTamil =
    opts.tamil ?? (cluster.scope === "tamil-nadu" || cluster.trendData?.geoTier === "P0" || articles.some((a) => a.language === "ta"));
  if (!wantTamil) return { en };
  const ta = verifyBrief(toTamilBrief(en, cluster, articles), cluster, articles);
  return { en, ta };
}

/** ~30–60 word native micro-brief for home cards / list shards. */
export function microBrief(
  cluster: LiveCluster,
  articles: LiveArticle[],
  opts: { now?: number; research?: ClusterResearch | null } = {},
): MicroBrief {
  const b = buildBrief(cluster, articles, opts);
  if (b.withheldReason) {
    return {
      slug: b.slug,
      text: "",
      citationCount: b.references.length,
      withheld: true,
      withheldReason: b.withheldReason,
      coverage: b.coverage,
    };
  }
  const lead = b.shortVersion.map((s) => s.text).join(" ");
  const extra = b.keyFacts[0]?.text ?? "";
  const text = clipWords([lead, lead.split(/\s+/).length < 22 ? extra : ""].filter(Boolean).join(" "), 60);
  return {
    slug: b.slug,
    text,
    citationCount: b.references.length,
    withheld: false,
    coverage: b.coverage,
  };
}
