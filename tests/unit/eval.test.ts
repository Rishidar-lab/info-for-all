import { describe, it, expect } from "vitest";
import { CORPUS } from "../../evaluation/claims/corpus";
import { validateCorpus } from "../../evaluation/claims/schema";
import { runCorpus } from "../../evaluation/claims/harness";

describe("claim gold corpus + evaluation harness (Phase 2–4)", () => {
  it("the corpus is structurally valid and large enough", () => {
    expect(validateCorpus(CORPUS)).toEqual([]);
    expect(CORPUS.length).toBeGreaterThanOrEqual(100);
    // every category A–O represented
    const cats = new Set(CORPUS.map((c) => c.category));
    expect(cats.size).toBe(15);
  });

  it("runs the real pipeline and never fabricates corroboration", () => {
    const r = runCorpus(CORPUS);
    expect(r.totals.cases).toBe(CORPUS.length);
    // THE non-negotiable: no unrelated / cross-language pair shown as corroborated
    expect(r.falseCorroboration.count).toBe(0);
    expect(r.falseCorroboration.rate).toBe(0);
  });

  it("meets the v0.4 release thresholds", () => {
    const r = runCorpus(CORPUS);
    const m = r.metrics;
    expect(m.claimMatching.precision ?? 0).toBeGreaterThanOrEqual(0.95);
    expect(m.contradiction.precision ?? 0).toBeGreaterThanOrEqual(0.9);
    expect(m.attribution.accuracy ?? 0).toBeGreaterThanOrEqual(0.9);
    expect(m.temporalUpdate.accuracy ?? 0).toBeGreaterThanOrEqual(0.7);
    expect(m.crossLanguageHeld.accuracy ?? 0).toBe(1);
    expect(m.tamilOriginalKept.accuracy ?? 0).toBe(1);
  });

  it("is deterministic across runs", () => {
    const a = runCorpus(CORPUS);
    const b = runCorpus(CORPUS);
    expect(a.totals.passed).toBe(b.totals.passed);
    expect(a.metrics.claimMatching.recall).toBe(b.metrics.claimMatching.recall);
  });
});
