import { describe, it, expect } from "vitest";
import type { LiveArticle } from "@/lib/live/types";
import type { PrimaryRecord } from "@/lib/research/types";
import { articleEchoesRecord, applyEchoCollapse } from "@/lib/research/echo";
import { resolveSourceFamilies } from "@/lib/research/independence";

let seq = 0;
function art(o: Partial<LiveArticle> & { publisher: string; title: string }): LiveArticle {
  return {
    id: o.id ?? `a${++seq}`,
    title: o.title,
    url: `https://ex.test/${o.id ?? seq}`,
    sourceId: o.publisher,
    sourceName: o.publisher,
    publisher: o.publisher,
    role: o.role ?? "independent",
    sourceUrl: "https://ex.test",
    publishedAt: o.publishedAt ?? "2026-09-03T08:00:00.000Z",
    fetchedAt: "2026-09-03T08:10:00.000Z",
    language: o.language ?? "en",
    scope: "india",
    districts: [],
    geo: {} as LiveArticle["geo"],
    evidenceRole: o.evidenceRole ?? "independent-report",
    verificationStatus: "single-source",
    excerpt: o.excerpt,
    crisisPriority: 20,
    isCrisis: false,
    lifecycle: "developing",
  } as LiveArticle;
}

function rec(o: Partial<PrimaryRecord> & { title: string; text: string }): PrimaryRecord {
  return {
    id: o.id ?? "r1",
    adapter: o.adapter ?? "pib_rss",
    tier: o.tier ?? "primary_official",
    authority: o.authority ?? "Press Information Bureau",
    title: o.title,
    text: o.text,
    bodyAvailable: o.bodyAvailable ?? true,
    publishedAt: o.publishedAt ?? "2026-09-03T06:00:00.000Z",
    url: o.url ?? "https://pib.gov.in/x",
    sha256: o.sha256 ?? "deadbeef",
    fetchedAt: "2026-09-03T09:00:00.000Z",
    requiresOcr: o.requiresOcr,
    ocrConfidence: o.ocrConfidence ?? null,
  };
}

// A real-shape PIB railway-safety release (03 Sep 2026), and a single-outlet
// wire copy derived almost verbatim from it — the exact pattern §B.2.1 exists for.
const RELEASE_TEXT =
  "Ashwini Vaishnaw Gives Directions for Improvement of Railway Safety, Technical and Maintenance-related Deficiencies. " +
  "Union Minister for Railways Shri Ashwini Vaishnaw today held a detailed safety review meeting at Rail Bhawan. " +
  "The meeting was attended by the Chairman and Chief Executive Officer, Railway Board, Members of the Railway Board, " +
  "General Managers of Zonal Railways and Divisional Railway Managers. During the meeting, the Railway Minister gave " +
  "directions to address technical deficiencies related to signalling in mission mode, and directed strict action " +
  "against poor-quality supplies and deliberate negligence.";
const RELEASE_TITLE = "Ashwini Vaishnaw Gives Directions for Improvement of Railway Safety, Technical and Maintenance-related Deficiencies";

describe("§B.2.1 — the echo-collapse gate (collapse case FIRST)", () => {
  it("collapses a single-outlet wire copy that restates a PIB release", () => {
    const wireCopy = art({
      publisher: "Some Digital Outlet",
      title: "Ashwini Vaishnaw gives directions for improvement of railway safety",
      excerpt:
        "Union Minister for Railways Ashwini Vaishnaw held a detailed safety review meeting at Rail Bhawan. " +
        "The Railway Minister gave directions to address technical deficiencies related to signalling in mission mode " +
        "and directed strict action against poor-quality supplies and deliberate negligence.",
      publishedAt: "2026-09-03T09:30:00.000Z",
    });
    const record = rec({ title: RELEASE_TITLE, text: RELEASE_TEXT, publishedAt: "2026-09-03T07:23:00.000Z" });

    const d = articleEchoesRecord(wireCopy, record);
    expect(d.collapses).toBe(true);

    const res = resolveSourceFamilies([wireCopy]);
    expect(res.genuineIndependentFamilies).toBe(1);
    const out = applyEchoCollapse([wireCopy], [record], res);
    expect(out.resolution.genuineIndependentFamilies).toBe(0);
    expect(out.outcome).toBe("withhold_sole_report_echoes_record");
    expect(out.collapsedArticleIds).toEqual([wireCopy.id]);
  });

  it("does NOT collapse a report that adds its own observation", () => {
    const realReporting = art({
      publisher: "The Hindu",
      title: "Railway safety review: minister orders signalling fixes",
      excerpt:
        "At the Rail Bhawan meeting, the minister set a 90-day deadline for the signalling upgrades, a timeline not mentioned in the official statement, and asked zonal GMs to submit weekly compliance reports, our correspondent has learnt.",
      publishedAt: "2026-09-03T10:00:00.000Z",
    });
    const record = rec({ title: RELEASE_TITLE, text: RELEASE_TEXT });
    expect(articleEchoesRecord(realReporting, record).collapses).toBe(false);
  });

  it("an unconfirmed OCR record cannot collapse anything", () => {
    const a = art({ publisher: "X Paper", title: RELEASE_TITLE, excerpt: RELEASE_TEXT.slice(0, 180) });
    const ocr = rec({ title: RELEASE_TITLE, text: RELEASE_TEXT, requiresOcr: true, ocrConfidence: null });
    expect(articleEchoesRecord(a, ocr).collapses).toBe(false);
  });

  it("headline-only record collapses on a restated headline but not on body text", () => {
    const a = art({
      publisher: "Y Digital",
      title: "Ashwini Vaishnaw gives directions for improvement of railway safety, maintenance deficiencies",
      excerpt: "The minister reviewed safety at a Rail Bhawan meeting and ordered signalling fixes.",
    });
    const headlineOnly = rec({ title: RELEASE_TITLE, text: RELEASE_TITLE, bodyAvailable: false });
    // rule 2 (headline overlap) still fires; rules 1/3/4 (need body) do not
    expect(articleEchoesRecord(a, headlineOnly).collapses).toBe(true);
  });

  it("1 genuine newsroom + a record delivers (deliver_one_plus_record)", () => {
    const independent = art({
      publisher: "The Indian Express",
      title: "Railway safety meet: 90-day signalling deadline set",
      excerpt: "The minister set a 90-day deadline and sought weekly compliance reports from zonal GMs, sources said — details not in the release.",
    });
    const echoer = art({ publisher: "Aggregator Site", title: RELEASE_TITLE, excerpt: RELEASE_TEXT.slice(0, 200) });
    const record = rec({ title: RELEASE_TITLE, text: RELEASE_TEXT });
    const res = resolveSourceFamilies([independent, echoer]);
    const out = applyEchoCollapse([independent, echoer], [record], res);
    expect(out.collapsedArticleIds).toContain(echoer.id);
    expect(out.resolution.genuineIndependentFamilies).toBe(1);
    expect(out.outcome).toBe("deliver_one_plus_record");
  });

  it("0 newsrooms + a record → deliver_official_record_only", () => {
    const record = rec({ title: RELEASE_TITLE, text: RELEASE_TEXT });
    const out = applyEchoCollapse([], [record], resolveSourceFamilies([]));
    expect(out.outcome).toBe("deliver_official_record_only");
  });
});
