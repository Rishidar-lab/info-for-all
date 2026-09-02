import { describe, it, expect } from "vitest";
import { normalizeItem } from "@/lib/live/normalize";
import { specialistVeto, clusterArticles } from "@/lib/live/cluster";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle } from "@/lib/live/types";

const NOW = Date.parse("2026-09-02T12:00:00Z");
const at = (h: number) => new Date(NOW - h * 3600_000).toISOString();

function feed(o: Partial<FeedSource>): FeedSource {
  return {
    id: "f", name: "F", publisher: "F", homepage: "https://f.example", url: "https://f.example/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "india", role: "independent", enabled: true, ...o,
  };
}
function mk(o: { publisher: string; title: string; hoursAgo?: number; excerpt?: string }): LiveArticle {
  const slug = (o.publisher + o.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return normalizeItem(
    feed({ id: slug, publisher: o.publisher }),
    { title: o.title, link: `https://x.ex/${slug}`, guid: slug, published: at(o.hoursAgo ?? 2), summary: o.excerpt ?? o.title },
    at(0), NOW,
  ).article!;
}

describe("IFFA event identity v2 — domain specialist split guard (v0.8 Phase C)", () => {
  it("vetoes two different sports fixtures (competition)", () => {
    const a = mk({ publisher: "A", title: "India beat Australia in the T20I series decider" });
    const b = mk({ publisher: "B", title: "India beat Australia in the Test series opener" });
    expect(specialistVeto(a, b)).toMatch(/different sports fixture/);
  });

  it("does NOT veto two reports of the same fixture", () => {
    const a = mk({ publisher: "A", title: "India beat Australia by 5 wickets in the ODI series decider" });
    const b = mk({ publisher: "B", title: "Australia fall to India in the ODI series decider" });
    expect(specialistVeto(a, b)).toBeNull();
  });

  it("vetoes incompatible market moves (direction)", () => {
    const a = mk({ publisher: "A", title: "Sensex rises 900 points on IT rebound" });
    const b = mk({ publisher: "B", title: "Sensex falls 900 points as banks drag" });
    expect(specialistVeto(a, b)).toMatch(/incompatible market move/);
  });

  it("does NOT veto compatible market moves (same instrument, same direction, close magnitude)", () => {
    const a = mk({ publisher: "A", title: "Sensex rises 900 points" });
    const b = mk({ publisher: "B", title: "Sensex up 880 points at close" });
    expect(specialistVeto(a, b)).toBeNull();
  });

  it("bare country names are not a fixture — no veto", () => {
    const a = mk({ publisher: "A", title: "India and Australia sign a trade agreement on critical minerals" });
    const b = mk({ publisher: "B", title: "India, Australia deepen defence ties at 2+2 dialogue" });
    expect(specialistVeto(a, b)).toBeNull();
  });

  it("the split guard keeps different CSK–RCB matches apart in live clustering", () => {
    const arts = [
      mk({ publisher: "The Hindu", title: "CSK beat RCB by 6 wickets in IPL 2026 opener", hoursAgo: 2 }),
      mk({ publisher: "Times of India", title: "CSK beat RCB by 6 wickets — IPL 2026, match 1", hoursAgo: 2.2 }),
      mk({ publisher: "News18", title: "CSK beat RCB by 4 runs in IPL 2026 final", hoursAgo: 1 }),
    ];
    const { clusters } = clusterArticles(arts, NOW);
    // the two "opener" reports may merge; the "final" must be its own cluster
    const finalCluster = clusters.find((c) => c.articleIds.length === 1);
    expect(finalCluster).toBeTruthy();
  });
});
