import { describe, it, expect } from "vitest";
import type { Claim } from "@/lib/claims/types";
import type { PrimaryRecord } from "@/lib/research/types";
import { matchClaimToRecord } from "@/lib/research/match";
import { buildResearchQuery } from "@/lib/research/query";

function claim(o: Partial<Claim> & { canonicalText: string }): Claim {
  return {
    id: o.id ?? "c1",
    eventId: "e",
    canonicalText: o.canonicalText,
    type: o.type ?? "event",
    status: o.status ?? "single-source",
    subjects: o.subjects ?? [],
    predicates: o.predicates ?? [],
    objects: o.objects ?? [],
    supportingArticleIds: [],
    contradictingArticleIds: [],
    supportingPublisherIds: [],
    independentSourceGroups: [],
    primaryEvidenceIds: [],
    confidence: 50,
    confidenceBand: "low",
    rationale: [],
    firstSeenAt: "2026-09-03T06:00:00.000Z",
    lastSeenAt: "2026-09-03T06:00:00.000Z",
    provenance: [],
    updates: [],
    corrections: [],
    notes: [],
  } as Claim;
}
function rec(o: Partial<PrimaryRecord> & { authority: string; title: string; text: string }): PrimaryRecord {
  return {
    id: "r1",
    adapter: "corpus_official",
    tier: "primary_official",
    authority: o.authority,
    title: o.title,
    text: o.text,
    bodyAvailable: o.bodyAvailable ?? true,
    publishedAt: "2026-09-03T05:00:00.000Z",
    url: "https://ex.test/r",
    sha256: "x",
    fetchedAt: "2026-09-03T09:00:00.000Z",
    requiresOcr: o.requiresOcr,
    ocrConfidence: o.ocrConfidence ?? null,
  };
}

describe("matchClaimToRecord (§B.2.3)", () => {
  it("rejects a domain-incompatible record (court claim vs an RBI release)", () => {
    const c = claim({ canonicalText: "Delhi High Court issues notice on a plea seeking a policy for women", subjects: ["Delhi High Court"] });
    const q = buildResearchQuery(c, c.canonicalText);
    const r = rec({ authority: "Reserve Bank of India", title: "RBI to conduct VRRR auction", text: "The Reserve Bank of India will conduct a variable rate reverse repo auction under the LAF on September 04." });
    expect(matchClaimToRecord(c, q, r).outcome).toBe("not_found");
  });

  it("rejects a record that shares only generic government vocabulary", () => {
    const c = claim({ canonicalText: "The Centre to test green crackers ahead of Deepavali", subjects: ["Centre"] });
    const q = buildResearchQuery(c, c.canonicalText);
    const r = rec({ authority: "Press Information Bureau", title: "Government reviews railway safety measures", text: "The government today held a review meeting on railway safety and signalling. The minister directed action." });
    expect(matchClaimToRecord(c, q, r).outcome).toBe("not_found");
  });

  it("corroborates when a specific name, the action and the figures all match", () => {
    const c = claim({
      canonicalText: "About 200 people were moved to relief camps in Cuddalore",
      subjects: ["Cuddalore"],
      objects: ["200"],
      predicates: ["rescued"],
    });
    const q = buildResearchQuery(c, "Flood relief in Cuddalore");
    const r = rec({
      authority: "NDMA SACHET",
      title: "Flood — Cuddalore district of Tamil Nadu",
      text: "Flood alert for Cuddalore district of Tamil Nadu. About 200 people were moved to relief camps as a precaution, the district administration said.",
    });
    const m = matchClaimToRecord(c, q, r);
    expect(m.outcome).toBe("corroborated");
    expect(m.locator).toBeDefined();
  });

  it("flags a CONTRADICTION when the record states a different figure for the same unit", () => {
    const c = claim({ canonicalText: "7 people died in the wall collapse in Chennai", subjects: ["Chennai"], objects: ["7"] });
    const q = buildResearchQuery(c, "Wall collapse in Chennai");
    const r = rec({
      authority: "Greater Chennai Corporation",
      title: "Statement on the Chennai wall collapse",
      text: "The Greater Chennai Corporation confirmed that 4 people died when a compound wall collapsed in Chennai on Wednesday. Rescue work is complete.",
    });
    const m = matchClaimToRecord(c, q, r);
    expect(m.outcome).toBe("contradicted");
    expect(m.conflict?.reportingValue).toMatch(/7/);
    expect(m.conflict?.recordValue).toMatch(/4/);
  });

  it("an unconfirmed OCR record never corroborates", () => {
    const c = claim({ canonicalText: "The Tamil Nadu government announced a new scheme", subjects: ["Tamil Nadu government"] });
    const q = buildResearchQuery(c, c.canonicalText);
    const r = rec({ authority: "Tamil Nadu DIPR", title: "TN DIPR release", text: "The Tamil Nadu government announced a new scheme today.", requiresOcr: true, ocrConfidence: null });
    expect(matchClaimToRecord(c, q, r).outcome).toBe("not_found");
  });

  it("a headline-only record corroborates only on a strong headline entity+action match", () => {
    const c = claim({ canonicalText: "Union Minister Ashwini Vaishnaw ordered railway safety fixes", subjects: ["Ashwini Vaishnaw"] });
    const q = buildResearchQuery(c, c.canonicalText);
    const strong = rec({ authority: "Press Information Bureau", title: "Ashwini Vaishnaw gives directions for improvement of railway safety", text: "Ashwini Vaishnaw gives directions for improvement of railway safety", bodyAvailable: false });
    expect(matchClaimToRecord(c, q, strong).outcome).toBe("corroborated");
    const weak = rec({ authority: "Press Information Bureau", title: "Cabinet approves textiles MoU", text: "Cabinet approves textiles MoU", bodyAvailable: false });
    expect(matchClaimToRecord(c, q, weak).outcome).toBe("not_found");
  });
});
