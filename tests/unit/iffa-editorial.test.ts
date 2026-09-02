import { describe, it, expect } from "vitest";
import { normalizeItem } from "@/lib/live/normalize";
import { computeEditorialPriority, buildSurfaces, EDITORIAL_WEIGHT_SUM, EDITORIAL_WEIGHTS } from "@/lib/editorial";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";

const NOW = Date.parse("2026-09-02T12:00:00Z");
const at = (h: number) => new Date(NOW - h * 3600_000).toISOString();

function feed(o: Partial<FeedSource>): FeedSource {
  return {
    id: "f", name: "F", publisher: "F", homepage: "https://f.ex", url: "https://f.ex/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "tamil-nadu", role: "independent", enabled: true, ...o,
  };
}
function art(o: { publisher: string; title: string; hoursAgo?: number; excerpt?: string; official?: boolean }): LiveArticle {
  const slug = (o.publisher + o.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 44);
  return normalizeItem(
    feed({ id: slug, publisher: o.publisher, official: o.official ?? false, role: o.official ? "official" : "independent", defaultEvidenceRole: o.official ? "official-alert" : "independent-report" }),
    { title: o.title, link: `https://x.ex/${slug}`, guid: slug, published: at(o.hoursAgo ?? 1), summary: o.excerpt ?? o.title },
    at(0), NOW,
  ).article!;
}
function cluster(over: Partial<LiveCluster> & { td?: Partial<NonNullable<LiveCluster["trendData"]>> }): LiveCluster {
  const { td, ...rest } = over;
  return {
    id: "c", slug: over.slug ?? "c", title: over.title ?? "t", scope: "tamil-nadu", districts: [],
    isCrisis: false, crisisPriority: 30, lifecycle: "developing", updatedAt: at(1), languages: ["en"],
    articleIds: [], distinctPublishers: 1, publishers: ["A"], sourceCount: 1, officialCount: 0,
    independentCount: 1, verificationStatus: "single-source", confidence: "weak", reason: "",
    isVerifiedComparison: false, commonGround: [], commonGroundPending: true, differences: [], unknowns: [],
    trendData: {
      geoTier: "P0", category: "politics", lastMeaningfulUpdateAt: at(0.5),
      independence: { families: 2, reports: 2, syndicated: 0, wireCredits: [], label: "" },
      novelty: { updateKind: "new-fact", meaningfulUpdateScore: 0.7, changes: ["a new fact"] },
      severity: { level: "informational", reason: "", peak: { deaths: 0, injured: 0, evacuated: 0 } },
      trend: { score: 40, state: "stable", noveltyClass: "new-fact", recencyScore: 0.8, velocityScore: 0.3, sourceDiversityScore: 0.5, geoScore: 1, categoryScore: 0.72, consequenceScore: 0.3, noveltyScore: 0.7, corroborationScore: 0.5, windows: { m15: 0, h1: 1, h3: 2, h6: 2, h12: 2, h24: 2 }, acceleration: 1, explanation: [] },
      ...(td as Record<string, unknown>),
    },
    ...rest,
  } as LiveCluster;
}

describe("IFFA editorial priority (v0.9 Phase A)", () => {
  it("weights sum to 1 and consequence + info-gain carry the most", () => {
    expect(EDITORIAL_WEIGHT_SUM).toBeCloseTo(1, 9);
    expect(EDITORIAL_WEIGHTS.consequence).toBeGreaterThanOrEqual(EDITORIAL_WEIGHTS.velocity);
    expect(EDITORIAL_WEIGHTS.informationGain).toBeGreaterThan(EDITORIAL_WEIGHTS.velocity);
  });

  it("the score is NOT a probability — it exposes every factor and penalty", () => {
    const a = [art({ publisher: "The Hindu", title: "Cuddalore floods: 5 dead, schools closed", excerpt: "5 dead, 3,000 evacuated." })];
    const r = computeEditorialPriority({ cluster: cluster({ districts: ["Cuddalore"], isCrisis: true, td: { category: "crisis" } }), articles: a, now: NOW });
    expect(r.factors.length).toBe(8);
    expect(r.factors.reduce((s, f) => s + f.contribution, 0)).toBeGreaterThan(0);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("a Tamil Nadu crisis with a new development outranks a P1 political quip", () => {
    const crisis = computeEditorialPriority({
      cluster: cluster({ slug: "cr", districts: ["Cuddalore", "Nagapattinam"], isCrisis: true, crisisPriority: 70, td: { category: "crisis", severity: { level: "severe", reason: "", peak: { deaths: 4, injured: 0, evacuated: 500 } }, novelty: { updateKind: "new-official-confirmation", meaningfulUpdateScore: 0.85, changes: ["official evacuation order"] }, independence: { families: 4, reports: 6, syndicated: 0, wireCredits: [], label: "" } } }),
      articles: [art({ publisher: "District Administration", title: "Cuddalore floods: Collector orders evacuation of 5 villages; 4 dead", official: true, excerpt: "The Collector ordered evacuation." })],
      now: NOW,
    });
    const quip = computeEditorialPriority({
      cluster: cluster({ slug: "q", title: "Minister jibes at opposition over economy", td: { geoTier: "P1", category: "politics", novelty: { updateKind: "new-event", meaningfulUpdateScore: 1, changes: ["a new event"] }, independence: { families: 2, reports: 2, syndicated: 0, wireCredits: [], label: "" } } }),
      articles: [art({ publisher: "PTI", title: "'Few jobless people call themselves economists': Minister jibes at opposition" })],
      now: NOW,
    });
    expect(crisis.score).toBeGreaterThan(quip.score + 15);
    expect(crisis.band === "urgent" || crisis.band === "high").toBe(true);
  });

  it("a pure reaction / quip is demoted", () => {
    const r = computeEditorialPriority({
      cluster: cluster({ title: "CM slams opposition over Katchatheevu", td: { geoTier: "P0", category: "politics" } }),
      articles: [art({ publisher: "A", title: "CM slams opposition over Katchatheevu remarks" })],
      now: NOW,
    });
    expect(r.penalties.some((p) => /reaction/.test(p.name))).toBe(true);
  });

  it("a generic single-source national CAP watch is background, not prominent", () => {
    const r = computeEditorialPriority({
      cluster: cluster({ title: "Heavy Rain", scope: "india", publishers: ["NDMA SACHET"], districts: [], isCrisis: true, td: { geoTier: "P1", category: "crisis", independence: { families: 1, reports: 1, syndicated: 0, wireCredits: [], label: "" }, novelty: { updateKind: "duplicate", meaningfulUpdateScore: 0.1, changes: [] } } }),
      articles: [art({ publisher: "NDMA SACHET", title: "Heavy Rain", official: true })],
      now: NOW,
    });
    expect(r.penalties.some((p) => p.name === "generic-cap")).toBe(true);
    expect(["background", "suppressed", "standard"]).toContain(r.band);
  });

  it("a multi-topic digest is suppressed", () => {
    const r = computeEditorialPriority({
      cluster: cluster({ title: "Today Headlines - 02.09.2026 | TN Assembly | CM Vijay | District News" }),
      articles: [art({ publisher: "A", title: "Today Headlines - 02.09.2026 | TN Assembly | CM Vijay | District News" })],
      now: NOW,
    });
    expect(r.band).toBe("suppressed");
    expect(r.suppressedByRule).toMatch(/digest/i);
  });

  it("celebrity / entertainment is suppressed by rule", () => {
    const r = computeEditorialPriority({
      cluster: cluster({ title: "Actor spotted at airport; dating rumours viral", td: { category: "celebrity" } }),
      articles: [art({ publisher: "A", title: "Actor spotted at airport; dating rumours go viral" })],
      now: NOW,
    });
    expect(r.band).toBe("suppressed");
  });

  it("buildSurfaces applies source-concentration control when diversity is available", () => {
    const clusters: LiveCluster[] = [];
    // 12 single-publisher Hindu stories …
    for (let i = 0; i < 12; i++) {
      const c = cluster({ slug: `h${i}`, title: `Hindu ${i}`, publishers: ["The Hindu"], distinctPublishers: 1, td: { category: "politics", geoTier: "P0" } });
      c.trendData!.editorial = computeEditorialPriority({ cluster: c, articles: [art({ publisher: "The Hindu", title: `Tamil Nadu government announces measure ${i}` })], now: NOW });
      clusters.push(c);
    }
    // … plus 3 from other publishers
    for (let i = 0; i < 3; i++) {
      const c = cluster({ slug: `o${i}`, title: `Other ${i}`, publishers: [`Pub${i}`], distinctPublishers: 1, td: { category: "politics", geoTier: "P0" } });
      c.trendData!.editorial = computeEditorialPriority({ cluster: c, articles: [art({ publisher: `Pub${i}`, title: `Tamil Nadu Assembly clears bill ${i}` })], now: NOW });
      clusters.push(c);
    }
    const s = buildSurfaces(clusters);
    const hinduInRightNow = s.rightNow.map((slug) => clusters.find((c) => c.slug === slug)!).filter((c) => c.publishers[0] === "The Hindu").length;
    // the cap keeps Hindu from filling every slot; overflow is deferred, then
    // backfilled only after other publishers are exhausted
    expect(hinduInRightNow).toBeLessThan(12);
    expect(s.concentrationNotes.some((n) => /Hindu/.test(n))).toBe(true);
  });

  it("is deterministic", () => {
    const c = cluster({});
    const a = [art({ publisher: "A", title: "Tamil Nadu Assembly passes a bill" })];
    expect(computeEditorialPriority({ cluster: c, articles: a, now: NOW })).toEqual(
      computeEditorialPriority({ cluster: c, articles: a, now: NOW }),
    );
  });
});
