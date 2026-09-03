# Source discovery audit (v0.11)

Generated 2026-09-03T07:36:03.336Z — one polite request per candidate, no scraping, no bypass.

| Publisher | Lang | Region | Category | Enabled | Status | Note |
|---|---|---|---|---|---|---|
| The Hindu Tamil | ta | tamil-nadu | general | yes | **DIRECT_FEED** | ENABLED v0.11 — /feed works (37 items); /rss/*.xml paths are Akamai-blocked. |
| ABP Tamil | ta | tamil-nadu | general | yes | **DIRECT_FEED** | ENABLED v0.11 — 21 items. |
| Nakkheeran | ta | tamil-nadu | politics | yes | **DIRECT_FEED** | ENABLED v0.11 — 50 items. |
| News18 Tamil | ta | tamil-nadu | general | yes | **DIRECT_FEED** | ENABLED (v0.8) — high item count, 7-day age filter drops ~70%. |
| Puthiyathalaimurai | ta | tamil-nadu | general | yes | **DIRECT_FEED** | ENABLED — but the feed only carries ~7 items. |
| BBC Tamil | ta | india | general | yes | **DIRECT_FEED** | ENABLED — world-news heavy; trustFeedScope=false drops most. |
| Dinamalar | ta | tamil-nadu | general | — | **NO_FEED** | No working public feed found on any tried path (all 404). |
| Daily Thanthi | ta | tamil-nadu | general | — | **NO_FEED** | No public feed found (404). Surfaces in Google News RSS. |
| Dinakaran | ta | tamil-nadu | general | — | **NO_FEED** | No public feed found (404). |
| Dinamani | ta | tamil-nadu | general | — | **NO_FEED** | Akamai 'Access Denied' on the .xml paths. Surfaces in Google News RSS. |
| Vikatan | ta | tamil-nadu | general | — | **DIRECT_FEED** | 302 to a non-feed; no working feed found. Surfaces in Google News RSS. |
| Maalai Malar | ta | tamil-nadu | general | — | **NO_FEED** | No public feed found (404). |
| DT Next | en | tamil-nadu | general | — | **NO_FEED** | No public feed found (404 on all tried paths). |
| Tamil Samayam | ta | tamil-nadu | general | — | **NO_FEED** | 404 on tried .cms feed paths. |
| Polimer News | ta | tamil-nadu | general | — | **PARTIAL_FEED** | FeedBurner Atom returns only ~3 items — too thin to enable. |
| Google News RSS (Tamil / Tamil Nadu) | ta | tamil-nadu | discovery | — | **DISCOVERY_ONLY** | Returns ~110 Tamil items with publisher names (Daily Thanthi, Dinamani, Vikatan, Tamil Murasu…). news.google.com/robots.txt does NOT list /rss/ in its Allow set → recorded DISCOVERY_ONLY, NOT integrated pending a maintainer compliance decision. Single biggest potential Tamil unlock. |
| The Indian Express | en | india | national | yes | **DIRECT_FEED** | ENABLED v0.10. |
| The Free Press Journal | en | india | national | yes | **DIRECT_FEED** | ENABLED v0.11 — 65 items. |
| Business Standard | en | india | finance | yes | **BLOCKED** | ENABLED v0.10 (home_page_top_stories; the economy feed is 403). |
| Moneycontrol | en | india | finance | yes | **DIRECT_FEED** | ENABLED v0.10 — earlier Akamai block cleared. |
| Deccan Herald | en | india | national | — | **NO_FEED** | 404 on tried paths. |
| Scroll.in | en | india | national | — | **NO_FEED** | 404 on tried paths. |
| The Wire | en | india | national | — | **NO_FEED** | Returns an HTML page, no feed at /rss. |
| The Print | en | india | national | — | **NO_FEED** | /feed/ redirects to the homepage; no feed served. |
| Zee Business | en | india | finance | — | **NO_FEED** | HTTP 403 (Akamai). |
| PIB | en | india | official | — | **BLOCKED** | DISABLED — 200 but no pubDate/description; cannot place on a timeline. |
| Prasar Bharati (NewsOnAir) | en | india | official | — | **MANUAL_ONLY** | DISABLED — 301 loop hangs past 25s. |

## Status counts

- DIRECT_FEED: 10
- NO_FEED: 12
- PARTIAL_FEED: 1
- DISCOVERY_ONLY: 1
- BLOCKED: 2
- MANUAL_ONLY: 1