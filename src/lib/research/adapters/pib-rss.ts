/**
 * `pib_rss` adapter — the one genuine network adapter for §B.2.
 *
 * The PIB press-release RSS (`RssMain.aspx?ModId=6&Lang=1&Regid=1&reg=3`) is
 * reachable with an identifying User-Agent and returns clean XML — but only
 * `<title>` + `<link>` (a PRID). The full release body sits behind an Akamai
 * bot-wall that 403s any UA carrying "IFFA". So this adapter operates at
 * HEADLINE LEVEL: `bodyAvailable: false`.
 *
 * A headline-only record:
 *   - upgrades the withhold reason ("we checked PIB — a release titled X exists")
 *   - can corroborate a claim ONLY when the claim's core entity + action are in
 *     the release headline (see ../match.ts)
 *   - never collapses an article on body text (see ../echo.ts)
 *
 * Full-body fetch (browser UA) is deliberately NOT shipped — see §9 of
 * IFFA_MILESTONE_B2_REPORT.md. That is a UA-policy decision for the maintainer.
 *
 * Run only by scripts/research-pass.ts (Node). Never bundled.
 */
import type { AdapterContext, PrimaryRecord, RawRecord, RecordAdapter, RecordCandidate, ResearchQuery } from "../types";
import { FixtureStore, fetchText, makeRawRecord, rawBody } from "../raw-store";

const PIB_RSS = "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1&reg=3";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

interface RssItem {
  title: string;
  link: string;
  prid: string;
}

export function parsePibRss(xml: string): RssItem[] {
  const out: RssItem[] = [];
  for (const m of xml.matchAll(/<item>\s*<title>([\s\S]*?)<\/title>\s*<link>([\s\S]*?)<\/link>/g)) {
    const title = m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    const link = m[2].trim();
    const prid = link.match(/PRID=(\d+)/)?.[1] ?? "";
    if (title && prid) out.push({ title, link, prid });
  }
  return out;
}

function headlineRelevance(q: ResearchQuery, title: string): number {
  const t = norm(title);
  const ents = q.entities.filter((e) => e.length > 4 && t.includes(norm(e)));
  const qtok = new Set(norm(q.entities.join(" ")).split(" ").filter((w) => w.length > 3));
  const ttok = new Set(t.split(" "));
  let inter = 0;
  for (const w of qtok) if (ttok.has(w)) inter++;
  return Math.min(1, ents.length * 0.35 + (qtok.size ? inter / qtok.size : 0) * 0.5);
}

function store(ctx: AdapterContext): FixtureStore {
  return new FixtureStore(ctx.fixtureDir);
}

export const pibRssAdapter: RecordAdapter = {
  id: "pib_rss",
  family: "official-primary",
  tier: "primary_official",
  network: true,

  async search(q: ResearchQuery, ctx: AdapterContext): Promise<RecordCandidate[]> {
    if (!["official_action", "appointment", "scheme_allocation"].includes(q.claimType)) return [];
    if (q.authority && !/government of india|union|centre|ministry|pib/i.test(q.authority)) return [];

    const raw = await fetchText(PIB_RSS, { adapter: "pib_rss", key: "rss_latest", store: store(ctx), offline: ctx.offline, now: ctx.now });
    if (!raw) return [];
    return parsePibRss(rawBody(raw))
      .map((it) => ({
        adapter: "pib_rss",
        externalId: it.prid,
        title: it.title,
        publishedAt: "",
        url: `https://www.pib.gov.in/PressReleasePage.aspx?PRID=${it.prid}`,
        relevance: headlineRelevance(q, it.title),
      }))
      .filter((c) => c.relevance >= 0.45)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 2);
  },

  async fetch(externalId: string, ctx: AdapterContext): Promise<RawRecord | null> {
    const raw = await fetchText(PIB_RSS, { adapter: "pib_rss", key: "rss_latest", store: store(ctx), offline: ctx.offline, now: ctx.now });
    if (!raw) return null;
    const it = parsePibRss(rawBody(raw)).find((x) => x.prid === externalId);
    if (!it) return null;
    return makeRawRecord(it.link, "application/json", JSON.stringify(it), ctx.now);
  },

  parse(raw: RawRecord): PrimaryRecord | null {
    let it: RssItem;
    try {
      it = JSON.parse(rawBody(raw)) as RssItem;
    } catch {
      return null;
    }
    return {
      id: `pib:${it.prid}`,
      adapter: "pib_rss",
      tier: "primary_official",
      authority: "Press Information Bureau",
      title: it.title,
      text: it.title,
      bodyAvailable: false,
      publishedAt: raw.fetchedAt,
      url: it.link,
      sha256: raw.sha256,
      fetchedAt: raw.fetchedAt,
    };
  },
};
