import { describe, it, expect } from "vitest";
import { assessPoliticalCoverage } from "@/lib/domain/political-coverage";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";

function cluster(over: Partial<LiveCluster>): LiveCluster {
  return {
    id: "c", slug: "c", title: over.title ?? "t", scope: "tamil-nadu", districts: [], isCrisis: false,
    crisisPriority: 20, lifecycle: "developing", updatedAt: "2026-09-02T09:00:00Z", languages: ["en"],
    articleIds: [], distinctPublishers: 1, publishers: ["A"], sourceCount: 1, officialCount: 0,
    independentCount: 1, verificationStatus: "single-source", confidence: "weak", reason: "",
    isVerifiedComparison: false, commonGround: [], commonGroundPending: true, differences: [], unknowns: [],
    ...over,
  } as LiveCluster;
}
function art(title: string, evidenceRole: LiveArticle["evidenceRole"] = "independent-report"): LiveArticle {
  return { id: "a" + Math.random(), title, excerpt: "", url: "https://x.ex/a", sourceId: "s", sourceName: "S",
    publisher: "S", role: "independent", sourceUrl: "https://x.ex", publishedAt: "2026-09-02T08:00:00Z",
    fetchedAt: "2026-09-02T09:00:00Z", language: "en", scope: "tamil-nadu", districts: [],
    geo: {} as LiveArticle["geo"], evidenceRole, verificationStatus: "single-source",
    crisisPriority: 20, isCrisis: false, lifecycle: "developing" } as LiveArticle;
}

describe("IFFA political coverage description (v0.9 Phase N)", () => {
  it("flags an allegation with no response on record as unanswered / one-sided", () => {
    const pc = assessPoliticalCoverage(
      cluster({ title: "Opposition alleges ₹500 crore irregularity in housing scheme" }),
      [art("BJP alleges ₹500 crore irregularity in Tamil Nadu housing scheme")],
    );
    expect(pc.speechAct).toBe("allegation");
    expect(pc.unanswered).toBe(true);
    expect(pc.note).toMatch(/no response on record/i);
  });

  it("is not unanswered when a denial is threaded to the event", () => {
    const c = cluster({ title: "Opposition alleges irregularity in housing scheme" });
    c.trendData = { politicalThread: { links: [{ slug: "denial", relation: "denies", headline: "Govt denies charge" }] } } as LiveCluster["trendData"];
    const pc = assessPoliticalCoverage(c, [art("Opposition alleges irregularity in housing scheme")]);
    expect(pc.hasResponse).toBe(true);
    expect(pc.unanswered).toBe(false);
  });

  it("records a denial in the same cluster as a response", () => {
    const pc = assessPoliticalCoverage(
      cluster({ title: "Minister denies the corruption charge, calls it politically motivated" }),
      [art("Minister denies the corruption charge, calls it politically motivated")],
    );
    expect(pc.hasResponse).toBe(true);
    expect(pc.unanswered).toBe(false);
  });

  it("notes when an official record is present", () => {
    const pc = assessPoliticalCoverage(
      cluster({ title: "Assembly passes the wetland protection Bill" }),
      [art("Assembly passes the wetland protection Bill", "government-statement")],
    );
    expect(pc.hasOfficialRecord).toBe(true);
    expect(pc.note).toMatch(/official record cited/i);
  });

  it("reports the independent source family count, not a bias axis", () => {
    const c = cluster({ title: "CM announces new housing programme" });
    c.trendData = { independence: { families: 4, reports: 6, syndicated: 0, wireCredits: [], label: "" } } as LiveCluster["trendData"];
    const pc = assessPoliticalCoverage(c, [art("CM announces new housing programme")]);
    expect(pc.independentFamilies).toBe(4);
    expect(JSON.stringify(pc)).not.toMatch(/left|right|pro-|anti-|bias/i);
  });
});
