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
    url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1",
    kind: "rss",
    defaultEvidenceRole: "government-statement",
    official: true,
    language: "en",
    focus: "india",
    role: "official",
    enabled: false,
    note: "HTTP 403 (Akamai edge block) from GitHub Actions and this environment on 2026-09-01. Not retried aggressively. Enable where pib.gov.in is reachable.",
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
  status: "to-validate" | "blocked" | "no-feed-found";
  note: string;
}[] = [
  { id: "rbi-press", publisher: "Reserve Bank of India", category: "finance", url: "https://www.rbi.org.in/pressreleases_rss.xml", status: "to-validate", note: "RBI press releases RSS." },
  { id: "sebi-press", publisher: "SEBI", category: "finance", url: "https://www.sebi.gov.in/sebirss.xml", status: "to-validate", note: "SEBI news/press RSS." },
  { id: "pib-english", publisher: "Press Information Bureau", category: "politics", url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1", status: "blocked", note: "Akamai 403 from CI (already in FEED_SOURCES, disabled). Retry from a reachable network." },
  { id: "thehindu-business", publisher: "The Hindu", category: "finance", url: "https://www.thehindu.com/business/feeder/default.rss", status: "to-validate", note: "The Hindu Business desk." },
  { id: "thehindu-sport", publisher: "The Hindu", category: "sports", url: "https://www.thehindu.com/sport/feeder/default.rss", status: "to-validate", note: "The Hindu Sport desk." },
  { id: "sportstar", publisher: "Sportstar", category: "sports", url: "https://sportstar.thehindu.com/feeder/default.rss", status: "to-validate", note: "Sportstar (The Hindu group)." },
  { id: "eci-press", publisher: "Election Commission of India", category: "politics", url: "https://www.eci.gov.in/", status: "no-feed-found", note: "No public RSS located; press-note page only. Revisit." },
];
