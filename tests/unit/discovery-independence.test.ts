import { describe, it, expect } from "vitest";
import type { LiveArticle } from "@/lib/live/types";
import { normalizeItem } from "@/lib/live/normalize";
import type { FeedSource } from "@/data/feeds";
import { canonicaliseUrl, dedupeCandidates } from "@/lib/discovery/dedupe";
import { normalizeCandidate } from "@/lib/discovery/normalize";
import { resolveDiscoveredReports } from "@/lib/discovery/resolve";
import type { DiscoveryCandidate, CandidateMatch } from "@/lib/discovery/types";

const NOW = Date.parse("2026-09-03T12:00:00Z");
const T = "2026-09-03T08:00:00.000Z";

function feed(pub: string): FeedSource {
  return {
    id: pub, name: pub, publisher: pub, homepage: "https://ex.test", url: "https://ex.test/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "tamil-nadu", role: "independent", enabled: true,
  };
}

function art(pub: string, title: string): LiveArticle {
  return normalizeItem(
    feed(pub),
    { title, link: `https://ex.test/${encodeURIComponent(pub + title.slice(0, 15))}`, guid: `${pub}:${title}`, published: T, summary: title },
    T, NOW,
  ).article!;
}

function mkCand(url: string, title: string, source: string, snippet = ""): DiscoveryCandidate {
  return {
    url, canonicalUrl: canonicaliseUrl(url), title, source, provider: "mock",
    query: "mock", discoveredAt: new Date(NOW).toISOString(), publishedAt: T,
    language: "en", snippet,
  };
}

const MATCH: CandidateMatch = { verdict: "MATCH", relation: "same", confidence: "high", score: 1, reasons: ["t"], blockers: [], crossLanguage: false };

describe("independence gate — URL count is not coverage (v0.13 PHASE 6)", () => {
  it("collapses tracking-param / AMP URL variants to one candidate", () => {
    const a = mkCand("https://www.thehindu.com/news/x?utm_source=feed&utm_medium=rss#top", "Mullaperiyar review sought", "The Hindu");
    const b = mkCand("https://thehindu.com/news/x.amp?utm_source=x", "Mullaperiyar review sought", "The Hindu");
    const { kept, dropped } = dedupeCandidates([a, b]);
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(1);
    expect(normalizeCandidate(a).canonicalUrl).toBe(normalizeCandidate(b).canonicalUrl);
  });

  it("marks a wire copy as wire, not an independent family", () => {
    const seed = [art("The Hindu", "Schools shut in six districts as rain pounds state")];
    const c = mkCand("https://other.test/wire1", "Schools shut in six districts as rain pounds state", "Other News", "Schools shut in six districts as rain pounds state. (PTI)");
    const r = resolveDiscoveredReports([{ candidate: c, match: { ...MATCH } }], seed, new Set(["reg:kasturi-and-sons"]), 1);
    expect(r.reports[0].sourceType).toBe("wire");
    expect(r.rescued).toBe(false);
  });

  it("marks a corporate sibling as same-family, not a rescue", () => {
    const seed = [art("The Hindu", "Mullaperiyar safety review sought by Keralam")];
    // Hindu BusinessLine shares the kasturi-and-sons family with The Hindu.
    const c = mkCand("https://thehindubusinessline.com/news/mullai", "Mullaperiyar safety review sought by Keralam", "The Hindu BusinessLine");
    const r = resolveDiscoveredReports([{ candidate: c, match: { ...MATCH } }], seed, new Set(["reg:kasturi-and-sons"]), 1);
    expect(r.reports[0].sourceType).toBe("same-family");
    expect(r.rescued).toBe(false);
  });

  it("marks a verbatim repost as syndication", () => {
    const seed = [art("The Hindu", "Digital licences to launch next month in Tamil Nadu")];
    const text = "Digital driving licences and vehicle registration certificates to be launched next month in Tamil Nadu with full details";
    const c1 = mkCand("https://a.test/1", text, "Outlet A", text);
    const c2 = mkCand("https://b.test/2", text, "Outlet B", text);
    const r = resolveDiscoveredReports(
      [{ candidate: c1, match: { ...MATCH } }, { candidate: c2, match: { ...MATCH } }],
      seed, new Set(["reg:kasturi-and-sons"]), 1,
    );
    expect(r.reports.map((x) => x.sourceType)).toContain("syndication");
  });

  it("counts a genuinely independent newsroom as a new family and rescues the cluster", () => {
    const seed = [art("The Hindu", "Two killed as bus hits lorry near Perambalur")];
    const c = mkCand("https://indianexpress.com/article/india/perambalur-bus-lorry-crash", "Two killed as bus hits lorry near Perambalur", "The Indian Express");
    const r = resolveDiscoveredReports([{ candidate: c, match: { ...MATCH } }], seed, new Set(["reg:kasturi-and-sons"]), 1);
    expect(r.reports[0].sourceType).toBe("independent");
    expect(r.familiesAfter).toBe(2);
    expect(r.rescued).toBe(true);
  });

  it("leaves unregistered outlets as unregistered — never counted as independent", () => {
    const seed = [art("The Hindu", "Some civic announcement in Chennai")];
    const c = mkCand("https://random-blog.test/post/123", "Some civic announcement in Chennai", "Random Blog 123");
    const r = resolveDiscoveredReports([{ candidate: c, match: { ...MATCH } }], seed, new Set(["reg:kasturi-and-sons"]), 1);
    expect(r.reports[0].sourceType).toBe("unregistered");
    expect(r.rescued).toBe(false);
  });
});
