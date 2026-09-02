import { describe, it, expect } from "vitest";
import { resolveTemporal } from "@/lib/domain/temporal";

const PUB = "2026-09-02T09:00:00Z"; // a Wednesday

const r = (title: string, excerpt?: string) => resolveTemporal({ title, excerpt, publishedAt: PUB });

describe("IFFA temporal intelligence (v0.9 Phase F)", () => {
  it("separates when it happened from when it was published", () => {
    const t = r("Two killed as wall collapses in Salem yesterday");
    expect(t.eventOccurredAt?.iso).toBe("2026-09-01");
    expect(t.eventOccurredAt?.certainty).toBe("relative");
    expect(t.tense).toBe("past");
  });

  it("resolves 'on Monday' to the nearest past weekday", () => {
    const t = r("CM met farmers' delegation on Monday, promised relief");
    expect(t.eventOccurredAt?.iso).toBe("2026-08-31");
  });

  it("reads an explicit absolute date without a year", () => {
    const t = r("Nominations for the by-election close on September 15");
    expect(t.scheduledFor?.iso).toBe("2026-09-15");
    expect(t.tense).toBe("future");
  });

  it("captures a scheduled future event", () => {
    const t = r("Tamil Nadu Assembly to reconvene tomorrow to take up the wetland Bill");
    expect(t.scheduledFor?.iso).toBe("2026-09-03");
    expect(t.tense).toBe("future");
  });

  it("captures effective-from and a bounded effective-until", () => {
    const t = r("Section 144 imposed in parts of Madurai for the next 3 days");
    expect(t.effectiveUntil?.iso).toBe("2026-09-05");
  });

  it("captures 'with effect from' a date", () => {
    const t = r("Revised bus fares applicable from October 1, government notifies");
    expect(t.effectiveFrom?.iso).toBe("2026-10-01");
  });

  it("'until further notice' is kept as an unresolved phrase, not dropped", () => {
    const t = r("Mettur dam shutters to remain open until further notice");
    expect(t.effectiveUntil?.phrase).toBe("until further notice");
    expect(t.effectiveUntil?.iso).toBeUndefined();
  });

  it("resolves a Tamil relative date", () => {
    const t = r("சேலத்தில் நேற்று சுவர் இடிந்து விழுந்து இருவர் பலி");
    expect(t.eventOccurredAt?.iso).toBe("2026-09-01");
  });

  it("resolves a Tamil month + day", () => {
    const t = r("செப்டம்பர் 15 அன்று இடைத்தேர்தல் நடைபெறும்");
    expect([t.scheduledFor?.iso, t.eventOccurredAt?.iso]).toContain("2026-09-15");
  });

  it("a bare past-tense report with no date word is inferred to the pub day", () => {
    const t = r("Minister resigns amid graft allegations");
    expect(t.eventOccurredAt?.certainty).toBe("inferred");
    expect(t.eventOccurredAt?.iso).toBe("2026-09-02");
  });

  it("notes a long reporting lag", () => {
    const t = r("Court acquits man in a 2019 murder case; verdict delivered on August 20");
    expect(t.notes.join(" ")).toMatch(/day\(s\) after/);
  });

  it("is deterministic and never throws on a junk date", () => {
    const a = resolveTemporal({ title: "x happened yesterday", publishedAt: "not-a-date" });
    expect(a.notes.join(" ")).toMatch(/unparseable/);
    expect(resolveTemporal({ title: "y", publishedAt: PUB })).toEqual(resolveTemporal({ title: "y", publishedAt: PUB }));
  });
});
