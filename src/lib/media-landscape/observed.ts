/**
 * Snapshot-scoped observed publisher metrics (v0.10, Phase 5 down-payment).
 *
 * The full rolling 7/30/90-day alignment needs the historical store (Phase 1.5).
 * Until that has enough days, this computes what CAN be computed honestly from
 * the CURRENT snapshot, and every number ships with its sample size and band.
 * Where n is below the minimum, the metric is withheld and the UI says
 * "INSUFFICIENT DATA".
 */
import type { LiveArticle, LiveDataset } from "@/lib/live/types";
import type { CoverageStance, SampleContext } from "./types";
import { makeSampleContext } from "./alignment";
import { entitiesIn, POLITICAL_ENTITIES } from "./entities";
import { readStance } from "./stance";
import { publisherSlug } from "@/data/publishers";

const LOADED =
  /\b(shocking|scandal\w*|expos[eé]d?|explosive|bombshell|slams?|blasts?|blistering|scathing|furious|fury|outrage\w*|storm|chaos|crisis|meltdown|debacle|fiasco|humiliat\w*|crushing|devastating|massive|huge|unprecedented|completely|totally|utterly|betrayal|traitor|shameful|disgrace\w*)\b/i;

export interface PublisherEntityStance {
  entityId: string;
  entityName: string;
  n: number;
  supportive: number;
  critical: number;
  neutralDescriptive: number;
  mixed: number;
  unclear: number;
}

export interface PublisherObserved {
  publisherId: string;
  publisherName: string;
  window: SampleContext["window"];
  computedAt: string;
  totalArticles: number;
  politicalArticles: number;
  /** Per-entity coverage stance, only for entities with n >= 1. */
  entityStance: PublisherEntityStance[];
  /** Fraction of headlines with loaded / absolute language, 0–1, or null. */
  sensationalismRate: number | null;
  /** Topics (IFFA categories) this publisher covered, with counts. */
  topics: Record<string, number>;
  /** Fraction of this publisher's articles that carry a resolved primary/official evidence role. */
  primarySourceUsage: number | null;
  sample: SampleContext;
  /** Honest note about what this window can and cannot say. */
  note: string;
}

export function computePublisherObserved(
  publisherName: string,
  dataset: LiveDataset,
  window: SampleContext["window"] = "all",
): PublisherObserved {
  const arts = dataset.articles.filter((a) => a.publisher === publisherName);
  const computedAt = dataset.generatedAt;
  const byId = new Map(dataset.articles.map((a) => [a.id, a]));

  const politicalArts: LiveArticle[] = [];
  for (const c of dataset.clusters) {
    if (c.trendData?.category !== "politics") continue;
    for (const id of c.articleIds) {
      const a = byId.get(id);
      if (a && a.publisher === publisherName) politicalArts.push(a);
    }
  }

  const bump: Record<CoverageStance, keyof PublisherEntityStance> = {
    supportive: "supportive",
    critical: "critical",
    "neutral-descriptive": "neutralDescriptive",
    mixed: "mixed",
    unclear: "unclear",
  };
  const stanceByEntity = new Map<string, PublisherEntityStance>();
  for (const a of politicalArts) {
    const text = `${a.title}. ${a.excerpt ?? ""}`;
    for (const e of entitiesIn(text)) {
      const rec =
        stanceByEntity.get(e.id) ??
        { entityId: e.id, entityName: e.name, n: 0, supportive: 0, critical: 0, neutralDescriptive: 0, mixed: 0, unclear: 0 };
      // ALIGNMENT tracks the ARTICLE'S OWN framing (author stance). Reported
      // speech ("X slams Y") is descriptive of the exchange, not the publisher's
      // stance — that is the whole point (docs/MEDIA-LANDSCAPE.md).
      const s = readStance(text, e).stance;
      rec.n++;
      (rec[bump[s]] as number)++;
      stanceByEntity.set(e.id, rec);
    }
  }

  const topics: Record<string, number> = {};
  for (const c of dataset.clusters) {
    const cat = c.trendData?.category;
    if (!cat) continue;
    if (c.articleIds.some((id) => byId.get(id)?.publisher === publisherName)) {
      topics[cat] = (topics[cat] ?? 0) + 1;
    }
  }

  const loadedN = arts.filter((a) => LOADED.test(a.title)).length;
  const primaryN = arts.filter((a) => a.evidenceRole === "official-alert" || a.evidenceRole === "primary-document" || a.evidenceRole === "government-statement").length;

  const sample = makeSampleContext(politicalArts.length, window, computedAt);

  return {
    publisherId: publisherSlug(publisherName),
    publisherName,
    window,
    computedAt,
    totalArticles: arts.length,
    politicalArticles: politicalArts.length,
    entityStance: [...stanceByEntity.values()].sort((a, b) => b.n - a.n),
    sensationalismRate: arts.length >= 5 ? Math.round((loadedN / arts.length) * 100) / 100 : null,
    topics,
    primarySourceUsage: arts.length >= 5 ? Math.round((primaryN / arts.length) * 100) / 100 : null,
    sample,
    note:
      politicalArts.length < 20
        ? "Snapshot-scoped only. Sample is below the threshold for a meaningful alignment reading — treat these as indicative, not a characterisation of the publisher."
        : "Snapshot-scoped. A rolling 30/90-day window will replace this once IFFA has enough history.",
  };
}

export const ALL_TRACKED_ENTITIES = POLITICAL_ENTITIES.map((e) => ({ id: e.id, name: e.name }));
