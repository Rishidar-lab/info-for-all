import { describe, it, expect } from "vitest";
import { normalizeTamilToken, tamilConceptTokens, resolveTamilDate, tamilDigitsToArabic } from "@/lib/language/tamil";
import { resolvePlaces, placeRelation, districtsOf } from "@/lib/language/locations";
import { resolveEntities, strongEntities } from "@/data/entity-aliases";
import { detectActions, actionRelation } from "@/lib/semantic/actions";
import { englishConceptTokens, conceptOverlap } from "@/lib/semantic/concepts";
import { DictionaryTranslationProvider } from "@/lib/language/translation";
import { hashEmbed, cosine } from "@/lib/semantic/embeddings";

describe("Tamil normalisation (Phase 11)", () => {
  it("strips common case / plural suffixes to a shared stem", () => {
    // சென்னையில் (in Chennai) and சென்னை (Chennai) resolve to the same place
    const a = tamilConceptTokens("சென்னையில் மழை").places;
    const b = tamilConceptTokens("சென்னை மழை").places;
    expect([...a]).toEqual([...b]);
    expect([...a]).toContain("Chennai");
  });

  it("does not mistake கடலூர் (Cuddalore) for கடல் (sea)", () => {
    const t = tamilConceptTokens("கடலூரில் வெள்ளம்");
    expect([...t.places]).toContain("Cuddalore");
    expect([...t.concepts]).not.toContain("sea");
  });

  it("maps recurring roots to language-neutral concepts", () => {
    const t = tamilConceptTokens("பள்ளிகளுக்கு விடுமுறை; மேட்டூர் அணை திறப்பு");
    expect([...t.concepts]).toEqual(expect.arrayContaining(["school", "holiday", "dam", "release"]));
    expect([...t.places]).toContain("Mettur");
  });

  it("normalizeTamilToken is idempotent on a bare stem", () => {
    expect(normalizeTamilToken("பள்ளி")).toBe("பள்ளி");
  });

  it("resolves Tamil relative dates against publication", () => {
    const r = resolveTamilDate("நாளை பள்ளிகளுக்கு விடுமுறை", "2026-09-02T06:00:00Z");
    expect(r?.iso).toBe("2026-09-03");
    expect(r?.phrase).toBe("நாளை");
  });

  it("converts Tamil digits", () => {
    expect(tamilDigitsToArabic("௧௨ பேர்")).toBe("12 பேர்");
  });
});

describe("location layer (Phase 10)", () => {
  it("resolves transliteration variants to one canonical district", () => {
    expect(resolvePlaces("Trichy floods")[0]?.place.canonical).toBe("Tiruchirappalli");
    expect(resolvePlaces("Tuticorin port")[0]?.place.canonical).toBe("Thoothukudi");
  });

  it("maps a dam / city to its district", () => {
    expect([...districtsOf(resolvePlaces("Mettur dam opened"))]).toContain("Salem");
    expect([...districtsOf(resolvePlaces("waterlogging in Tambaram"))]).toContain("Chengalpattu");
  });

  it("placeRelation: same district → same; neighbours → sibling; state-only → same-region-only", () => {
    expect(placeRelation(resolvePlaces("flood in Cuddalore"), resolvePlaces("rescue in Cuddalore"))).toBe("same");
    expect(placeRelation(resolvePlaces("flood in Cuddalore"), resolvePlaces("flood in Villupuram"))).toBe("sibling");
    expect(placeRelation(resolvePlaces("rain across Tamil Nadu"), resolvePlaces("Tamil Nadu weather"))).toBe("same-region-only");
  });

  it("placeRelation: a genuine state conflict blocks", () => {
    expect(placeRelation(resolvePlaces("Karnataka dam"), resolvePlaces("Tamil Nadu assembly"))).toBe("different");
  });
});

describe("entity aliases (Phase 9)", () => {
  it("resolves abbreviations and long forms to one canonical entity", () => {
    expect(resolveEntities("GCC opens relief camps")[0]?.entity.canonical).toBe("Greater Chennai Corporation");
    expect(resolveEntities("the India Meteorological Department warned")[0]?.entity.canonical).toBe("IMD");
  });

  it("generic role words are NOT strong identifiers", () => {
    expect([...strongEntities("the government announced a scheme")]).toEqual([]);
    expect([...strongEntities("police said the fire was out")]).toEqual([]);
  });

  it("a specific named body IS a strong identifier", () => {
    expect([...strongEntities("NDRF deployed three teams")]).toContain("NDRF");
  });
});

describe("action ontology (Phase 7)", () => {
  it("maps surface verbs to a family", () => {
    expect([...detectActions("cabinet cleared the proposal")]).toContain("approve");
    expect([...detectActions("schools ordered to close")]).toContain("close");
  });

  it("approve and discuss stay DISTINCT and conflict", () => {
    expect(actionRelation(detectActions("cabinet approves the plan"), detectActions("cabinet discusses the plan"))).toBe("conflicting");
  });

  it("a weather warning and the order it triggers are compatible", () => {
    expect(actionRelation(detectActions("red alert issued"), detectActions("fishing banned"))).toBe("compatible");
  });
});

describe("concept lexicon (Phase 14)", () => {
  it("English and Tamil share a vocabulary", () => {
    const en = englishConceptTokens("Schools shut in Chennai amid heavy rain");
    const ta = tamilConceptTokens("சென்னையில் கனமழை; பள்ளிகள் மூடல்").concepts;
    const { shared } = conceptOverlap(en, ta);
    expect(shared).toEqual(expect.arrayContaining(["closure"]));
  });

  it("generic concepts do not count as overlap", () => {
    const { shared } = conceptOverlap(new Set(["government", "water"]), new Set(["government", "water"]));
    expect(shared).toEqual([]);
  });
});

describe("providers (Phase 15, 17)", () => {
  it("dictionary translation produces a rough gloss, never overwrites", async () => {
    const r = await new DictionaryTranslationProvider().translate("சென்னையில் பள்ளிகளுக்கு விடுமுறை", "ta", "en");
    expect(r.method).toBe("dictionary");
    expect(r.text.toLowerCase()).toContain("chennai");
    expect(r.confidence).toBeLessThanOrEqual(0.6);
  });

  it("hashing embedding is deterministic and higher for paraphrases", () => {
    const a = hashEmbed("Schools closed in Chennai due to rain");
    const b = hashEmbed("Schools closed in Chennai due to rain");
    const c = hashEmbed("Chennai schools shut as heavy rain lashes the city");
    const d = hashEmbed("Karnataka assembly passes a resolution on power tariffs");
    expect(cosine(a, b)).toBeCloseTo(1, 5);
    expect(cosine(a, c)).toBeGreaterThan(cosine(a, d));
  });
});
