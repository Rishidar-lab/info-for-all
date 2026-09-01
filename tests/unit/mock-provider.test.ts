import { describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/intelligence/mock-provider";
import { CLAIM_TYPES } from "@/lib/domain/types";

const provider = new MockProvider();

describe("MockProvider.extractClaims", () => {
  it("is deterministic", async () => {
    const input = {
      articleId: "art_1",
      title: "Bill introduced",
      text: "The National Assembly introduced the AI Systems Oversight Bill on Monday. It creates a supervisory unit inside the Ministry of Digital Affairs. Deputy Corin Vale said a first reading was expected within six weeks.",
    };
    const a = await provider.extractClaims(input);
    const b = await provider.extractClaims(input);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("classifies claim types and keeps paragraph provenance", async () => {
    const claims = await provider.extractClaims({
      articleId: "art_2",
      title: "Recall",
      text: "The Consumer Safety Agency ordered a recall of a batch of earbuds.\n\nThe Agency has received 41 reports of overheating, including three minor burns.\n\nThe company said it would replace all affected units.",
    });
    for (const c of claims) {
      expect(CLAIM_TYPES).toContain(c.type);
      expect(c.sourceParagraph).not.toBeNull();
      expect(c.extractionConfidence).toBeGreaterThanOrEqual(0.3);
      expect(c.extractionConfidence).toBeLessThanOrEqual(0.95);
    }
    const stat = claims.find((c) => /41 reports/.test(c.canonicalText));
    expect(stat?.type).toBe("statistic");
  });
});

describe("MockProvider.detectContradictions", () => {
  it("flags an incompatible-scope conflict", async () => {
    const findings = await provider.detectContradictions([
      { id: "c1", canonicalText: "The bill applies to all generative AI systems.", normalizedMeaning: "ai all appli bill generat system", type: "attribution", entities: ["bill"] },
      { id: "c2", canonicalText: "The legislation applies only to high-risk AI systems.", normalizedMeaning: "ai appli high legislation risk system", type: "attribution", entities: ["legislation"] },
    ]);
    expect(findings.some((f) => f.type === "CONTRADICTS")).toBe(true);
  });

  it("flags a negation conflict", async () => {
    const findings = await provider.detectContradictions([
      { id: "n1", canonicalText: "The northern zone is covered by a confidential annex.", normalizedMeaning: "annex confidential cover northern zone", type: "attribution", entities: ["annex"] },
      { id: "n2", canonicalText: "The northern zone is not covered and no annex is confirmed.", normalizedMeaning: "annex confirm cover north not zone", type: "observation", entities: ["annex"] },
    ]);
    expect(findings.some((f) => f.type === "CONTRADICTS")).toBe(true);
  });

  it("marks near-identical claims as duplicates", async () => {
    const findings = await provider.detectContradictions([
      { id: "d1", canonicalText: "The Reserve Bank held the rate at 3.75 percent.", normalizedMeaning: "bank held percent rate reserve", type: "observation", entities: ["Reserve Bank"] },
      { id: "d2", canonicalText: "The Reserve Bank held the rate at 3.75 percent.", normalizedMeaning: "bank held percent rate reserve", type: "observation", entities: ["Reserve Bank"] },
    ]);
    expect(findings.some((f) => f.type === "DUPLICATES")).toBe(true);
  });
});

describe("MockProvider.embed", () => {
  it("produces deterministic vectors whose similarity tracks meaning", async () => {
    const [a, b, c] = await provider.embed([
      "The National Assembly introduced the AI oversight bill on Monday.",
      "Lawmakers introduced the AI oversight bill in the National Assembly.",
      "Coastal flood barriers will be built along the shoreline.",
    ]);
    const cos = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i], 0);
    expect(cos(a, b)).toBeGreaterThan(cos(a, c));
    expect(a).toEqual((await provider.embed([
      "The National Assembly introduced the AI oversight bill on Monday.",
    ]))[0]);
  });
});
