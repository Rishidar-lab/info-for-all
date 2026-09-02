import { describe, it, expect } from "vitest";
import {
  classifyCategory,
  isDefaultEnabled,
  CATEGORY_WEIGHT,
  CATEGORY_ORDER,
} from "../../src/lib/domain/categories";
import { geoTierOf, GEO_WEIGHT } from "../../src/lib/domain/geo-tiers";

describe("IFFA category taxonomy (Phase C)", () => {
  it("an active crisis type wins outright", () => {
    const c = classifyCategory({ title: "Minister reviews relief work", crisisType: "flood" });
    expect(c.category).toBe("crisis");
    expect(c.subCategory).toBe("flood");
    expect(c.confidence).toBe("high");
  });

  it("classifies weather / flood headlines as crisis", () => {
    expect(classifyCategory({ title: "Heavy rain warning for Cuddalore; IMD issues orange alert" }).category).toBe("crisis");
    expect(classifyCategory({ title: "Chennai roads flooded after overnight downpour" }).category).toBe("crisis");
    expect(classifyCategory({ title: "Bridge collapse in Tiruchirappalli, search operation on" }).category).toBe("crisis");
  });

  it("classifies governance / election headlines as politics", () => {
    expect(classifyCategory({ title: "Tamil Nadu Assembly passes resolution against NEET" }).category).toBe("politics");
    expect(classifyCategory({ title: "DMK and Congress finalise seat-sharing for by-election" }).category).toBe("politics");
    expect(classifyCategory({ title: "ED raids premises linked to former minister in graft case" }).category).toBe("politics");
  });

  it("classifies markets / RBI / budget headlines as finance", () => {
    expect(classifyCategory({ title: "RBI keeps repo rate unchanged at 6.5% in monetary policy review" }).category).toBe("finance");
    expect(classifyCategory({ title: "Sensex rises 1,000 points; Nifty reclaims 25,000" }).category).toBe("finance");
    expect(classifyCategory({ title: "Petrol price cut by Rs 2 a litre from midnight" }).category).toBe("finance");
  });

  it("classifies match / tournament headlines as sports", () => {
    expect(classifyCategory({ title: "CSK beat RCB by 6 wickets in IPL opener" }).category).toBe("sports");
    expect(classifyCategory({ title: "Gukesh wins Candidates tournament, to challenge for world title" }).category).toBe("sports");
  });

  it("demotes entertainment and celebrity to disabled-by-default categories", () => {
    const ent = classifyCategory({ title: "Vijay's next film first look out; trailer launch next week" });
    expect(ent.category).toBe("entertainment");
    expect(isDefaultEnabled(ent.category)).toBe(false);

    const cel = classifyCategory({ title: "Actor spotted at airport; dating rumours go viral on Instagram" });
    expect(cel.category).toBe("celebrity");
    expect(isDefaultEnabled(cel.category)).toBe(false);
  });

  it("a political story that merely NAMES an actor is politics, not celebrity", () => {
    const c = classifyCategory({ title: "CM announces new welfare scheme for women; opposition slams timing" });
    expect(c.category).toBe("politics");
  });

  it("falls back to other-relevant when nothing matches, and keeps it enabled", () => {
    const c = classifyCategory({ title: "New species of frog documented in the Western Ghats" });
    expect(c.category).toBe("other-relevant");
    expect(isDefaultEnabled("other-relevant")).toBe(true);
  });

  it("crisis outranks every other category weight, celebrity is near zero", () => {
    expect(CATEGORY_WEIGHT.crisis).toBe(1);
    expect(CATEGORY_WEIGHT.crisis).toBeGreaterThan(CATEGORY_WEIGHT.politics);
    expect(CATEGORY_WEIGHT.politics).toBeGreaterThan(CATEGORY_WEIGHT.finance);
    expect(CATEGORY_WEIGHT.finance).toBeGreaterThan(CATEGORY_WEIGHT.sports);
    expect(CATEGORY_WEIGHT.celebrity).toBeLessThan(0.05);
    expect(CATEGORY_ORDER[0]).toBe("crisis");
  });

  it("every result carries matched terms and a reason", () => {
    const c = classifyCategory({ title: "GST council meets to review rates on 200 items" });
    expect(c.reason.length).toBeGreaterThan(0);
    expect(Array.isArray(c.matchedTerms)).toBe(true);
  });
});

describe("IFFA geo tiers (Phase C)", () => {
  it("Tamil Nadu scope is P0", () => {
    expect(geoTierOf({ scope: "tamil-nadu", title: "Cuddalore rain" }).tier).toBe("P0");
  });

  it("India + India-relevant scopes are P1", () => {
    expect(geoTierOf({ scope: "india", title: "Parliament clears bill" }).tier).toBe("P1");
    expect(geoTierOf({ scope: "india-relevant", title: "Cyclone in Bay of Bengal" }).tier).toBe("P1");
  });

  it("an excluded foreign story with an explicit India consequence becomes P2", () => {
    const t = geoTierOf({ scope: "excluded", title: "Crude oil price spikes after OPEC output cut" });
    expect(t.tier).toBe("P2");
  });

  it("a foreign story with no India consequence is out of scope", () => {
    const t = geoTierOf({ scope: "excluded", title: "Local council election held in small European town" });
    expect(t.tier).toBe("out");
    expect(GEO_WEIGHT.out).toBe(0);
  });

  it("geo weights decrease P0 > P1 > P2 > out", () => {
    expect(GEO_WEIGHT.P0).toBeGreaterThan(GEO_WEIGHT.P1);
    expect(GEO_WEIGHT.P1).toBeGreaterThan(GEO_WEIGHT.P2);
    expect(GEO_WEIGHT.P2).toBeGreaterThan(GEO_WEIGHT.out);
  });
});
