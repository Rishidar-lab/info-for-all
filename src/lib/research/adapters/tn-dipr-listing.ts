/**
 * `tn_dipr_listing` adapter — LISTING ONLY.
 *
 * Tamil Nadu DIPR publishes daily press releases as JPG SCANS
 * (`cms.tn.gov.in/cms_migrated/document/press_release/prDDMMYYa.jpg`). This
 * adapter fetches the listing on `www.tn.gov.in/press_release.php` and records
 * that a release *exists* for a date — it does NOT OCR here. Every record it
 * emits carries `requiresOcr: true` and `ocrConfidence: null`, so per
 * ../match.ts and ../echo.ts it can NEVER anchor a published claim or collapse
 * an article without a human confirm.
 *
 * Its value: the withhold-reason upgrade — "we checked TN DIPR; a release for
 * <date> exists but is a scan we have not verified."
 */
import type { AdapterContext, PrimaryRecord, RawRecord, RecordAdapter, RecordCandidate, ResearchQuery } from "../types";
import { FixtureStore, fetchText, makeRawRecord, rawBody } from "../raw-store";

const LISTING = "https://www.tn.gov.in/press_release.php";

function store(ctx: AdapterContext): FixtureStore {
  return new FixtureStore(ctx.fixtureDir);
}

export function parseDiprListing(html: string): { id: string; url: string; date: string }[] {
  const out: { id: string; url: string; date: string }[] = [];
  for (const m of html.matchAll(/cms_migrated\/document\/press_release\/(pr(\d{2})(\d{2})(\d{2})[a-z])\.jpg/gi)) {
    const id = m[1];
    const url = `https://cms.tn.gov.in/cms_migrated/document/press_release/${id}.jpg`;
    const date = `20${m[4]}-${m[3]}-${m[2]}`;
    if (!out.some((x) => x.id === id)) out.push({ id, url, date });
  }
  return out;
}

export const tnDiprListingAdapter: RecordAdapter = {
  id: "tn_dipr_listing",
  family: "official-primary",
  tier: "primary_official",
  network: true,

  async search(q: ResearchQuery, ctx: AdapterContext): Promise<RecordCandidate[]> {
    const raw = await fetchText(LISTING, { adapter: "tn_dipr_listing", key: "listing", store: store(ctx), offline: ctx.offline, now: ctx.now });
    if (!raw) return [];
    const items = parseDiprListing(rawBody(raw));
    // no OCR → we can only offer "a release exists near the claim's date"
    const qDate = (q.dates[0] ?? "").toLowerCase();
    return items
      .slice(0, 6)
      .map((it) => ({ adapter: "tn_dipr_listing", externalId: it.id, title: `Tamil Nadu DIPR press release ${it.date}`, publishedAt: `${it.date}T00:00:00.000Z`, url: it.url, relevance: qDate && it.date.includes(qDate) ? 0.5 : 0.3 }))
      .slice(0, 2);
  },

  async fetch(externalId: string, ctx: AdapterContext): Promise<RawRecord | null> {
    const raw = await fetchText(LISTING, { adapter: "tn_dipr_listing", key: "listing", store: store(ctx), offline: ctx.offline, now: ctx.now });
    if (!raw) return null;
    const it = parseDiprListing(rawBody(raw)).find((x) => x.id === externalId);
    if (!it) return null;
    return makeRawRecord(it.url, "application/json", JSON.stringify(it), ctx.now);
  },

  parse(raw: RawRecord): PrimaryRecord | null {
    let it: { id: string; url: string; date: string };
    try {
      it = JSON.parse(rawBody(raw));
    } catch {
      return null;
    }
    return {
      id: `tndipr:${it.id}`,
      adapter: "tn_dipr_listing",
      tier: "primary_official",
      authority: "Tamil Nadu DIPR",
      title: `Tamil Nadu DIPR press release, ${it.date}`,
      text: `Tamil Nadu DIPR press release, ${it.date}`,
      bodyAvailable: false,
      publishedAt: `${it.date}T00:00:00.000Z`,
      url: it.url,
      sha256: raw.sha256,
      fetchedAt: raw.fetchedAt,
      requiresOcr: true,
      ocrConfidence: null,
    };
  },
};
