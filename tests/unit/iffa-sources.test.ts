import { describe, it, expect } from "vitest";
import {
  FEED_SOURCES,
  DESCRIBED_FEEDS,
  CANDIDATE_FEEDS,
  describeFeed,
} from "../../src/data/feeds";

describe("IFFA source registry (Phase D)", () => {
  it("describes every feed with the typed metadata resolved", () => {
    expect(DESCRIBED_FEEDS.length).toBe(FEED_SOURCES.length);
    for (const f of DESCRIBED_FEEDS) {
      expect(f.sourceType).toBeTruthy();
      expect(f.authorityClass).toBeTruthy();
      expect(f.region).toBeTruthy();
      expect(f.categorySupport.length).toBeGreaterThan(0);
      expect(f.pollIntervalMinutes).toBeGreaterThan(0);
    }
  });

  it("official feeds resolve to primary-authority", () => {
    for (const f of DESCRIBED_FEEDS.filter((x) => x.official)) {
      expect(f.authorityClass).toBe("primary-authority");
    }
  });

  it("independent newspapers cover crisis/politics/finance/sports", () => {
    const hindu = DESCRIBED_FEEDS.find((f) => f.id === "thehindu-national");
    expect(hindu?.categorySupport).toEqual(
      expect.arrayContaining(["crisis", "politics", "finance", "sports"]),
    );
  });

  it("a per-feed override wins over derivation", () => {
    const overridden = describeFeed({
      ...FEED_SOURCES[0],
      authorityClass: "aggregator",
      pollIntervalMinutes: 5,
    });
    expect(overridden.authorityClass).toBe("aggregator");
    expect(overridden.pollIntervalMinutes).toBe(5);
  });

  it("Tamil Nadu feeds resolve to the tamil-nadu region", () => {
    const tn = DESCRIBED_FEEDS.filter((f) => f.focus === "tamil-nadu");
    expect(tn.length).toBeGreaterThan(0);
    for (const f of tn) expect(f.region).toBe("tamil-nadu");
  });

  it("no feed carries a numeric trust score (spec-forbidden)", () => {
    for (const f of FEED_SOURCES) {
      expect(f).not.toHaveProperty("trustScore");
      expect(f).not.toHaveProperty("reliabilityScore");
    }
  });

  it("candidate feeds are all http(s) and carry a status", () => {
    for (const c of CANDIDATE_FEEDS) {
      expect(c.url).toMatch(/^https?:\/\//);
      expect(["to-validate", "blocked", "no-feed-found"]).toContain(c.status);
    }
  });
});
