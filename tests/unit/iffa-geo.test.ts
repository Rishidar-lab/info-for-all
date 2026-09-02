import { describe, it, expect } from "vitest";
import {
  resolveDistricts,
  ALL_TN_DISTRICTS,
  TN_DISTRICT_TAMIL,
  SUBUNIT_TO_DISTRICT,
} from "../../src/lib/domain/districts";

describe("IFFA Tamil Nadu district resolution (Phase C / H)", () => {
  it("knows all 38 districts with a Tamil name for each", () => {
    expect(ALL_TN_DISTRICTS.length).toBe(38);
    for (const d of ALL_TN_DISTRICTS) {
      expect(TN_DISTRICT_TAMIL[d], `missing Tamil name for ${d}`).toBeTruthy();
      expect(TN_DISTRICT_TAMIL[d].length).toBeGreaterThan(0);
    }
  });

  it("resolves an English district name", () => {
    const r = resolveDistricts("Heavy rain lashes Cuddalore and Nagapattinam");
    expect(r.map((x) => x.district).sort()).toEqual(["Cuddalore", "Nagapattinam"]);
    expect(r.every((x) => x.script === "en")).toBe(true);
  });

  it("resolves a Tamil-script district name", () => {
    const r = resolveDistricts("கடலூரில் கனமழை; பள்ளிகளுக்கு விடுமுறை");
    expect(r.map((x) => x.district)).toContain("Cuddalore");
    expect(r.find((x) => x.district === "Cuddalore")?.script).toBe("ta");
  });

  it("resolves a Tamil district name inside an inflected form (substring)", () => {
    const r = resolveDistricts("சென்னையில் இன்று மழை பெய்யும் என அறிவிப்பு");
    expect(r.map((x) => x.district)).toContain("Chennai");
  });

  it("resolves common transliteration alternates", () => {
    expect(resolveDistricts("Trichy corporation clears budget").map((x) => x.district)).toContain("Tiruchirappalli");
    expect(resolveDistricts("Tuticorin port handles record cargo").map((x) => x.district)).toContain("Thoothukudi");
    expect(resolveDistricts("Kovai sees traffic snarls").map((x) => x.district)).toContain("Coimbatore");
  });

  it("does not resolve a district from an unrelated substring", () => {
    // "Salem, Oregon" style false positive guard — "salem" as a word still hits,
    // but a random word containing letters must not.
    expect(resolveDistricts("The theatre troupe performed a new play").map((x) => x.district)).toEqual([]);
  });

  it("de-duplicates a district named twice", () => {
    const r = resolveDistricts("Madurai news: Madurai airport expansion approved for Madurai");
    expect(r.filter((x) => x.district === "Madurai").length).toBe(1);
  });

  it("maps a taluk / town to its district", () => {
    expect(SUBUNIT_TO_DISTRICT["srirangam"]).toBe("Tiruchirappalli");
    expect(SUBUNIT_TO_DISTRICT["sivakasi"]).toBe("Virudhunagar");
  });
});
