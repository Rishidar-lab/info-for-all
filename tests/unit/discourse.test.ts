import { describe, it, expect } from "vitest";
import { parseRedditRss } from "@/lib/discourse/reddit";
import { matchDiscourse, detectEmergingClaims } from "@/lib/discourse";
import type { LiveCluster } from "@/lib/live/types";
import type { DiscourseMention } from "@/lib/media-landscape/types";

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Cauvery water release increased after reservoir decision, says CM</title>
<link href="https://www.reddit.com/r/tamilnadu/comments/abc123/cauvery/"/>
<updated>2026-09-03T06:00:00Z</updated><author><name>u/someone</name></author>
<content type="html">&lt;p&gt;Discussion about the Cauvery release and Mettur dam.&lt;/p&gt;</content></entry>
<entry><title>Random meme about Chennai traffic</title>
<link href="https://www.reddit.com/r/tamilnadu/comments/def456/meme/"/>
<updated>2026-09-03T05:00:00Z</updated><content>nothing</content></entry>
</feed>`;

function cluster(over: Partial<LiveCluster>): LiveCluster {
  return {
    id: "c", slug: over.slug ?? "c", title: over.title ?? "t", scope: "tamil-nadu", districts: over.districts ?? [],
    isCrisis: false, crisisPriority: 30, lifecycle: "developing", updatedAt: "2026-09-03T06:00:00Z", languages: ["en"],
    articleIds: [], distinctPublishers: 1, publishers: [], sourceCount: 1, officialCount: 0, independentCount: 1,
    verificationStatus: "single-source", confidence: "weak", reason: "", isVerifiedComparison: false,
    commonGround: [], commonGroundPending: true, differences: [], unknowns: [],
  } as LiveCluster;
}

describe("v0.10 — public discourse (Phase 9)", () => {
  it("parses Reddit Atom into DiscourseMentions", () => {
    const m = parseRedditRss(ATOM, "tamilnadu");
    expect(m.length).toBe(2);
    expect(m[0].platform).toBe("reddit");
    expect(m[0].channel).toBe("r/tamilnadu");
    expect(m[0].url).toContain("reddit.com/r/tamilnadu/comments/abc123");
    expect(m[0].id).toContain("abc123");
  });

  it("matches a mention to the cluster it discusses, not an unrelated one", () => {
    const mentions = parseRedditRss(ATOM, "tamilnadu");
    const clusters = [
      cluster({ slug: "cauvery-release", title: "Cauvery water release increased after reservoir decision" }),
      cluster({ slug: "cricket-match", title: "India beat Australia in the third ODI" }),
    ];
    const byCluster = matchDiscourse(clusters, mentions);
    expect(byCluster.get("cauvery-release")?.length).toBe(1);
    expect(byCluster.get("cricket-match")).toBeUndefined();
    expect(mentions[1].matchedEventSlug).toBeUndefined(); // the meme matches nothing
  });

  it("discourse never sets a corroboration signal — matched mentions stay a separate list", () => {
    const clusters = [cluster({ slug: "s", title: "Cauvery water release increased after reservoir decision" })];
    const mentions = parseRedditRss(ATOM, "tamilnadu");
    matchDiscourse(clusters, mentions);
    // there is no path from a DiscourseMention to independentSourceGroups / claim status —
    // the only field it can set is matchedEventSlug.
    const keys = Object.keys(mentions[0]);
    expect(keys).not.toContain("independentSourceGroups");
    expect(keys).not.toContain("corroborates");
  });

  it("emerging claims need repetition across channels and stay UNVERIFIED", () => {
    const mk = (channel: string, title: string): DiscourseMention => ({
      id: channel + title, platform: "reddit", channel, url: "u", publishedAt: "2026-09-03T00:00:00Z",
      title, claims: [], linkedEvidence: [], stance: "unclear", language: "en",
    });
    const mentions = [
      mk("r/tamilnadu", "Rumour about a factory closure spreading in Hosur industrial area"),
      mk("r/chennai", "Rumour about a factory closure spreading in Hosur industrial area"),
      mk("r/IndiaSpeaks", "Rumour about a factory closure spreading in Hosur industrial area"),
    ];
    const emerging = detectEmergingClaims(mentions, new Set());
    expect(emerging.length).toBe(1);
    expect(emerging[0].label).toBe("EMERGING_UNVERIFIED");
    expect(emerging[0].newsReports).toBe(0);
    expect(emerging[0].primarySources).toBe(0);
    expect(emerging[0].distinctChannels).toBe(3);
  });

  it("a claim that IS matched to a news cluster is not 'emerging'", () => {
    const m: DiscourseMention = {
      id: "x", platform: "reddit", channel: "r/india", url: "u", publishedAt: "2026-09-03T00:00:00Z",
      title: "Same story the news already has three times over here", claims: [], linkedEvidence: [],
      stance: "unclear", language: "en", matchedEventSlug: "known-story",
    };
    const emerging = detectEmergingClaims([m, m, m], new Set(["x"]));
    expect(emerging.length).toBe(0);
  });
});
