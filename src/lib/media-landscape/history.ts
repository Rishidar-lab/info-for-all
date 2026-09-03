/**
 * Historical aggregate store (v0.10, Phase 1.5 / 5).
 *
 * Observed editorial alignment needs history. Committing a full snapshot daily
 * would be repo churn, so each run appends a COMPACT per-publisher aggregate
 * (entity-stance counts + topic counts + sensationalism) to a dated file kept
 * in `actions/cache` (like live-feed.json). `rollupWindows()` reads the last
 * N days into 7 / 30 / 90-day windows.
 *
 * Until ~7 days have accumulated, observed alignment stays snapshot-scoped and
 * the UI says INSUFFICIENT DATA — this is the honest state, by design.
 */
import type { LiveDataset } from "@/lib/live/types";
import { computePublisherObserved } from "./observed";
import type { SampleContext } from "./types";
import { makeSampleContext } from "./alignment";

export interface DailyPublisherAggregate {
  publisherId: string;
  articles: number;
  politicalArticles: number;
  sensationalismHits: number;
  primaryUseHits: number;
  topics: Record<string, number>;
  entityStance: Record<string, { n: number; supportive: number; critical: number; neutral: number; mixed: number; unclear: number }>;
}

export interface DailyAggregate {
  date: string; // YYYY-MM-DD
  generatedAt: string;
  publishers: DailyPublisherAggregate[];
}

const LOADED_RE = /\b(shocking|scandal\w*|slams?|blasts?|expos[eé]d?|explosive|bombshell|storm|chaos|meltdown|betrayal|shameful|disgrace\w*|humiliat\w*|devastating|massive|unprecedented)\b/i;

export function computeDailyAggregate(dataset: LiveDataset): DailyAggregate {
  const date = new Date(dataset.generatedAt).toISOString().slice(0, 10);
  const publishers = [...new Set(dataset.articles.map((a) => a.publisher))];

  const rows: DailyPublisherAggregate[] = publishers.map((name) => {
    const obs = computePublisherObserved(name, dataset, "all");
    const arts = dataset.articles.filter((a) => a.publisher === name);
    const entityStance: DailyPublisherAggregate["entityStance"] = {};
    for (const e of obs.entityStance) {
      entityStance[e.entityId] = {
        n: e.n,
        supportive: e.supportive,
        critical: e.critical,
        neutral: e.neutralDescriptive,
        mixed: e.mixed,
        unclear: e.unclear,
      };
    }
    return {
      publisherId: obs.publisherId,
      articles: arts.length,
      politicalArticles: obs.politicalArticles,
      sensationalismHits: arts.filter((a) => LOADED_RE.test(a.title)).length,
      primaryUseHits: arts.filter((a) => a.evidenceRole === "official-alert" || a.evidenceRole === "primary-document" || a.evidenceRole === "government-statement").length,
      topics: obs.topics,
      entityStance,
    };
  });

  return { date, generatedAt: dataset.generatedAt, publishers: rows };
}

export interface RolledPublisherAlignment {
  publisherId: string;
  window: "7d" | "30d" | "90d";
  articles: number;
  politicalArticles: number;
  entityStance: Record<string, { n: number; supportive: number; critical: number; neutral: number; mixed: number; unclear: number }>;
  sensationalismRate: number | null;
  sample: SampleContext;
}

const WINDOWS: [("7d" | "30d" | "90d"), number][] = [
  ["7d", 7],
  ["30d", 30],
  ["90d", 90],
];

export function rollupWindows(aggregates: DailyAggregate[], computedAt: string): RolledPublisherAlignment[] {
  const sorted = [...aggregates].sort((a, b) => b.date.localeCompare(a.date));
  const out: RolledPublisherAlignment[] = [];

  for (const [win, days] of WINDOWS) {
    const slice = sorted.slice(0, days);
    const byPub = new Map<string, RolledPublisherAlignment>();
    for (const day of slice) {
      for (const p of day.publishers) {
        const r =
          byPub.get(p.publisherId) ??
          ({
            publisherId: p.publisherId,
            window: win,
            articles: 0,
            politicalArticles: 0,
            entityStance: {},
            sensationalismRate: null,
            sample: makeSampleContext(0, win, computedAt),
          } as RolledPublisherAlignment);
        r.articles += p.articles;
        r.politicalArticles += p.politicalArticles;
        for (const [eid, s] of Object.entries(p.entityStance)) {
          const acc = r.entityStance[eid] ?? { n: 0, supportive: 0, critical: 0, neutral: 0, mixed: 0, unclear: 0 };
          acc.n += s.n;
          acc.supportive += s.supportive;
          acc.critical += s.critical;
          acc.neutral += s.neutral;
          acc.mixed += s.mixed;
          acc.unclear += s.unclear;
          r.entityStance[eid] = acc;
        }
        byPub.set(p.publisherId, r);
      }
    }
    for (const r of byPub.values()) {
      r.sample = makeSampleContext(r.politicalArticles, win, computedAt);
      out.push(r);
    }
  }
  return out;
}
