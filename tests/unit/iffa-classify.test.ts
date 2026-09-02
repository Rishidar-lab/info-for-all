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

describe("IFFA secondary-category engine (v0.9 Phase B)", () => {
  const sec = (title: string, language?: "ta" | "en") => {
    const r = classifyEvent({ title, language });
    return { primary: r.primaryCategory, all: [r.primaryCategory, ...r.secondaryCategories] };
  };

  it("surfaces a real second domain via a cross-domain pattern, not a loose keyword", () => {
    // economic data as the substance of a political clash
    const a = sec("DMK, Congress corner Centre in Lok Sabha over falling GDP growth and rising unemployment");
    expect(a.primary).toBe("politics");
    expect(a.all).toContain("finance");

    // a court ruling whose substance is a market matter
    const b = sec("Madras High Court stays SEBI order against a Chennai brokerage in an insider-trading case");
    expect(b.primary).toBe("finance");

    // a demolition drive that displaces people
    const c = sec("Greater Chennai Corporation razes 120 riverbank huts ahead of the northeast monsoon; residents allege no rehab");
    expect(c.primary).toBe("politics");
    expect(c.all).toContain("crisis");
  });

  it("does NOT invent a secondary for a single-domain story", () => {
    expect(sec("RBI holds repo rate at 6.25% for a fourth straight review").all).toEqual(["finance"]);
    expect(sec("Thailand bowl; India hand a T20I debut to Pratika Rawal").all).toEqual(["sports"]);
    expect(sec("GST Council slashes rates on 33 items; FMCG and cement stocks rally").all).toEqual(["finance"]);
  });

  it("a cross-domain angle never out-ranks a real primary", () => {
    // 'flood' is a real keyword but the story is a court holding the govt to account
    const r = classifyEvent({ title: "Madurai bench pulls up the state over unpaid flood-relief compensation from 2023" });
    expect(r.primaryCategory).toBe("politics");
    expect(r.secondaryCategories).toContain("crisis");
  });

  it("exposes structured per-category evidence for the primary and each secondary", () => {
    const r = classifyEvent({ title: "Enforcement Directorate raids premises of a former DMK minister in a ₹200-crore sand-mining case" });
    expect(r.categoryEvidence[0].role).toBe("primary");
    expect(r.categoryEvidence[0].category).toBe(r.primaryCategory);
    for (const ev of r.categoryEvidence) {
      expect(ev.signals.length).toBeGreaterThan(0);
      expect(typeof ev.score).toBe("number");
    }
    expect(r.categoryEvidence.map((e) => e.category)).toEqual([r.primaryCategory, ...r.secondaryCategories]);
  });

  it("reads a Tamil cross-domain story (unemployment debated politically)", () => {
    const r = sec("வேலைவாய்ப்பின்மை உயர்வு: மத்திய அரசை எதிர்க்கட்சிகள் கடும் விமர்சனம்", "ta");
    expect(r.primary).toBe("politics");
    expect(r.all).toContain("finance");
  });
});
