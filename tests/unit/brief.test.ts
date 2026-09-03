import { describe, it, expect } from "vitest";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Claim, EventClaims } from "@/lib/claims/types";
import { synthesizeBrief } from "@/lib/brief/synthesize";
import { verifyBrief } from "@/lib/brief/verify";
import { buildBriefs, microBrief } from "@/lib/brief/build";
import type { BriefSentence, IFFABrief } from "@/lib/brief/types";

// ── fixtures ────────────────────────────────────────────────────────────────

let seq = 0;
function mkArticle(o: Partial<LiveArticle> & { publisher: string; title: string }): LiveArticle {
  const id = o.id ?? `a${++seq}`;
  return {
    id,
    title: o.title,
    url: o.url ?? `https://ex.test/${id}`,
    sourceId: o.publisher,
    sourceName: o.publisher,
    publisher: o.publisher,
    role: o.role ?? "independent",
    sourceUrl: "https://ex.test",
    publishedAt: o.publishedAt ?? "2026-09-03T06:00:00.000Z",
    fetchedAt: "2026-09-03T06:10:00.000Z",
    language: o.language ?? "en",
    scope: o.scope ?? "tamil-nadu",
    districts: o.districts ?? [],
    geo: {} as LiveArticle["geo"],
    evidenceRole: o.evidenceRole ?? "independent-report",
    verificationStatus: "single-source",
    excerpt: o.excerpt,
    crisisPriority: 20,
    isCrisis: o.isCrisis ?? false,
    lifecycle: "developing",
  } as LiveArticle;
}

function mkClaim(o: Partial<Claim> & { id: string; canonicalText: string }): Claim {
  return {
    eventId: "evt",
    type: o.type ?? "fact",
    status: o.status ?? "corroborated",
    subjects: o.subjects ?? [],
    predicates: o.predicates ?? [],
    objects: o.objects ?? [],
    supportingArticleIds: o.supportingArticleIds ?? [],
    contradictingArticleIds: [],
    supportingPublisherIds: o.supportingPublisherIds ?? [],
    independentSourceGroups: o.independentSourceGroups ?? [],
    primaryEvidenceIds: o.primaryEvidenceIds ?? [],
    confidence: o.confidence ?? 70,
    confidenceBand: "moderate",
    rationale: [],
    firstSeenAt: "2026-09-03T06:00:00.000Z",
    lastSeenAt: "2026-09-03T06:00:00.000Z",
    provenance: o.provenance ?? [],
    updates: o.updates ?? [],
    corrections: [],
    notes: [],
    ...o,
  } as Claim;
}

function mkEventClaims(o: Partial<EventClaims> & { claims: Claim[] }): EventClaims {
  return {
    eventId: "evt",
    generatedAt: "2026-09-03T07:00:00.000Z",
    claims: o.claims,
    evidence: o.evidence ?? [],
    disputes: o.disputes ?? [],
    unknowns: o.unknowns ?? [],
    independence: o.independence ?? {
      reports: o.claims.length,
      distinctPublishers: 2,
      independentGroups: 2,
      possibleSyndicated: 0,
      primarySources: 0,
    },
    cgi: null,
  };
}

function mkCluster(o: Partial<LiveCluster> & { articles: LiveArticle[]; ec?: EventClaims }): LiveCluster {
  const arts = o.articles;
  return {
    id: "evt",
    slug: o.slug ?? "evt-story",
    title: o.title ?? arts[0]?.title ?? "Event",
    scope: o.scope ?? "tamil-nadu",
    districts: o.districts ?? [],
    isCrisis: o.isCrisis ?? false,
    crisisPriority: 20,
    lifecycle: "developing",
    updatedAt: "2026-09-03T06:30:00.000Z",
    languages: [...new Set(arts.map((a) => a.language))] as LiveCluster["languages"],
    articleIds: arts.map((a) => a.id),
    distinctPublishers: new Set(arts.map((a) => a.publisher)).size,
    publishers: [...new Set(arts.map((a) => a.publisher))],
    sourceCount: new Set(arts.map((a) => a.publisher)).size,
    officialCount: arts.filter((a) => a.role === "official").length,
    independentCount: arts.filter((a) => a.role !== "official").length,
    verificationStatus: "corroborated",
    confidence: "strong",
    reason: "",
    isVerifiedComparison: true,
    commonGround: [],
    commonGroundPending: false,
    differences: [],
    unknowns: [],
    claims: o.ec,
    cap: o.cap,
    trendData: {
      category: o.trendData?.category ?? "politics",
      geoTier: "P0",
      ...o.trendData,
    } as LiveCluster["trendData"],
    ...o,
  } as LiveCluster;
}

/** A cheap valid English brief for verifier-only tests. */
function baseBrief(over: Partial<IFFABrief> = {}): IFFABrief {
  return {
    eventId: "evt",
    slug: "evt-story",
    generatedAt: "2026-09-03T07:00:00.000Z",
    language: "en",
    category: "politics",
    headline: "Event",
    shortVersion: [],
    keyFacts: [],
    uncertainties: [],
    whyItMatters: [],
    whatChanged: [],
    disagreements: [],
    references: [],
    coverage: { sources: 3, families: 3, genuineFamilies: 3, familyLabel: "Multiple independent newsrooms", tamil: 1, english: 2, official: 0, primaryDocs: 0 },
    verification: { sentencesConsidered: 0, sentencesDropped: 0, dropReasons: [] },
    synthesizer: "deterministic-v1",
    ...over,
  };
}
function sentence(text: string, over: Partial<BriefSentence> = {}): BriefSentence {
  return {
    id: "s1",
    text,
    citations: { claimIds: ["c1"], sourceIds: ["a1"], evidenceIds: [] },
    support: "MODERATE",
    ...over,
  };
}

// ── the hallucination firewall ─────────────────────────────────────────────

describe("verifyBrief — hallucination firewall", () => {
  const a1 = mkArticle({ id: "a1", publisher: "The Hindu", title: "Flood displaces 200 people in Thanjavur", excerpt: "About 200 people were moved to relief camps in Thanjavur district on Tuesday." });
  const a2 = mkArticle({ id: "a2", publisher: "The Times of India", title: "200 shifted as Thanjavur floods", excerpt: "The district administration shifted 200 residents to safety." });
  const c1 = mkClaim({
    id: "c1",
    canonicalText: "About 200 people were moved to relief camps in Thanjavur.",
    status: "corroborated",
    supportingArticleIds: ["a1", "a2"],
    supportingPublisherIds: ["The Hindu", "The Times of India"],
    independentSourceGroups: [["a1"], ["a2"]],
    objects: ["200"],
    predicates: ["rescued"],
  });
  const ec = mkEventClaims({ claims: [c1] });
  const cluster = mkCluster({ articles: [a1, a2], ec, districts: ["Thanjavur"] });

  it("keeps a sentence whose entities, numbers and citation all check out", () => {
    const out = verifyBrief(baseBrief({ shortVersion: [sentence("About 200 people were moved to relief camps in Thanjavur.")] }), cluster, [a1, a2]);
    expect(out.shortVersion).toHaveLength(1);
    expect(out.withheldReason).toBeUndefined();
  });

  it("drops a sentence with a WRONG number", () => {
    const out = verifyBrief(baseBrief({ keyFacts: [sentence("About 900 people were moved to relief camps in Thanjavur.")] }), cluster, [a1, a2]);
    expect(out.keyFacts).toHaveLength(0);
    expect(out.verification.dropReasons.join()).toMatch(/number 900/);
  });

  it("drops a sentence with a WRONG district", () => {
    const out = verifyBrief(baseBrief({ keyFacts: [sentence("About 200 people were moved to relief camps in Chennai.", { text: "About 200 people were moved to relief camps in Coimbatore." })] }), cluster, [a1, a2]);
    expect(out.keyFacts).toHaveLength(0);
    expect(out.verification.dropReasons.join()).toMatch(/Coimbatore/);
  });

  it("drops a sentence with a fabricated entity", () => {
    const out = verifyBrief(baseBrief({ keyFacts: [sentence("The World Bank moved 200 people to relief camps in Thanjavur.")] }), cluster, [a1, a2]);
    expect(out.keyFacts).toHaveLength(0);
  });

  it("drops a sentence with NO citation binding", () => {
    const out = verifyBrief(
      baseBrief({ keyFacts: [sentence("Something happened.", { citations: { claimIds: [], sourceIds: [], evidenceIds: [] } })] }),
      cluster,
      [a1, a2],
    );
    expect(out.keyFacts).toHaveLength(0);
    expect(out.verification.dropReasons.join()).toMatch(/no citation binding/);
  });

  it("drops a sentence citing a claim that does not exist", () => {
    const out = verifyBrief(
      baseBrief({ keyFacts: [sentence("About 200 people were moved.", { citations: { claimIds: ["ghost"], sourceIds: ["a1"], evidenceIds: [] } })] }),
      cluster,
      [a1, a2],
    );
    expect(out.keyFacts).toHaveLength(0);
    expect(out.verification.dropReasons.join()).toMatch(/does not exist/);
  });

  it("withholds the brief when the short version has nothing verifiable", () => {
    const out = verifyBrief(baseBrief({ shortVersion: [sentence("The Moon is made of 5000 tonnes of cheese.")] }), cluster, [a1, a2]);
    expect(out.withheldReason).toBe("NO_VERIFIABLE_SENTENCE");
  });

  it("drops a WRONG unit", () => {
    const w1 = mkArticle({ id: "w1", publisher: "IMD", title: "120 mm rain recorded in Chennai", excerpt: "Chennai recorded 120 mm of rainfall." });
    const wc = mkClaim({ id: "wc", canonicalText: "120 mm of rainfall was recorded.", supportingArticleIds: ["w1"], objects: ["120"], predicates: ["rainfall_mm"], status: "single-source" });
    const wcl = mkCluster({ articles: [w1], ec: mkEventClaims({ claims: [wc] }) });
    const out = verifyBrief(baseBrief({ keyFacts: [sentence("120 cusecs of rainfall was recorded.", { citations: { claimIds: ["wc"], sourceIds: ["w1"], evidenceIds: [] } })] }), wcl, [w1]);
    expect(out.keyFacts).toHaveLength(0);
  });
});

// ── attribution / allegations ──────────────────────────────────────────────

describe("verifyBrief — attribution & allegations", () => {
  const a1 = mkArticle({ id: "a1", publisher: "The Hindu", title: "Opposition alleges corruption in road contract", excerpt: "The opposition alleged that the road contract involved corruption." });
  const alleg = mkClaim({
    id: "c1",
    canonicalText: "The opposition alleged corruption in the road contract.",
    type: "allegation",
    status: "attributed",
    supportingArticleIds: ["a1"],
    subjects: ["opposition"],
    provenance: [{ articleId: "a1", publisherId: "The Hindu", sourceUrl: "https://ex.test/a1", attribution: "opposition", extractionMethod: "rule", confidence: 0.6, seenAt: "2026-09-03T06:00:00.000Z" }],
  });
  const cluster = mkCluster({ articles: [a1], ec: mkEventClaims({ claims: [alleg] }) });

  it("drops an allegation rendered as a bare fact", () => {
    const out = verifyBrief(baseBrief({ keyFacts: [sentence("There was corruption in the road contract.")] }), cluster, [a1]);
    expect(out.keyFacts).toHaveLength(0);
    expect(out.verification.dropReasons.join()).toMatch(/allegation|bare fact/);
  });

  it("keeps an allegation that stays marked as an allegation", () => {
    const out = verifyBrief(
      baseBrief({ keyFacts: [sentence("The opposition alleged corruption in the road contract.", { attributedTo: "opposition" })] }),
      cluster,
      [a1],
    );
    expect(out.keyFacts).toHaveLength(1);
  });
});

// ── end-to-end synthesis ───────────────────────────────────────────────────

describe("synthesizeBrief — deterministic native brief", () => {
  it("builds a cited brief for a corroborated multi-source event", () => {
    const a1 = mkArticle({ id: "a1", publisher: "The Hindu", title: "Madras High Court rejects plea against TVK's Kolathur win", excerpt: "The Madras High Court on Wednesday rejected a plea challenging the Kolathur result." });
    const a2 = mkArticle({ id: "a2", publisher: "The Indian Express", title: "HC dismisses petition against Kolathur verdict", excerpt: "A division bench dismissed the petition." });
    const ev = mkClaim({ id: "c1", canonicalText: "Madras High Court rejects plea against TVK's Kolathur win", type: "event", status: "corroborated", supportingArticleIds: ["a1", "a2"], supportingPublisherIds: ["The Hindu", "The Indian Express"], independentSourceGroups: [["a1"], ["a2"]] });
    const cluster = mkCluster({ title: "Madras High Court rejects plea against TVK's Kolathur win", articles: [a1, a2], ec: mkEventClaims({ claims: [ev] }) });
    const b = verifyBrief(synthesizeBrief(cluster, [a1, a2], { language: "en" }), cluster, [a1, a2]);
    expect(b.withheldReason).toBeUndefined();
    expect(b.shortVersion.length).toBeGreaterThanOrEqual(1);
    for (const s of [...b.shortVersion, ...b.keyFacts]) {
      expect(s.citations.claimIds.length + s.citations.sourceIds.length).toBeGreaterThan(0);
    }
    expect(b.references.length).toBe(2);
  });

  it("withholds a single-source story with no official anchor", () => {
    const a1 = mkArticle({ id: "a1", publisher: "The Hindu", title: "Minister opens new bridge in Salem" });
    const ev = mkClaim({ id: "c1", canonicalText: "Minister opens new bridge in Salem", type: "event", status: "single-source", supportingArticleIds: ["a1"], supportingPublisherIds: ["The Hindu"], independentSourceGroups: [["a1"]] });
    const cluster = mkCluster({
      title: "Minister opens new bridge in Salem",
      articles: [a1],
      ec: mkEventClaims({ claims: [ev], independence: { reports: 1, distinctPublishers: 1, independentGroups: 1, possibleSyndicated: 0, primarySources: 0 } }),
      trendData: { category: "politics", independence: { families: 1, reports: 1, syndicated: 0, wireCredits: [], label: "one report" } } as LiveCluster["trendData"],
    });
    const b = verifyBrief(synthesizeBrief(cluster, [a1], { language: "en" }), cluster, [a1]);
    expect(b.withheldReason).toBe("NO_INDEPENDENT_COVERAGE");
  });

  it("supports a brief from a single OFFICIAL announcement (Authority X announced Y)", () => {
    const a1 = mkArticle({ id: "a1", publisher: "NDMA SACHET", title: "Very Heavy Rain — 5 districts of Tamil Nadu", role: "official", evidenceRole: "official-alert", excerpt: "Very Heavy Rain warning for 5 districts." });
    const cluster = mkCluster({
      title: "Very Heavy Rain",
      articles: [a1],
      isCrisis: true,
      cap: { event: "Very Heavy Rain", senderName: "Tamil Nadu SDMA", areaDescription: "5 districts of Tamil Nadu", severity: "Severe", effectiveFrom: "2026-09-03T12:00:00.000Z", effectiveUntil: "2026-09-04T06:00:00.000Z" },
      ec: mkEventClaims({ claims: [], independence: { reports: 1, distinctPublishers: 1, independentGroups: 1, possibleSyndicated: 0, primarySources: 1 } }),
      trendData: { category: "crisis" } as LiveCluster["trendData"],
    });
    const b = verifyBrief(synthesizeBrief(cluster, [a1], { language: "en" }), cluster, [a1]);
    expect(b.withheldReason).toBeUndefined();
    expect(b.shortVersion[0].text).toMatch(/Tamil Nadu SDMA/);
    expect(b.shortVersion[0].text).toMatch(/5 districts/);
  });

  it("keeps conflicting numbers visible instead of silently picking one", () => {
    const a1 = mkArticle({ id: "a1", publisher: "Local Paper", title: "7 dead in wall collapse", excerpt: "Local reports put the toll at 7." });
    const a2 = mkArticle({ id: "a2", publisher: "The Hindu", title: "Police confirm 4 dead in collapse", excerpt: "Police confirmed 4 deaths." });
    const ev = mkClaim({ id: "c1", canonicalText: "A wall collapsed", type: "event", status: "corroborated", supportingArticleIds: ["a1", "a2"], supportingPublisherIds: ["Local Paper", "The Hindu"], independentSourceGroups: [["a1"], ["a2"]] });
    const cluster = mkCluster({
      title: "Wall collapse",
      articles: [a1, a2],
      ec: mkEventClaims({
        claims: [ev],
        disputes: [
          {
            field: "deaths",
            a: { value: "7", publisherIds: ["Local Paper"], at: "2026-09-03T05:00:00.000Z" },
            b: { value: "4", publisherIds: ["The Hindu"], at: "2026-09-03T06:00:00.000Z" },
            reason: "Sources report different death tolls.",
            kind: "numeric",
            confidence: "moderate",
            possiblyTemporalUpdate: false,
          },
        ],
      }),
    });
    const b = verifyBrief(synthesizeBrief(cluster, [a1, a2], { language: "en" }), cluster, [a1, a2]);
    expect(b.disagreements).toHaveLength(1);
    expect(b.disagreements[0].positions.map((p) => p.value).sort()).toEqual(["4", "7"]);
    expect(b.disagreements[0].reasoning).toMatch(/not|≠|best/i);
  });
});

// ── syndication / primary source ───────────────────────────────────────────

describe("brief respects the frozen engine's guarantees", () => {
  it("withholds when two publishers both carry the same wire dispatch (§B.1)", () => {
    const a1 = mkArticle({ id: "a1", publisher: "The Hindu", title: "Cabinet clears new policy (PTI)", excerpt: "(PTI) The cabinet cleared the policy on Wednesday." });
    const a2 = mkArticle({ id: "a2", publisher: "The Times of India", title: "Cabinet clears new policy (PTI)", excerpt: "(PTI) The cabinet cleared the policy on Wednesday." });
    const ev = mkClaim({
      id: "c1",
      canonicalText: "The cabinet cleared a new policy",
      type: "event",
      status: "partially-corroborated",
      supportingArticleIds: ["a1", "a2"],
      supportingPublisherIds: ["The Hindu", "The Times of India"],
      independentSourceGroups: [["a1", "a2"]],
    });
    const cluster = mkCluster({ title: "Cabinet clears new policy", articles: [a1, a2], ec: mkEventClaims({ claims: [ev] }) });
    const b = verifyBrief(synthesizeBrief(cluster, [a1, a2], { language: "en" }), cluster, [a1, a2]);
    expect(b.withheldReason).toBe("NO_INDEPENDENT_COVERAGE");
    expect(b.withheldDetail).toMatch(/PTI|dispatch|reprinted/i);
  });

  it("withholds when a syndicated repost is the only 'second source' (≥85% body overlap)", () => {
    const body = "A wall of an old building in the market area collapsed early on Wednesday, and rescue teams were pressed into service to clear the debris.";
    const a1 = mkArticle({ id: "a1", publisher: "The Hindu", title: "Wall collapses in market area", excerpt: body });
    const a2 = mkArticle({ id: "a2", publisher: "Mint", title: "Wall collapses in market area", excerpt: body });
    const ev = mkClaim({ id: "c1", canonicalText: "A wall collapsed in the market area", type: "event", status: "partially-corroborated", supportingArticleIds: ["a1", "a2"], supportingPublisherIds: ["The Hindu", "Mint"], independentSourceGroups: [["a1"], ["a2"]] });
    const cluster = mkCluster({ title: "Wall collapses in market area", articles: [a1, a2], ec: mkEventClaims({ claims: [ev] }) });
    const b = verifyBrief(synthesizeBrief(cluster, [a1, a2], { language: "en" }), cluster, [a1, a2]);
    expect(b.withheldReason).toBe("NO_INDEPENDENT_COVERAGE");
    expect(b.withheldDetail).toMatch(/verbatim|copy/i);
  });

  it("delivers when two genuinely independent newsrooms report it", () => {
    const a1 = mkArticle({ id: "a1", publisher: "The Hindu", title: "Assembly passes the records bill", excerpt: "The assembly passed the records bill on Wednesday after a two-hour debate." });
    const a2 = mkArticle({ id: "a2", publisher: "The Indian Express", title: "Records bill cleared", excerpt: "Members cleared the bill; the opposition sought two amendments that were rejected." });
    const ev = mkClaim({ id: "c1", canonicalText: "The assembly passed the records bill", type: "event", status: "corroborated", supportingArticleIds: ["a1", "a2"], supportingPublisherIds: ["The Hindu", "The Indian Express"], independentSourceGroups: [["a1"], ["a2"]] });
    const cluster = mkCluster({ title: "Assembly passes the records bill", articles: [a1, a2], ec: mkEventClaims({ claims: [ev] }) });
    const b = verifyBrief(synthesizeBrief(cluster, [a1, a2], { language: "en" }), cluster, [a1, a2]);
    expect(b.withheldReason).toBeUndefined();
    expect(b.coverage.genuineFamilies).toBe(2);
  });

  it("a lead never claims '3+ families' from one independent group", () => {
    const a1 = mkArticle({ id: "a1", publisher: "The Hindu", title: "Assembly clears the bill", excerpt: "The assembly cleared the bill after a debate on Wednesday afternoon." });
    const a2 = mkArticle({ id: "a2", publisher: "The Indian Express", title: "Bill cleared by the assembly", excerpt: "The house cleared it; a walkout by the opposition preceded the vote." });
    const ev = mkClaim({ id: "c1", canonicalText: "The assembly cleared the bill", type: "event", status: "partially-corroborated", supportingArticleIds: ["a1", "a2"], supportingPublisherIds: ["The Hindu", "The Indian Express"], independentSourceGroups: [["a1", "a2"]] });
    const cluster = mkCluster({ title: "Assembly clears the bill", articles: [a1, a2], ec: mkEventClaims({ claims: [ev] }) });
    const b = verifyBrief(synthesizeBrief(cluster, [a1, a2], { language: "en" }), cluster, [a1, a2]);
    expect(b.shortVersion[0]?.support).not.toBe("STRONG");
  });

  it("a primary source does not become objective truth — it stays attributed/official", () => {
    const a1 = mkArticle({ id: "a1", publisher: "PIB", title: "Government announces relief package", role: "official", evidenceRole: "government-statement", excerpt: "The government announced a relief package." });
    const ev = mkClaim({
      id: "c1",
      canonicalText: "Government stated: a relief package was announced",
      type: "attribution",
      status: "attributed",
      supportingArticleIds: ["a1"],
      subjects: ["government"],
      provenance: [{ articleId: "a1", publisherId: "PIB", sourceUrl: "https://ex.test/a1", attribution: "government", extractionMethod: "rule", confidence: 0.7, seenAt: "2026-09-03T06:00:00.000Z" }],
    });
    const cluster = mkCluster({
      title: "Government announces relief package",
      articles: [a1],
      ec: mkEventClaims({ claims: [ev], independence: { reports: 1, distinctPublishers: 1, independentGroups: 1, possibleSyndicated: 0, primarySources: 1 } }),
      trendData: { category: "politics", politicalCoverage: { actors: ["government"], speechAct: "announcement", claimCount: 1, hasResponse: false, hasOfficialRecord: true, independentFamilies: 1, unanswered: false, note: "" } } as LiveCluster["trendData"],
    });
    const b = verifyBrief(synthesizeBrief(cluster, [a1], { language: "en" }), cluster, [a1]);
    const all = [...b.shortVersion, ...b.keyFacts].map((s) => s.text).join(" ");
    expect(all).toMatch(/announced|said|stated|according to/i);
  });
});

// ── Tamil ↔ English parity ─────────────────────────────────────────────────

describe("Tamil and English briefs share claim ids", () => {
  it("Tamil sentences carry the same citations as their English counterparts", () => {
    const a1 = mkArticle({ id: "a1", publisher: "News18 Tamil", language: "ta", title: "தஞ்சாவூரில் 200 பேர் நிவாரண முகாம்களுக்கு மாற்றம்", excerpt: "தஞ்சாவூர் மாவட்டத்தில் 200 பேர் பாதுகாப்பான இடங்களுக்கு மாற்றப்பட்டனர்." });
    const a2 = mkArticle({ id: "a2", publisher: "The Hindu", language: "en", title: "200 shifted to relief camps in Thanjavur", excerpt: "About 200 people were moved to relief camps by the district administration." });
    const ev = mkClaim({
      id: "c1",
      canonicalText: "About 200 people were moved to relief camps in Thanjavur.",
      canonicalTextOriginal: "தஞ்சாவூரில் 200 பேர் நிவாரண முகாம்களுக்கு மாற்றப்பட்டனர்.",
      type: "statistic",
      status: "corroborated",
      objects: ["200"],
      predicates: ["rescued"],
      supportingArticleIds: ["a1", "a2"],
      supportingPublisherIds: ["News18 Tamil", "The Hindu"],
      independentSourceGroups: [["a1"], ["a2"]],
      provenance: [
        { articleId: "a1", publisherId: "News18 Tamil", sourceUrl: "https://ex.test/a1", language: "ta", sourceTextOriginal: "தஞ்சாவூர் மாவட்டத்தில் 200 பேர் மாற்றப்பட்டனர்.", extractionMethod: "rule", confidence: 0.6, seenAt: "2026-09-03T06:00:00.000Z" },
      ],
    });
    const cluster = mkCluster({ title: "Thanjavur flood relief", scope: "tamil-nadu", districts: ["Thanjavur"], articles: [a1, a2], ec: mkEventClaims({ claims: [ev] }) });
    const { en, ta } = buildBriefs(cluster, [a1, a2], { tamil: true });
    expect(ta).toBeDefined();
    expect(ta!.withheldReason).toBeUndefined();
    const enIds = new Set(en.shortVersion.flatMap((s) => s.citations.claimIds));
    for (const s of ta!.shortVersion) {
      for (const id of s.citations.claimIds) expect(enIds.has(id)).toBe(true);
      expect(s.text).toMatch(/[஀-௿]/); // actually Tamil
    }
  });
});

// ── micro-brief ────────────────────────────────────────────────────────────

describe("microBrief", () => {
  it("produces a short native summary for a covered story and nothing for a withheld one", () => {
    const a1 = mkArticle({ id: "a1", publisher: "The Hindu", title: "Assembly passes digital-records bill", excerpt: "The assembly passed the bill on Wednesday." });
    const a2 = mkArticle({ id: "a2", publisher: "The Indian Express", title: "Digital records bill cleared by assembly", excerpt: "The bill was cleared unanimously." });
    const ev = mkClaim({ id: "c1", canonicalText: "The assembly passed a digital-records bill", type: "event", status: "corroborated", supportingArticleIds: ["a1", "a2"], supportingPublisherIds: ["The Hindu", "The Indian Express"], independentSourceGroups: [["a1"], ["a2"]] });
    const cluster = mkCluster({ title: "Assembly passes digital-records bill", articles: [a1, a2], ec: mkEventClaims({ claims: [ev] }) });
    const mb = microBrief(cluster, [a1, a2]);
    expect(mb.withheld).toBe(false);
    expect(mb.text.split(/\s+/).length).toBeLessThanOrEqual(62);
    expect(mb.text.length).toBeGreaterThan(0);

    const s1 = mkArticle({ id: "s1", publisher: "One Paper", title: "Rare bird spotted" });
    const sc = mkCluster({
      title: "Rare bird spotted",
      articles: [s1],
      ec: mkEventClaims({ claims: [mkClaim({ id: "x", canonicalText: "A rare bird was spotted", type: "event", status: "single-source", supportingArticleIds: ["s1"], independentSourceGroups: [["s1"]] })], independence: { reports: 1, distinctPublishers: 1, independentGroups: 1, possibleSyndicated: 0, primarySources: 0 } }),
      trendData: { category: "other-relevant", independence: { families: 1, reports: 1, syndicated: 0, wireCredits: [], label: "one" } } as LiveCluster["trendData"],
    });
    expect(microBrief(sc, [s1]).withheld).toBe(true);
  });
});
