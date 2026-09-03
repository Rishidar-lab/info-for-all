/**
 * Structured source-discovery audit (v0.11 Phase A).
 *
 *   npm run source-discovery-audit           # probe the target list, write the report
 *   npm run source-discovery-audit -- --enabled-only
 *
 * Probes each candidate publisher's discovery surface (RSS / Atom / sitemap /
 * public JSON) with ONE polite request each — no scraping, no bypass. Records
 * a status per the directive's vocabulary and writes
 * evaluation/reports/source-discovery-audit.md + .json.
 *
 * This is discovery AUDIT only. It never enables a feed — a human reviews the
 * report and adds validated feeds to src/data/feeds.ts.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FEED_SOURCES } from "../src/data/feeds";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (IFFA/0.11 source-discovery; +https://github.com/Rishidar-lab/info-for-all)";

type Status =
  | "DIRECT_FEED"
  | "PUBLIC_API"
  | "DISCOVERY_ONLY"
  | "SITEMAP_ONLY"
  | "BLOCKED"
  | "PAYWALLED"
  | "REMOVED"
  | "UNSUITABLE"
  | "MANUAL_ONLY"
  | "NO_FEED";

interface Target {
  publisher: string;
  domain: string;
  language: "ta" | "en" | "mixed";
  region: "tamil-nadu" | "india" | "kerala" | "global";
  category: string;
  candidates: { kind: "rss" | "atom" | "sitemap" | "json" | "discovery"; url: string }[];
  /** Prior manual knowledge, filled from v0.10/v0.11 discovery runs. */
  priorNote?: string;
}

const TARGETS: Target[] = [
  // ── Tamil-native ──
  { publisher: "The Hindu Tamil", domain: "hindutamil.in", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://www.hindutamil.in/feed" }], priorNote: "ENABLED v0.11 — /feed works (37 items); /rss/*.xml paths are Akamai-blocked." },
  { publisher: "ABP Tamil", domain: "tamil.abplive.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://tamil.abplive.com/home/feed" }], priorNote: "ENABLED v0.11 — 21 items." },
  { publisher: "Nakkheeran", domain: "nakkheeran.in", language: "ta", region: "tamil-nadu", category: "politics", candidates: [{ kind: "rss", url: "https://www.nakkheeran.in/rss" }], priorNote: "ENABLED v0.11 — 50 items." },
  { publisher: "News18 Tamil", domain: "tamil.news18.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://tamil.news18.com/commonfeeds/v1/tam/rss/tamil-nadu.xml" }], priorNote: "ENABLED (v0.8) — high item count, 7-day age filter drops ~70%." },
  { publisher: "Puthiyathalaimurai", domain: "puthiyathalaimurai.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://www.puthiyathalaimurai.com/stories.rss" }], priorNote: "ENABLED — but the feed only carries ~7 items." },
  { publisher: "BBC Tamil", domain: "bbc.com/tamil", language: "ta", region: "india", category: "general", candidates: [{ kind: "rss", url: "https://feeds.bbci.co.uk/tamil/rss.xml" }], priorNote: "ENABLED — world-news heavy; trustFeedScope=false drops most." },
  { publisher: "Dinamalar", domain: "dinamalar.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://www.dinamalar.com/rss_feed.asp" }, { kind: "rss", url: "https://static.dinamalar.com/rss/latest.xml" }], priorNote: "No working public feed found on any tried path (all 404)." },
  { publisher: "Daily Thanthi", domain: "dailythanthi.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://www.dailythanthi.com/rss/tamil-nadu.xml" }], priorNote: "No public feed found (404). Surfaces in Google News RSS." },
  { publisher: "Dinakaran", domain: "dinakaran.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://www.dinakaran.com/rss/tamilnadu.xml" }], priorNote: "No public feed found (404)." },
  { publisher: "Dinamani", domain: "dinamani.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://www.dinamani.com/rss/latest-news.xml" }], priorNote: "Akamai 'Access Denied' on the .xml paths. Surfaces in Google News RSS." },
  { publisher: "Vikatan", domain: "vikatan.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://www.vikatan.com/feed" }], priorNote: "302 to a non-feed; no working feed found. Surfaces in Google News RSS." },
  { publisher: "Maalai Malar", domain: "maalaimalar.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://www.maalaimalar.com/rss/tamilnadu.xml" }], priorNote: "No public feed found (404)." },
  { publisher: "DT Next", domain: "dtnext.in", language: "en", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://www.dtnext.in/rss/tamilnadu" }], priorNote: "No public feed found (404 on all tried paths)." },
  { publisher: "Tamil Samayam", domain: "tamil.samayam.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "rss", url: "https://tamil.samayam.com/rssfeedstopstories.cms" }], priorNote: "404 on tried .cms feed paths." },
  { publisher: "Polimer News", domain: "polimernews.com", language: "ta", region: "tamil-nadu", category: "general", candidates: [{ kind: "atom", url: "https://feeds.feedburner.com/Polimernews" }], priorNote: "FeedBurner Atom returns only ~3 items — too thin to enable." },
  // ── Discovery layer ──
  { publisher: "Google News RSS (Tamil / Tamil Nadu)", domain: "news.google.com", language: "ta", region: "tamil-nadu", category: "discovery", candidates: [{ kind: "discovery", url: "https://news.google.com/rss/search?q=%E0%AE%A4%E0%AE%AE%E0%AE%BF%E0%AE%B4%E0%AF%8D%E0%AE%A8%E0%AE%BE%E0%AE%9F%E0%AF%81&hl=ta-IN&gl=IN&ceid=IN:ta" }], priorNote: "Returns ~110 Tamil items with publisher names (Daily Thanthi, Dinamani, Vikatan, Tamil Murasu…). news.google.com/robots.txt does NOT list /rss/ in its Allow set → recorded DISCOVERY_ONLY, NOT integrated pending a maintainer compliance decision. Single biggest potential Tamil unlock." },
  // ── Indian English / national ──
  { publisher: "The Indian Express", domain: "indianexpress.com", language: "en", region: "india", category: "national", candidates: [{ kind: "rss", url: "https://indianexpress.com/section/india/feed/" }], priorNote: "ENABLED v0.10." },
  { publisher: "The Free Press Journal", domain: "freepressjournal.in", language: "en", region: "india", category: "national", candidates: [{ kind: "rss", url: "https://www.freepressjournal.in/stories.rss" }], priorNote: "ENABLED v0.11 — 65 items." },
  { publisher: "Business Standard", domain: "business-standard.com", language: "en", region: "india", category: "finance", candidates: [{ kind: "rss", url: "https://www.business-standard.com/rss/home_page_top_stories.rss" }], priorNote: "ENABLED v0.10 (home_page_top_stories; the economy feed is 403)." },
  { publisher: "Moneycontrol", domain: "moneycontrol.com", language: "en", region: "india", category: "finance", candidates: [{ kind: "rss", url: "https://www.moneycontrol.com/rss/latestnews.xml" }], priorNote: "ENABLED v0.10 — earlier Akamai block cleared." },
  { publisher: "Deccan Herald", domain: "deccanherald.com", language: "en", region: "india", category: "national", candidates: [{ kind: "rss", url: "https://www.deccanherald.com/rss-feed/52" }], priorNote: "404 on tried paths." },
  { publisher: "Scroll.in", domain: "scroll.in", language: "en", region: "india", category: "national", candidates: [{ kind: "rss", url: "https://scroll.in/feeds/all.rss" }], priorNote: "404 on tried paths." },
  { publisher: "The Wire", domain: "thewire.in", language: "en", region: "india", category: "national", candidates: [{ kind: "rss", url: "https://thewire.in/rss" }], priorNote: "Returns an HTML page, no feed at /rss." },
  { publisher: "The Print", domain: "theprint.in", language: "en", region: "india", category: "national", candidates: [{ kind: "rss", url: "https://theprint.in/feed/" }], priorNote: "/feed/ redirects to the homepage; no feed served." },
  { publisher: "Zee Business", domain: "zeebiz.com", language: "en", region: "india", category: "finance", candidates: [{ kind: "rss", url: "https://www.zeebiz.com/latest.xml/feed" }], priorNote: "HTTP 403 (Akamai)." },
  // ── Official ──
  { publisher: "PIB", domain: "pib.gov.in", language: "en", region: "india", category: "official", candidates: [{ kind: "rss", url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1" }], priorNote: "DISABLED — 200 but no pubDate/description; cannot place on a timeline." },
  { publisher: "Prasar Bharati (NewsOnAir)", domain: "newsonair.gov.in", language: "en", region: "india", category: "official", candidates: [{ kind: "rss", url: "https://www.newsonair.gov.in/feed/" }], priorNote: "DISABLED — 301 loop hangs past 25s." },
];

async function probe(url: string): Promise<{ code: string; kind: string; items: number; dated: boolean; tamil: boolean; blocked: boolean }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5" }, redirect: "follow", signal: AbortSignal.timeout(18_000) });
    const body = await res.text();
    const head = body.slice(0, 3000).toLowerCase();
    const blocked = /access denied|attention required|request unsuccessful|cf-browser-verification/i.test(body.slice(0, 1500));
    const kind = head.includes("<rss") ? "rss" : head.includes("<feed") ? "atom" : body.trimStart().startsWith("{") || body.trimStart().startsWith("[") ? "json" : head.includes("<html") ? "html" : "?";
    const items = (body.match(/<item\b|<entry\b/g) || []).length;
    const dated = /<pubdate>|<published>|<updated>/i.test(body);
    const tamil = /[஀-௿]/.test(body);
    return { code: String(res.status), kind, items, dated, tamil, blocked };
  } catch (err) {
    return { code: `ERR ${String(err).slice(0, 40)}`, kind: "?", items: 0, dated: false, tamil: false, blocked: false };
  }
}

function classify(probes: Awaited<ReturnType<typeof probe>>[], target: Target): Status {
  const best = probes.find((p) => (p.kind === "rss" || p.kind === "atom") && p.items >= 5 && p.dated);
  if (best) return target.candidates.some((c) => c.kind === "discovery") ? "DISCOVERY_ONLY" : "DIRECT_FEED";
  if (probes.some((p) => p.blocked || p.code === "403")) return "BLOCKED";
  if (probes.some((p) => (p.kind === "rss" || p.kind === "atom") && p.items > 0)) return "PARTIAL_FEED" as Status;
  if (probes.every((p) => p.code === "404" || p.code === "410" || p.kind === "html")) return "NO_FEED";
  return "MANUAL_ONLY";
}

async function main() {
  const enabledPubs = new Set(FEED_SOURCES.filter((f) => f.enabled).map((f) => f.publisher));
  const rows: Record<string, unknown>[] = [];

  for (const t of TARGETS) {
    const probes: Awaited<ReturnType<typeof probe>>[] = [];
    for (const c of t.candidates) {
      probes.push(await probe(c.url));
      await new Promise((r) => setTimeout(r, 1200));
    }
    const status = classify(probes, t);
    rows.push({
      publisher: t.publisher,
      domain: t.domain,
      language: t.language,
      region: t.region,
      category: t.category,
      currentlyEnabled: enabledPubs.has(t.publisher),
      status,
      probes: t.candidates.map((c, i) => ({ url: c.url, candidateKind: c.kind, ...probes[i] })),
      note: t.priorNote,
    });
    console.log(`  ${t.publisher.padEnd(34)} ${status.padEnd(15)} ${probes.map((p) => `${p.kind}/${p.items}`).join(" ")}`);
  }

  const md = [
    "# Source discovery audit (v0.11)",
    "",
    `Generated ${new Date().toISOString()} — one polite request per candidate, no scraping, no bypass.`,
    "",
    "| Publisher | Lang | Region | Category | Enabled | Status | Note |",
    "|---|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.publisher} | ${r.language} | ${r.region} | ${r.category} | ${r.currentlyEnabled ? "yes" : "—"} | **${r.status}** | ${(r.note as string) ?? ""} |`,
    ),
    "",
    "## Status counts",
    "",
    ...Object.entries(
      rows.reduce<Record<string, number>>((a, r) => ((a[r.status as string] = (a[r.status as string] ?? 0) + 1), a), {}),
    ).map(([k, v]) => `- ${k}: ${v}`),
  ].join("\n");

  writeFileSync(resolve(ROOT, "evaluation/reports/source-discovery-audit.md"), md);
  writeFileSync(resolve(ROOT, "evaluation/reports/source-discovery-audit.json"), JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));
  console.log("\nwrote evaluation/reports/source-discovery-audit.{md,json}");
}

main();
