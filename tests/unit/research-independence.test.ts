import { describe, it, expect } from "vitest";
import type { LiveArticle } from "@/lib/live/types";
import type { Evidence } from "@/lib/claims/types";
import { resolveSourceFamilies } from "@/lib/research/independence";

let seq = 0;
function art(o: Partial<LiveArticle> & { publisher: string; title: string }): LiveArticle {
  return {
    id: o.id ?? `a${++seq}`,
    title: o.title,
    url: `https://ex.test/${o.id ?? seq}`,
    sourceId: o.publisher,
    sourceName: o.publisher,
    publisher: o.publisher,
    role: o.role ?? "independent",
    sourceUrl: "https://ex.test",
    publishedAt: o.publishedAt ?? "2026-09-03T06:00:00.000Z",
    fetchedAt: "2026-09-03T06:10:00.000Z",
    language: o.language ?? "en",
    scope: "india",
    districts: [],
    geo: {} as LiveArticle["geo"],
    evidenceRole: o.evidenceRole ?? "independent-report",
    verificationStatus: "single-source",
    excerpt: o.excerpt,
    crisisPriority: 20,
    isCrisis: false,
    lifecycle: "developing",
  } as LiveArticle;
}

describe("resolveSourceFamilies (Milestone B §B.1)", () => {
  it("collapses two mastheads of one corporate family", () => {
    const r = resolveSourceFamilies([
      art({ publisher: "NDTV", title: "X happened", excerpt: "A full report of what happened today." }),
      art({ publisher: "NDTV Profit", title: "X happened", excerpt: "A slightly different report of the same." }),
    ]);
    expect(r.familyCount).toBe(1);
    expect(r.genuineIndependentFamilies).toBe(1);
  });

  it("collapses every pickup of one wire dispatch, always", () => {
    const r = resolveSourceFamilies([
      art({ publisher: "The Hindu", title: "Cabinet clears bill (PTI)", excerpt: "(PTI) The cabinet cleared the bill." }),
      art({ publisher: "The Times of India", title: "Cabinet clears bill", excerpt: "Press Trust of India reports the cabinet cleared the bill." }),
      art({ publisher: "Hindustan Times", title: "Cabinet clears bill (PTI)", excerpt: "(PTI) Cabinet nod for the bill." }),
    ]);
    expect(r.familyCount).toBe(1);
    expect(r.genuineIndependentFamilies).toBe(0);
    expect(r.families[0].kind).toBe("wire");
    expect(r.wireAgencies).toContain("PTI");
  });

  it("collapses a ≥85% verbatim repost across two corporate families", () => {
    const body = "The state government on Wednesday announced a new welfare scheme for weavers, allocating funds for looms and yarn, officials said, adding that registration would open next month.";
    const r = resolveSourceFamilies([
      art({ publisher: "The Hindu", title: "New weaver scheme announced", excerpt: body }),
      art({ publisher: "The Indian Express", title: "Weaver scheme unveiled", excerpt: body }),
    ]);
    expect(r.familyCount).toBe(1);
    expect(r.downgrades.some((d) => /verbatim/.test(d.reason))).toBe(true);
  });

  it("keeps two genuinely independent newsrooms separate", () => {
    const r = resolveSourceFamilies([
      art({ publisher: "The Hindu", title: "Assembly passes bill", excerpt: "Our correspondent reports the assembly passed the bill after a two-hour debate." }),
      art({ publisher: "The Indian Express", title: "Bill cleared", excerpt: "The house cleared the bill; the opposition staged a brief walkout before the vote." }),
    ]);
    expect(r.familyCount).toBe(2);
    expect(r.genuineIndependentFamilies).toBe(2);
    expect(r.label).toMatch(/two independent/i);
  });

  it("classifies an official record as a primary anchor, not an independent newsroom", () => {
    const r = resolveSourceFamilies([
      art({ publisher: "NDMA SACHET", title: "Cyclone alert", role: "official", evidenceRole: "official-alert", excerpt: "Cyclone warning for the coast." }),
    ]);
    expect(r.genuineIndependentFamilies).toBe(0);
    expect(r.primaryRecordCount).toBeGreaterThanOrEqual(1);
    expect(r.families[0].kind).toBe("official-primary");
  });

  it("treats a press release + its echo as one family", () => {
    const release = "The Chief Minister announced that a new bridge would be built across the river at a cost of 200 crore, with work to begin in October.";
    const evidence: Evidence[] = [
      { id: "e1", type: "official-statement", title: release, publisher: "TN DIPR", url: "https://ex.test/e1", publishedAt: "2026-09-03T05:00:00.000Z", supportsClaimIds: [], provenance: { event: release } },
    ];
    const r = resolveSourceFamilies(
      [art({ publisher: "The Hindu", title: "CM announces new bridge", excerpt: "The Chief Minister announced a new bridge across the river at a cost of 200 crore with work to begin in October.", publishedAt: "2026-09-03T06:00:00.000Z" })],
      { evidence },
    );
    expect(r.families[0].kind).toBe("press-release-echo");
    expect(r.genuineIndependentFamilies).toBe(0);
    expect(r.primaryRecordCount).toBeGreaterThanOrEqual(1);
  });

  it("does not count 'unknown, unregistered, headline-only' as independent", () => {
    const r = resolveSourceFamilies([
      art({ publisher: "SomeBlog", title: "Big thing" }),
      art({ publisher: "AnotherBlog", title: "Big thing occurs" }),
    ]);
    expect(r.genuineIndependentFamilies).toBe(0);
    expect(r.families.every((f) => f.kind === "thin")).toBe(true);
  });
});
