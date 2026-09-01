/**
 * Bounded source-validation utility.
 *
 *   npx tsx scripts/validate-sources.ts            # validate the enabled + candidate list
 *   npx tsx scripts/validate-sources.ts --md       # also (re)write docs/source-registry.md
 *
 * For each candidate feed it records: HTTP status, content type, RSS/Atom validity,
 * item count, newest-item timestamp, canonical-link presence, declared language,
 * India / Tamil Nadu relevance of the first few items, and redirect behaviour.
 * It never scrapes article bodies and it stops after one request per feed.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FEED_SOURCES } from "../src/data/feeds";
import { parseFeed, parseSachetJson } from "../src/lib/live/parse";
import { classifyGeo } from "../src/lib/live/geo";
import { cleanTitle, safeDate } from "../src/lib/live/text";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_MD = resolve(ROOT, "docs/source-registry.md");
const UA =
  "IFA-source-check/0.4 (+https://github.com/Rishidar-lab/info-for-all; feed reachability validation)";
const TIMEOUT_MS = 15_000;

interface Candidate {
  id: string;
  publisher: string;
  role: "official" | "independent" | "specialist";
  region: string;
  language: "ta" | "en" | "mixed";
  url: string;
  kind: "rss" | "atom" | "sachet-json";
  note?: string;
}

/**
 * Candidates below were each reachable from a shell on 2026-09-01. This script
 * re-checks them and is the source of truth for what gets enabled in
 * src/data/feeds.ts. Anything that fails here is recorded as unavailable.
 */
const CANDIDATES: Candidate[] = [
  // ── Official / primary ───────────────────────────────────────────────
  { id: "ndma-sachet-json", publisher: "NDMA SACHET", role: "official", region: "India", language: "mixed", kind: "sachet-json", url: "https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails" },
  { id: "ndma-sachet-rss", publisher: "NDMA SACHET", role: "official", region: "India", language: "mixed", kind: "rss", url: "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml" },
  { id: "reliefweb-india-disasters", publisher: "ReliefWeb (UN OCHA)", role: "official", region: "India", language: "en", kind: "rss", url: "https://reliefweb.int/disasters/rss.xml?primary_country=IND&appname=ifa-github-io" },
  { id: "pib-english", publisher: "Press Information Bureau", role: "official", region: "India", language: "en", kind: "rss", url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1", note: "expected 403 (Akamai) from CI" },
  { id: "imd-allindia", publisher: "India Meteorological Department", role: "official", region: "India", language: "en", kind: "rss", url: "https://mausam.imd.gov.in/responsive/rss/allindiawxnews.xml", note: "IMD retired public RSS; alerts still arrive via SACHET CAP" },

  // ── Independent — Tamil Nadu focus (English) ─────────────────────────
  { id: "thehindu-tn", publisher: "The Hindu", role: "independent", region: "Tamil Nadu", language: "en", kind: "rss", url: "https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss" },
  { id: "thehindu-chennai", publisher: "The Hindu", role: "independent", region: "Chennai", language: "en", kind: "rss", url: "https://www.thehindu.com/news/cities/chennai/feeder/default.rss" },
  { id: "toi-chennai", publisher: "The Times of India", role: "independent", region: "Chennai / Tamil Nadu", language: "en", kind: "rss", url: "https://timesofindia.indiatimes.com/rssfeeds/-2128833038.cms" },

  // ── Independent — India-wide (English) ───────────────────────────────
  { id: "thehindu-national", publisher: "The Hindu", role: "independent", region: "India", language: "en", kind: "rss", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
  { id: "ndtv-india", publisher: "NDTV", role: "independent", region: "India", language: "en", kind: "rss", url: "https://feeds.feedburner.com/ndtvnews-india-news" },
  { id: "toi-india", publisher: "The Times of India", role: "independent", region: "India", language: "en", kind: "rss", url: "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms" },
  { id: "ht-india", publisher: "Hindustan Times", role: "independent", region: "India", language: "en", kind: "rss", url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml" },
  { id: "indiatoday", publisher: "India Today", role: "independent", region: "India", language: "en", kind: "rss", url: "https://www.indiatoday.in/rss/1206578" },

  // ── Independent — Tamil-language ─────────────────────────────────────
  { id: "bbc-tamil", publisher: "BBC Tamil", role: "independent", region: "Tamil Nadu / India", language: "ta", kind: "rss", url: "https://feeds.bbci.co.uk/tamil/rss.xml" },
  { id: "news18-tamil-tn", publisher: "News18 Tamil", role: "independent", region: "Tamil Nadu", language: "ta", kind: "rss", url: "https://tamil.news18.com/commonfeeds/v1/tam/rss/tamil-nadu.xml" },
  { id: "puthiyathalaimurai", publisher: "Puthiyathalaimurai", role: "independent", region: "Tamil Nadu", language: "ta", kind: "rss", url: "https://www.puthiyathalaimurai.com/stories.rss" },

  // ── Specialist context ──────────────────────────────────────────────
  { id: "thehindu-energy-env", publisher: "The Hindu", role: "specialist", region: "India", language: "en", kind: "rss", url: "https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss" },
  { id: "mongabay-india", publisher: "Mongabay India", role: "specialist", region: "India", language: "en", kind: "rss", url: "https://india.mongabay.com/feed/" },
  { id: "thehindu-kerala", publisher: "The Hindu", role: "specialist", region: "Kerala (India-relevant)", language: "en", kind: "rss", url: "https://www.thehindu.com/news/national/kerala/feeder/default.rss" },
];

interface Result {
  c: Candidate;
  httpStatus: number | string;
  contentType: string;
  finalUrl: string;
  redirected: boolean;
  valid: boolean;
  itemCount: number;
  newest: string | null;
  canonicalLinks: number;
  relevantSample: number;
  error?: string;
}

async function check(c: Candidate): Promise<Result> {
  const r: Result = {
    c,
    httpStatus: "—",
    contentType: "—",
    finalUrl: c.url,
    redirected: false,
    valid: false,
    itemCount: 0,
    newest: null,
    canonicalLinks: 0,
    relevantSample: 0,
  };
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(c.url, {
      redirect: "follow",
      signal: ac.signal,
      headers: { "user-agent": UA, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*" },
    });
    r.httpStatus = res.status;
    r.contentType = (res.headers.get("content-type") || "—").split(";")[0];
    r.finalUrl = res.url;
    r.redirected = res.url.replace(/\/$/, "") !== c.url.replace(/\/$/, "");
    if (!res.ok) {
      r.error = `HTTP ${res.status}`;
      return r;
    }
    const body = await res.text();
    const items = c.kind === "sachet-json" ? parseSachetJson(body) : parseFeed(body).items;
    r.itemCount = items.length;
    r.valid = items.length > 0;
    const dates = items.map((it) => safeDate(it.published ?? it.cap?.effectiveFrom)).filter(Boolean) as string[];
    r.newest = dates.sort().at(-1) ?? null;
    r.canonicalLinks = items.filter((it) => typeof it.link === "string" && /^\s*https?:\/\//.test(it.link)).length;
    for (const it of items.slice(0, 8)) {
      const g = classifyGeo({ title: cleanTitle(it.title), excerpt: it.summary, areaDescription: it.cap?.areaDescription });
      if (g.scope !== "excluded") r.relevantSample++;
    }
  } catch (e) {
    r.error = e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(t);
  }
  return r;
}

function verdict(r: Result): { enabled: boolean; reason: string } {
  if (typeof r.httpStatus === "number" && r.httpStatus === 403)
    return { enabled: false, reason: "HTTP 403 — access-controlled from this environment; not bypassed. Registry entry kept." };
  if (!r.valid) return { enabled: false, reason: r.error ? `unreachable / invalid: ${r.error}` : `no parseable items (HTTP ${r.httpStatus}, ${r.contentType})` };
  if (r.itemCount < 2) return { enabled: false, reason: `only ${r.itemCount} item(s) — too thin to enable` };
  if (r.relevantSample === 0 && r.c.role !== "official")
    return { enabled: false, reason: "none of the first 8 items classified as India / Tamil Nadu relevant" };
  return { enabled: true, reason: `ok — ${r.itemCount} items, newest ${r.newest ?? "n/a"}, ${r.canonicalLinks}/${r.itemCount} with canonical links` };
}

async function main() {
  console.log(`IFA source validation — ${new Date().toISOString()} — ${CANDIDATES.length} candidates\n`);
  const results: Result[] = [];
  for (const c of CANDIDATES) {
    const r = await check(c);
    results.push(r);
    const v = verdict(r);
    console.log(`${v.enabled ? "ENABLE " : "skip   "} ${c.id.padEnd(26)} ${String(r.httpStatus).padEnd(4)} ${v.reason}`);
  }

  const enabledIds = new Set(FEED_SOURCES.filter((f) => f.enabled).map((f) => f.id));
  const rows = results.map((r) => {
    const v = verdict(r);
    const inRegistry = FEED_SOURCES.some((f) => f.id === r.c.id);
    const currentlyEnabled = enabledIds.has(r.c.id);
    return { r, v, inRegistry, currentlyEnabled };
  });

  if (process.argv.includes("--md")) {
    const now = new Date().toISOString();
    const md = `# IFA source registry

_Generated by \`npx tsx scripts/validate-sources.ts --md\` on ${now}._
_Re-run before enabling or disabling any feed. Nothing here is scraped — only feed
metadata and short excerpts are ever stored, and every item links to the publisher._

| Source | Role | Region | Language | Endpoint | Access | Newest item | Enabled | Reason |
|---|---|---|---|---|---|---|---|---|
${rows
  .map(({ r, v }) => {
    const access =
      typeof r.httpStatus === "number"
        ? r.httpStatus === 200
          ? r.redirected
            ? "200 (redirected)"
            : "200"
          : String(r.httpStatus)
        : `error: ${r.error ?? "?"}`;
    return `| ${r.c.publisher} | ${r.c.role} | ${r.c.region} | ${r.c.language} | \`${r.c.url}\` | ${access} | ${r.newest ?? "—"} | ${v.enabled ? "**yes**" : "no"} | ${v.reason} |`;
  })
  .join("\n")}

## Blocked / unavailable (registry entries retained, not retried aggressively)

${rows
  .filter(({ v }) => !v.enabled)
  .map(({ r, v }) => `- **${r.c.publisher}** (\`${r.c.id}\`, ${r.c.role}) — ${v.reason}`)
  .join("\n")}

## Distinct publishers enabled

${[...new Set(rows.filter((x) => x.v.enabled).map((x) => x.r.c.publisher))].sort().map((p) => `- ${p}`).join("\n")}
`;
    mkdirSync(dirname(REGISTRY_MD), { recursive: true });
    writeFileSync(REGISTRY_MD, md);
    console.log(`\nWrote ${REGISTRY_MD}`);
  }

  const enable = rows.filter((x) => x.v.enabled).length;
  console.log(`\n${enable}/${CANDIDATES.length} candidates pass. Distinct passing publishers: ${new Set(rows.filter((x) => x.v.enabled).map((x) => x.r.c.publisher)).size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
