import { describe, it, expect } from "vitest";
import { assessSeverity, SEVERITY_RANK } from "@/lib/domain/severity";
import { normalizeItem } from "@/lib/live/normalize";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";

const NOW = Date.parse("2026-09-02T12:00:00Z");
function feed(o: Partial<FeedSource>): FeedSource {
  return { id: "f", name: "F", publisher: "F", homepage: "https://f.ex", url: "https://f.ex/r", kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en", focus: "tamil-nadu", role: "independent", enabled: true, ...o };
}
function art(title: string, excerpt?: string): LiveArticle {
  return normalizeItem(feed({ id: "a", publisher: "A" }), { title, link: "https://x.ex/a", guid: "a", published: new Date(NOW - 3600_000).toISOString(), summary: excerpt ?? title }, new Date(NOW).toISOString(), NOW).article!;
}
function crisis(over: Partial<LiveCluster> = {}): LiveCluster {
  return {
    id: "c", slug: "c", title: "t", scope: "tamil-nadu", districts: [], isCrisis: true, crisisPriority: 50,
    lifecycle: "active", updatedAt: new Date(NOW).toISOString(), languages: ["en"], articleIds: [], distinctPublishers: 1,
    publishers: ["A"], sourceCount: 1, officialCount: 0, independentCount: 1, verificationStatus: "single-source",
    confidence: "weak", reason: "", isVerifiedComparison: false, commonGround: [], commonGroundPending: true,
    differences: [], unknowns: [], ...over,
  } as LiveCluster;
}

describe("IFFA event severity (v0.8 Phase G)", () => {
  it("a non-crisis event is informational", () => {
    expect(assessSeverity(crisis({ isCrisis: false }), [art("Assembly debates a new policy")]).severity).toBe("informational");
  });

  it("a forecast with no impact is informational or watch", () => {
    const s = assessSeverity(crisis(), [art("Heavy rain likely over Tamil Nadu coast tomorrow, IMD forecast")]);
    expect(["informational", "watch"]).toContain(s.severity);
  });

  it("a warning in effect with no confirmed impact is a watch", () => {
    const s = assessSeverity(crisis({ cap: { severity: "Moderate" } as LiveCluster["cap"] }), [art("Orange alert issued for Chennai; IMD warns of heavy rain")]);
    expect(SEVERITY_RANK[s.severity]).toBeGreaterThanOrEqual(SEVERITY_RANK.watch);
  });

  it("confirmed flooding / disruption is at least significant", () => {
    const s = assessSeverity(crisis({ districts: ["Cuddalore"] }), [art("Cuddalore roads flooded; schools closed, train services suspended")]);
    expect(SEVERITY_RANK[s.severity]).toBeGreaterThanOrEqual(SEVERITY_RANK.significant);
  });

  it("multiple deaths → severe", () => {
    const s = assessSeverity(crisis({ districts: ["Nilgiris"] }), [art("Nilgiris bus accident: 4 killed, 20 injured")]);
    expect(s.severity).toBe("severe");
    expect(s.peak.deaths).toBe(4);
  });

  it("mass casualties → critical", () => {
    const s = assessSeverity(crisis({ districts: ["Chennai", "Chengalpattu", "Kanchipuram"] }), [art("Chennai floods: 12 dead, over 8,000 people evacuated to relief camps")]);
    expect(s.severity).toBe("critical");
  });

  it("severity is not a probability of truth — a single unverified report can still be Severe by impact", () => {
    const s = assessSeverity(crisis(), [art("10 feared dead as boat capsizes off Nagapattinam, says local report")]);
    expect(SEVERITY_RANK[s.severity]).toBeGreaterThanOrEqual(SEVERITY_RANK.severe);
  });
});
