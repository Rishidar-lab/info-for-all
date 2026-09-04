import { describe, it, expect } from "vitest";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { normalizeItem } from "@/lib/live/normalize";
import type { FeedSource } from "@/data/feeds";
import { discoverForCluster, discoveryEligibility } from "@/lib/discovery/pipeline";
import { mockProvider } from "@/lib/discovery/providers/mock";
import { computeDiscoveryMetrics } from "@/lib/discovery/metrics";

const NOW = Date.parse("2026-09-03T12:00:00Z");
const T = "2026-09-03T08:00:00.000Z";

function feed(pub: string): FeedSource {
  return { id: pub, name: pub, publisher: pub, homepage: "https://ex.test", url: "https://ex.test/r", kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en", focus: "tamil-nadu", role: "independent", enabled: true };
}
function art(pub: string, title: string, excerpt: string): LiveArticle {
  const a = normalizeItem(feed(pub), { title, link: "https://ex.test/" + encodeURIComponent(pub + title.slice(0, 20)), guid: pub + ":" + title, published: T, summary: excerpt }, T, NOW).article!;
  a.excerpt = excerpt; return a;
}
function cl(slug: string, title: string): LiveCluster {
  return {
    id: slug, slug, title, scope: "tamil-nadu", districts: ["Chennai"],
    crisisType: undefined, isCrisis: false, crisisPriority: 10, lifecycle: "developing",
    updatedAt: T, languages: ["en"], articleIds: ["s1"], distinctPublishers: 1,
    publishers: ["The Hindu"], sourceCount: 1, officialCount: 0, independentCount: 1,
    verificationStatus: "single-source", confidence: "weak", reason: "Single report.",
    isVerifiedComparison: false, commonGround: [], commonGroundPending: true,
    differences: [], unknowns: [],
    trendData: { category: "politics", geoTier: "P0", firstSeenAt: T, editorial: { band: "lead" } } as unknown as LiveCluster["trendData"],
  } as unknown as LiveCluster;
}

describe("discovery pipeline — mock provider end to end (v0.13 PHASE 6/9)", () => {
  it("rescues a single-family story with a genuinely independent mock candidate", async () => {
    const cluster = cl("mock-slug-aaaaaa", "CM Vijay to move resolution urging Centre on Tamil in Madras HC");
    const seed = [art("The Hindu", "CM Vijay to move resolution urging Centre on Tamil in Madras HC", "Vijay said the assembly will move a resolution urging the Centre to allow Tamil in the Madras High Court.")];
    const mock = mockProvider({
      "mock-slug-aaaaaa": [{
        url: "https://indianexpress.com/article/india/vijay-resolution-madras-hc-tamil",
        title: "Vijay: assembly to urge Centre for Tamil in Madras high court",
        source: "The Indian Express",
        publishedAt: "2026-09-03T09:00:00.000Z",
        language: "en",
        snippet: "The chief minister said a resolution will be moved in the assembly urging the Centre.",
      }],
    });
    const d = await discoverForCluster(cluster, seed, [], [mock], { now: NOW, familiesBefore: 1, force: true });
    expect(d.attempted).toBe(true);
    expect(d.candidatesFound).toBe(1);
    expect(d.reports.filter((r) => r.sourceType === "independent")).toHaveLength(1);
    expect(d.rescued).toBe(true);
    expect(d.familiesAfter).toBe(2);
    // provenance: every discovered record carries provider + query + timestamp
    expect(d.reports[0].provider).toBe("mock");
    expect(d.reports[0].query.length).toBeGreaterThan(0);
    expect(d.reports[0].discoveredAt.length).toBeGreaterThan(0);
  });

  it("UNCERTAIN candidates never join the cluster (kept separate in rejected)", async () => {
    const cluster = cl("mock-slug-bbbbbb", "PWD to tighten safety at construction sites in Kerala");
    const seed = [art("The Hindu", "PWD to tighten safety at construction sites in Kerala", "The public works department decided to tighten safety measures.")];
    const mock = mockProvider({
      "mock-slug-bbbbbb": [{
        url: "https://other.test/vague-panel",
        title: "Construction safety norms under review, says panel",
        source: "The Indian Express",
        snippet: "A panel is reviewing construction safety norms.",
      }],
    });
    const d = await discoverForCluster(cluster, seed, [], [mock], { now: NOW, familiesBefore: 1, force: true });
    expect(d.attempted).toBe(true);
    expect(d.reports.filter((r) => r.sourceType === "independent")).toHaveLength(0);
    expect(d.rescued).toBe(false);
  });

  it("skips multi-family stories unless forced", () => {
    const cluster = cl("mock-slug-cccccc", "Some multi-source story");
    expect(discoveryEligibility(cluster, { now: NOW, familiesBefore: 2 }).eligible).toBe(false);
    expect(discoveryEligibility(cluster, { now: NOW, familiesBefore: 2, force: true }).eligible).toBe(true);
  });

  it("metrics separate candidates / same-event / independent / rescued (no single misleading score)", () => {
    const m = computeDiscoveryMetrics({
      familiesBeforeByCluster: { a: 1, b: 1, c: 2 },
      discoveries: [
        { slug: "a", generatedAt: new Date(NOW).toISOString(), attempted: true, queriesRun: 3, providersRun: ["mock"], candidatesFound: 2, candidatesAdmitted: 1, candidatesRejected: 1, reports: [{ sourceType: "independent" } as never], rejected: [], familiesBefore: 1, familiesAfter: 2, rescued: true, rescueLanguages: ["en->en"], notes: [] },
        { slug: "b", generatedAt: new Date(NOW).toISOString(), attempted: true, queriesRun: 3, providersRun: ["mock"], candidatesFound: 1, candidatesAdmitted: 0, candidatesRejected: 1, reports: [], rejected: [{ stage: "identity", verdict: "UNCERTAIN" } as never], familiesBefore: 1, familiesAfter: 1, rescued: false, rescueLanguages: [], notes: [] },
      ],
    });
    expect(m.singleSourceCandidates).toBe(2);
    expect(m.discoveryAttempted).toBe(2);
    expect(m.candidateArticlesFound).toBe(3);
    expect(m.independentCandidates).toBe(1);
    expect(m.rescuedClusters).toBe(1);
    expect(m.uncertainCandidates).toBe(1);
  });
});
