import { describe, expect, it } from "vitest";
import { CGI_WEIGHTS_V0_1, computeCgi, type CgiInput } from "@/lib/cgi";
import { cgiBand } from "@/lib/domain/types";

const now = new Date("2026-03-01T12:00:00Z");

function baseInput(overrides: Partial<CgiInput> = {}): CgiInput {
  return {
    keyClaims: [
      { independentCorroboratingSources: 4, hasPrimaryEvidence: true, status: "CONFIRMED", contradictionCount: 0 },
      { independentCorroboratingSources: 3, hasPrimaryEvidence: true, status: "CONFIRMED", contradictionCount: 0 },
      { independentCorroboratingSources: 3, hasPrimaryEvidence: false, status: "CORROBORATED", contradictionCount: 0 },
    ],
    totalArticles: 18,
    independentSourceCount: 12,
    ownershipGroupCount: 6,
    sourceCategoryCount: 4,
    countryCount: 4,
    primaryEvidenceCount: 3,
    contradictionPairs: 0,
    latestUpdateAt: new Date(now.getTime() - 6 * 3600_000),
    now,
    ...overrides,
  };
}

describe("cgiBand", () => {
  it("maps scores to the documented bands", () => {
    expect(cgiBand(95)).toBe("very_high");
    expect(cgiBand(90)).toBe("very_high");
    expect(cgiBand(89)).toBe("high");
    expect(cgiBand(70)).toBe("high");
    expect(cgiBand(69)).toBe("mixed");
    expect(cgiBand(50)).toBe("mixed");
    expect(cgiBand(49)).toBe("substantial_disagreement");
    expect(cgiBand(30)).toBe("substantial_disagreement");
    expect(cgiBand(29)).toBe("very_low");
    expect(cgiBand(0)).toBe("very_low");
  });
});

describe("computeCgi", () => {
  it("produces an integer 0..100 with a matching band", () => {
    const result = computeCgi(baseInput());
    expect(Number.isInteger(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.band).toBe(cgiBand(result.score));
  });

  it("is explainable: base + sum(contributions) equals the pre-clamp score", () => {
    const result = computeCgi(baseInput());
    const summed = result.base + result.components.reduce((s, c) => s + c.contribution, 0);
    expect(Math.round(Math.min(100, Math.max(0, summed)))).toBe(result.score);
  });

  it("emits one component per weight-table entry, each with an explanation", () => {
    const result = computeCgi(baseInput());
    expect(result.components).toHaveLength(CGI_WEIGHTS_V0_1.components.length);
    for (const c of result.components) {
      expect(c.explanation.length).toBeGreaterThan(0);
      expect(["positive", "negative"]).toContain(c.direction);
    }
  });

  it("scores a well-corroborated, primary-backed event high", () => {
    expect(computeCgi(baseInput()).score).toBeGreaterThanOrEqual(80);
  });

  it("penalises contradictions and unresolved claims", () => {
    const contested = computeCgi(
      baseInput({
        keyClaims: [
          { independentCorroboratingSources: 1, hasPrimaryEvidence: false, status: "DISPUTED", contradictionCount: 2 },
          { independentCorroboratingSources: 1, hasPrimaryEvidence: false, status: "UNVERIFIED", contradictionCount: 0 },
        ],
        contradictionPairs: 1,
        primaryEvidenceCount: 0,
      }),
    );
    expect(contested.score).toBeLessThan(55);
    expect(contested.narrative.negatives.length).toBeGreaterThan(0);
  });

  it("is monotonic in corroboration", () => {
    const low = computeCgi(
      baseInput({ keyClaims: baseInput().keyClaims.map((c) => ({ ...c, independentCorroboratingSources: 1 })) }),
    ).score;
    const high = computeCgi(baseInput()).score;
    expect(high).toBeGreaterThan(low);
  });

  it("snapshots its inputs for auditability", () => {
    const result = computeCgi(baseInput());
    expect(result.inputs.totalArticles).toBe(18);
    expect(result.inputs).toHaveProperty("hoursSinceUpdate");
  });
});
