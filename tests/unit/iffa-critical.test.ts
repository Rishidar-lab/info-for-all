/**
 * IFFA v0.7 critical-safety corpus — the 12 non-negotiables from the spec.
 *
 * Several of these lock in behaviour of the FROZEN v0.6 engine (identity,
 * claims, independence). If one fails, a regression has been introduced.
 */
import { describe, it, expect } from "vitest";
import { normalizeItem } from "@/lib/live/normalize";
import { clusterArticles } from "@/lib/live/cluster";
import { buildSignature, decideIdentity } from "@/lib/event-identity";
import { analyseIndependence, independenceLabel } from "@/lib/independence";
import { buildEventClaims } from "@/lib/claims";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle } from "@/lib/live/types";
import { enrichDataset } from "@/lib/trends";
import { parseMarketMoves, sameMarketMove, detectFinanceInstruments } from "@/lib/domain/finance";
import { detectFixture, sameSportsFixture } from "@/lib/domain/sports";
import { resolveDistricts } from "@/lib/domain/districts";
import { classifyCategory } from "@/lib/domain/categories";

const NOW = Date.parse("2026-09-02T12:00:00Z");
const at = (h: number) => new Date(NOW - h * 3600_000).toISOString();

function feed(o: Partial<FeedSource>): FeedSource {
  return {
    id: "f", name: "F", publisher: "F", homepage: "https://f.example", url: "https://f.example/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "tamil-nadu", role: "independent", enabled: true, ...o,
  };
}
function mk(o: { publisher: string; title: string; hoursAgo: number; excerpt?: string; official?: boolean; lang?: "en" | "ta" }): LiveArticle {
  const slug = (o.publisher + o.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return normalizeItem(
    feed({
      id: slug, publisher: o.publisher, language: o.lang ?? "en",
      official: o.official ?? false, role: o.official ? "official" : "independent",
      defaultEvidenceRole: o.official ? "government-statement" : "independent-report",
    }),
    { title: o.title, link: `https://${slug}.ex/${encodeURIComponent(o.title.slice(0, 20))}`, guid: slug, published: at(o.hoursAgo), summary: o.excerpt ?? o.title },
    at(0), NOW,
  ).article!;
}
function sig(title: string, opts: { lang?: "en" | "ta"; hoursAgo?: number; districts?: string[] } = {}) {
  return buildSignature({
    title, publishedAt: at(opts.hoursAgo ?? 1), language: opts.lang ?? "en", districts: opts.districts,
  });
}

// 1 ─────────────────────────────────────────────────────────────────────
it("1. a quoted political attack is kept as the speaker's claim, not an IFFA assertion", () => {
  const arts = [
    mk({ publisher: "The Hindu", title: "CM Vijay attacks opposition, alleges Rs 500 crore scam in road contracts", hoursAgo: 2, excerpt: "The Chief Minister alleged that the previous government caused a Rs 500 crore loss." }),
    mk({ publisher: "Times of India", title: "Vijay alleges Rs 500 crore road scam; opposition denies", hoursAgo: 1.6, excerpt: "Vijay claimed irregularities; the opposition rejected the allegation." }),
  ];
  const { clusters } = clusterArticles(arts, NOW);
  const c = clusters.sort((a, b) => b.articleIds.length - a.articleIds.length)[0];
  const ec = buildEventClaims(c, arts, NOW);
  const scamClaims = ec.claims.filter((x) => /500 crore|scam|loss/i.test(x.canonicalText));
  expect(scamClaims.length).toBeGreaterThan(0);
  // EVERY scam claim must carry the allegation framing (claimant named, or an
  // "alleges/claims/denies" marker) — none may stand as a bare IFFA fact.
  for (const cl of scamClaims) {
    const framed =
      /alleg|claim|denie|accus|said|charge|vijay|opposition/i.test(cl.canonicalText) ||
      cl.provenance.some((p) => p.attribution) ||
      cl.status === "attributed";
    expect(framed, `unframed scam claim: "${cl.canonicalText}" (${cl.status})`).toBe(true);
  }
});

// 2 ─────────────────────────────────────────────────────────────────────
it("2. a newspaper death count and a police death count are kept as a discrepancy", () => {
  const arts = [
    mk({ publisher: "DailyBlog", title: "10 people killed as building collapses in Tiruchirappalli, says local report", hoursAgo: 3, excerpt: "A local report put the toll at 10 dead." }),
    mk({ publisher: "The Hindu", title: "Tiruchirappalli building collapse: police confirm 4 dead", hoursAgo: 2, excerpt: "Police confirmed four deaths in the Tiruchirappalli building collapse." }),
  ];
  const { clusters } = clusterArticles(arts, NOW);
  const c = clusters.sort((a, b) => b.articleIds.length - a.articleIds.length)[0];
  const ec = buildEventClaims(c, arts, NOW);
  const text = JSON.stringify(ec);
  // both numbers survive somewhere; they are not silently reconciled to one
  expect(text).toMatch(/\b10\b/);
  expect(text).toMatch(/\b4\b/);
  const toll = ec.claims.filter((x) => /killed|dead|toll|deaths/i.test(x.canonicalText));
  if (toll.length === 1) expect(toll[0].status).not.toBe("corroborated");
});

// 3 ─────────────────────────────────────────────────────────────────────
it("3. rain warning for Cuddalore tomorrow does NOT merge with rain warning for Chennai yesterday", () => {
  const a = sig("Heavy rain warning for Cuddalore tomorrow", { hoursAgo: 1 });
  const b = sig("Heavy rain warning for Chennai issued yesterday", { hoursAgo: 30 });
  const d = decideIdentity(a, b);
  expect(d.relation).not.toBe("same");
  expect(d.blockers.length).toBeGreaterThan(0);
});

// 4 ─────────────────────────────────────────────────────────────────────
it("4. 'Sensex rises 1,000 points' preserves 1000 / Sensex / direction=up", () => {
  const moves = parseMarketMoves("Sensex rises 1,000 points to close at a record high");
  expect(moves.length).toBeGreaterThan(0);
  const m = moves[0];
  expect(m.value).toBe(1000);
  expect(m.unit).toBe("points");
  expect(m.direction).toBe("up");
  expect(m.instrument).toBe("Sensex");
  expect(detectFinanceInstruments("Sensex rises 1,000 points")).toContain("Sensex");
});

// 5 ─────────────────────────────────────────────────────────────────────
it("5. 'Nifty falls 2%' is a percent move, never 2 points", () => {
  const moves = parseMarketMoves("Nifty falls 2% amid global sell-off");
  expect(moves[0].unit).toBe("percent");
  expect(moves[0].value).toBe(2);
  expect(moves[0].direction).toBe("down");
  // a 2% fall and a 2-point fall are not the same move
  expect(sameMarketMove("Nifty falls 2%", "Nifty falls 2 points")).toBe(false);
});

// 6 ─────────────────────────────────────────────────────────────────────
it("6. 'CSK beat RCB' on two different dates are two different fixtures", () => {
  const f1 = detectFixture("CSK beat RCB by 6 wickets in IPL clash", "2026-04-05");
  const f2 = detectFixture("CSK beat RCB by 4 runs in IPL thriller", "2026-04-26");
  expect(sameSportsFixture(f1, f2)).toBe(false);
  // same date, same competition, same teams => same fixture
  const f3 = detectFixture("CSK edge RCB in last-over finish, IPL", "2026-04-05");
  expect(sameSportsFixture(f1, f3)).toBe(true);
  // men's vs women's never merge
  expect(sameSportsFixture(detectFixture("India beat Australia, first ODI"), detectFixture("India Women beat Australia Women, first ODI"))).toBe(false);
});

// 7 ─────────────────────────────────────────────────────────────────────
it("7. 'தமிழக அரசு' resolves to a Tamil Nadu government / state context", () => {
  const s = sig("தமிழக அரசு புதிய நலத்திட்டத்தை அறிவித்தது", { lang: "ta" });
  const canon = [...s.entities, ...s.places.map((p) => p.place.canonical)].join(" ").toLowerCase();
  expect(canon).toMatch(/tamil nadu/);
});

// 8 ─────────────────────────────────────────────────────────────────────
it("8. 'கடலூரில் கனமழை' maps to Cuddalore", () => {
  expect(resolveDistricts("கடலூரில் கனமழை; பள்ளிகளுக்கு விடுமுறை").map((x) => x.district)).toContain("Cuddalore");
  const s = sig("கடலூரில் கனமழை காரணமாக பள்ளிகளுக்கு விடுமுறை", { lang: "ta" });
  expect([...s.districts]).toContain("Cuddalore");
});

// 9 ─────────────────────────────────────────────────────────────────────
it("9. a political allegation keeps its claimant through clustering", () => {
  const arts = [
    mk({ publisher: "The Hindu", title: "Opposition leader alleges corruption in mining leases", hoursAgo: 2, excerpt: "The opposition leader alleged that mining leases were granted irregularly." }),
    mk({ publisher: "NDTV", title: "Mining lease row: opposition leader repeats corruption charge", hoursAgo: 1.5, excerpt: "The opposition leader again alleged corruption in the grant of mining leases." }),
  ];
  const { clusters } = clusterArticles(arts, NOW);
  const c = clusters.sort((a, b) => b.articleIds.length - a.articleIds.length)[0];
  const ec = buildEventClaims(c, arts, NOW);
  const alleged = ec.claims.filter((x) => /corrupt|irregular|lease/i.test(x.canonicalText));
  expect(alleged.length).toBeGreaterThan(0);
  for (const cl of alleged) {
    const keepsClaimant =
      /alleg|claim|charge|accus|opposition|leader/i.test(cl.canonicalText) ||
      cl.provenance.some((p) => p.attribution) ||
      cl.status === "attributed";
    expect(keepsClaimant, `allegation lost its claimant: "${cl.canonicalText}" (${cl.status})`).toBe(true);
  }
});

// 10 ────────────────────────────────────────────────────────────────────
it("10. the same wire copy on many sites is one confirmation, not many", () => {
  const body = "A deep depression over the Bay of Bengal is likely to intensify into a cyclonic storm within 24 hours, the IMD said. (PTI)";
  const arts = ["Site A", "Site B", "Site C", "Site D", "Site E"].map((p) =>
    mk({ publisher: p, title: "Deep depression to intensify into cyclone within 24 hours: IMD", hoursAgo: 2, excerpt: body }),
  );
  const r = analyseIndependence(arts);
  expect(r.independentGroups).toBeLessThanOrEqual(2);
  expect(r.possibleSyndicated).toBeGreaterThanOrEqual(3);
  expect(independenceLabel(r)).toMatch(/syndicat|one newsroom/i);
});

// 11 ────────────────────────────────────────────────────────────────────
it("11. an old event with fresh duplicates does not outrank a genuine new development", () => {
  const oldEventDupes = [
    mk({ publisher: "A", title: "Assembly clears heritage building restoration plan", hoursAgo: 0.5, excerpt: "The plan to restore the heritage building was cleared." }),
    mk({ publisher: "B", title: "Assembly clears heritage building restoration plan", hoursAgo: 0.6, excerpt: "The plan to restore the heritage building was cleared." }),
    mk({ publisher: "C", title: "Assembly clears heritage building restoration plan", hoursAgo: 40, excerpt: "The plan to restore the heritage building was cleared." }),
  ];
  const newDev = [
    mk({ publisher: "The Hindu", title: "Cuddalore floods: 5 dead, 3,000 evacuated as rivers breach banks", hoursAgo: 0.8, excerpt: "Five people died and 3,000 were evacuated in Cuddalore as rivers breached their banks. IMD orange alert." }),
    mk({ publisher: "Times of India", title: "Cuddalore flooding worsens: toll rises to 5, evacuations under way", hoursAgo: 0.6, excerpt: "The toll in the Cuddalore floods rose to 5 with large-scale evacuations." }),
    mk({ publisher: "News18", title: "Cuddalore rivers in spate; relief camps opened", hoursAgo: 1.1, excerpt: "Relief camps were opened as Cuddalore rivers ran in spate." }),
  ];
  const arts = [...oldEventDupes, ...newDev];
  const { clusters, weakMatchesRejected } = clusterArticles(arts, NOW);
  const enriched = enrichDataset(
    {
      generatedAt: at(0), lastSuccessAt: at(0), health: "live", feeds: [], articles: arts, clusters,
      counts: { activeCrisis: 0, tamilNadu: 0, india: 0, comparisons: 0, singleReports: 0, weakMatchesRejected, distinctPublishers: 6, workingFeeds: 1, failedFeeds: 0 },
    },
    { now: NOW, previous: null },
  );
  const flood = enriched.clusters.find((c) => /cuddalore/i.test(c.title));
  const heritage = enriched.clusters.find((c) => /heritage/i.test(c.title));
  expect(flood?.trendData?.trend?.score).toBeGreaterThan(heritage?.trendData?.trend?.score ?? 0);
  expect(enriched.trending.indexOf(flood!.slug)).toBeLessThan(
    enriched.trending.indexOf(heritage!.slug) === -1 ? Infinity : enriched.trending.indexOf(heritage!.slug),
  );
});

// 12 ────────────────────────────────────────────────────────────────────
it("12. an official correction is reflected while the earlier report stays in the timeline", () => {
  const arts = [
    mk({ publisher: "The Hindu", title: "Bridge closed after cracks reported near Erode", hoursAgo: 6, excerpt: "The bridge near Erode was closed after cracks were reported." }),
    mk({ publisher: "PWD Tamil Nadu", title: "PWD clarifies: Erode bridge safe, closure was precautionary and is now lifted", hoursAgo: 1, official: true, excerpt: "The PWD clarified that the Erode bridge is structurally safe and has reopened." }),
  ];
  const { clusters, weakMatchesRejected } = clusterArticles(arts, NOW);
  const prev = {
    clusters: [
      {
        ...clusters[0],
        slug: clusters[0].slug,
        updatedAt: at(6),
        trendData: { firstSeenAt: at(6), lastSeenAt: at(6) },
      },
    ] as unknown as import("@/lib/live/types").LiveCluster[],
  };
  const enriched = enrichDataset(
    {
      generatedAt: at(0), lastSuccessAt: at(0), health: "live", feeds: [], articles: arts, clusters,
      counts: { activeCrisis: 0, tamilNadu: 0, india: 0, comparisons: 0, singleReports: 0, weakMatchesRejected, distinctPublishers: 2, workingFeeds: 1, failedFeeds: 0 },
    },
    { now: NOW, previous: prev },
  );
  const c = enriched.clusters.find((x) => /erode/i.test(x.title))!;
  expect(c.trendData?.trend?.noveltyClass).toBe("correction");
  // the earlier report is still in the timeline
  const tl = c.trendData?.timeline ?? [];
  expect(tl.some((e) => /cracks reported/i.test(e.headline))).toBe(true);
  expect(tl.some((e) => /clarifies|safe/i.test(e.headline))).toBe(true);
});

describe("IFFA critical corpus meta", () => {
  it("entertainment classification keeps a film story off the default surface", () => {
    const c = classifyCategory({ title: "Superstar's next film: first look and title announced, trailer next month" });
    expect(c.category).toBe("entertainment");
  });
});
