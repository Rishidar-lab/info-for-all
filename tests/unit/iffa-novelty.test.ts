import { describe, it, expect } from "vitest";
import { normalizeItem } from "@/lib/live/normalize";
import { assessNovelty, buildEventState, classifyUpdateSignificance } from "@/lib/trends/novelty";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";

const NOW = Date.parse("2026-09-02T12:00:00Z");
const at = (h: number) => new Date(NOW - h * 3600_000).toISOString();

function feed(o: Partial<FeedSource>): FeedSource {
  return {
    id: "f", name: "F", publisher: "F", homepage: "https://f.example", url: "https://f.example/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "tamil-nadu", role: "independent", enabled: true, ...o,
  };
}
function mk(o: { publisher: string; title: string; hoursAgo: number; excerpt?: string; official?: boolean }): LiveArticle {
  const slug = (o.publisher + o.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 44);
  return normalizeItem(
    feed({
      id: slug, publisher: o.publisher,
      official: o.official ?? false, role: o.official ? "official" : "independent",
      defaultEvidenceRole: o.official ? "government-statement" : "independent-report",
    }),
    { title: o.title, link: `https://x.ex/${slug}`, guid: slug, published: at(o.hoursAgo), summary: o.excerpt ?? o.title },
    at(0), NOW,
  ).article!;
}
function cluster(over: Partial<LiveCluster>): LiveCluster {
  return {
    id: "c", slug: "c", title: "t", scope: "tamil-nadu", districts: [], isCrisis: false,
    crisisPriority: 30, lifecycle: "developing", updatedAt: at(1), languages: ["en"], articleIds: [],
    distinctPublishers: 1, publishers: ["A"], sourceCount: 1, officialCount: 0, independentCount: 1,
    verificationStatus: "single-source", confidence: "weak", reason: "", isVerifiedComparison: false,
    commonGround: [], commonGroundPending: true, differences: [], unknowns: [],
    ...over,
  } as LiveCluster;
}

describe("IFFA claim-aware novelty v2 (v0.8 Phase D)", () => {
  it("no previous snapshot at all → unknown, honestly", () => {
    const r = assessNovelty(cluster({}), [mk({ publisher: "A", title: "Heavy rain in Chennai", hoursAgo: 1 })], undefined, false);
    expect(r.noveltyClass).toBe("unknown");
  });

  it("no matched prior cluster → new-event / major-development", () => {
    const r = assessNovelty(cluster({}), [mk({ publisher: "A", title: "Fire at Ambattur factory", hoursAgo: 1 })], undefined, true, NOW);
    expect(r.noveltyClass).toBe("new-event");
    expect(r.updateKind).toBe("major-development");
  });

  it("a fresh report with no new fact is 'more-of-same' / rephrasing or duplicate", () => {
    const arts = [mk({ publisher: "A", title: "Cuddalore rain: schools closed", hoursAgo: 6 })];
    const prev = cluster({ articleIds: ["x"], updatedAt: at(5.9), trendData: { lastSeenAt: at(5.9) } });
    const now = cluster({ articleIds: ["x"] });
    // the only article predates the prior snapshot's lastSeen → no fresh
    const r = assessNovelty(now, arts, prev, true);
    expect(r.noveltyClass).toBe("more-of-same");
    expect(["duplicate", "rephrasing", "minor-detail"]).toContain(r.updateKind);
    expect(r.meaningfulUpdateScore).toBeLessThan(0.35);
  });

  it("a fresh official confirmation is a meaningful update", () => {
    const arts = [
      mk({ publisher: "A", title: "Reports of a wall collapse in Salem", hoursAgo: 6 }),
      mk({ publisher: "District Administration", title: "Salem Collector confirms wall collapse; 2 dead, rescue on", hoursAgo: 0.5, official: true, excerpt: "The Collector confirmed two deaths." }),
    ];
    const prev = cluster({ articleIds: ["x"], officialCount: 0, updatedAt: at(5.5), trendData: { lastSeenAt: at(5.5) } });
    const now = cluster({ articleIds: ["x", "y"], districts: ["Salem"], officialCount: 1 });
    const r = assessNovelty(now, arts, prev, true);
    expect(r.noveltyClass).toBe("new-fact");
    expect(r.meaningfulUpdateScore).toBeGreaterThan(0.6);
    expect(r.changes.join(" ")).toMatch(/official|figure|area/i);
  });

  it("a fresh 'revised toll' report is a correction", () => {
    const arts = [
      mk({ publisher: "A", title: "7 feared dead in the Nilgiris bus accident", hoursAgo: 8 }),
      mk({ publisher: "B", title: "Nilgiris bus accident: officials revise death toll from 7 to 4", hoursAgo: 0.5 }),
    ];
    const prev = cluster({ articleIds: ["x"], updatedAt: at(7.5), trendData: { lastSeenAt: at(7.5) } });
    const r = assessNovelty(cluster({ articleIds: ["x", "y"] }), arts, prev, true);
    expect(r.noveltyClass).toBe("correction");
    expect(r.updateKind).toBe("correction");
  });

  it("buildEventState summarises the current state", () => {
    const s = buildEventState(
      cluster({ districts: ["Chennai", "Chengalpattu"], commonGround: ["IMD orange alert active"], unknowns: ["Casualty figures not established"] }),
      [mk({ publisher: "A", title: "Chennai floods: 120 mm rain, 3 dead", hoursAgo: 1 })],
      at(1),
    );
    expect(s.affectedLocations).toEqual(["Chennai", "Chengalpattu"]);
    expect(s.unresolvedQuestions.length).toBe(1);
    expect(s.openQuestions).toEqual(s.unresolvedQuestions);
    expect(s.latestNumbers.length).toBeGreaterThan(0);
  });
});

describe("IFFA update significance (v0.9 Phase E)", () => {
  it("maps update kinds to a development band, not an importance score", () => {
    expect(classifyUpdateSignificance("retraction", 0.95)).toBe("critical");
    expect(classifyUpdateSignificance("major-development", 0.9, { severeEvent: true })).toBe("critical");
    expect(classifyUpdateSignificance("major-development", 0.9)).toBe("major");
    expect(classifyUpdateSignificance("new-official-confirmation", 0.85)).toBe("major");
    expect(classifyUpdateSignificance("new-number", 0.72)).toBe("major");
    expect(classifyUpdateSignificance("new-source-only", 0.3)).toBe("minor");
    expect(classifyUpdateSignificance("rephrasing", 0.15)).toBe("none");
    expect(classifyUpdateSignificance("duplicate", 0.1)).toBe("none");
  });

  it("a correction that overturns a previously-official fact is CRITICAL", () => {
    expect(classifyUpdateSignificance("correction", 0.9, { overturnsPriorFact: true })).toBe("critical");
    expect(classifyUpdateSignificance("correction", 0.9)).toBe("major");
  });

  it("assessNovelty attaches updateSignificance + whatChangedSincePreviousSnapshot", () => {
    const arts = [
      mk({ publisher: "A", title: "Reports of a wall collapse in Salem", hoursAgo: 6 }),
      mk({ publisher: "District Administration", title: "Salem Collector confirms wall collapse; 2 dead", hoursAgo: 0.5, official: true, excerpt: "Two deaths confirmed." }),
    ];
    const prev = cluster({ articleIds: ["x"], officialCount: 0, updatedAt: at(5.5), trendData: { lastSeenAt: at(5.5) } });
    const now = cluster({ articleIds: ["x", "y"], districts: ["Salem"], officialCount: 1 });
    const r = assessNovelty(now, arts, prev, true);
    expect(["meaningful", "major", "critical"]).toContain(r.updateSignificance);
    expect(r.whatChangedSincePreviousSnapshot).toEqual(r.changes);
  });

  it("a quiet duplicate is NONE significance", () => {
    const arts = [mk({ publisher: "A", title: "Cuddalore rain: schools closed", hoursAgo: 6 })];
    const prev = cluster({ articleIds: ["x"], updatedAt: at(5.9), trendData: { lastSeenAt: at(5.9) } });
    const r = assessNovelty(cluster({ articleIds: ["x"] }), arts, prev, true);
    expect(r.updateSignificance).toBe("none");
  });
});
