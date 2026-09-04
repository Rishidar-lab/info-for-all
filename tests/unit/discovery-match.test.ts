import { describe, it, expect } from "vitest";
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { normalizeItem } from "@/lib/live/normalize";
import type { FeedSource } from "@/data/feeds";
import { buildDiscoveryEvent } from "@/lib/discovery/query";
import { verifySameEvent } from "@/lib/discovery/match";
import type { DiscoveryCandidate } from "@/lib/discovery/types";

const NOW = Date.parse("2026-09-03T12:00:00Z");
const T = "2026-09-03T08:00:00.000Z";

function feed(pub: string): FeedSource {
  return {
    id: pub, name: pub, publisher: pub, homepage: "https://ex.test", url: "https://ex.test/r",
    kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en",
    focus: "tamil-nadu", role: "independent", enabled: true,
  };
}

function art(pub: string, title: string, excerpt: string, districts: string[] = [], publishedAt = T): LiveArticle {
  const a = normalizeItem(
    feed(pub),
    { title, link: `https://ex.test/${encodeURIComponent(pub + title.slice(0, 20))}`, guid: `${pub}:${title}`, published: publishedAt, summary: excerpt },
    publishedAt, NOW,
  ).article!;
  a.excerpt = excerpt;
  if (districts.length) a.districts = districts;
  return a;
}

function cl(title: string, category = "politics"): LiveCluster {
  return {
    id: "c", slug: "adv-slug-aaaaaa", title, scope: "tamil-nadu", districts: ["Chennai"],
    crisisType: undefined, isCrisis: false, crisisPriority: 10, lifecycle: "developing",
    updatedAt: T, languages: ["en"], articleIds: ["s1"], distinctPublishers: 1,
    publishers: ["The Hindu"], sourceCount: 1, officialCount: 0, independentCount: 1,
    verificationStatus: "single-source", confidence: "weak", reason: "Single report.",
    isVerifiedComparison: false, commonGround: [], commonGroundPending: true,
    differences: [], unknowns: [],
    trendData: { category, geoTier: "P0", firstSeenAt: T } as unknown as LiveCluster["trendData"],
  } as unknown as LiveCluster;
}

function cand(title: string, snippet: string, publishedAt = "2026-09-03T09:00:00.000Z"): DiscoveryCandidate {
  return {
    url: `https://other.test/${encodeURIComponent(title.slice(0, 20))}`, canonicalUrl: `https://other.test/${encodeURIComponent(title.slice(0, 20))}`,
    title, source: "Other News", provider: "mock", query: "mock", discoveredAt: new Date(NOW).toISOString(),
    publishedAt, snippet,
  };
}

describe("same-event gate — adversarial (v0.13 PHASE 5)", () => {
  it("MATCHES a genuine same-event paraphrase (control)", () => {
    const seed = [art("The Hindu", "CM Vijay to move resolution urging Centre on Tamil in Madras HC", "Vijay said the assembly will move a resolution urging the Centre to allow Tamil in the Madras High Court.", ["Chennai"])];
    const ev = buildDiscoveryEvent(cl("CM Vijay to move resolution urging Centre on Tamil in Madras HC"), seed);
    const m = verifySameEvent(ev, cand("Vijay: assembly to urge Centre for Tamil in Madras high court", "The chief minister said a resolution will be moved in the assembly."), seed);
    expect(m.verdict).toBe("MATCH");
  });

  it("rejects same politician / different speech (announcement vs criticism)", () => {
    const seed = [art("The Hindu", "CM Vijay announces Rs 1,200-crore new Secretariat in Chennai", "Vijay announced a Rs 1,200-crore Secretariat complex in Chennai.", ["Chennai"])];
    const ev = buildDiscoveryEvent(cl("CM Vijay announces Rs 1,200-crore new Secretariat in Chennai"), seed);
    const m = verifySameEvent(ev, cand("Opposition slams CM Vijay over Secretariat cost claims", "Opposition leaders criticised Vijay's earlier remarks on the Secretariat at a rally."), seed);
    expect(m.verdict).not.toBe("MATCH");
  });

  it("rejects same city / old disaster (time incompatibility)", () => {
    const seed = [art("The Hindu", "Flood alert for Cuddalore district, 200 moved to relief camps", "About 200 people moved to camps in Cuddalore amid flooding.", ["Cuddalore"], "2026-09-03T08:00:00.000Z")];
    const ev = buildDiscoveryEvent(cl("Flood alert for Cuddalore district"), seed);
    const m = verifySameEvent(ev, cand("Cuddalore recalls the great flood of 2015", "A retrospective on the 2015 Cuddalore floods and what changed since.", "2015-12-02T08:00:00.000Z"), seed);
    expect(m.verdict).not.toBe("MATCH");
  });

  it("rejects same sports team / different match (fixture split guard)", () => {
    const seed = [art("Sportstar", "India beat Pakistan in Asia Cup 2026 final thriller", "India defeated Pakistan in the Asia Cup 2026 final.", [], "2026-09-03T08:00:00.000Z")];
    const ev = buildDiscoveryEvent(cl("India beat Pakistan in Asia Cup 2026 final thriller", "sports"), seed);
    const m = verifySameEvent(ev, cand("India to face Pakistan in World Cup 2027 group clash", "The schedule pits India against Pakistan in next year's World Cup group stage."), seed);
    expect(m.verdict).not.toBe("MATCH");
  });

  it("rejects same company / different financial announcement (magnitude/direction guard)", () => {
    const seed = [art("Mint", "RBI holds repo rate at 6.5%, stance unchanged", "The Reserve Bank held the repo rate at 6.5 percent.", [], "2026-09-03T08:00:00.000Z")];
    const ev = buildDiscoveryEvent(cl("RBI holds repo rate", "finance"), seed);
    const m = verifySameEvent(ev, cand("RBI cuts repo rate by 50 bps to 6%", "In a surprise move the central bank cut rates.", "2026-08-06T08:00:00.000Z"), seed);
    expect(m.verdict).not.toBe("MATCH");
  });

  it("rejects allegation vs denial as the same development only when actions differ", () => {
    const seed = [art("The Hindu", "Minister denies phone-ban order for temples, calls reports false", "The minister denied issuing any order banning phones in temples.", ["Chennai"])];
    const ev = buildDiscoveryEvent(cl("Minister denies phone-ban order for temples"), seed);
    const m = verifySameEvent(ev, cand("Phones banned in temples from next month, confirms official", "An official in Madurai confirmed phones will be banned in temples from next month."), seed);
    // Either NO_MATCH (different districts/actions) or UNCERTAIN — but NEVER a corroborating MATCH.
    expect(m.verdict).not.toBe("MATCH");
  });

  it("rejects same Tamil district but unrelated incident", () => {
    const seed = [art("Dinamalar", "Two killed as bus hits lorry near Perambalur", "Two people died when an omni bus hit a lorry near Perambalur.", ["Perambalur"])];
    const ev = buildDiscoveryEvent(cl("Two killed as bus hits lorry near Perambalur", "crisis"), seed);
    const m = verifySameEvent(ev, cand("New bus depot opened near Perambalur, 40 routes added", "The transport department opened a new depot near Perambalur with 40 routes."), seed);
    expect(m.verdict).not.toBe("MATCH");
  });

  it("UNCERTAIN never joins: weak headline overlap without structured evidence stays out", () => {
    const seed = [art("The Hindu", "PWD to tighten safety at construction sites in Kerala", "The public works department decided to tighten safety measures.", [])];
    const ev = buildDiscoveryEvent(cl("PWD to tighten safety at construction sites in Kerala"), seed);
    const m = verifySameEvent(ev, cand("Construction safety norms under review, says panel", "A panel is reviewing construction safety norms."), seed);
    expect(["NO_MATCH", "UNCERTAIN"]).toContain(m.verdict);
    expect(m.verdict).not.toBe("MATCH");
  });
});
