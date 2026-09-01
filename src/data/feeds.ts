import type { EvidenceRole } from "@/lib/live/types";

/**
 * IFA live-feed registry — India / Tamil Nadu.
 *
 * Every entry is a publicly accessible RSS/Atom document or a public structured
 * endpoint. IFA stores only the feed's own headline, timestamp, short excerpt
 * and canonical URL, always attributes the publisher, and always links out to
 * the original report. It never copies full article bodies or bypasses access
 * controls.
 *
 * Reachability from this environment was checked on 2026-09-01. Feeds that were
 * blocked here (e.g. PIB via Akamai) are listed as `enabled: false` with a note
 * so they can be turned on in an environment that can reach them.
 */

export type FeedKind = "rss" | "atom" | "sachet-json";

export interface FeedSource {
  id: string;
  name: string;
  /** Publisher homepage — shown as attribution, never a fabricated article URL. */
  homepage: string;
  url: string;
  kind: FeedKind;
  /** Default evidence role for items from this feed (may be refined per-item). */
  defaultEvidenceRole: EvidenceRole;
  /** Is this an official / primary authority? */
  official: boolean;
  language: "ta" | "en" | "mixed";
  /** Editorial region focus, used only to help geo-classification, never displayed as a rating. */
  focus: "tamil-nadu" | "india" | "india-disaster";
  enabled: boolean;
  note?: string;
  /**
   * When an item names no India/Tamil Nadu location at all, may its scope
   * still be trusted from the feed's own focus? True for feeds whose entire
   * output is India-specific by construction (a paper's India/TN desk, the
   * national disaster authority). False for feeds that are filtered by a
   * query parameter that isn't a hard guarantee (e.g. a global humanitarian
   * digest queried for India can still return other-country or global items)
   * — those require an explicit textual match instead of feed-focus trust.
   * Defaults to true.
   */
  trustFeedScope?: boolean;
}

export const FEED_SOURCES: FeedSource[] = [
  // ── Official / primary authorities ──────────────────────────────────────
  {
    id: "ndma-sachet-json",
    name: "NDMA SACHET — CAP alert details",
    homepage: "https://sachet.ndma.gov.in/",
    url: "https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails",
    kind: "sachet-json",
    defaultEvidenceRole: "official-alert",
    official: true,
    language: "mixed",
    focus: "india-disaster",
    enabled: true,
    note: "National Disaster Management Authority Common Alerting Protocol feed. Structured severity / effective-time / area fields are preserved verbatim.",
  },
  {
    id: "ndma-sachet-rss",
    name: "NDMA SACHET — All India CAP alerts (RSS)",
    homepage: "https://sachet.ndma.gov.in/",
    url: "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml",
    kind: "rss",
    defaultEvidenceRole: "official-alert",
    official: true,
    language: "mixed",
    focus: "india-disaster",
    enabled: true,
    note: "Per-alert canonical links (FetchXMLFile) come from this feed and are merged with the JSON by identifier.",
  },
  {
    id: "reliefweb-india",
    name: "ReliefWeb — India updates (UN OCHA)",
    homepage: "https://reliefweb.int/country/india",
    url: "https://reliefweb.int/updates/rss.xml?primary_country=IND&appname=ifa-github-io",
    kind: "rss",
    defaultEvidenceRole: "government-statement",
    official: true,
    language: "en",
    focus: "india-disaster",
    enabled: true,
    trustFeedScope: false,
    note: "UN Office for the Coordination of Humanitarian Affairs. Aggregates official situation reports and agency statements. The primary_country=IND query parameter is not a hard guarantee — the feed has been observed to include other-country and global thematic reports, so items are kept only when they name an India / Tamil Nadu location themselves.",
  },

  // ── Independent news — Tamil Nadu focus ────────────────────────────────
  {
    id: "thehindu-tn",
    name: "The Hindu — Tamil Nadu",
    homepage: "https://www.thehindu.com/news/national/tamil-nadu/",
    url: "https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "tamil-nadu",
    enabled: true,
  },

  // ── Independent news — India ───────────────────────────────────────────
  {
    id: "thehindu-national",
    name: "The Hindu — National",
    homepage: "https://www.thehindu.com/news/national/",
    url: "https://www.thehindu.com/news/national/feeder/default.rss",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    enabled: true,
  },
  {
    id: "ndtv-india",
    name: "NDTV — India",
    homepage: "https://www.ndtv.com/india",
    url: "https://feeds.feedburner.com/ndtvnews-india-news",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    enabled: true,
  },
  {
    id: "toi-india",
    name: "The Times of India — India",
    homepage: "https://timesofindia.indiatimes.com/india",
    url: "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",
    kind: "rss",
    defaultEvidenceRole: "independent-report",
    official: false,
    language: "en",
    focus: "india",
    enabled: true,
  },

  // ── Blocked from this environment — enable where reachable ─────────────
  {
    id: "pib-english",
    name: "Press Information Bureau — English",
    homepage: "https://pib.gov.in/",
    url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1",
    kind: "rss",
    defaultEvidenceRole: "government-statement",
    official: true,
    language: "en",
    focus: "india",
    enabled: false,
    note: "Returned HTTP 403 (Akamai edge block) from the build environment on 2026-09-01. Enable where the host can reach pib.gov.in.",
  },
  {
    id: "pib-tamil",
    name: "Press Information Bureau — Tamil",
    homepage: "https://pib.gov.in/",
    url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=11&Regid=6",
    kind: "rss",
    defaultEvidenceRole: "government-statement",
    official: true,
    language: "ta",
    focus: "tamil-nadu",
    enabled: false,
    note: "Same Akamai block as the English PIB feed.",
  },
];

export const ENABLED_FEEDS = FEED_SOURCES.filter((f) => f.enabled);
