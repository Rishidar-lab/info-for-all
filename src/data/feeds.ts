import type { EvidenceRole } from "@/lib/live/types";
import type { CategoryId } from "@/lib/domain/categories";

/**
 * IFFA live-feed registry — India / Tamil Nadu.
 *
 * Every enabled entry was validated by `scripts/validate-sources.ts` (see
 * `docs/source-registry.md` for the last run: HTTP status, item count, newest
 * item, canonical-link coverage, redirects). IFFA stores only the feed's own
 * headline, timestamp, short excerpt and canonical URL, always attributes the
 * publisher, and always links out to the original report. It never copies full
 * article bodies or bypasses paywalls, CAPTCHAs, auth, rate limits or anti-bot
 * systems — RSS / Atom / official CAP / open public endpoints only.
 *
 * `publisher` groups multiple feeds from one organisation (e.g. The Hindu's
 * several desks) so that a "coverage comparison" genuinely means *distinct
 * publishers*, not distinct feeds.
 *
 * v0.7: the typed metadata below (`sourceType`, `authorityClass`,
 * `categorySupport`, `region`, `pollIntervalMinutes`) is derived from the
 * existing fields by `describeFeed()` unless a feed overrides it. There is
 * deliberately NO numeric per-publisher "trust score" — reliability stays
 * contextual (evidence role + the independence engine).
 */

export type FeedKind = "rss" | "atom" | "sachet-json";

export type SourceType =
  | "official"
  | "public_broadcaster"
  | "wire"
  | "newspaper"
  | "digital_native"
  | "financial"
  | "sports"
  | "local"
  | "data_feed";

export type AuthorityClass = "primary-authority" | "accredited-media" | "specialist" | "aggregator";

export type SourceRegion = "tamil-nadu" | "india" | "kerala" | "global";

export interface FeedSource {
  id: string;
  name: string;
  /** Organisation this feed belongs to — the unit of "distinct source". */
  publisher: string;
  /** Publisher homepage — attribution only, never a fabricated article URL. */
  homepage: string;
  url: string;
  kind: FeedKind;
  defaultEvidenceRole: EvidenceRole;
  /** Is this an official / primary authority (vs independent journalism)? */
  official: boolean;
  language: "ta" | "en" | "mixed";
  focus: "tamil-nadu" | "india" | "india-disaster";
  role: "official" | "independent" | "specialist";
  enabled: boolean;
  /**
   * May a zero-signal item still be scoped from the feed's focus alone? True
   * for feeds that are India-specific by construction; false for feeds only
   * filtered to India by a query parameter, or general/world feeds published
   * in an Indian language. Defaults to true.
   */
  trustFeedScope?: boolean;
  note?: string;

  // ── v0.7 typed registry metadata (optional; describeFeed() fills the gaps) ──
  sourceType?: SourceType;
  authorityClass?: AuthorityClass;
  /** News domains this feed usefully covers. */
  categorySupport?: CategoryId[];
  region?: SourceRegion;
  /** Advisory poll cadence in minutes. Ingestion still runs on the workflow's 15-min schedule. */
  pollIntervalMinutes?: number;
  /**
   * v0.8 — corporate ownership group. Two publishers in the same group are not
   * fully independent of each other; the independence engine uses this.
   */
  ownershipGroup?: string;
}

export interface DescribedFeed extends FeedSource {
  sourceType: SourceType;
  authorityClass: AuthorityClass;
  categorySupport: CategoryId[];
  region: SourceRegion;
  pollIntervalMinutes: number;
}

/** Fill in the typed registry metadata for a feed from its existing fields. */
export function describeFeed(f: FeedSource): DescribedFeed {
  const authorityClass: AuthorityClass =
    f.authorityClass ?? (f.official ? "primary-authority" : f.role === "specialist" ? "specialist" : "accredited-media");

  const sourceType: SourceType =
    f.sourceType ??
    (f.kind === "sachet-json"
      ? "data_feed"
      : f.official
        ? "official"
        : f.publisher.includes("BBC")
          ? "public_broadcaster"
          : /News18|Puthiyathalaimurai/.test(f.publisher)
            ? "digital_native"
            : f.role === "specialist"
              ? "digital_native"
              : "newspaper");

  const region: SourceRegion =
    f.region ??
    (f.focus === "tamil-nadu"
      ? "tamil-nadu"
      : f.id.includes("kerala")
        ? "kerala"
        : f.language === "ta" && f.trustFeedScope === false
          ? "global"
          : "india");

  const categorySupport: CategoryId[] =
    f.categorySupport ??
    (f.official
      ? ["crisis"]
      : f.role === "specialist"
        ? ["crisis", "other-relevant"]
        : ["crisis", "politics", "finance", "sports", "other-relevant"]);

  const pollIntervalMinutes =
    f.pollIntervalMinutes ?? (f.official ? 15 : f.role === "specialist" ? 45 : 20);

  return { ...f, sourceType, authorityClass, categorySupport, region, pollIntervalMinutes };
}

export const FEED_SOURCES: FeedSource[] = [
  // ── Official / primary authorities ─────────────────────────────────────
  {
    id: "ndma-sachet-json",
    name: "NDMA SACHET — CAP alert details",
    publisher: "NDMA SACHET",
    homepage: "https://sachet.ndma.gov.in/",
    url: "https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails",
    kind: "sachet-json",
    defaultEvidenceRole: "official-alert",
    official: true,
    language: "mixed",
    focus: "india-disaster",
    role: "official",
    enabled: true,
    note: "National Disaster Management Authority Common Alerting Protocol feed. CAP severity / effective-time / area fields preserved verbatim.",
  },
  {
    id: "ndma-sachet-rss",
    name: "NDMA SACHET — All India CAP alerts (RSS)",
    publisher: "NDMA SACHET",
    homepage: "https://sachet.ndma.gov.in/",
    url: "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml",
    kind: "rss",
    defaultEvidenceRole: "official-alert",
    official: true,
    language: "mixed",
    focus: "india-disaster",
    role: "official",
    enabled: true,
    note: "Per-alert canonical links (FetchXMLFile) and CWC river-gauge bulletins. Merged with the JSON by identifier.",
  },
  {
    id: "reliefweb-india-disasters",
    name: "ReliefWeb — India disasters (UN OCHA)",
    publisher: "ReliefWeb (UN OCHA)",
    homepage: "https://reliefweb.int/country/india",
    url: "https://reliefweb.int/disasters/rss.xml?primary_country=IND&appname=ifa-github-io",
    kind: "rss",
    defaultEvidenceRole: "government-statement",
    official: true,
    language: "en",
    focus: "india-disaster",
    role: "official",
    enabled: true,
    trustFeedScope: false,
    note: "UN OCHA disaster-page feed. The primary_country=IND filter is not a hard guarantee, so items are kept only when they name an India / Tamil Nadu location themselves. Updates less often than a news feed; last-known-good is retained on failure.",
  },
  {
    id: "pib-english",
    name: "Press Information Bureau — English",
    publisher: "Press Information Bureau",
    homepage: "https://pib.gov.in/",
    url: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1&reg=3",
    kind: "rss",
    defaultEvidenceRole: "government-statement",
    official: true,
    language: "en",
    focus: "india",
    role: "official",
    enabled: false,
    note: "DISABLED — v0.9 Phase Q re-investigation (2026-09-02): the 403 edge block is gone (www.pib.gov.in with the &reg suffix now returns HTTP 200, 20 English national releases), but the feed carries ONLY <title> + <link> — no <pubDate>, <description>, or <guid>. Without a timestamp the pipeline cannot place a release on the live timeline or judge recency, and filling in the date/body would require fetching each PRID page (scraping, disallowed). Revisit if PIB restores a dated RSS.",
  },
  {
    id: "imd-allindia",
    name: "India Meteorological Department — all-India weather",
    publisher: "India Meteorological Department",
    homepage: "https://mausam.imd.gov.in/",
    url: "https://mausam.imd.gov.in/responsive/rss/allindiawxnews.xml",
    kind: "rss",
    defaultEvidenceRole: "government-statement",
    official: true,
    language: "en",
    focus: "india-disaster",
    role: "official",
    enabled: false,
    note: "IMD retired its public RSS (HTTP 404); its warnings API needs a key. IMD alerts still reach IFA through the SACHET CAP feed.",
  },

  // ── Independent reporting — Tamil Nadu focus (English) ──────────────────
  {
    id: "thehindu-tn",
    name: "The Hindu — Tamil Nadu",
    publisher: "The Hindu",
    homepage: "https://www.thehindu.com/news/national/tamil-nadu/",
    url: "https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "tamil-nadu",
    role: "independent",
    enabled: true,
  },
  {
    id: "thehindu-chennai",
    name: "The Hindu — Chennai",
    publisher: "The Hindu",
    homepage: "https://www.thehindu.com/news/cities/chennai/",
    url: "https://www.thehindu.com/news/cities/chennai/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "tamil-nadu",
    role: "independent",
    enabled: true,
  },
  {
    id: "toi-chennai",
    name: "The Times of India — Chennai",
    publisher: "The Times of India",
    homepage: "https://timesofindia.indiatimes.com/city/chennai",
    url: "https://timesofindia.indiatimes.com/rssfeeds/-2128833038.cms",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "tamil-nadu",
    role: "independent",
    enabled: true,
  },

  // ── Independent reporting — India-wide (English) ───────────────────────
  {
    id: "thehindu-national",
    name: "The Hindu — National",
    publisher: "The Hindu",
    homepage: "https://www.thehindu.com/news/national/",
    url: "https://www.thehindu.com/news/national/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "independent",
    enabled: true,
  },
  {
    id: "ndtv-india",
    name: "NDTV — India",
    publisher: "NDTV",
    homepage: "https://www.ndtv.com/india",
    url: "https://feeds.feedburner.com/ndtvnews-india-news",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "independent",
    enabled: true,
    note: "Feed reachable; individual ndtv.com article URLs have been observed to return 403 to datacenter IPs (publisher-side bot management). Not treated as an IFA defect; ordinary readers are unaffected.",
  },
  {
    id: "toi-india",
    name: "The Times of India — India",
    publisher: "The Times of India",
    homepage: "https://timesofindia.indiatimes.com/india",
    url: "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "independent",
    enabled: true,
  },
  {
    id: "ht-india",
    name: "Hindustan Times — India",
    publisher: "Hindustan Times",
    homepage: "https://www.hindustantimes.com/india-news",
    url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "independent",
    enabled: true,
    ownershipGroup: "HT Media",
  },
  {
    id: "indiatoday",
    name: "India Today — India",
    publisher: "India Today",
    homepage: "https://www.indiatoday.in/india",
    url: "https://www.indiatoday.in/rss/1206578",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "independent",
    enabled: true,
  },

  // ── Independent reporting — Tamil-language ─────────────────────────────
  {
    id: "bbc-tamil",
    name: "BBC News தமிழ்",
    publisher: "BBC Tamil",
    homepage: "https://www.bbc.com/tamil",
    url: "https://feeds.bbci.co.uk/tamil/rss.xml",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "ta",
    focus: "india",
    role: "independent",
    enabled: true,
    trustFeedScope: false,
    note: "Tamil-language; covers India, Tamil Nadu and world/Sri Lanka. Kept only when an item names an India / Tamil Nadu location.",
  },
  {
    id: "news18-tamil-tn",
    name: "News18 தமிழ் — தமிழ்நாடு",
    publisher: "News18 Tamil",
    homepage: "https://tamil.news18.com/tamil-nadu/",
    url: "https://tamil.news18.com/commonfeeds/v1/tam/rss/tamil-nadu.xml",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "ta",
    focus: "tamil-nadu",
    role: "independent",
    enabled: true,
  },
  {
    id: "puthiyathalaimurai",
    name: "Puthiyathalaimurai (புதிய தலைமுறை)",
    publisher: "Puthiyathalaimurai",
    homepage: "https://www.puthiyathalaimurai.com/",
    url: "https://www.puthiyathalaimurai.com/stories.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "ta",
    focus: "tamil-nadu",
    role: "independent",
    enabled: true,
    trustFeedScope: false,
    note: "Tamil-language TV news; general feed, so an item is kept only when it names an India / Tamil Nadu location.",
  },

  // ── Specialist context ────────────────────────────────────────────────
  {
    id: "thehindu-energy-env",
    name: "The Hindu — Energy & Environment",
    publisher: "The Hindu",
    homepage: "https://www.thehindu.com/sci-tech/energy-and-environment/",
    url: "https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "specialist",
    enabled: true,
  },
  {
    id: "mongabay-india",
    name: "Mongabay India",
    publisher: "Mongabay India",
    homepage: "https://india.mongabay.com/",
    url: "https://india.mongabay.com/feed/",
    kind: "rss",
    defaultEvidenceRole: "expert-analysis",
    official: false,
    language: "en",
    focus: "india",
    role: "specialist",
    enabled: true,
    note: "Environmental / conservation reporting.",
  },
  {
    id: "thehindu-kerala",
    name: "The Hindu — Kerala",
    publisher: "The Hindu",
    homepage: "https://www.thehindu.com/news/national/kerala/",
    url: "https://www.thehindu.com/news/national/kerala/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "specialist",
    enabled: true,
    note: "Neighbouring-state coverage — relevant for cross-border weather, Cauvery/Mullaperiyar water, and fishermen issues.",
  },

  // ── v0.8: official (public broadcaster) ───────────────────────────────
  {
    id: "prasar-bharati-newsonair",
    name: "All India Radio — NewsOnAir (Prasar Bharati)",
    publisher: "Prasar Bharati (NewsOnAir)",
    homepage: "https://www.newsonair.gov.in/",
    url: "https://www.newsonair.gov.in/feed/",
    kind: "rss",
    defaultEvidenceRole: "government-statement",
    official: true,
    language: "en",
    focus: "india",
    role: "official",
    enabled: false,
    sourceType: "public_broadcaster",
    authorityClass: "primary-authority",
    categorySupport: ["politics", "crisis", "finance", "sports", "other-relevant"],
    region: "india",
    note: "DISABLED — re-checked v0.9 Phase Q (2026-09-02): newsonair.gov.in/feed/ still returns a 301 to https://newsonair.gov.in/feed/ that then hangs past a 25s timeout (0 bytes). Not reachable from CI or this environment. Revisit.",
  },

  // ── v0.8: finance ────────────────────────────────────────────────────
  {
    id: "rbi-press",
    name: "Reserve Bank of India — press releases",
    publisher: "Reserve Bank of India",
    homepage: "https://www.rbi.org.in/",
    url: "https://www.rbi.org.in/pressreleases_rss.xml",
    kind: "rss",
    defaultEvidenceRole: "primary-document",
    official: true,
    language: "en",
    focus: "india",
    role: "official",
    enabled: true,
    sourceType: "official",
    authorityClass: "primary-authority",
    categorySupport: ["finance"],
    region: "india",
    pollIntervalMinutes: 30,
    note: "Monetary policy, regulation, banking. Validated 2026-09-02 (HTTP 200, 10 items).",
  },
  {
    id: "sebi-news",
    name: "SEBI — news & press releases",
    publisher: "SEBI",
    homepage: "https://www.sebi.gov.in/",
    url: "https://www.sebi.gov.in/sebirss.xml",
    kind: "rss",
    defaultEvidenceRole: "primary-document",
    official: true,
    language: "en",
    focus: "india",
    role: "official",
    enabled: false,
    sourceType: "official",
    authorityClass: "primary-authority",
    categorySupport: ["finance"],
    region: "india",
    pollIntervalMinutes: 45,
    note: "DISABLED — re-checked v0.9 Phase Q (2026-09-02, HTTP 200, 30 items): still dominated by SAT appeal filings and recovery-certificate notices ('Appeal No. 7022 of 2026 filed by …'), not policy/market news, and pubDate is still 'DD Mon, YYYY +0530' (no weekday, no time, stray comma — not RFC-822). Revisit if SEBI adds a press-release feed.",
  },
  {
    id: "thehindu-businessline",
    name: "The Hindu BusinessLine",
    publisher: "The Hindu BusinessLine",
    homepage: "https://www.thehindubusinessline.com/",
    url: "https://www.thehindubusinessline.com/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "specialist",
    enabled: true,
    trustFeedScope: false,
    sourceType: "financial",
    categorySupport: ["finance", "politics", "other-relevant"],
    region: "india",
    ownershipGroup: "Kasturi & Sons",
    note: "Financial daily (The Hindu Group). Carries global business news, so kept only when India-relevant. Validated 2026-09-02 (HTTP 200, 60 items).",
  },
  {
    id: "ndtv-profit",
    name: "NDTV Profit",
    publisher: "NDTV Profit",
    homepage: "https://www.ndtvprofit.com/",
    url: "https://feeds.feedburner.com/ndtvprofit-latest",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "specialist",
    enabled: true,
    trustFeedScope: false,
    sourceType: "financial",
    categorySupport: ["finance"],
    region: "india",
    ownershipGroup: "NDTV / Adani",
    note: "Markets, economy, corporate. Carries global markets news; kept when India-relevant. Validated 2026-09-02 (HTTP 200, 20 items).",
  },
  {
    id: "livemint-economy",
    name: "Mint — Economy",
    publisher: "Mint",
    homepage: "https://www.livemint.com/economy",
    url: "https://www.livemint.com/rss/economy",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "specialist",
    enabled: true,
    trustFeedScope: false,
    sourceType: "financial",
    categorySupport: ["finance", "politics", "other-relevant"],
    region: "india",
    ownershipGroup: "HT Media",
    note: "India macroeconomics / policy daily. Shares a parent (HT Media) with Hindustan Times — the independence engine collapses the two into one family (PUBLISHER_GROUP). robots.txt Allow: /; RSS not disallowed. Added v0.9 Phase G, validated 2026-09-03 (HTTP 200, ~25 items, pubDate/description/guid present).",
  },
  {
    id: "news18-tamil-business",
    name: "News18 தமிழ் — வணிகம்",
    publisher: "News18 Tamil",
    homepage: "https://tamil.news18.com/business/",
    url: "https://tamil.news18.com/commonfeeds/v1/tam/rss/business.xml",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "ta",
    focus: "india",
    role: "specialist",
    enabled: true,
    trustFeedScope: false,
    sourceType: "financial",
    categorySupport: ["finance"],
    region: "india",
    note: "Tamil-language business news. Kept only when an item names an India / Tamil Nadu topic. Validated 2026-09-02 (HTTP 200).",
  },

  // ── v0.8: sports ─────────────────────────────────────────────────────
  {
    id: "thehindu-sport",
    name: "The Hindu — Sport",
    publisher: "The Hindu",
    homepage: "https://www.thehindu.com/sport/",
    url: "https://www.thehindu.com/sport/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "specialist",
    enabled: true,
    sourceType: "sports",
    categorySupport: ["sports"],
    region: "india",
    note: "Validated 2026-09-02 (HTTP 200, 60 items).",
  },
  {
    id: "sportstar",
    name: "Sportstar",
    publisher: "Sportstar",
    homepage: "https://sportstar.thehindu.com/",
    url: "https://sportstar.thehindu.com/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "specialist",
    enabled: true,
    trustFeedScope: false,
    sourceType: "sports",
    categorySupport: ["sports"],
    region: "india",
    ownershipGroup: "Kasturi & Sons",
    note: "Sports weekly (The Hindu Group). Covers global sport; kept when India-relevant. Validated 2026-09-02 (HTTP 200, 80 items).",
  },
  {
    id: "espncricinfo",
    name: "ESPNcricinfo — India",
    publisher: "ESPNcricinfo",
    homepage: "https://www.espncricinfo.com/",
    url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    role: "specialist",
    enabled: true,
    trustFeedScope: false,
    sourceType: "sports",
    categorySupport: ["sports"],
    region: "global",
    note: "Cricket. Global feed; kept when it names India / an Indian team / IPL. Validated 2026-09-02 (HTTP 200, 100 items).",
  },
  {
    id: "news18-tamil-sports",
    name: "News18 தமிழ் — விளையாட்டு",
    publisher: "News18 Tamil",
    homepage: "https://tamil.news18.com/sports/",
    url: "https://tamil.news18.com/commonfeeds/v1/tam/rss/sports.xml",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "ta",
    focus: "india",
    role: "specialist",
    enabled: true,
    trustFeedScope: false,
    sourceType: "sports",
    categorySupport: ["sports"],
    region: "india",
    note: "Tamil-language sports news. Validated 2026-09-02 (HTTP 200).",
  },
];

export const ENABLED_FEEDS = FEED_SOURCES.filter((f) => f.enabled);

/** Distinct publishers among the enabled feeds. */
export const ENABLED_PUBLISHERS = [...new Set(ENABLED_FEEDS.map((f) => f.publisher))].sort();

/** The registry with typed metadata resolved — used by /sources and diagnostics. */
export const DESCRIBED_FEEDS: DescribedFeed[] = FEED_SOURCES.map(describeFeed);

/**
 * Feeds to INVESTIGATE for v0.7 / v0.8 — public RSS / official endpoints only,
 * no paywall / CAPTCHA / auth / rate-limit / anti-bot circumvention. Each is
 * enabled only after `scripts/validate-sources.ts` confirms a valid, reachable
 * document (HTTP 200, parseable, canonical links). Recorded here so the
 * discovery work is visible; not yet part of the pipeline.
 */
export const CANDIDATE_FEEDS: {
  id: string;
  publisher: string;
  category: CategoryId;
  url: string;
  status: "to-validate" | "blocked" | "no-feed-found" | "enabled";
  note: string;
}[] = [
  // ── enabled in v0.8 (validated 2026-09-02) ──
  { id: "rbi-press", publisher: "Reserve Bank of India", category: "finance", url: "https://www.rbi.org.in/pressreleases_rss.xml", status: "enabled", note: "HTTP 200, 10 items." },
  { id: "thehindu-businessline", publisher: "The Hindu BusinessLine", category: "finance", url: "https://www.thehindubusinessline.com/feeder/default.rss", status: "enabled", note: "HTTP 200, 60 items." },
  { id: "ndtv-profit", publisher: "NDTV Profit", category: "finance", url: "https://feeds.feedburner.com/ndtvprofit-latest", status: "enabled", note: "HTTP 200, 20 items." },
  { id: "thehindu-sport", publisher: "The Hindu", category: "sports", url: "https://www.thehindu.com/sport/feeder/default.rss", status: "enabled", note: "HTTP 200, 60 items." },
  { id: "sportstar", publisher: "Sportstar", category: "sports", url: "https://sportstar.thehindu.com/feeder/default.rss", status: "enabled", note: "HTTP 200, 80 items." },
  { id: "espncricinfo", publisher: "ESPNcricinfo", category: "sports", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", status: "enabled", note: "HTTP 200, 100 items (302 -> follow)." },
  { id: "news18-tamil-business", publisher: "News18 Tamil", category: "finance", url: "https://tamil.news18.com/commonfeeds/v1/tam/rss/business.xml", status: "enabled", note: "Tamil, HTTP 200." },
  { id: "news18-tamil-sports", publisher: "News18 Tamil", category: "sports", url: "https://tamil.news18.com/commonfeeds/v1/tam/rss/sports.xml", status: "enabled", note: "Tamil, HTTP 200." },
  { id: "livemint-economy", publisher: "Mint", category: "finance", url: "https://www.livemint.com/rss/economy", status: "enabled", note: "v0.9 Phase G. HTTP 200, ~25 items, pubDate/description/guid present. robots.txt Allow: /. Shares HT Media parent with Hindustan Times — one family in the independence engine." },
  // ── validated but NOT enabled ──
  { id: "moneycontrol-latest", publisher: "Moneycontrol", category: "finance", url: "https://www.moneycontrol.com/rss/latestnews.xml", status: "blocked", note: "v0.9 Phase G re-check: HTTP 200 but body is an Akamai 'Access Denied' page — anti-bot. Not usable." },
  { id: "business-standard-econ", publisher: "Business Standard", category: "finance", url: "https://www.business-standard.com/rss/economy-policy-102.rss", status: "blocked", note: "v0.9 Phase G re-check: HTTP 403 (Akamai). Not usable." },
  { id: "sebi-news", publisher: "SEBI", category: "finance", url: "https://www.sebi.gov.in/sebirss.xml", status: "blocked", note: "HTTP 200 but the feed is enforcement-appeal filings, and pubDate 'DD Mon, YYYY' is unparseable. Low value." },
  { id: "prasar-bharati-newsonair", publisher: "Prasar Bharati", category: "other-relevant", url: "https://www.newsonair.gov.in/feed/", status: "blocked", note: "Slow 301 loop (20s+, 0 bytes) from CI / this environment." },
  { id: "pib-english", publisher: "Press Information Bureau", category: "politics", url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1", status: "blocked", note: "Akamai 403 from CI and this environment (2026-09-02). Retry from a reachable network." },
  { id: "eci-press", publisher: "Election Commission of India", category: "politics", url: "https://www.eci.gov.in/", status: "no-feed-found", note: "No public RSS located; press-note page only." },
  { id: "imd-tn-warnings", publisher: "India Meteorological Department", category: "crisis", url: "https://mausam.imd.gov.in/", status: "no-feed-found", note: "Public RSS retired (404); warnings reach IFFA via SACHET CAP." },
  { id: "sansad", publisher: "Parliament of India", category: "politics", url: "https://sansad.in/", status: "no-feed-found", note: "No public RSS located (404)." },
  { id: "tn-dipr", publisher: "Tamil Nadu DIPR", category: "politics", url: "https://tn.gov.in/", status: "no-feed-found", note: "No machine-readable feed; press releases are PDFs on a portal." },
];
