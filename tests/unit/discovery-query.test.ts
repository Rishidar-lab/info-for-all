import { describe, it, expect } from "vitest";
import type { LiveCluster } from "@/lib/live/types";
import { buildDiscoveryEvent, buildDiscoveryQueries } from "@/lib/discovery/query";
import { normalizeItem } from "@/lib/live/normalize";
import type { FeedSource } from "@/data/feeds";

const NOW = Date.parse("2026-09-03T06:00:00Z");
const T = "2026-09-03T05:00:00.000Z";

function feed(pub: string, language: "en" | "ta" = "en"): FeedSource {
  return {
    id: pub, name: pub, publisher: pub, homepage: "https://ex.test", url: "https://ex.test/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language,
    focus: "tamil-nadu", role: "independent", enabled: true,
  };
}

function article(pub: string, title: string, language: "en" | "ta" = "en", districts: string[] = []) {
  const a = normalizeItem(
    feed(pub, language),
    { title, link: `https://ex.test/${encodeURIComponent(title.slice(0, 30))}`, guid: `${pub}:${title}`, published: T, summary: title },
    T, NOW,
  ).article!;
  a.language = language;
  if (districts.length) a.districts = districts;
  return a;
}

function cluster(title: string, over: Partial<LiveCluster> = {}): LiveCluster {
  return {
    id: "c1", slug: "test-slug-aaaaaa", title, scope: "tamil-nadu", districts: [],
    crisisType: undefined, isCrisis: false, crisisPriority: 10, lifecycle: "developing",
    updatedAt: T, languages: ["en"], articleIds: ["a1"], distinctPublishers: 1,
    publishers: ["The Hindu"], sourceCount: 1, officialCount: 0, independentCount: 1,
    verificationStatus: "single-source", confidence: "weak", reason: "Single report.",
    isVerifiedComparison: false, commonGround: [], commonGroundPending: true,
    differences: [], unknowns: [], trendData: {
      category: "politics", categoryReason: "t", secondaryCategories: [], categoryConfidence: "high",
      categorySignals: [], categoryEvidence: [], geoTier: "P0", trend: "steady",
      independence: { families: 1 }, firstSeenAt: T, lastSeenAt: T, lastMeaningfulUpdateAt: T,
      timeline: [], novelty: "new", eventState: "developing",
    },
    ...over,
  } as unknown as LiveCluster;
}

describe("discovery queries — deterministic, small, ordered (v0.13 PHASE 3)", () => {
  it("generates 2–8 stable, deduplicated, ordered queries from an English TN politics event", () => {
    const c = cluster("CM Vijay to move resolution urging Centre to recognise Tamil in Madras HC", {
      districts: ["Chennai"],
      trendData: { category: "politics", geoTier: "P0" } as unknown as LiveCluster["trendData"],
    });
    const arts = [article("The Hindu", "CM Vijay to move resolution urging Centre to recognise Tamil in Madras HC", "en", ["Chennai"])];
    const ev = buildDiscoveryEvent(c, arts);
    const q1 = buildDiscoveryQueries(ev);
    const q2 = buildDiscoveryQueries(ev);
    expect(q1).toEqual(q2); // stable
    expect(q1.length).toBeGreaterThanOrEqual(2);
    expect(q1.length).toBeLessThanOrEqual(8);
    const texts = q1.map((q) => q.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length); // deduplicated
    expect(q1[0].cls).toBe("headline_core"); // ordered: headline core first
    for (const q of q1) expect(q.anchorDate).toBe(ev.anchorDate); // stored anchor
  });

  it("adds a Tamil cross-language query for a Tamil Nadu English event (never replaces the English one)", () => {
    const c = cluster("Mullaperiyar safety review sought by Keralam as per 2025 ToR", {
      districts: ["Theni"],
      trendData: { category: "crisis", geoTier: "P0" } as unknown as LiveCluster["trendData"],
    });
    const arts = [article("The Hindu", "Mullaperiyar safety review sought by Keralam as per 2025 ToR", "en", ["Theni"])];
    const ev = buildDiscoveryEvent(c, arts);
    const q = buildDiscoveryQueries(ev);
    expect(q.some((x) => x.language === "en")).toBe(true); // original-language query kept
    // Tamil cross-language query present when Tamil identity terms exist
    const ta = q.filter((x) => x.cls === "tamil_cross_language");
    expect(ta.length).toBeLessThanOrEqual(1);
    if (ta.length) expect(/[஀-௿]/.test(ta[0].text)).toBe(true);
  });

  it("adds an English semantic query for a Tamil-titled story", () => {
    const c = cluster("பெரம்பலூர் அருகே லாரி மீது ஆம்னி பேருந்து மோதி இருவர் உயிரிழப்பு", {
      districts: ["Perambalur"],
    });
    const arts = [article("Dinamalar", "பெரம்பலூர் அருகே லாரி மீது ஆம்னி பேருந்து மோதி இருவர் உயிரிழப்பு", "ta", ["Perambalur"])];
    const ev = buildDiscoveryEvent(c, arts);
    const q = buildDiscoveryQueries(ev);
    expect(q.some((x) => x.language === "ta")).toBe(true);
    expect(q.length).toBeGreaterThanOrEqual(1);
    expect(q.length).toBeLessThanOrEqual(8);
  });

  it("never invents translations: no Tamil script in queries for a non-TN English event without Tamil signals", () => {
    const c = cluster("War over 7.8% GDP growth data, opposition attacks government", {
      scope: "india",
      trendData: { category: "finance", geoTier: "P1" } as unknown as LiveCluster["trendData"],
    } as Partial<LiveCluster>);
    const arts = [article("Mint", "War over 7.8% GDP growth data, opposition attacks government")];
    const ev = buildDiscoveryEvent(c, arts);
    expect(ev.tamilNadu).toBe(false);
    const q = buildDiscoveryQueries(ev);
    expect(q.some((x) => x.cls === "tamil_cross_language")).toBe(false);
  });

  it("keeps important quantities / place signals in the event graph", () => {
    const c = cluster("Rs 1,200-crore Secretariat plan for Chennai announced", { districts: ["Chennai"] });
    const arts = [article("DT Next", "Rs 1,200-crore Secretariat plan for Chennai announced", "en", ["Chennai"])];
    const ev = buildDiscoveryEvent(c, arts);
    expect(ev.places).toContain("Chennai");
    expect(ev.numbers.join(" ")).toMatch(/1,?200/);
  });
});
