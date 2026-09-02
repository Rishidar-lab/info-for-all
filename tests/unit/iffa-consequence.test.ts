import { describe, it, expect } from "vitest";
import { assessConsequence } from "@/lib/domain/consequence";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";

function cluster(over: Partial<LiveCluster>): LiveCluster {
  return {
    id: "c", slug: "c", title: over.title ?? "t", scope: "tamil-nadu", districts: [], isCrisis: false,
    crisisPriority: 30, lifecycle: "developing", updatedAt: "2026-09-02T09:00:00Z", languages: ["en"],
    articleIds: [], distinctPublishers: 1, publishers: ["A"], sourceCount: 1, officialCount: 0,
    independentCount: 1, verificationStatus: "single-source", confidence: "weak", reason: "",
    isVerifiedComparison: false, commonGround: [], commonGroundPending: true, differences: [], unknowns: [],
    ...over,
  } as LiveCluster;
}
function art(title: string, excerpt = "", evidenceRole: LiveArticle["evidenceRole"] = "independent-report"): LiveArticle {
  return { id: "a", title, excerpt, url: "https://x.ex/a", sourceId: "s", sourceName: "S", publisher: "S",
    role: "independent", sourceUrl: "https://x.ex", publishedAt: "2026-09-02T08:00:00Z",
    fetchedAt: "2026-09-02T09:00:00Z", language: "en", scope: "tamil-nadu", districts: [],
    geo: {} as LiveArticle["geo"], evidenceRole, verificationStatus: "single-source",
    crisisPriority: 30, isCrisis: false, lifecycle: "developing" } as LiveArticle;
}

describe("IFFA consequence model (v0.9 Phase I)", () => {
  it("a statewide cyclone warning outranks a lurid single-victim crime", () => {
    const cyclone = assessConsequence(
      cluster({ title: "Cyclone warning", districts: ["Nagapattinam", "Cuddalore", "Mayiladuthurai", "Thanjavur"], isCrisis: true }),
      [art("Cyclone alert for four coastal districts; evacuation ordered, relief camps opened",
           "Schools closed. Fishermen advised not to venture to sea. NDRF teams deployed.", "official-alert")],
    );
    const crime = assessConsequence(
      cluster({ title: "Brutal murder", districts: ["Chennai"] }),
      [art("Gruesome, chilling murder: woman's body found hacked in Chennai flat", "Police said the horrific killing was over a property dispute.")],
    );
    expect(cyclone.score).toBeGreaterThan(0.7);
    expect(crime.score).toBeLessThan(0.3);
    expect(crime.isolatedIncident).toBe(true);
    expect(cyclone.score).toBeGreaterThan(crime.score + 0.4);
  });

  it("emotional-intensity words carry no weight", () => {
    const plain = assessConsequence(
      cluster({ title: "Murder reported in Salem" }),
      [art("Murder reported in Salem; one arrested")],
    );
    const lurid = assessConsequence(
      cluster({ title: "Horrific, gruesome, chilling murder in Salem" }),
      [art("Horrific, gruesome, chilling murder in Salem; one arrested in the brutal killing")],
    );
    expect(lurid.score).toBeCloseTo(plain.score, 5);
    expect(lurid.isolatedIncident).toBe(true);
  });

  it("counts deaths, scaling with the number reported", () => {
    const one = assessConsequence(cluster({ title: "1 killed in wall collapse", districts: ["Madurai"] }), [art("1 killed in wall collapse in Madurai")]);
    const many = assessConsequence(cluster({ title: "12 killed in wall collapse", districts: ["Madurai"] }), [art("12 killed in wall collapse in Madurai")]);
    expect(many.score).toBeGreaterThan(one.score);
  });

  it("recognises service disruption and official emergency action", () => {
    const c = assessConsequence(
      cluster({ title: "Heavy rain hits Chennai", districts: ["Chennai", "Chengalpattu"], isCrisis: true }),
      [art("Chennai schools closed, suburban train services suspended; Section 144 imposed near the marina",
           "The Corporation declared a holiday. Power supply was cut in several areas as a precaution.")],
    );
    const names = c.signals.map((s) => s.name);
    expect(names).toContain("serviceDisruption");
    expect(names).toContain("officialEmergencyAction");
    expect(c.score).toBeGreaterThan(0.6);
  });

  it("a single district is not 'scale'", () => {
    const c = assessConsequence(cluster({ title: "Protest in Tiruchi", districts: ["Tiruchirappalli"] }), [art("Protest in Tiruchi over water")]);
    expect(c.signals.map((s) => s.name)).not.toContain("scale");
  });

  it("communal violence / a riot is NOT an isolated incident", () => {
    const c = assessConsequence(
      cluster({ title: "Communal clash in Coimbatore", districts: ["Coimbatore"] }),
      [art("Communal violence in Coimbatore leaves 4 injured; mob torches shops, Section 144 imposed")],
    );
    expect(c.isolatedIncident).toBe(false);
  });

  it("gives legal / electoral weight to a court ruling", () => {
    const c = assessConsequence(
      cluster({ title: "SC verdict on TN quarry leases" }),
      [art("Supreme Court sets aside High Court order on Tamil Nadu quarry leases")],
    );
    expect(c.signals.map((s) => s.name)).toContain("legalElectoralWeight");
  });
});
