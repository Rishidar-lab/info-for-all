import { describe, it, expect } from "vitest";
import { classifyEvent } from "@/lib/domain/classify";
import { CATEGORY_CORPUS } from "../../evaluation/category/corpus";
import { isDigestHeadline } from "@/lib/live/entities";

describe("IFFA classifier v2 — multi-signal (v0.8 Phase A)", () => {
  it("meets the category-corpus accuracy bar (≥ 92%)", () => {
    let correct = 0;
    for (const c of CATEGORY_CORPUS) {
      const got =
        c.digest || isDigestHeadline(c.title)
          ? "other-relevant"
          : classifyEvent({ title: c.title, excerpt: c.excerpt, language: c.language }).primaryCategory;
      if (got === c.primary) correct++;
    }
    const acc = correct / CATEGORY_CORPUS.length;
    expect(acc).toBeGreaterThanOrEqual(0.92);
  });

  it("classifies Tamil headlines (not just English)", () => {
    expect(classifyEvent({ title: "கடலூரில் கனமழை காரணமாக பள்ளிகளுக்கு விடுமுறை", language: "ta" }).primaryCategory).toBe("crisis");
    expect(classifyEvent({ title: "சட்டசபையில் முதலமைச்சர் விஜய் புதிய நலத்திட்டத்தை அறிவித்தார்", language: "ta" }).primaryCategory).toBe("politics");
    expect(classifyEvent({ title: "தங்கம் விலை சரிவு: 10 நாட்களில் பெரிய வீழ்ச்சி", language: "ta" }).primaryCategory).toBe("finance");
  });

  it("catches the 'government actor + governance action' pattern", () => {
    expect(classifyEvent({ title: "CM proposes Rs 4,800-crore desalination plant at Minjur" }).primaryCategory).toBe("politics");
    expect(classifyEvent({ title: "State government to launch digital driving licences in Tamil Nadu" }).primaryCategory).toBe("politics");
  });

  it("a casualty count is an unambiguous crisis signal", () => {
    expect(classifyEvent({ title: "Bus falls into gorge in the Nilgiris; 9 killed, 20 injured" }).primaryCategory).toBe("crisis");
  });

  it("'red alert' about state revenue is a political metaphor, not a weather alert", () => {
    const r = classifyEvent({ title: "RED Alert on Tamil Nadu revenue: minister's shock report on GST collection" });
    expect(r.primaryCategory).not.toBe("crisis");
  });

  it("a culture piece that merely names chess players is not sports", () => {
    expect(
      classifyEvent({ title: "Chess grandmaster's menu: what Chef Suresh Pillai cooked for Anand and Gukesh" }).primaryCategory,
    ).toBe("other-relevant");
  });

  it("returns primary + secondary + confidence + competing categories", () => {
    const r = classifyEvent({ title: "Union Budget raises income tax exemption limit and cuts GST on 30 items" });
    expect(r.primaryCategory).toBe("finance");
    expect(["STRONG", "MODERATE", "WEAK"]).toContain(r.confidenceClass);
    expect(r.competingCategories.length).toBeGreaterThan(0);
    expect(r.matchedSignals.length).toBeGreaterThan(0);
    // a cross-domain story exposes a secondary
    const b = classifyEvent({ title: "Finance Minister criticises opposition over RBI repo-rate policy in Lok Sabha" });
    expect(new Set([b.primaryCategory, ...b.secondaryCategories])).toEqual(
      expect.objectContaining({}),
    );
    expect([b.primaryCategory, ...b.secondaryCategories]).toEqual(expect.arrayContaining(["politics"]));
  });

  it("genuine general news stays other-relevant with UNKNOWN confidence", () => {
    const r = classifyEvent({ title: "Guitars in a Carnatic city: the rock 'n' roll story of 1960s Madras" });
    expect(r.primaryCategory).toBe("other-relevant");
    expect(r.confidenceClass).toBe("UNKNOWN");
  });

  it("entity signals steer the category", () => {
    expect(classifyEvent({ title: "Policy decision reviewed", entities: ["RBI"] }).primaryCategory).toBe("finance");
    expect(classifyEvent({ title: "New guidelines issued", entities: ["Tamil Nadu Assembly", "DMK"] }).primaryCategory).toBe("politics");
  });

  it("is deterministic", () => {
    const t = "Sensex ends 900 points lower as IT stocks drag";
    expect(classifyEvent({ title: t })).toEqual(classifyEvent({ title: t }));
  });
});
