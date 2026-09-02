import { describe, it, expect } from "vitest";
import { normalizeItem } from "@/lib/live/normalize";
import { clusterArticles } from "@/lib/live/cluster";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle, LiveDataset } from "@/lib/live/types";
import {
  enrichDataset,
  computeTrend,
  velocityScore,
  trendWindows,
  buildTimeline,
  buildSituation,
  TREND_WEIGHT_SUM,
  TREND_WEIGHTS,
} from "@/lib/trends";

const NOW = Date.parse("2026-09-02T12:00:00Z");
const iso = (hoursAgo: number) => new Date(NOW - hoursAgo * 3600_000).toISOString();

function feed(over: Partial<FeedSource>): FeedSource {
  return {
    id: "f", name: "F", publisher: "F", homepage: "https://f.example", url: "https://f.example/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "tamil-nadu", role: "independent", enabled: true, ...over,
  };
}

function mk(opts: {
  publisher: string;
  title: string;
  hoursAgo: number;
  excerpt?: string;
  official?: boolean;
}): LiveArticle {
  const slug = (opts.publisher + opts.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const t = iso(opts.hoursAgo);
  return normalizeItem(
    feed({
      id: slug,
      publisher: opts.publisher,
      official: opts.official ?? false,
      role: opts.official ? "official" : "independent",
      defaultEvidenceRole: opts.official ? "government-statement" : "independent-report",
    }),
    {
      title: opts.title,
      link: `https://${slug}.example/${encodeURIComponent(opts.title.slice(0, 24))}`,
      guid: `${opts.publisher}:${opts.title}:${opts.hoursAgo}`,
      published: t,
      summary: opts.excerpt ?? opts.title,
    },
    iso(0),
    NOW,
  ).article!;
}

function datasetOf(articles: LiveArticle[]): LiveDataset {
  const { clusters, weakMatchesRejected } = clusterArticles(articles, NOW);
  return {
    generatedAt: iso(0),
    lastSuccessAt: iso(0),
    health: "live",
    feeds: [],
    articles,
    clusters,
    counts: {
      activeCrisis: 0, tamilNadu: 0, india: 0, comparisons: 0, singleReports: 0,
      weakMatchesRejected, distinctPublishers: new Set(articles.map((a) => a.publisher)).size,
      workingFeeds: 1, failedFeeds: 0,
    },
  };
}

describe("IFFA trend engine — weights (Phase F)", () => {
  it("trend weights sum to exactly 1", () => {
    expect(TREND_WEIGHT_SUM).toBeCloseTo(1, 9);
  });
  it("consequence and velocity carry the most weight", () => {
    expect(TREND_WEIGHTS.consequence).toBeGreaterThanOrEqual(TREND_WEIGHTS.novelty);
    expect(TREND_WEIGHTS.velocity).toBeGreaterThanOrEqual(TREND_WEIGHTS.novelty);
  });
});

describe("IFFA trend engine — velocity (Phase F)", () => {
  it("counts independent families per window, not raw articles", () => {
    const arts = [
      mk({ publisher: "A", title: "Chennai heavy rain floods low-lying areas", hoursAgo: 0.5 }),
      mk({ publisher: "A", title: "Chennai heavy rain floods low-lying areas again", hoursAgo: 0.4 }),
      mk({ publisher: "A", title: "Chennai heavy rain floods low-lying areas update", hoursAgo: 0.3 }),
    ];
    const familyOf = new Map(arts.map((a) => [a.id, "A"])); // all one family
    const w = trendWindows(arts, familyOf, NOW);
    expect(w.h1).toBe(1); // three articles, one family
  });

  it("a fresh burst across many families scores as fast-rising", () => {
    const arts = [
      mk({ publisher: "P1", title: "Cyclone alert issued for Tamil Nadu coast", hoursAgo: 0.2 }),
      mk({ publisher: "P2", title: "Cyclone warning: Tamil Nadu coast on alert", hoursAgo: 0.3 }),
      mk({ publisher: "P3", title: "IMD issues cyclone alert for coastal Tamil Nadu", hoursAgo: 0.4 }),
      mk({ publisher: "P4", title: "Tamil Nadu coast braces for cyclone landfall", hoursAgo: 0.5 }),
      mk({ publisher: "P5", title: "Cyclone nears Tamil Nadu, fishermen warned", hoursAgo: 8 }),
    ];
    const familyOf = new Map(arts.map((a) => [a.id, a.publisher]));
    const v = velocityScore(arts, familyOf, NOW);
    expect(v.measurable).toBe(true);
    expect(v.acceleration).toBeGreaterThan(2);
    expect(v.score).toBeGreaterThan(0.7);
  });

  it("a single-article cluster is not measurable and gets the baseline", () => {
    const arts = [mk({ publisher: "A", title: "Minor road repair announced in Salem", hoursAgo: 3 })];
    const v = velocityScore(arts, new Map([[arts[0].id, "A"]]), NOW);
    expect(v.measurable).toBe(false);
    expect(v.score).toBeLessThan(0.25);
  });
});

describe("IFFA trend engine — score is fully inspectable (Phase F)", () => {
  it("returns every sub-score and an explanation", () => {
    const t = computeTrend({
      cluster: { crisisPriority: 70, districts: ["Chennai", "Chengalpattu", "Tiruvallur"], verificationStatus: "corroborated", isCrisis: true, officialCount: 1 },
      category: "crisis",
      geoTier: "P0",
      independence: { families: 5, reports: 12, syndicated: 1, wireCredits: [], label: "Multiple independent newsrooms" },
      hasOfficialPrimary: true,
      velocityScore: 0.9,
      acceleration: 4.3,
      windows: { m15: 1, h1: 5, h3: 8, h6: 9, h12: 10, h24: 12 },
      noveltyClass: "new-fact",
      minutesSinceMeaningful: 40,
      state: "fast-rising",
    });
    for (const k of ["recencyScore", "velocityScore", "sourceDiversityScore", "geoScore", "categoryScore", "consequenceScore", "noveltyScore", "corroborationScore"] as const) {
      expect(t[k]).toBeGreaterThanOrEqual(0);
      expect(t[k]).toBeLessThanOrEqual(1);
    }
    expect(t.score).toBeGreaterThan(50);
    expect(t.explanation.length).toBeGreaterThan(2);
    expect(t.explanation.join(" ")).toMatch(/independent source families/);
  });

  it("an out-of-scope story scores zero (geo hard-zero)", () => {
    const t = computeTrend({
      cluster: { crisisPriority: 30, districts: [], verificationStatus: "single-source", isCrisis: false, officialCount: 0 },
      category: "other-relevant",
      geoTier: "out",
      independence: { families: 3, reports: 5, syndicated: 0, wireCredits: [], label: "x" },
      hasOfficialPrimary: false,
      velocityScore: 0.8,
      acceleration: 2,
      windows: { m15: 0, h1: 2, h3: 3, h6: 4, h12: 5, h24: 5 },
      noveltyClass: "new-event",
      minutesSinceMeaningful: 20,
      state: "rising",
    });
    expect(t.score).toBe(0);
  });

  it("40 syndicated copies from one family beat down the score vs 6 independent families", () => {
    const base = {
      cluster: { crisisPriority: 50, districts: ["Chennai"], verificationStatus: "single-source" as const, isCrisis: false, officialCount: 0 },
      category: "politics" as const,
      geoTier: "P0" as const,
      hasOfficialPrimary: false,
      velocityScore: 0.7,
      acceleration: 2,
      windows: { m15: 0, h1: 1, h3: 2, h6: 3, h12: 4, h24: 5 },
      noveltyClass: "more-of-same" as const,
      minutesSinceMeaningful: 120,
      state: "stable" as const,
    };
    const syndicated = computeTrend({ ...base, independence: { families: 1, reports: 40, syndicated: 39, wireCredits: ["PTI"], label: "One newsroom, syndicated" } });
    const independent = computeTrend({ ...base, independence: { families: 6, reports: 6, syndicated: 0, wireCredits: [], label: "Multiple independent newsrooms" } });
    expect(independent.score).toBeGreaterThan(syndicated.score);
  });
});

describe("IFFA timeline (Phase I)", () => {
  it("marks entries that add a new fact and the first entry", () => {
    const arts = [
      mk({ publisher: "A", title: "Heavy rain forecast for Cuddalore district", hoursAgo: 6 }),
      mk({ publisher: "B", title: "Heavy rain forecast for Cuddalore district", hoursAgo: 5 }), // repeat
      mk({ publisher: "C", title: "Cuddalore: 3 dead as rain triggers wall collapse, 120 mm recorded", hoursAgo: 2 }), // new facts
    ];
    const tl = buildTimeline(arts);
    expect(tl[0].addedNewFact).toBe(true);
    expect(tl[1].addedNewFact).toBe(false);
    expect(tl[2].addedNewFact).toBe(true);
  });
});

describe("IFFA situation bar (Phase F)", () => {
  it("derives Crisis for TN from two escalating severe alerts, and lists the drivers", () => {
    const s = buildSituation(
      [
        { slug: "cyclone-x", title: "Cyclone alert — Nagapattinam, Cuddalore", tier: "P0", isCrisis: true, crisisPriority: 82, lifecycle: "active", officialCount: 2, independentFamilies: 4, districtCount: 5, capSeverity: "Severe" },
        { slug: "flood-z", title: "Flood — Thanjavur delta", tier: "P0", isCrisis: true, crisisPriority: 70, lifecycle: "active", officialCount: 1, independentFamilies: 3, districtCount: 4 },
        { slug: "rain-y", title: "Heavy rain — Chennai", tier: "P0", isCrisis: true, crisisPriority: 45, lifecycle: "update", officialCount: 0, independentFamilies: 1, districtCount: 1 },
      ],
      iso(0),
    );
    expect(s.tamilNadu).toBe("crisis");
    expect(s.derivedFrom.length).toBeGreaterThan(0);
    expect(s.derivedFrom[0].slug).toBe("cyclone-x");
  });

  it("routine national CAP watches alone do NOT read as Crisis", () => {
    const s = buildSituation(
      [
        { slug: "ff1", title: "Flash Flood", tier: "P1", isCrisis: true, crisisPriority: 65, lifecycle: "active", officialCount: 1, independentFamilies: 1, districtCount: 0 },
        { slug: "ff2", title: "Lightning", tier: "P1", isCrisis: true, crisisPriority: 64, lifecycle: "active", officialCount: 1, independentFamilies: 1, districtCount: 0 },
        { slug: "ff3", title: "Heavy Rain", tier: "P1", isCrisis: true, crisisPriority: 63, lifecycle: "active", officialCount: 1, independentFamilies: 0, districtCount: 0 },
      ],
      iso(0),
    );
    expect(s.india).not.toBe("crisis");
  });

  it("is Normal when nothing is active — never a fabricated alert", () => {
    const s = buildSituation(
      [{ slug: "a", title: "Old cleared alert", tier: "P0", isCrisis: true, crisisPriority: 60, lifecycle: "all-clear", officialCount: 1, independentFamilies: 2, districtCount: 3 }],
      iso(0),
    );
    expect(s.tamilNadu).toBe("normal");
    expect(s.derivedFrom).toEqual([]);
  });
});

describe("IFFA enrichDataset end to end (Phase E/F)", () => {
  const arts = [
    mk({ publisher: "The Hindu", title: "Chennai schools shut as heavy rain floods roads; IMD orange alert", hoursAgo: 1, excerpt: "Greater Chennai Corporation declared a holiday for schools." }),
    mk({ publisher: "Times of India", title: "Heavy rain in Chennai: schools closed, flights delayed", hoursAgo: 1.4, excerpt: "IMD has issued an orange alert for Chennai and Chengalpattu." }),
    mk({ publisher: "News18", title: "Chennai rains: schools declared holiday, waterlogging reported", hoursAgo: 2.1, excerpt: "Schools across Chennai will remain closed." }),
    mk({ publisher: "Vikatan", title: "Bengaluru tech company announces new funding round", hoursAgo: 3, excerpt: "The startup raised a Series B round." }),
    mk({ publisher: "SomeBlog", title: "Local council election held in a small town in France", hoursAgo: 5, excerpt: "Voters in the commune went to the polls." }),
  ];
  const enriched = enrichDataset(datasetOf(arts), { now: NOW, previous: null });

  it("classifies clusters into categories and counts them", () => {
    expect(enriched.counts.byCategory).toBeTruthy();
    const cats = enriched.clusters.map((c) => c.trendData?.category);
    expect(cats).toContain("crisis");
  });

  it("the Chennai rain cluster trends; the French local election does not", () => {
    const rain = enriched.clusters.find((c) => /chennai/i.test(c.title) && c.trendData?.category === "crisis");
    expect(rain).toBeTruthy();
    expect(enriched.trending).toContain(rain!.slug);

    const french = enriched.clusters.find((c) => /france/i.test(c.title));
    expect(french?.trendData?.geoTier).toBe("out");
    expect(enriched.trending).not.toContain(french?.slug);
  });

  it("every enriched cluster carries first-seen, timeline and an independence summary", () => {
    for (const c of enriched.clusters) {
      expect(c.trendData?.firstSeenAt).toBeTruthy();
      expect(Array.isArray(c.trendData?.timeline)).toBe(true);
      expect(c.trendData?.independence?.families).toBeGreaterThanOrEqual(1);
    }
  });

  it("novelty is 'unknown' with no previous snapshot, honestly", () => {
    for (const c of enriched.clusters) {
      expect(c.trendData?.trend?.noveltyClass).toBe("unknown");
    }
  });

  it("is deterministic", () => {
    const a = enrichDataset(datasetOf(arts), { now: NOW, previous: null });
    const b = enrichDataset(datasetOf(arts), { now: NOW, previous: null });
    expect(a.trending).toEqual(b.trending);
    expect(a.clusters.map((c) => c.trendData?.trend?.score)).toEqual(b.clusters.map((c) => c.trendData?.trend?.score));
  });
});

describe("IFFA political claim threads (v0.9 Phase D)", () => {
  it("links an allegation and its denial about the same subject, but not unrelated politics", () => {
    const arts = [
      mk({ publisher: "The Hindu", title: "Opposition AIADMK alleges ₹600-crore corruption in the Kallanai barrage contract", hoursAgo: 6, excerpt: "AIADMK leaders levelled corruption charges over the Kallanai barrage tender awarded last month." }),
      mk({ publisher: "Times of India", title: "AIADMK repeats Kallanai barrage corruption allegation in the Assembly", hoursAgo: 5, excerpt: "The party alleged irregularities in the Kallanai barrage contract." }),
      mk({ publisher: "News18", title: "Government denies Kallanai barrage corruption charge, calls it baseless", hoursAgo: 2, excerpt: "The Water Resources Minister rejected the AIADMK allegation on the Kallanai barrage contract as politically motivated and false." }),
      mk({ publisher: "Dinamani", title: "Chief Minister inaugurates a new bus terminus in Kilambakkam", hoursAgo: 4, excerpt: "The CM opened the long-delayed Kilambakkam bus terminus." }),
    ];
    const enriched = enrichDataset(datasetOf(arts), { now: NOW, previous: null });
    const denial = enriched.clusters.find((c) => /denies/i.test(c.title));
    const allegation = enriched.clusters.find((c) => /alleges|allegation/i.test(c.title));
    const terminus = enriched.clusters.find((c) => /terminus/i.test(c.title));

    expect(denial?.trendData?.politicalThread?.links?.length).toBeGreaterThan(0);
    expect(denial?.trendData?.politicalThread?.links?.[0].relation).toBe("denies");
    expect(allegation?.trendData?.politicalThread?.links?.some((l) => l.slug === denial?.slug)).toBe(true);
    // the unrelated inauguration is NOT pulled into the thread
    expect(terminus?.trendData?.politicalThread).toBeUndefined();
  });
});
