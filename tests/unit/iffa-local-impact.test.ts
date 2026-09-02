import { describe, it, expect } from "vitest";
import { assessLocalImpact } from "@/lib/domain/local-impact";
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
function art(title: string, excerpt = ""): LiveArticle {
  return { id: "a", title, excerpt, url: "https://x.ex/a", sourceId: "s", sourceName: "S", publisher: "S",
    role: "independent", sourceUrl: "https://x.ex", publishedAt: "2026-09-02T08:00:00Z",
    fetchedAt: "2026-09-02T09:00:00Z", language: "en", scope: "tamil-nadu", districts: [],
    geo: {} as LiveArticle["geo"], evidenceRole: "independent-report", verificationStatus: "single-source",
    crisisPriority: 30, isCrisis: false, lifecycle: "developing" } as LiveArticle;
}

describe("IFFA local-impact model (v0.9 Phase K/L)", () => {
  it("reads a real impact statement: what fell on what, where", () => {
    const li = assessLocalImpact(
      cluster({ title: "Heavy rain in Cuddalore", districts: ["Cuddalore"] }),
      [art("Schools closed in Cuddalore as heavy rain floods low-lying areas",
           "The district administration declared a holiday for schools. Bus services were suspended on several routes.")],
    );
    expect(li.impactKinds).toContain("closure");
    expect(li.affectedInfrastructure).toContain("schools / education");
    expect(li.affectedInfrastructure).toContain("bus services");
    expect(li.affectedDistricts).toContain("Cuddalore");
    expect(li.statements.length).toBeGreaterThan(0);
  });

  it("does not treat a personnel action as an infrastructure closure", () => {
    const li = assessLocalImpact(
      cluster({ title: "Aided school headmaster from Madurai suspended over administrative lapses" }),
      [art("Aided school headmaster from Madurai suspended over administrative lapses",
           "The headmaster was placed under suspension pending an inquiry.")],
    );
    expect(li.statements).toHaveLength(0);
    expect(li.scale).toBe("none");
  });

  it("does not invent impact for an announcement or a court direction", () => {
    const li = assessLocalImpact(
      cluster({ title: "CM announces funds for road repairs across urban local bodies" }),
      [art("CM announces ₹1,850 crore for road repairs in Chennai and other urban areas",
           "The Chief Minister said the works would also cover drinking water supply improvements.")],
    );
    expect(li.statements).toHaveLength(0);
  });

  it("does not record a restriction that a court has struck down", () => {
    const li = assessLocalImpact(
      cluster({ title: "Court lifts vehicle ban at Vellore court complex" }),
      [art("District judge withdraws the order prohibiting litigants' vehicles inside the court complex in Vellore", "")],
    );
    expect(li.impactKinds).not.toContain("restriction");
  });

  it("derives scale from the spread of demonstrated impact, not a warning polygon", () => {
    // a CAP-style alert that lists 12 districts but reports nothing actually hit
    const li = assessLocalImpact(
      cluster({
        title: "Thunderstorm with lightning warning",
        districts: ["Ariyalur", "Chengalpattu", "Cuddalore", "Dharmapuri", "Dindigul", "Erode",
                    "Kanchipuram", "Madurai", "Perambalur", "Salem", "Thanjavur", "Vellore"],
      }),
      [art("Thunderstorm with lightning warning for 12 districts", "")],
    );
    expect(li.scale).toBe("none");
    expect(li.affectedDistricts).toHaveLength(0);
  });

  it("marks a genuinely multi-district disruption as such", () => {
    const li = assessLocalImpact(
      cluster({ title: "Rain disrupts train services", districts: ["Chennai", "Tiruvallur"] }),
      [art("Suburban train services disrupted in Chennai and Tiruvallur after tracks are inundated",
           "EMU services came to a halt on the western line. Relief camps were opened in three low-lying wards.")],
    );
    expect(li.impactKinds).toEqual(expect.arrayContaining(["disruption", "displacement"]));
    expect(li.affectedDistricts).toEqual(expect.arrayContaining(["Chennai", "Tiruvallur"]));
    expect(li.scale).toBe("multi-district");
  });

  it("captures a named institution named as affected", () => {
    const li = assessLocalImpact(
      cluster({ title: "Wall collapses at Chennai Central Railway Station" }),
      [art("A portion of the roof collapsed at Chennai Central Railway Station, disrupting movement", "")],
    );
    expect(li.affectedInstitutions.join(" ")).toMatch(/Railway Station/);
    expect(li.impactKinds).toContain("damage");
  });

  it("returns the empty shape when nothing local is affected", () => {
    const li = assessLocalImpact(
      cluster({ title: "Tamil Nadu Ranji pre-season camp from September 3" }),
      [art("Tamil Nadu Ranji pre-season camp from September 3", "The 20-member squad will assemble in Chennai.")],
    );
    expect(li.scale).toBe("none");
    expect(li.statements).toHaveLength(0);
    expect(li.impactKinds).toHaveLength(0);
  });
});
