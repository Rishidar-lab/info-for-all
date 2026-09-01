import { describe, expect, it } from "vitest";
import { canonicalizeUrl, domainFromUrl, normalizeItem } from "@/lib/ingestion/normalize";

describe("canonicalizeUrl", () => {
  it("lowercases host, drops www, strips tracking params and fragments", () => {
    const out = canonicalizeUrl("https://WWW.Example.com/story?utm_source=x&id=7&ref=home#section");
    expect(out).toBe("https://example.com/story?id=7");
  });
  it("removes a trailing slash from non-root paths", () => {
    expect(canonicalizeUrl("https://example.com/a/b/")).toBe("https://example.com/a/b");
  });
  it("throws on an invalid URL", () => {
    expect(() => canonicalizeUrl("not a url")).toThrow();
  });
});

describe("domainFromUrl", () => {
  it("returns the bare host", () => {
    expect(domainFromUrl("https://www.northwind.example/a/b")).toBe("northwind.example");
  });
});

describe("normalizeItem", () => {
  it("cleans title/description, derives domain, and builds a dedupe key", () => {
    const article = normalizeItem({
      url: "https://www.meridiandispatch.example/a/ai-bill?utm_campaign=news",
      title: "  <b>AI oversight</b> bill introduced  ",
      summary: "<p>The bill was <em>introduced</em> on Monday.</p>",
      publishedAt: "2026-03-01T09:00:00Z",
      publication: "The Meridian Dispatch",
    });
    expect(article.title).toBe("AI oversight bill introduced");
    expect(article.description).toBe("The bill was introduced on Monday.");
    expect(article.sourceDomain).toBe("meridiandispatch.example");
    expect(article.dedupeKey).toBe("https://meridiandispatch.example/a/ai-bill");
    expect(article.publishedAt.toISOString()).toBe("2026-03-01T09:00:00.000Z");
  });

  it("falls back to now for a missing or implausible future date", () => {
    const future = normalizeItem({
      url: "https://x.example/a",
      title: "A headline here",
      publishedAt: "2099-01-01T00:00:00Z",
    });
    expect(future.publishedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("rejects an item with no title", () => {
    expect(() => normalizeItem({ url: "https://x.example/a", title: "" })).toThrow();
  });
});
