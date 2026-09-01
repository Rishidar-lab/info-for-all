import { describe, it, expect } from "vitest";
import {
  STORIES,
  SOURCES,
  storyForSlug,
  sourceFor,
  CATEGORIES,
} from "@/data/demo";
import {
  coverageSegments,
  publicationCount,
  hostname,
  PERSPECTIVE_LABEL,
  RELIABILITY_LABEL,
} from "@/lib/ifa";

describe("demo dataset integrity", () => {
  it("has multiple story clusters, each with multiple sources", () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(4);
    for (const s of STORIES) {
      expect(s.articles.length, `${s.slug} articles`).toBeGreaterThanOrEqual(3);
      expect(publicationCount(s), `${s.slug} distinct publications`).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses unique slugs", () => {
    const slugs = STORIES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every story has common facts and coverage differences", () => {
    for (const s of STORIES) {
      expect(s.commonFacts.length, `${s.slug} commonFacts`).toBeGreaterThanOrEqual(2);
      expect(s.coverageDifferences.length, `${s.slug} differences`).toBeGreaterThanOrEqual(2);
      for (const d of s.coverageDifferences) {
        expect(d.observations.length, `${s.slug}/${d.topic}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("coverage segments always normalise to ~100%", () => {
    for (const s of STORIES) {
      const total = coverageSegments(s).reduce((n, seg) => n + seg.pct, 0);
      expect(Math.abs(total - 100), `${s.slug} coverage total ${total}`).toBeLessThanOrEqual(1);
    }
  });

  it("every article's publication resolves to a known source", () => {
    for (const s of STORIES) {
      for (const a of s.articles) {
        expect(sourceFor(a.publication), `${a.publication} missing from SOURCES`).toBeDefined();
      }
    }
  });

  it("every article and source URL uses the reserved .example TLD (no real links)", () => {
    const urls = [
      ...SOURCES.map((s) => s.website),
      ...STORIES.flatMap((s) => s.articles.map((a) => a.url)),
    ];
    for (const u of urls) {
      expect(new URL(u).hostname.endsWith(".example"), u).toBe(true);
    }
  });

  it("perspective and reliability values are within the allowed sets", () => {
    const perspectives = new Set(["left", "center", "right"]);
    const reliabilities = new Set(["high", "mixed", "unknown"]);
    for (const s of SOURCES) {
      expect(perspectives.has(s.perspective)).toBe(true);
      expect(reliabilities.has(s.reliability)).toBe(true);
    }
  });

  it("storyForSlug resolves known slugs and rejects unknown ones", () => {
    expect(storyForSlug(STORIES[0].slug)?.id).toBe(STORIES[0].id);
    expect(storyForSlug("no-such-story")).toBeUndefined();
  });

  it("exposes a non-empty category list", () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });
});

describe("ifa presentation helpers", () => {
  it("labels every perspective and reliability", () => {
    expect(PERSPECTIVE_LABEL.left).toBe("Left");
    expect(PERSPECTIVE_LABEL.center).toBe("Center");
    expect(PERSPECTIVE_LABEL.right).toBe("Right");
    expect(RELIABILITY_LABEL.high).toBe("High");
    expect(RELIABILITY_LABEL.unknown).toBe("Unknown");
  });

  it("hostname strips protocol and www", () => {
    expect(hostname("https://www.themeridian.example")).toBe("themeridian.example");
    expect(hostname("not a url")).toBe("not a url");
  });
});
