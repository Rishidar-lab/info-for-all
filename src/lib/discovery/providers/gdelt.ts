/**
 * GDELT DOC 2.0 API — coverage discovery provider.
 *
 * https://api.gdeltproject.org/api/v2/doc/doc — a public, documented,
 * key-less index of worldwide news article METADATA (title, domain, publish
 * time, language, source country). IFFA uses it to DISCOVER that other outlets
 * covered an event, then links out to the publisher's own page. It never
 * fetches, stores, or republishes article bodies from GDELT.
 *
 * Access notes (docs/audits/v0.13-provider-audit.md):
 *   - No authentication. Terms: attribution + "one request every 5 seconds".
 *   - This provider self-throttles to 6s and does one retry with backoff.
 *   - `sourcecountry:IN` restricts to India-published outlets; `sourcelang:tam`
 *     / `sourcelang:eng` splits the language query without dropping the other.
 *   - DISCOVERY_ONLY — metadata + publisher URL, no body retrieval.
 *   - A shared cloud IP can be soft-rate-limited for longer; the pass records
 *     that as a provider note and falls back to committed fixtures.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicaliseUrl } from "../dedupe";
import type {
  DiscoveryCandidate,
  DiscoveryEvent,
  DiscoveryProvider,
  DiscoveryProviderContext,
  DiscoveryQuery,
} from "../types";

const ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const USER_AGENT =
  "IFFA-discovery/0.13 (+https://github.com/Rishidar-lab/info-for-all; Tamil Nadu / India coverage discovery; contact via repo issues)";
const THROTTLE_MS = 6_000;
const MAX_RECORDS = 30;

let lastCallAt = 0;

interface GdeltArticle {
  url: string;
  url_mobile?: string;
  title: string;
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

function queryHash(text: string, lang: string): string {
  return createHash("sha256").update(`gdelt|${lang}|${text}`).digest("hex").slice(0, 16);
}

function gdeltLang(l: DiscoveryQuery["language"]): "tam" | "eng" | null {
  return l === "ta" ? "tam" : l === "en" ? "eng" : null;
}

function parseSeenDate(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z` : undefined;
}

function toCandidate(a: GdeltArticle, query: string, now: number): DiscoveryCandidate | null {
  if (!a.url || !a.title || a.title.length < 8) return null;
  const url = a.url_mobile && a.url_mobile.length < a.url.length ? a.url : a.url;
  return {
    url,
    canonicalUrl: canonicaliseUrl(url),
    title: a.title.trim(),
    source: a.domain ?? "",
    domain: a.domain,
    publishedAt: parseSeenDate(a.seendate),
    language: a.language === "Tamil" ? "ta" : a.language === "English" ? "en" : "unknown",
    provider: "gdelt",
    query,
    discoveredAt: new Date(now).toISOString(),
  };
}

async function fetchGdelt(text: string, lang: DiscoveryQuery["language"], anchorDate: string, ctx: DiscoveryProviderContext): Promise<{ articles: GdeltArticle[]; note?: string }> {
  const gl = gdeltLang(lang);
  const phrase = /\s/.test(text) ? `"${text}"` : text;
  const parts = [`${phrase} sourcecountry:IN`];
  if (gl) parts.push(`sourcelang:${gl}`);
  const q = parts.join(" ");

  const anchor = Date.parse(`${anchorDate}T00:00:00Z`);
  const params = new URLSearchParams({ query: q, mode: "artlist", format: "json", maxrecords: String(MAX_RECORDS), sort: "hybridrel" });
  if (Number.isFinite(anchor)) {
    const start = new Date(anchor - 3 * 86_400_000);
    const end = new Date(Math.min(ctx.now, anchor + 10 * 86_400_000));
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "").replace("T", "") + "";
    params.set("startdatetime", fmt(start).slice(0, 14));
    params.set("enddatetime", fmt(end).slice(0, 14));
  } else {
    params.set("timespan", "14d");
  }

  const fixtureDir = resolve(ctx.fixtureDir, "gdelt");
  const fixturePath = resolve(fixtureDir, `${queryHash(q, gl ?? "any")}.json`);

  if (ctx.offline) {
    if (existsSync(fixturePath)) {
      try {
        return { articles: (JSON.parse(readFileSync(fixturePath, "utf8")).articles ?? []) as GdeltArticle[] };
      } catch {
        return { articles: [], note: "gdelt: fixture unreadable" };
      }
    }
    return { articles: [], note: "gdelt: offline, no fixture" };
  }

  // self-throttle
  const wait = THROTTLE_MS - (Date.now() - lastCallAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  for (let attempt = 0; attempt < 2; attempt++) {
    lastCallAt = Date.now();
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 25_000);
      const res = await fetch(`${ENDPOINT}?${params}`, { headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: ctl.signal });
      clearTimeout(timer);
      const body = await res.text();
      if (!res.ok) {
        if (attempt === 0) { await new Promise((r) => setTimeout(r, 8_000)); continue; }
        return { articles: [], note: `gdelt: HTTP ${res.status}` };
      }
      if (body.trimStart().startsWith("{")) {
        const json = JSON.parse(body) as { articles?: GdeltArticle[] };
        const articles = json.articles ?? [];
        // cache a fixture so CI / prebuild can replay this run deterministically
        try {
          mkdirSync(fixtureDir, { recursive: true });
          writeFileSync(fixturePath, JSON.stringify({ query: q, fetchedAt: new Date().toISOString(), articles }, null, 2) + "\n");
        } catch {
          /* fixture cache is best-effort */
        }
        return { articles };
      }
      // GDELT returns a plain-text rate-limit / error message with HTTP 200
      if (attempt === 0) { await new Promise((r) => setTimeout(r, 8_000)); continue; }
      return { articles: [], note: `gdelt: ${body.slice(0, 80).replace(/\s+/g, " ").trim()}` };
    } catch (err) {
      if (attempt === 0) { await new Promise((r) => setTimeout(r, 5_000)); continue; }
      return { articles: [], note: `gdelt: ${err instanceof Error ? err.message : "fetch failed"}` };
    }
  }
  return { articles: [], note: "gdelt: exhausted retries" };
}

export function gdeltProvider(enabled: boolean): DiscoveryProvider {
  return {
    id: "gdelt",
    kind: "news_index_api",
    network: true,
    enabled,
    description: "GDELT DOC 2.0 public news-metadata index, India-filtered, language-split. Discovery only — no body retrieval.",
    async discover(event: DiscoveryEvent, queries: DiscoveryQuery[], ctx: DiscoveryProviderContext) {
      const candidates: DiscoveryCandidate[] = [];
      const notes: string[] = [];
      const seen = new Set<string>();
      // one call per distinct (text, language) — cap the fan-out
      const picked = queries
        .filter((q) => q.cls === "headline_core" || q.cls === "entity_action" || q.cls === "tamil_cross_language" || q.cls === "english_cross_language" || q.cls === "entity_place")
        .slice(0, 5);
      for (const q of picked) {
        const { articles, note } = await fetchGdelt(q.text, q.language, q.anchorDate, ctx);
        if (note) notes.push(note);
        for (const a of articles) {
          const c = toCandidate(a, q.text, ctx.now);
          if (!c) continue;
          const key = c.canonicalUrl;
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push(c);
        }
      }
      return { candidates, notes };
    },
  };
}
