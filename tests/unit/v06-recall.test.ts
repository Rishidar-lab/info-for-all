import { describe, it, expect } from "vitest";
import { normalizeItem } from "@/lib/live/normalize";
import { clusterArticles } from "@/lib/live/cluster";
import { buildEventClaims } from "@/lib/claims";
import { parseFigures } from "@/lib/claims/extract";
import { parseQuantities } from "@/lib/claims/quantity";
import { buildSignature } from "@/lib/event-identity/signature";
import { decideIdentity, candidatePairs } from "@/lib/event-identity";
import { tamilConceptTokens, normalizeTamilToken } from "@/lib/language/tamil";
import { englishConceptTokens, conceptOverlap } from "@/lib/semantic/concepts";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle } from "@/lib/live/types";

const NOW = Date.parse("2026-09-02T06:00:00Z");
const h = (n: number) => new Date(NOW - n * 3_600_000).toISOString();

function feed(over: Partial<FeedSource>): FeedSource {
  return {
    id: "f", name: "F", publisher: "F", homepage: "https://f.example", url: "https://f.example/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "tamil-nadu", role: "independent", enabled: true, ...over,
  };
}
const A_FEED = feed({ id: "a", publisher: "Outlet A" });
const B_FEED = feed({ id: "b", publisher: "Outlet B", language: "en" });
const B_TA = feed({ id: "bt", publisher: "Outlet B", language: "ta" });
const A_TA = feed({ id: "at", publisher: "Outlet A", language: "ta" });

function mk(f: FeedSource, title: string, published = h(4)): LiveArticle {
  return normalizeItem(
    f,
    { title, link: `https://x.example/${encodeURIComponent(title.slice(0, 24))}`, guid: title, published, summary: title },
    h(0),
    NOW,
  ).article!;
}
function together(a: LiveArticle, b: LiveArticle): boolean {
  const { clusters } = clusterArticles([a, b], NOW);
  return clusters.some((c) => c.articleIds.includes(a.id) && c.articleIds.includes(b.id));
}
function sharedSpecificClaim(a: LiveArticle, b: LiveArticle): boolean {
  const { clusters } = clusterArticles([a, b], NOW);
  const cl = clusters.find((c) => c.articleIds.includes(a.id));
  if (!cl || !cl.articleIds.includes(b.id)) return false;
  const ec = buildEventClaims(cl, cl.articleIds.map((id) => [a, b].find((x) => x.id === id)!), NOW);
  return ec.claims.some(
    (c) =>
      !(c.type === "event" && c.predicates.length === 0) &&
      c.supportingArticleIds.includes(a.id) &&
      c.supportingArticleIds.includes(b.id),
  );
}

// ── recall wins ────────────────────────────────────────────────────────

describe("v0.6 — Tamil morphology & concept recall", () => {
  it("sea ≡ coast: a fishing warning and a fishing ban at the same coast merge", () => {
    // P04 shape
    const a = mk(A_TA, "நாகப்பட்டினம் மீனவர்கள் கடலுக்கு செல்ல வேண்டாம் என எச்சரிக்கை", h(7));
    const b = mk(B_TA, "நாகை கடலோரத்தில் மீன்பிடிக்க தடை; வானிலை மோசம்", h(6));
    expect(together(a, b)).toBe(true);
  });

  it("road subsidence and rain-damaged road with a diversion merge (damage + diversion concepts)", () => {
    // P12 shape
    const a = mk(A_TA, "விழுப்புரத்தில் சாலை சரிவு; வாகன போக்குவரத்து மாற்றம்", h(4));
    const b = mk(B_TA, "விழுப்புரம்: மழையால் சாலை பாதிப்பு; வழித்தடம் மாற்றம்", h(3));
    expect(together(a, b)).toBe(true);
    expect([...tamilConceptTokens(a.title).concepts]).toContain("damage");
    expect([...tamilConceptTokens(b.title).concepts]).toEqual(expect.arrayContaining(["damage", "diversion"]));
  });

  it("rough sea, boats ashore ≈ waves rising, fishermen out (rough-sea / boat concepts)", () => {
    // P14 shape
    const a = mk(A_TA, "கன்னியாகுமரியில் கடல் கொந்தளிப்பு; படகுகள் கரைக்கு", h(6));
    const b = mk(B_TA, "குமரி மாவட்டத்தில் கடல் அலைகள் அதிகரிப்பு; மீனவர்கள் வெளியேறல்", h(5));
    expect([...tamilConceptTokens(a.title).concepts]).toEqual(expect.arrayContaining(["rough-sea", "boat"]));
    expect([...tamilConceptTokens(b.title).concepts]).toContain("rough-sea");
    expect(together(a, b)).toBe(true);
  });

  it("the accusative + ஒட்டி postposition no longer hides திறப்பு → release", () => {
    // Q14 shape: திறப்பையொட்டி
    expect([...tamilConceptTokens("மேட்டூர் அணை திறப்பையொட்டி விவசாயிகள் மகிழ்ச்சி").concepts]).toContain("release");
    expect(normalizeTamilToken("திறப்பையொட்டி")).toContain("திற");
  });
});

describe("v0.6 — distinctive-figure recall", () => {
  it("'16 districts' is parsed in Tamil as well as English", () => {
    expect(parseQuantities("தமிழ்நாட்டில் 16 மாவட்டங்களுக்கு மழை எச்சரிக்கை")[0]).toMatchObject({
      dimension: "district-count",
      value: 16,
    });
    expect(parseQuantities("16 மாவட்டங்களில் இன்று கனமழை")[0]).toMatchObject({ dimension: "district-count", value: 16 });
    expect(parseQuantities("rain alert for 16 districts")[0]).toMatchObject({ dimension: "district-count", value: 16 });
  });

  it("a state-level rain-warning pair sharing '16 districts' becomes a candidate and merges", () => {
    // P13 shape
    const a = buildSignature({ title: "தமிழ்நாட்டில் 16 மாவட்டங்களுக்கு மழை எச்சரிக்கை", excerpt: "", publishedAt: h(5), language: "ta" });
    const b = buildSignature({ title: "16 மாவட்டங்களில் இன்று கனமழை; வானிலை மையம் எச்சரிக்கை", excerpt: "", publishedAt: h(4), language: "ta" });
    expect(candidatePairs([a, b]).length).toBeGreaterThan(0);
    expect(decideIdentity(a, b).relation).toBe("same");
  });

  it("reservoir level in feet is a length figure, and 118 ft / 120 ft extract as statistics", () => {
    expect(parseQuantities("Mettur dam level at 118 feet against a full level of 120 feet").map((q) => q.dimension)).toEqual([
      "length",
      "length",
    ]);
    const figs = parseFigures("Mettur storage nears full: 118 ft of 120 ft");
    expect(figs.map((f) => f.kind)).toEqual(expect.arrayContaining(["water_level_ft"]));
    expect(figs.find((f) => f.kind === "water_level_ft")?.value).toBe(118);
  });

  it("C05: Mettur 118/120 ft reports share a specific statistic claim", () => {
    const a = mk(A_FEED, "Mettur dam level at 118 feet against a full level of 120 feet", h(6));
    const b = mk(B_FEED, "Mettur storage nears full: 118 ft of 120 ft", h(5));
    expect(sharedSpecificClaim(a, b)).toBe(true);
  });
});

describe("v0.6 — cross-language structured agreement", () => {
  it("Q06: Erode Cauvery-bank evacuation merges across languages", () => {
    const a = mk(A_TA, "ஈரோட்டில் காவிரி கரையோர மக்கள் வெளியேற்றம்", h(6));
    const b = mk(B_FEED, "Erode: residents on the Cauvery banks moved to safety as river swells", h(5));
    expect(together(a, b)).toBe(true);
  });

  it("Q11: 'cyclone will cross the coast near Nagapattinam' merges across languages via landfall + cyclone", () => {
    const a = mk(A_TA, "புயல் திட்வா நாகப்பட்டினம் அருகே கரையை கடக்கும் என எதிர்பார்ப்பு", h(9));
    const b = mk(B_FEED, "Cyclone Ditwah likely to cross coast near Nagapattinam on Thursday", h(8));
    expect([...englishConceptTokens(b.title)]).toEqual(expect.arrayContaining(["cyclone", "landfall"]));
    expect(together(a, b)).toBe(true);
  });

  it("'moved to safety' is an evacuation concept in English", () => {
    expect([...englishConceptTokens("residents moved to safety as the river swells")]).toEqual(
      expect.arrayContaining(["evacuation", "flood"]),
    );
  });
});

describe("v0.6 — same incident sub-type is a positive signal", () => {
  it("S10: two capsize reports at the same town merge and share a 'missing' statistic", () => {
    const a = mk(A_FEED, "Two fishermen from Rameswaram go missing after boat capsizes", h(5));
    const b = mk(B_FEED, "Rameshwaram boat mishap: search on for two missing fishermen", h(4));
    expect(together(a, b)).toBe(true);
    expect(sharedSpecificClaim(a, b)).toBe(true);
    expect(parseFigures("Two fishermen from Rameswaram go missing after boat capsizes").map((f) => f.kind)).toContain(
      "missing",
    );
  });
});

describe("v0.6 — state-level transport disruption", () => {
  it("J10: rain hitting air & rail across TN merges (state-level candidate + gate)", () => {
    const a = mk(A_FEED, "Heavy rain disrupts flights and trains across Tamil Nadu", h(5));
    const b = mk(B_FEED, "Tamil Nadu weather: air and rail traffic hit by downpour", h(4));
    expect(together(a, b)).toBe(true);
    expect(sharedSpecificClaim(a, b)).toBe(true);
  });

  it("candidate generation is order-independent for state-level pairs", () => {
    const a = buildSignature({ title: "Heavy rain disrupts flights and trains across Tamil Nadu", excerpt: "", publishedAt: h(5), language: "en" });
    const b = buildSignature({ title: "Tamil Nadu weather: air and rail traffic hit by downpour", excerpt: "", publishedAt: h(4), language: "en" });
    expect(candidatePairs([a, b]).length).toBe(candidatePairs([b, a]).length);
    expect(candidatePairs([a, b]).length).toBeGreaterThan(0);
  });
});

// ── mandatory negative constraints (Phase 10) — recall must NOT break these ──

describe("v0.6 — negative constraints hold", () => {
  const NEG: [string, string, ("en" | "ta")?, ("en" | "ta")?][] = [
    // same politician, different speech
    ["CM Vijay opens Mettur dam for Cauvery water release", "CM Vijay announces a new semiconductor park at Kancheepuram"],
    // same district, different incident
    ["Coimbatore fire at a chemical unit; three injured", "Coimbatore building collapse leaves three injured"],
    // same weather type, different date (a week apart)
    ["Red alert for Coimbatore as heavy rain lashes the district", "Red alert for Coimbatore as heavy rain lashes the district", "en", "en"],
    // same dam, different action
    ["Mettur dam opened; surplus water released into the Cauvery", "Mettur dam gates closed as inflow drops near Salem"],
    // same Tamil stem family, different word — கடல் (sea) vs கடலூர் (Cuddalore)
    ["கடலூரில் கனமழை; பள்ளிகள் மூடல்", "கடலில் மீன்பிடி தடை; மீனவர்கள் திரும்பினர்", "ta", "ta"],
    // state-wide warning vs an unrelated state-level story
    ["Tamil Nadu weather: 16 districts to get heavy rain today", "Tamil Nadu Assembly clears a 10% wage hike for weavers"],
    // similar keywords, different event
    ["Cyclone alert for the Tamil Nadu coast as the system intensifies", "Tamil Nadu coast to get two new fishing harbours, says minister"],
    // two neighbouring districts, same hazard
    ["Heavy rain floods low-lying parts of Cuddalore", "Heavy rain floods low-lying parts of Villupuram"],
  ];
  for (const [a, b, la, lb] of NEG) {
    it(`stays separate: "${a.slice(0, 34)}…" vs "${b.slice(0, 34)}…"`, () => {
      const dateA = /Red alert for Coimbatore/.test(a) ? h(170) : h(6);
      const sa = buildSignature({ title: a, excerpt: a, publishedAt: dateA, language: la ?? "en" });
      const sb = buildSignature({ title: b, excerpt: b, publishedAt: h(3), language: lb ?? "en" });
      expect(decideIdentity(sa, sb).relation).not.toBe("same");
    });
  }

  it("same place, same action, but a follow-up days later is not merged as one fresh event", () => {
    const a = buildSignature({ title: "Section 144 imposed in Madurai ahead of the festival", excerpt: "", publishedAt: h(170), language: "en" });
    const b = buildSignature({ title: "Section 144 imposed in Madurai after market clashes", excerpt: "", publishedAt: h(3), language: "en" });
    const d = decideIdentity(a, b);
    expect(d.relation).toBe("different");
    expect(d.blockers.join(" ")).toMatch(/days apart/);
  });

  it("a cross-language pair with only a shared state stays UNCERTAIN, never merged", () => {
    const a = buildSignature({ title: "தமிழ்நாட்டில் இன்று மழை", excerpt: "", publishedAt: h(4), language: "ta" });
    const b = buildSignature({ title: "Section 144 imposed in Madurai ahead of festival", excerpt: "", publishedAt: h(4), language: "en" });
    expect(decideIdentity(a, b).relation).not.toBe("same");
  });

  it("the district-count block does not pair a warning with an unrelated '16'-something", () => {
    const a = buildSignature({ title: "Rain warning for 16 districts of Tamil Nadu", excerpt: "", publishedAt: h(4), language: "en" });
    const b = buildSignature({ title: "16 new medical colleges approved for Tamil Nadu", excerpt: "", publishedAt: h(4), language: "en" });
    // they may share the "qty:count" block, but the gate must not merge them
    expect(decideIdentity(a, b).relation).not.toBe("same");
  });

  it("sea ≡ coast does not merge two different coastal districts", () => {
    const a = buildSignature({ title: "Fishing banned off the Nagapattinam coast over rough seas", excerpt: "", publishedAt: h(5), language: "en" });
    const b = buildSignature({ title: "Rough sea warning for fishermen off the Kanyakumari coast", excerpt: "", publishedAt: h(4), language: "en" });
    expect(decideIdentity(a, b).relation).not.toBe("same");
  });

  it("conceptOverlap still ignores generic concepts after the new equivalences", () => {
    expect(conceptOverlap(new Set(["government", "road", "water"]), new Set(["government", "road", "water"])).shared).toEqual([]);
  });
});
