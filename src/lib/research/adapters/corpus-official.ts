/**
 * `corpus_official` adapter — the workhorse.
 *
 * IFFA already ingests NDMA SACHET, RBI, PIB (when the feed is live), IMD,
 * ReliefWeb and Prasar Bharati as `official` RSS feeds. Those primary records
 * land in their OWN clusters. This adapter links an EXISTING official article in
 * the corpus to a WITHHELD news cluster that makes a claim about it — no network.
 *
 * It emits `primary_official` records; an official record is a PRIMARY ANCHOR,
 * never an "independent newsroom" (§B.1 — do not regress it).
 */
import type { AdapterContext, PrimaryRecord, RawRecord, RecordAdapter, RecordCandidate, ResearchQuery } from "../types";
import { makeRawRecord } from "../raw-store";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(s: string): Set<string> {
  return new Set(norm(s).split(" ").filter((w) => w.length > 3));
}
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / a.size;
}

const AUTHORITY_PUBLISHER: [RegExp, string][] = [
  [/reserve bank|rbi/i, "Reserve Bank of India"],
  [/meteorolog|imd|weather/i, "India Meteorological Department"],
  [/ndma|sdma|disaster management|sachet/i, "NDMA SACHET"],
  [/sebi|securities and exchange/i, "SEBI"],
  [/government of india|union government|pib|ministry of/i, "Press Information Bureau"],
];

export const corpusOfficialAdapter: RecordAdapter = {
  id: "corpus_official",
  family: "official-primary",
  tier: "primary_official",
  network: false,

  async search(q: ResearchQuery, ctx: AdapterContext): Promise<RecordCandidate[]> {
    const qTok = tokens([...q.entities, ...q.places, q.authority ?? ""].join(" "));
    const wantPub =
      q.authority && AUTHORITY_PUBLISHER.find(([re]) => re.test(q.authority!))?.[1];
    const out: RecordCandidate[] = [];
    for (const a of ctx.corpusOfficialArticles) {
      const hayText = norm(`${a.title} ${a.excerpt}`);
      const hay = tokens(`${a.title} ${a.excerpt}`);
      // require a SPECIFIC signal: a shared place, a shared number, or a shared
      // multi-word proper noun — not just generic government-vocabulary overlap
      const placeHit = q.places.some((p) => hayText.includes(norm(p)));
      const numHit = q.numbers.filter((n) => n.length > 1 && hayText.replace(/\s+/g, "").includes(n.replace(/\s+/g, ""))).length;
      const nounHit = q.entities.filter((e) => e.includes(" ") && e.length > 6 && hayText.includes(norm(e))).length;
      if (!placeHit && numHit === 0 && nounHit === 0) continue;

      let rel = overlap(qTok, hay) * 0.5 + overlap(tokens(q.entities.join(" ")), hay) * 0.2;
      rel += Math.min(numHit, 3) * 0.15 + Math.min(nounHit, 2) * 0.2 + (placeHit ? 0.2 : 0);
      if (wantPub && a.publisher === wantPub) rel += 0.15;
      if (rel >= 0.4) out.push({ adapter: "corpus_official", externalId: a.id, title: a.title, publishedAt: a.publishedAt, url: a.url, relevance: Math.min(1, rel) });
    }
    return out.sort((x, y) => y.relevance - x.relevance).slice(0, 3);
  },

  async fetch(externalId: string, ctx: AdapterContext): Promise<RawRecord | null> {
    const a = ctx.corpusOfficialArticles.find((x) => x.id === externalId);
    if (!a) return null;
    // The "raw bytes" here are the ingested official article, serialised — it is
    // already re-verifiable from the committed snapshot.
    const body = JSON.stringify({ id: a.id, publisher: a.publisher, title: a.title, excerpt: a.excerpt, url: a.url, publishedAt: a.publishedAt });
    return makeRawRecord(a.url, "application/json", body, ctx.now);
  },

  parse(raw: RawRecord): PrimaryRecord | null {
    let a: { id: string; publisher: string; title: string; excerpt: string; url: string; publishedAt: string };
    try {
      a = JSON.parse(Buffer.from(raw.bytesB64, "base64").toString("utf8"));
    } catch {
      return null;
    }
    const text = `${a.title}. ${a.excerpt ?? ""}`.trim();
    return {
      id: `corpus:${a.id}`,
      adapter: "corpus_official",
      tier: "primary_official",
      authority: a.publisher,
      title: a.title,
      text,
      bodyAvailable: (a.excerpt ?? "").trim().length >= 40,
      publishedAt: a.publishedAt,
      url: a.url,
      sha256: raw.sha256,
      fetchedAt: raw.fetchedAt,
    };
  },
};
