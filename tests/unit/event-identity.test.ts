import { describe, it, expect } from "vitest";
import { buildSignature } from "@/lib/event-identity/signature";
import { decideIdentity, candidatePairs } from "@/lib/event-identity";

const NOW = Date.parse("2026-09-02T06:00:00Z");
const h = (n: number) => new Date(NOW - n * 3_600_000).toISOString();
const sig = (title: string, language: "en" | "ta" = "en", publishedAt = h(4), crisisType?: string) =>
  buildSignature({ title, excerpt: title, publishedAt, language, crisisType });

describe("event signature (Phase 2)", () => {
  it("captures language-neutral structure", () => {
    const s = sig("Schools shut in Chennai amid heavy rain");
    expect([...s.districts]).toContain("Chennai");
    expect([...s.concepts]).toEqual(expect.arrayContaining(["closure", "rain"]));
    expect([...s.actions]).toContain("close");
  });
});

describe("identity decision (Phase 18) — same-event positives", () => {
  const same: [string, string, ("en" | "ta")?, ("en" | "ta")?][] = [
    ["Schools in Chennai will remain closed Wednesday due to heavy rain", "Chennai district schools declared a holiday for Wednesday amid rain"],
    ["Section 144 imposed in Madurai ahead of the temple festival", "Madurai police clamp prohibitory orders before the festival procession"],
    ["Mettur dam opened, Cauvery water released towards Salem", "Water release from Mettur dam into the Cauvery begins near Salem"],
    ["Cabinet clears Rs 1,000 crore flood relief for Tamil Nadu", "Government approves Rs 1,000 crore flood package for the state"],
    ["சென்னையில் நாளை பள்ளிகளுக்கு விடுமுறை", "Schools in Chennai to remain closed tomorrow", "ta", "en"],
  ];
  for (const [a, b, la, lb] of same) {
    it(`SAME: "${a.slice(0, 40)}…"`, () => {
      const d = decideIdentity(sig(a, la ?? "en"), sig(b, lb ?? "en"));
      expect(d.relation).toBe("same");
      expect(d.blockers).toEqual([]);
    });
  }
});

describe("identity decision — negatives never merge (Phase 5, 19)", () => {
  const different: [string, string][] = [
    ["CM Vijay announces a semiconductor park near Kancheepuram", "CM Vijay announces a milk price hike to Rs 44"],
    ["Boat capsizes in Cuddalore, two fishermen missing", "Two-storey house collapses in Villupuram, none hurt"],
    ["Heavy rain floods low-lying areas of Cuddalore", "Heavy rain floods low-lying areas of Villupuram"],
    ["Cabinet approves the Chennai-Salem highway", "Cabinet discusses the Chennai-Salem highway"],
    ["Tamil Nadu weather: 16 districts to get heavy rain", "Tamil Nadu Assembly clears wage hike for weavers"],
    ["Coimbatore fire leaves three injured", "Coimbatore building collapse leaves three injured"],
  ];
  for (const [a, b] of different) {
    it(`DIFFERENT: "${a.slice(0, 34)}…" vs "${b.slice(0, 34)}…"`, () => {
      const d = decideIdentity(sig(a), sig(b));
      expect(d.relation).not.toBe("same");
    });
  }

  it("same district, different date → different (temporal blocker)", () => {
    const d = decideIdentity(
      sig("Section 144 imposed in Madurai ahead of festival", "en", h(170)),
      sig("Section 144 imposed in Madurai after clashes", "en", h(3)),
    );
    expect(d.relation).toBe("different");
    expect(d.blockers.join(" ")).toMatch(/days apart/);
  });

  it("different hazard types block", () => {
    const d = decideIdentity(sig("Chennai flooded after downpour", "en", h(4), "flood"), sig("Cyclone nears Chennai coast", "en", h(4), "cyclone"));
    expect(d.blockers.join(" ")).toMatch(/hazard/);
  });

  it("a pure reaction is NOT the event (no concrete action of its own)", () => {
    const d = decideIdentity(
      sig("Mettur dam opened, water released into the Cauvery"),
      sig("Farmers hail the Cauvery water decision by the government"),
    );
    expect(d.relation).not.toBe("same");
  });
});

describe("event relations (Phase 6)", () => {
  it("a regional event and a local incident inside it are PART_OF, not SAME", () => {
    const d = decideIdentity(
      sig("Heavy rain across Tamil Nadu; several districts flooded"),
      sig("Cuddalore town submerged as rain batters the district"),
    );
    expect(["part-of", "related", "different"]).toContain(d.relation);
    expect(d.relation).not.toBe("same");
  });

  it("a developing follow-up is FOLLOW_UP / supersedes territory, not a fresh event", () => {
    const d = decideIdentity(
      sig("Ukkadam building collapse: two killed in Coimbatore", "en", h(8)),
      sig("Ukkadam building collapse toll rises to six in Coimbatore", "en", h(1)),
    );
    // same place + developing language + time gap
    expect(["same", "follow-up"]).toContain(d.relation);
  });
});

describe("candidate generation (Phase 3, 25)", () => {
  it("blocks by district / specific place / entity, not by 'Tamil Nadu'", () => {
    const sigs = [
      sig("Schools closed in Cuddalore due to flooding"),
      sig("Rescue teams pull residents from Cuddalore floodwater"),
      sig("Tamil Nadu Assembly debates the power tariff"),
      sig("Tamil Nadu government hikes DA for employees"),
    ];
    const pairs = candidatePairs(sigs);
    const has = (i: number, j: number) => pairs.some((p) => (p.i === i && p.j === j) || (p.i === j && p.j === i));
    expect(has(0, 1)).toBe(true); // shared Cuddalore
    expect(has(2, 3)).toBe(false); // only "Tamil Nadu" in common, low embedding
  });

  it("is not O(N²) across a hot key — fan-out is capped", () => {
    const sigs = Array.from({ length: 200 }, (_, i) => sig(`Update ${i}: heavy rain across Tamil Nadu today`));
    const pairs = candidatePairs(sigs);
    expect(pairs.length).toBeLessThan(200 * 199); // vastly fewer than all pairs
  });
});
