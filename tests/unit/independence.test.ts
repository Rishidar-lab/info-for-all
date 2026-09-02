import { describe, it, expect } from "vitest";
import { detectWireCredit, wireCreditsIn } from "@/lib/independence/wire";
import { analyseIndependence, classifyPair, independenceLabel } from "@/lib/independence";
import { normalizeItem } from "@/lib/live/normalize";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle } from "@/lib/live/types";

const NOW = Date.parse("2026-09-02T06:00:00Z");
const T = new Date(NOW - 3600_000).toISOString();

function feed(over: Partial<FeedSource>): FeedSource {
  return {
    id: "f", name: "F", publisher: "F", homepage: "https://f.example", url: "https://f.example/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "tamil-nadu", role: "independent", enabled: true, ...over,
  };
}
function mk(pub: string, title: string, excerpt?: string): LiveArticle {
  const slug = pub.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalizeItem(
    feed({ id: slug, publisher: pub }),
    { title, link: `https://${slug}.example/${encodeURIComponent(title.slice(0, 20))}`, guid: `${pub}:${title}`, published: T, summary: excerpt ?? title },
    T,
    NOW,
  ).article!;
}

describe("wire / agency credit detection (Phase 17)", () => {
  it("detects credits that are actually present", () => {
    expect(detectWireCredit("Cyclone nears coast. (PTI)")).toBe("PTI");
    expect(detectWireCredit("Reuters: Tamil Nadu braces for landfall")).toBe("Reuters");
    expect(detectWireCredit("Report by ANI")).toBe("ANI");
    expect(detectWireCredit("From the Press Trust of India")).toBe("PTI");
  });

  it("does not invent a credit that is absent", () => {
    expect(detectWireCredit("Heavy rain lashes Chennai overnight")).toBeUndefined();
    expect(detectWireCredit("The cap on relief funds was raised")).toBeUndefined(); // 'cap' ≠ 'AP'
  });

  it("collects the distinct credits across a set of texts", () => {
    expect([...wireCreditsIn(["a (PTI)", "b Reuters", "c PTI"])].sort()).toEqual(["PTI", "Reuters"]);
  });
});

describe("independence engine (Phase 16)", () => {
  it("same publisher's several stories collapse to one group", () => {
    const r = analyseIndependence([
      mk("The Hindu", "Mettur dam opened, Cauvery water released near Salem"),
      mk("The Hindu", "Focus on longevity of the Mettur water release near Salem"),
    ]);
    expect(r.independentGroups).toBe(1);
  });

  it("two papers running the same PTI dispatch are one confirmation", () => {
    const t = "Tamil Nadu shuts schools in six districts as heavy rain pounds the state";
    const r = analyseIndependence([mk("HT", t, `${t}. (PTI)`), mk("NIE", t, `${t}. (PTI)`)]);
    expect(r.independentGroups).toBe(1);
    expect(r.possibleSyndicated).toBeGreaterThanOrEqual(1);
    expect(r.wireCredits).toContain("PTI");
  });

  it("distinct wording from two publishers is likely-independent", () => {
    const rel = classifyPair(
      mk("The Hindu", "Chennai schools shut on Wednesday as the city reels under heavy rain"),
      mk("TOI", "Wednesday declared a holiday for Chennai schools after a night of downpour"),
    );
    expect(rel.relation).toBe("likely-independent");
  });

  it("two short bare headlines with no excerpt are UNKNOWN, never independent", () => {
    const a = { ...mk("A", "Rain toll rises"), excerpt: undefined };
    const b = { ...mk("B", "Storm warning issued"), excerpt: undefined };
    const rel = classifyPair(a, b);
    expect(rel.relation).toBe("unknown");
    expect(rel.relation).not.toBe("independent");
    expect(rel.relation).not.toBe("likely-independent");
  });

  it("independenceLabel is honest about unclear cases", () => {
    expect(independenceLabel({ groups: [], independentGroups: 1, possibleSyndicated: 0, relations: [], wireCredits: [], unknownPairs: 1 })).toMatch(/unclear/i);
    expect(independenceLabel({ groups: [], independentGroups: 3, possibleSyndicated: 0, relations: [], wireCredits: [], unknownPairs: 0 })).toMatch(/independent/i);
  });
});
