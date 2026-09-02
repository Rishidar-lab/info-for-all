import { describe, it, expect } from "vitest";
import { normalizeItem } from "@/lib/live/normalize";
import { clusterArticles } from "@/lib/live/cluster";
import { buildEventClaims } from "@/lib/claims";
import { extractCandidates, detectAttribution, parseFigures } from "@/lib/claims/extract";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";

const NOW = Date.parse("2026-09-02T06:00:00Z");
const h = (n: number) => new Date(NOW - n * 3600_000).toISOString();

function feed(over: Partial<FeedSource>): FeedSource {
  return {
    id: "f", name: "F", publisher: "F", homepage: "https://f.example", url: "https://f.example/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "tamil-nadu", role: "independent", enabled: true, ...over,
  };
}
const hindu = feed({ id: "h", publisher: "The Hindu" });
const toi = feed({ id: "t", publisher: "The Times of India" });
function mk(f: FeedSource, title: string, published = h(3), summary?: string): LiveArticle {
  return normalizeItem(f, { title, link: `https://x.example/${encodeURIComponent(title.slice(0, 24))}`, guid: title, published, summary }, h(0), NOW).article!;
}
function claimsFor(arts: LiveArticle[], anchor: string) {
  const { clusters } = clusterArticles(arts, NOW);
  const cl = clusters.find((c) => c.articleIds.includes(anchor))!;
  return buildEventClaims(cl, cl.articleIds.map((id) => arts.find((a) => a.id === id)!), NOW);
}

describe("v0.4 extraction — bare attributed / allegation / prediction (Phase 2, 6)", () => {
  it("'the opposition alleged corruption' becomes an allegation claim, never a fact", () => {
    const a = mk(hindu, "Opposition alleged corruption in flood relief procurement");
    const ec = claimsFor([a], a.id);
    const c = ec.claims.find((x) => x.type === "allegation");
    expect(c).toBeTruthy();
    expect(c!.status).toBe("attributed");
    expect(c!.provenance.some((p) => /opposition/i.test(p.attribution ?? ""))).toBe(true);
    expect(ec.claims.some((x) => x.type === "fact")).toBe(false);
  });

  it("'Officials expect heavy rainfall tomorrow' becomes a prediction, not observed rain", () => {
    const a = mk(hindu, "Officials expect heavy rainfall over the delta districts tomorrow");
    const ec = claimsFor([a], a.id);
    expect(ec.claims.some((x) => x.type === "prediction" || x.status === "attributed")).toBe(true);
    expect(ec.claims.some((x) => x.type === "statistic" && x.predicates.includes("rainfall_mm"))).toBe(false);
  });

  it("two papers quoting the same minister figure stay one attributed claim (not corroborated)", () => {
    const a = mk(hindu, "More than 10,000 people received flood aid, the Revenue Minister said");
    const b = mk(toi, "Revenue Minister says over 10,000 people got flood assistance");
    const ec = claimsFor([a, b], a.id);
    const c = ec.claims.find((x) => x.status === "attributed");
    expect(c).toBeTruthy();
    expect(c!.status).not.toBe("corroborated");
    expect(new Set(c!.provenance.map((p) => p.articleId)).size).toBe(2);
  });

  it("detectAttribution handles 'per the district administration' and institution-before-verb", () => {
    expect(detectAttribution("Per the district administration, 300 relief camps are open")).toMatch(/district administration/i);
    expect(detectAttribution("Doctors at the government hospital said all the injured were stable")).toMatch(/doctors/i);
  });
});

describe("v0.4 figures — word numbers, verb-first, running totals", () => {
  it("parses spelled-out numbers", () => {
    expect(parseFigures("Three people were injured in the collapse")).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "injuries", value: 3 })]),
    );
  });
  it("parses verb-first and running-total phrasings", () => {
    expect(parseFigures("Wall collapse kills 3 in Chennai")).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "deaths", value: 3 })]),
    );
    expect(parseFigures("Rain toll climbs to 11")).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "deaths", value: 11 })]),
    );
    expect(parseFigures("Evacuations cross 5,000 in Thanjavur")).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "rescued", value: 5000 })]),
    );
  });
  it("still parses the v0.3 baseline cases exactly", () => {
    expect(parseFigures("113.4 mm of rain recorded")).toEqual([expect.objectContaining({ kind: "rainfall_mm", value: 113.4 })]);
  });
});

describe("v0.4 temporal — a falling developing count is still an update, not a contradiction", () => {
  it("missing count 3 → 1 over hours supersedes, does not dispute", () => {
    const a = mk(hindu, "3 missing after the boat capsize off Nagapattinam", h(8));
    const b = mk(toi, "Nagapattinam boat capsize: 1 missing after 2 reach shore", h(1));
    const ec = claimsFor([a, b], a.id);
    const dsp = ec.disputes.find((d) => d.field === "missing");
    expect(dsp?.possiblyTemporalUpdate).toBe(true);
    const missing = ec.claims.filter((c) => c.predicates.includes("missing"));
    expect(missing.some((c) => c.status === "disputed")).toBe(false);
    expect(missing.some((c) => c.updates.length > 0 || c.status === "outdated")).toBe(true);
  });
});

describe("v0.4 Tamil — canonical language + translationMethod (Phase 14)", () => {
  it("a Tamil-only claim keeps Tamil canonical text and records translationMethod 'none'", () => {
    const cluster = { id: "evt", title: "மேட்டூர் அணை", unknowns: [], isCrisis: false } as unknown as LiveCluster;
    const ta = {
      id: "ta1",
      title: "மேட்டூர் அணையில் இருந்து தண்ணீர் திறந்து விடப்பட்டது",
      excerpt: "மேட்டூர் அணையில் இருந்து காவிரி ஆற்றில் தண்ணீர் திறக்கப்பட்டது",
      url: "https://n.example/ta1",
      publisher: "News18 Tamil",
      publishedAt: h(3),
    } as LiveArticle;
    const ec = buildEventClaims(cluster, [ta], NOW);
    const head = ec.claims.find((c) => c.type === "event")!;
    expect(head.canonicalLanguage).toBe("ta");
    expect(head.translationMethod).toBe("none");
    expect(head.canonicalTextOriginal && head.canonicalTextOriginal.length).toBeGreaterThan(0);
  });

  it("extractCandidates keeps the Tamil source sentence verbatim", () => {
    const cluster = { id: "evt", title: "x" } as LiveCluster;
    const ta = { id: "t", title: "கடலூரில் வெள்ளத்தில் சிக்கிய 12 பேர் மீட்பு", excerpt: undefined, url: "https://n.example/t", publisher: "PT", publishedAt: h(3) } as LiveArticle;
    const cands = extractCandidates(cluster, [ta]);
    expect(cands.some((c) => c.language === "ta" && !!c.sourceTextOriginal)).toBe(true);
  });
});

describe("v0.4 independence signal feeds confidence (Phase 18)", () => {
  it("unknown independence caps a claim below the High band", () => {
    const a = { ...mk(hindu, "Rain toll rises"), excerpt: undefined };
    const b = { ...mk(toi, "Storm warning issued"), excerpt: undefined };
    const ec = claimsFor([a, b], a.id);
    for (const c of ec.claims) expect(c.confidence).toBeLessThan(70);
  });
});
