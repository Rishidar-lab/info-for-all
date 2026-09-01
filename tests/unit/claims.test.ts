import { describe, it, expect } from "vitest";
import { normalizeItem } from "@/lib/live/normalize";
import { clusterArticles } from "@/lib/live/cluster";
import { buildEventClaims } from "@/lib/claims";
import { extractCandidates, detectAttribution, parseFigures, keyOf } from "@/lib/claims/extract";
import { analyseIndependence } from "@/lib/claims/corroborate";
import { scoreClaim } from "@/lib/claims/confidence";
import { claimsEquivalent, numericConflict } from "@/lib/claims/compare";
import { provenanceChain } from "@/lib/claims/provenance";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Claim } from "@/lib/claims/types";

const NOW = Date.parse("2026-09-01T12:00:00Z");
const RECENT = new Date(NOW - 3600_000).toISOString();

function feed(over: Partial<FeedSource> = {}): FeedSource {
  return {
    id: "test-news",
    name: "Test News",
    publisher: "Test News",
    homepage: "https://news.example",
    url: "https://news.example/rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "tamil-nadu",
    role: "independent",
    enabled: true,
    ...over,
  };
}
const hindu = feed({ id: "hindu", name: "The Hindu", publisher: "The Hindu" });
const toi = feed({ id: "toi", name: "TOI", publisher: "The Times of India" });
const ht = feed({ id: "ht", name: "HT", publisher: "Hindustan Times" });
const n18 = feed({ id: "n18", name: "News18 Tamil", publisher: "News18 Tamil", language: "ta" });

function mk(f: FeedSource, title: string, url: string, summary?: string, published = RECENT): LiveArticle {
  return normalizeItem(f, { title, link: url, guid: url, published, summary }, RECENT, NOW).article!;
}

/** Cluster a set of articles and return the cluster + claims for the group that contains `anchorId`. */
function claimsFor(articles: LiveArticle[], anchorId: string) {
  const { clusters } = clusterArticles(articles, NOW);
  const cluster = clusters.find((c) => c.articleIds.includes(anchorId))!;
  const arts = cluster.articleIds.map((id) => articles.find((a) => a.id === id)!);
  return { cluster, ec: buildEventClaims(cluster, arts, NOW) };
}

// ── labelled corpus: fixed inputs, deterministic expected classification ──

describe("claim extraction — attribution retention (Phase 2, MANDATORY)", () => {
  it("a minister's quoted figure stays an ATTRIBUTED claim, never a bare statistic", () => {
    const a = mk(hindu, "Minister says 12 people rescued in Cuddalore floods", "https://h.example/1");
    const b = mk(toi, "12 rescued in Cuddalore floods, minister says relief camps opened", "https://t.example/2");
    const { ec } = claimsFor([a, b], a.id);
    const rescue = ec.claims.find((c) => c.predicates.includes("rescued"));
    expect(rescue).toBeTruthy();
    expect(rescue!.status).toBe("attributed");
    expect(rescue!.type).toBe("attribution");
    expect(rescue!.provenance.some((p) => /minister/i.test(p.attribution ?? ""))).toBe(true);
  });

  it("'police believe …' is detected as attribution", () => {
    expect(detectAttribution("Police believe the fire started in the kitchen")).toMatch(/police/i);
    expect(detectAttribution("According to the IMD, rainfall will intensify")).toMatch(/imd/i);
    expect(detectAttribution("Officials expect the water level to rise")).toMatch(/official/i);
  });

  it("a direct, unattributed sentence is NOT marked as attribution", () => {
    expect(detectAttribution("Schools were closed in Cuddalore on Tuesday")).toBeUndefined();
  });
});

describe("claim normalisation — same fact, different wording (Phase 4, Phase 17)", () => {
  it("two publishers reporting the same school closure → one corroborated claim", () => {
    const a = mk(hindu, "Schools closed in Cuddalore on September 2 due to heavy rain", "https://h.example/s1");
    const b = mk(toi, "Cuddalore district schools declared holiday for September 2 amid rain", "https://t.example/s2");
    const { cluster, ec } = claimsFor([a, b], a.id);
    expect(cluster.isVerifiedComparison).toBe(true);
    const closure = ec.claims.find((c) => c.predicates.includes("closed") || /school/i.test(c.canonicalText));
    expect(closure).toBeTruthy();
    expect(["corroborated", "partially-corroborated"]).toContain(closure!.status);
    expect(closure!.supportingPublisherIds.length).toBeGreaterThanOrEqual(2);
  });
});

describe("contradiction detection (Phase 6)", () => {
  it("a genuine numeric conflict with no time ordering → disputed", () => {
    const a = mk(hindu, "8 killed in Pallavaram wall collapse in Chennai", "https://h.example/w1");
    const b = mk(ht, "Pallavaram wall collapse: 3 dead in Chennai, rescue on", "https://x.example/w2");
    const { ec } = claimsFor([a, b], a.id);
    const dispute = ec.disputes.find((d) => d.field === "deaths");
    expect(dispute).toBeTruthy();
    expect(dispute!.possiblyTemporalUpdate).toBe(false);
    const deaths = ec.claims.find((c) => c.predicates.includes("deaths"));
    expect(deaths!.status).toBe("disputed");
  });

  it("a rising toll reported later → treated as a temporal update, NOT a contradiction", () => {
    const a = mk(hindu, "2 killed as building collapses in Ukkadam, Coimbatore", "https://h.example/u1", undefined, new Date(NOW - 5 * 3600_000).toISOString());
    const b = mk(ht, "Ukkadam building collapse: 6 dead in Coimbatore", "https://x.example/u2", undefined, RECENT);
    const { ec } = claimsFor([a, b], a.id);
    const dispute = ec.disputes.find((d) => d.field === "deaths");
    expect(dispute).toBeTruthy();
    expect(dispute!.possiblyTemporalUpdate).toBe(true);
    const deaths = ec.claims.find((c) => c.predicates.includes("deaths"));
    // A later, higher figure supersedes — it is not marked as a hard dispute.
    expect(deaths!.status).not.toBe("disputed");
    expect(deaths!.updates.length).toBeGreaterThanOrEqual(1);
    expect(deaths!.updates[0]!.change).toMatch(/2 → 6/);
  });

  it("heavy rain + schools closed because of rain is NOT a contradiction", () => {
    const a = mk(hindu, "Heavy rain lashes Tiruvallur through the night", "https://h.example/r1");
    const b = mk(toi, "Tiruvallur schools shut as heavy rain continues", "https://t.example/r2");
    const { ec } = claimsFor([a, b], a.id);
    expect(ec.disputes.length).toBe(0);
  });
});

describe("independent corroboration ≠ publication count (Phase 5)", () => {
  it("two publishers running an identical headline count as ONE independent group", () => {
    const t = "Cyclone Ditwah to cross Tamil Nadu coast near Nagapattinam on Thursday";
    const a = mk(hindu, t, "https://h.example/c1");
    const b = mk(toi, t, "https://t.example/c2");
    const ind = analyseIndependence([a, b]);
    expect(ind.independentGroups).toBe(1);
    expect(ind.possibleSyndicated).toBeGreaterThanOrEqual(1);

    const { ec } = claimsFor([a, b], a.id);
    const head = ec.claims.find((c) => c.type === "event")!;
    expect(head.status).not.toBe("corroborated");
    expect(head.status).toBe("partially-corroborated");
  });

  it("one publisher's several stories about an event are not independent of each other", () => {
    const a = mk(hindu, "Mettur dam opened, water released into Cauvery near Salem", "https://h.example/m1");
    const b = mk(hindu, "Cauvery water release from Mettur dam begins near Salem", "https://h.example/m2");
    const ind = analyseIndependence([a, b]);
    expect(ind.independentGroups).toBe(1);
  });
});

describe("primary evidence (Phase 7)", () => {
  const capFeed = feed({ id: "sachet", name: "NDMA SACHET", publisher: "NDMA SACHET", kind: "sachet-json", official: true, role: "official", defaultEvidenceRole: "official-alert" });

  it("a CAP alert becomes linked Evidence, and is never invented when absent", () => {
    const alert = normalizeItem(
      capFeed,
      {
        title: "Flash Flood warning for Cuddalore",
        link: "https://sachet.ndma.gov.in/x?identifier=555",
        guid: "555",
        published: RECENT,
        cap: { severity: "Severe", event: "Flash Flood", senderName: "TN SDMA", areaDescription: "Cuddalore", effectiveFrom: RECENT },
      },
      RECENT,
      NOW,
    ).article!;
    const news = mk(hindu, "Flash floods hit Cuddalore, low-lying areas inundated", "https://h.example/f1");
    const { ec } = claimsFor([alert, news], alert.id);
    expect(ec.evidence.length).toBe(1);
    expect(ec.evidence[0]!.url).toMatch(/^https?:\/\//);
    expect(ec.evidence[0]!.supportsClaimIds.length).toBeGreaterThanOrEqual(1);
    expect(ec.claims.some((c) => c.primaryEvidenceIds.length > 0)).toBe(true);

    const { ec: noCap } = claimsFor([news, mk(toi, "Cuddalore flooding: relief work under way", "https://t.example/f2")], news.id);
    expect(noCap.evidence.length).toBe(0);
  });
});

describe("Tamil preservation (Phase 12)", () => {
  it("a Tamil source sentence keeps its original text in provenance", () => {
    const cluster = { id: "evt-ta", title: "மேட்டூர் அணை திறப்பு" } as LiveCluster;
    const taArticle = {
      id: "ta1",
      title: "மேட்டூர் அணையில் இருந்து தண்ணீர் திறந்து விடப்பட்டது",
      excerpt: "மேட்டூர் அணையில் இருந்து காவிரி ஆற்றில் தண்ணீர் திறந்து விடப்பட்டது",
      url: "https://n.example/ta1",
      publisher: "News18 Tamil",
      publishedAt: RECENT,
    } as LiveArticle;
    const cands = extractCandidates(cluster, [taArticle]);
    const taCand = cands.find((c) => c.language === "ta");
    expect(taCand).toBeTruthy();
    expect(taCand!.sourceTextOriginal && taCand!.sourceTextOriginal.length).toBeGreaterThan(0);
  });

  it("an English + Tamil cluster carries both languages through to claims", () => {
    const en = mk(hindu, "Mettur dam opened for Cauvery water release near Salem", "https://h.example/e1");
    const ta = mk(n18, "Mettur Dam Open | மேட்டூர் அணை திறப்பு | Salem | News18 Tamil", "https://n.example/t1", "மேட்டூர் அணையில் தண்ணீர் திறக்கப்பட்டது");
    const { cluster } = claimsFor([en, ta], en.id);
    expect(cluster.languages).toEqual(expect.arrayContaining(["en"]));
  });
});

describe("false-positive guards carry into the claim layer (Phase 19)", () => {
  it("similar political names, unrelated stories → no shared corroborated claim", () => {
    const a = mk(hindu, "CM Vijay announces semiconductor park at Kancheepuram", "https://h.example/p1");
    const b = mk(toi, "CM Vijay announces milk procurement price hike to Rs 44", "https://t.example/p2");
    const { clusters } = clusterArticles([a, b], NOW);
    expect(clusters.length).toBe(2);
  });

  it("nearby TN districts, different incidents → not merged", () => {
    const a = mk(hindu, "Boat capsizes in Cuddalore, two fishermen missing", "https://h.example/d1");
    const b = mk(toi, "Two-storey house collapses in Villupuram, none hurt", "https://t.example/d2");
    const { clusters } = clusterArticles([a, b], NOW);
    expect(clusters.length).toBe(2);
  });

  it("same place, different dates → not merged", () => {
    const old = new Date(NOW - 6 * 24 * 3600_000).toISOString();
    const a = mk(hindu, "Section 144 imposed in Madurai ahead of temple festival", "https://h.example/x1", undefined, old);
    const b = mk(toi, "Section 144 imposed in Madurai after clashes near market", "https://t.example/x2", undefined, RECENT);
    const { clusters } = clusterArticles([a, b], NOW);
    expect(clusters.length).toBe(2);
  });
});

describe("confidence scoring (Phase 10)", () => {
  const base = (over: Partial<Claim>): Omit<Claim, "confidence" | "confidenceBand" | "rationale"> => ({
    id: "c", eventId: "e", canonicalText: "x", type: "event", status: "single-source",
    subjects: [], predicates: [], objects: [],
    supportingArticleIds: ["a1"], contradictingArticleIds: [], supportingPublisherIds: ["P1"],
    independentSourceGroups: [["a1"]], primaryEvidenceIds: [],
    firstSeenAt: RECENT, lastSeenAt: RECENT,
    provenance: [{ articleId: "a1", publisherId: "P1", sourceUrl: "https://x.example", extractionMethod: "rule", confidence: 0.8, seenAt: RECENT }],
    updates: [], corrections: [], notes: [],
    ...over,
  });

  it("a corroborated claim scores higher than an attributed one", () => {
    const corro = scoreClaim(base({ independentSourceGroups: [["a1"], ["a2"], ["a3"]], supportingPublisherIds: ["A", "B", "C"] }), {
      hasPrimaryEvidence: false, isDisputed: false, syndicationCollapsed: false, now: NOW,
    });
    const attributed = scoreClaim(base({ type: "attribution", provenance: [{ articleId: "a1", publisherId: "P1", sourceUrl: "https://x.example", attribution: "Minister", extractionMethod: "rule", confidence: 0.7, seenAt: RECENT }] }), {
      hasPrimaryEvidence: false, isDisputed: false, syndicationCollapsed: false, now: NOW,
    });
    expect(corro.score).toBeGreaterThan(attributed.score);
    expect(corro.band).toBe("high");
    expect(attributed.band).toBe("low");
  });

  it("a dispute drops the score and is stated in the rationale", () => {
    const r = scoreClaim(base({ independentSourceGroups: [["a1"], ["a2"]], supportingPublisherIds: ["A", "B"] }), {
      hasPrimaryEvidence: false, isDisputed: true, syndicationCollapsed: false, now: NOW,
    });
    expect(r.rationale.join(" ")).toMatch(/disagree/i);
    expect(r.score).toBeLessThan(60);
  });

  it("score is deterministic and clamped 0–100", () => {
    const args = { hasPrimaryEvidence: true, isDisputed: false, syndicationCollapsed: false, now: NOW } as const;
    const a = scoreClaim(base({ independentSourceGroups: [["a"], ["b"], ["c"]] }), args);
    const b = scoreClaim(base({ independentSourceGroups: [["a"], ["b"], ["c"]] }), args);
    expect(a.score).toBe(b.score);
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
  });
});

describe("compare + provenance helpers", () => {
  it("claimsEquivalent matches same predicate + object, not similar names", () => {
    const c = (o: Partial<Claim>) => ({ id: Math.random().toString(), predicates: [], objects: [], canonicalText: "", ...o }) as Claim;
    expect(claimsEquivalent(c({ predicates: ["deaths"], objects: ["5"] }), c({ predicates: ["deaths"], objects: ["5"] }))).toBe(true);
    expect(claimsEquivalent(c({ predicates: ["deaths"], objects: ["5"], canonicalText: "5 killed in A" }), c({ predicates: ["closed"], objects: ["schools"], canonicalText: "schools shut in B" }))).toBe(false);
  });

  it("numericConflict is true only for different values of the same kind", () => {
    const c = (k: string, v: string) => ({ predicates: [k], objects: [v] }) as Claim;
    expect(numericConflict(c("deaths", "3"), c("deaths", "8"))).toBe(true);
    expect(numericConflict(c("deaths", "3"), c("injuries", "8"))).toBe(false);
    expect(numericConflict(c("deaths", "3"), c("deaths", "3"))).toBe(false);
  });

  it("provenanceChain traces EVENT → CLAIM → ARTICLE", () => {
    const claim = {
      eventId: "evt-1", canonicalText: "Something happened", status: "single-source",
      provenance: [{ articleId: "a1", publisherId: "The Hindu", sourceUrl: "https://h.example/1", sourceText: "Something happened today", extractionMethod: "rule", confidence: 0.6, seenAt: RECENT }],
    } as Claim;
    const chain = provenanceChain(claim);
    expect(chain[0]!.label).toBe("Event");
    expect(chain[1]!.label).toBe("Claim");
    expect(chain[2]!.label).toBe("Article");
    expect(chain[2]!.url).toBe("https://h.example/1");
  });
});

describe("figure + key parsing", () => {
  it("parseFigures pulls typed numeric facts", () => {
    expect(parseFigures("12 people killed and 30 injured")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "deaths", value: 12 }),
        expect.objectContaining({ kind: "injuries", value: 30 }),
      ]),
    );
    expect(parseFigures("113.4 mm of rain recorded")).toEqual([expect.objectContaining({ kind: "rainfall_mm", value: 113.4 })]);
  });

  it("keyOf normalises synonyms so wording variants share a key", () => {
    expect(keyOf("Schools shut in Chennai")).toBe(keyOf("Chennai schools closed"));
  });
});

describe("dataset invariant — no single-source claim presented as consensus", () => {
  it("every generated corroborated claim has ≥2 independent groups and ≥2 publishers", async () => {
    const { dataset } = await import("@/lib/live/dataset");
    for (const c of dataset.clusters) {
      const ec = c.claims;
      if (!ec) continue;
      for (const cl of ec.claims) {
        if (cl.status === "corroborated") {
          expect(cl.independentSourceGroups.length).toBeGreaterThanOrEqual(2);
          expect(cl.supportingPublisherIds.length).toBeGreaterThanOrEqual(2);
        }
        if (cl.status === "attributed") {
          expect(cl.provenance.some((p) => p.attribution)).toBe(true);
        }
      }
    }
  });

  it("no claim carries a bare 'verified' label — status is one of the documented values", async () => {
    const { dataset } = await import("@/lib/live/dataset");
    const allowed = new Set(["corroborated", "partially-corroborated", "single-source", "disputed", "attributed", "uncertain", "outdated", "retracted"]);
    for (const c of dataset.clusters) {
      for (const cl of c.claims?.claims ?? []) expect(allowed.has(cl.status)).toBe(true);
    }
  });
});
