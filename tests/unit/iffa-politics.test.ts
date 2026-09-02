import { describe, it, expect } from "vitest";
import {
  detectPoliticalEvent,
  samePoliticalEvent,
  threadRelation,
} from "@/lib/domain/politics";
import { specialistVeto } from "@/lib/live/cluster";
import { normalizeItem } from "@/lib/live/normalize";
import type { FeedSource } from "@/data/feeds";
import type { LiveArticle } from "@/lib/live/types";

const NOW = Date.parse("2026-09-02T12:00:00Z");
function feed(o: Partial<FeedSource>): FeedSource {
  return { id: "f", name: "F", publisher: "F", homepage: "https://f.ex", url: "https://f.ex/r", kind: "rss", defaultEvidenceRole: "independent-report", official: false, language: "en", focus: "tamil-nadu", role: "independent", enabled: true, ...o };
}
function mk(publisher: string, title: string): LiveArticle {
  const s = (publisher + title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 44);
  return normalizeItem(feed({ id: s, publisher }), { title, link: `https://x.ex/${s}`, guid: s, published: new Date(NOW - 3600_000).toISOString(), summary: title }, new Date(NOW).toISOString(), NOW).article!;
}

const ev = (t: string) => detectPoliticalEvent(t);

describe("IFFA political event identity (v0.9 Phase C)", () => {
  it("classifies the political action + speech act", () => {
    expect(ev("CM announces new housing programme for the poor").action).toBe("announce");
    expect(ev("CM criticises opposition's housing proposal").action).toBe("criticise");
    expect(ev("Opposition alleges ₹500 crore corruption in the housing scheme").speechAct).toBe("allegation");
    expect(ev("Government denies allegation of corruption").action).toBe("deny");
    expect(ev("Madras High Court sets aside the order").action).toBe("court-ruling");
    expect(ev("Minister resigns amid graft row").action).toBe("resign");
    expect(ev("Assembly passes the online gaming bill").action).toBe("pass-legislation");
    expect(ev("ED raids premises linked to the former minister").action).toBe("investigate");
  });

  it("announce / criticise / allege are NOT the same development", () => {
    expect(samePoliticalEvent(ev("CM announces free bus scheme for women"), ev("CM criticises opposition over the free bus scheme"))).toBe(false);
    expect(samePoliticalEvent(ev("CM launches the newborn gold-ring scheme"), ev("Opposition alleges corruption in the gold-ring scheme"))).toBe(false);
    expect(samePoliticalEvent(ev("Opposition alleges land scam"), ev("Government denies the land scam allegation"))).toBe(false);
  });

  it("two reports of the SAME announcement do merge", () => {
    expect(samePoliticalEvent(ev("CM announces ₹4,800-crore desalination plant at Minjur"), ev("Tamil Nadu government to set up desalination plant at Minjur, says CM"))).toBe(true);
  });

  it("the split guard vetoes announce-vs-criticise in live clustering", () => {
    const a = mk("The Hindu", "CM announces new housing scheme for slum dwellers in Chennai");
    const b = mk("Times of India", "Opposition slams CM's Chennai housing scheme as a poll gimmick");
    expect(specialistVeto(a, b)).toMatch(/different political development/);
  });

  it("the split guard does NOT veto two reports of one bill", () => {
    const a = mk("The Hindu", "Tamil Nadu Assembly passes the wetland development bill");
    const b = mk("News18", "Wetland bill cleared by Tamil Nadu Assembly amid opposition walkout");
    expect(specialistVeto(a, b)).toBeNull();
  });

  it("thread relations: a denial links to the allegation", () => {
    expect(threadRelation(ev("Government denies the corruption allegation"), ev("Opposition alleges corruption in tenders"))).toBe("denies");
    expect(threadRelation(ev("CM responds to opposition's charge"), ev("Opposition slams CM over the scheme"))).toBe("responds-to");
    expect(threadRelation(ev("ED opens investigation into the mining lease"), ev("Party alleges irregularities in mining leases"))).toBe("supports");
  });
});
