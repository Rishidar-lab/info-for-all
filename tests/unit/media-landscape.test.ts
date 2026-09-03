import { describe, it, expect } from "vitest";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { EventClaims } from "@/lib/claims/types";
import { coverageContext, buildCoverageLandscape } from "@/lib/media-landscape/coverage";
import { compareFraming } from "@/lib/media-landscape/framing";
import { detectBlindspots } from "@/lib/media-landscape/blindspot";
import { buildClaimEvidence, buildEvidenceProfile, evidenceStrength } from "@/lib/media-landscape/evidence";
import { primaryEntity, entitiesIn } from "@/lib/media-landscape/entities";
import { readStance } from "@/lib/media-landscape/stance";

function art(o: { publisher: string; title: string; lang?: "ta" | "en"; districts?: string[]; excerpt?: string; role?: LiveArticle["role"] }): LiveArticle {
  return {
    id: "a-" + o.publisher + o.title.slice(0, 6),
    title: o.title,
    url: "https://x.ex/a",
    sourceId: "s",
    sourceName: o.publisher,
    publisher: o.publisher,
    role: o.role ?? "independent",
    sourceUrl: "https://x.ex",
    publishedAt: "2026-09-03T06:00:00Z",
    fetchedAt: "2026-09-03T06:10:00Z",
    language: o.lang ?? "en",
    scope: "tamil-nadu",
    districts: o.districts ?? [],
    geo: {} as LiveArticle["geo"],
    evidenceRole: "independent-report",
    verificationStatus: "single-source",
    excerpt: o.excerpt,
    crisisPriority: 30,
    isCrisis: false,
    lifecycle: "developing",
  } as LiveArticle;
}
function cluster(over: Partial<LiveCluster>): LiveCluster {
  return {
    id: "c", slug: "c", title: over.title ?? "t", scope: "tamil-nadu", districts: over.districts ?? [], isCrisis: false,
    crisisPriority: 30, lifecycle: "developing", updatedAt: "2026-09-03T06:00:00Z", languages: ["en"],
    articleIds: [], distinctPublishers: 1, publishers: over.publishers ?? [], sourceCount: 1, officialCount: 0,
    independentCount: 1, verificationStatus: "single-source", confidence: "weak", reason: "",
    isVerifiedComparison: false, commonGround: [], commonGroundPending: true, differences: [], unknowns: [],
    ...over,
  } as LiveCluster;
}

const CTX = coverageContext();

describe("v0.10 — CoverageLandscape (Phase 2)", () => {
  const arts = [
    art({ publisher: "The Hindu", title: "Government releases Cauvery water for irrigation", lang: "en" }),
    art({ publisher: "The Times of India", title: "After opposition pressure, Cauvery release increased", lang: "en" }),
    art({ publisher: "News18 Tamil", title: "காவிரி நீர் திறப்பு அதிகரிப்பு", lang: "ta", districts: ["Thanjavur"] }),
    art({ publisher: "Sportstar", title: "Reservoir discharge rises to 12,000 cusecs", lang: "en" }),
  ];
  const c = cluster({ title: "Cauvery water release", publishers: ["The Hindu", "The Times of India", "News18 Tamil", "Sportstar"] });

  it("counts publishers, families, languages, ownership", () => {
    const cov = buildCoverageLandscape(c, arts, CTX);
    expect(cov.totalArticles).toBe(4);
    expect(cov.uniquePublishers).toBe(4);
    // The Hindu + Sportstar are one family (Kasturi & Sons) → 3 families not 4
    expect(cov.independentSourceFamilies).toBe(3);
    expect(cov.tamilCount).toBe(1);
    expect(cov.englishCount).toBe(3);
    expect(cov.ownershipDistribution.MEDIA_CONGLOMERATE).toBeGreaterThanOrEqual(3);
  });

  it("reliability distribution is honest 'unrated' when no external ratings are integrated", () => {
    const cov = buildCoverageLandscape(c, arts, CTX);
    expect(Object.keys(cov.reliabilityDistribution)).toEqual(["unrated"]);
    expect(cov.reliabilityDistribution.unrated).toBe(4);
  });

  it("alignment is null with a stated reason until stance + history exist", () => {
    const cov = buildCoverageLandscape(c, arts, CTX);
    expect(cov.alignment).toBeNull();
    expect(cov.alignmentUnavailableReason).toMatch(/stance|history/i);
  });
});

describe("v0.10 — entities + stance", () => {
  it("finds political entities and the dominant one", () => {
    expect(entitiesIn("DMK slams BJP over the issue").map((e) => e.id).sort()).toEqual(["bjp", "dmk"]);
    expect(primaryEntity(["Tamil Nadu Government announces scheme", "State government scheme welcomed", "BJP reacts"])?.id).toBe("tn-government");
  });
  it("separates the article's own framing from quoted / reported speech", () => {
    const gov = entitiesIn("Tamil Nadu Government")[0];
    // reported speech: author is NEUTRAL, the quoted actor carries the stance
    const slam = readStance("Opposition slams Tamil Nadu Government over failure to act", gov);
    expect(slam.stance).toBe("neutral-descriptive");
    expect(slam.quotedStance).toBe("critical");
    const hail = readStance("Tamil Nadu Government hails record GST collections", gov);
    expect(hail.stance).toBe("neutral-descriptive");
    expect(hail.quotedStance).toBe("supportive");
    // plain event report
    expect(readStance("Tamil Nadu Government announces new water scheme", gov).stance).toBe("neutral-descriptive");
    // the ARTICLE'S OWN voice evaluates → author stance
    expect(readStance("Government's total failure exposed as the water crisis worsens", gov).stance).toBe("critical");
    expect(readStance("A masterstroke: the government's infrastructure blitz wins over sceptics", gov).stance).toBe("supportive");
  });
});

describe("v0.10 — FramingComparison (Phase 4)", () => {
  const arts = [
    art({ publisher: "The Hindu", title: "Tamil Nadu Government releases Cauvery water" }),
    art({ publisher: "The Times of India", title: "After opposition pressure, Cauvery water release increased" }),
    art({ publisher: "Mint", title: "Cauvery discharge rises to 12,000 cusecs" }),
  ];
  const c = cluster({ title: "Cauvery release", publishers: arts.map((a) => a.publisher) });

  it("extracts distinct emphasis per headline", () => {
    const f = compareFraming(c, arts);
    const byPub = Object.fromEntries(f.observations.map((o) => [o.publisherId, o.emphasis]));
    expect(byPub["the-hindu"]).toContain("government-action");
    expect(byPub["times-of-india"]).toContain("opposition-pressure");
    expect(byPub["mint"]).toContain("measurement-data");
    expect(f.framingDifferences.join(" ")).toMatch(/emphasise different/i);
  });

  it("flags loaded language and never picks a 'correct' framing", () => {
    const loud = [
      art({ publisher: "NDTV", title: "SHOCKING: Government's total failure exposed in water crisis" }),
      art({ publisher: "The Hindu", title: "Government releases water" }),
    ];
    const f = compareFraming(cluster({ publishers: ["NDTV", "The Hindu"] }), loud);
    const ndtv = f.observations.find((o) => o.publisherId === "ndtv")!;
    expect(ndtv.loadedPhrases.length).toBeGreaterThan(0);
    expect(f.framingDifferences.join(" ")).toMatch(/loaded or absolute/i);
  });
});

describe("v0.10 — Blindspot engine (Phase 6): asymmetry, never truth", () => {
  it("LANGUAGE blindspot when Tamil coverage dwarfs English", () => {
    const arts = [
      ...Array.from({ length: 8 }, (_, i) => art({ publisher: "News18 Tamil", title: `தமிழ் செய்தி ${i}`, lang: "ta" })),
      art({ publisher: "The Hindu", title: "One English report", lang: "en" }),
    ];
    const bs = detectBlindspots(cluster({ publishers: ["News18 Tamil", "The Hindu"] }), arts, CTX);
    const lang = bs.find((b) => b.type === "LANGUAGE");
    expect(lang).toBeTruthy();
    expect(lang!.description).toMatch(/not a judgement about whether the story is true/i);
  });

  it("SOURCE_FAMILY blindspot when one family dominates", () => {
    const arts = [
      art({ publisher: "The Hindu", title: "A" }),
      art({ publisher: "The Hindu BusinessLine", title: "B" }),
      art({ publisher: "Sportstar", title: "C" }),
      art({ publisher: "The Times of India", title: "D" }),
    ];
    // SOURCE_FAMILY / OWNERSHIP concentration is only flagged on a consequential
    // story (v0.11 audit F3) — a politics cluster qualifies.
    const c = cluster({ publishers: arts.map((a) => a.publisher), trendData: { category: "politics" } } as never);
    const bs = detectBlindspots(c, arts, CTX);
    expect(bs.some((b) => b.type === "SOURCE_FAMILY")).toBe(true);
    // ...but NOT on a routine other-relevant cluster
    const routine = cluster({ publishers: arts.map((a) => a.publisher), trendData: { category: "other-relevant" } } as never);
    expect(detectBlindspots(routine, arts, CTX).some((b) => b.type === "SOURCE_FAMILY")).toBe(false);
  });
});

describe("v0.10 — Claim Evidence Matrix (Phase 7)", () => {
  const claims: EventClaims = {
    eventId: "e1",
    generatedAt: "2026-09-03T06:00:00Z",
    claims: [
      { id: "cl1", eventId: "e1", canonicalText: "The reservoir discharge rose to 12,000 cusecs", type: "statistic", status: "corroborated", subjects: ["reservoir"], predicates: ["rose"], objects: ["12,000 cusecs"], supportingArticleIds: ["a1", "a2", "a3"], contradictingArticleIds: [], supportingPublisherIds: ["p1", "p2", "p3"], independentSourceGroups: [["p1"], ["p2"], ["p3"]], primaryEvidenceIds: ["ev1"], confidence: 90, confidenceBand: "high", rationale: [], notes: [], firstSeenAt: "2026-09-03T05:00:00Z", lastSeenAt: "2026-09-03T06:00:00Z", provenance: [], updates: [], corrections: [] },
      { id: "cl2", eventId: "e1", canonicalText: "The release followed opposition pressure", type: "attribution", status: "single-source", subjects: ["release"], predicates: ["followed"], objects: ["opposition pressure"], supportingArticleIds: ["a2"], contradictingArticleIds: [], supportingPublisherIds: ["p2"], independentSourceGroups: [["p2"]], primaryEvidenceIds: [], confidence: 40, confidenceBand: "low", rationale: [], notes: [], firstSeenAt: "2026-09-03T05:30:00Z", lastSeenAt: "2026-09-03T06:00:00Z", provenance: [], updates: [], corrections: [] },
    ],
    evidence: [{ id: "ev1", type: "government-document", title: "Water Resources Dept order", publisher: "Tamil Nadu Government", url: "https://x", supportsClaimIds: ["cl1"], provenance: {} }],
    disputes: [],
    unknowns: [],
    independence: { reports: 3, distinctPublishers: 3, independentGroups: 3, possibleSyndicated: 0, primarySources: 1 },
    cgi: null,
  };

  it("projects claims into the richer status vocabulary + primary docs", () => {
    const m = buildClaimEvidence(claims);
    expect(m).toHaveLength(2);
    expect(m[0].status).toBe("HIGHLY_CORROBORATED");
    expect(m[0].primaryEvidence[0].kind).toBe("government-order");
    expect(m[0].primaryEvidence[0].establishes).toMatch(/record/i);
    expect(m[1].status).toBe("SINGLE_SOURCE");
  });

  it("Evidence Profile is counts, not a truth percentage", () => {
    const m = buildClaimEvidence(claims);
    const p = buildEvidenceProfile(m, claims);
    expect(p.substantiveClaims).toBe(2);
    expect(p.byStatus.HIGHLY_CORROBORATED).toBe(1);
    expect(p.byStatus.SINGLE_SOURCE).toBe(1);
    expect(p.primaryDocumentSupported).toBe(1);
  });

  it("Evidence Strength Score is internal, carries a NOT-a-truth-probability disclaimer, exposes components", () => {
    const s = evidenceStrength(buildClaimEvidence(claims))!;
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
    expect(s.disclaimer).toMatch(/NOT a probability that the story is true/);
    expect(Object.keys(s.components)).toContain("independentCorroboration");
    expect(Object.keys(s.components)).toContain("singleSourcePenalty");
  });
});
