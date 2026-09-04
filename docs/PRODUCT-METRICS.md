# Product metrics & analytics foundation

**Status (v0.12):** measurement *foundation* only. IFFA ships with **no analytics
provider** and sends nothing anywhere. This document defines what would be worth
measuring and how the code is structured so a privacy-respecting provider can be
added later without changing call sites.

## Principles

1. **Off by default, identical behaviour.** `NEXT_PUBLIC_ANALYTICS` is unset in
   every shipped build. `track()` is a no-op: no request, no cookie, no
   `localStorage`, no fingerprint. The app behaves the same with it on or off.
2. **No content, ever.** The typed schema (`src/lib/analytics/events.ts`) makes
   it impossible for a call site to pass article text or a raw search string.
   `search_used` carries a length *bucket* (0–3) and a boolean "looked like a
   URL", never the query.
3. **Public data only.** Story slugs, categories and scopes are already in the
   URL. Nothing identifies a person.
4. **One reviewed wiring point.** `getProvider()` in `src/lib/analytics/index.ts`
   is the single switch where a provider would be registered.
5. **Provider choice, if ever:** cookieless, no cross-site tracking, EU-hosted or
   self-hosted, aggregate-only. Candidates to evaluate: self-hosted Plausible or
   Umami. Never Google Analytics.

## Event schema

`src/lib/analytics/events.ts` — every payload field is an enum, bounded string,
count or boolean.

| Event | When | Key fields |
|---|---|---|
| `home_view` | home page mount | `path` |
| `story_open` | story page mount | `slug`, `category`, `scope`, `briefState` (delivered/withheld), `genuineFamilies` |
| `evidence_open` | a reader opens the Evidence / Landscape / Headlines / Perspectives tab | `slug`, `tab` |
| `reference_open` | a reader expands a citation `[n]` | `slug`, `refIndex` |
| `source_profile_open` | a `/source/[id]` page opens | `sourceId` |
| `compare_open` | `/source/compare` opened | `from` |
| `search_used` | debounced, after typing stops | `queryLength` bucket, `looksLikeUrl`, `resultCount` |
| `load_more` | "Load more" clicked on a feed section | `section`, `pageIndex` |
| `pwa_install_prompt` | install prompt shown / accepted / dismissed | `outcome` |
| `partnership_cta` | project/partnership link clicked | `placement` |

**Wired today:** `home_view`, `story_open`, `search_used`, `load_more`.
**Call sites ready, not yet wired:** the rest.

## KPIs these support

| KPI | Formula | What it tells us |
|---|---|---|
| Story-open rate | `story_open / home_view` | Is the feed surfacing things people want to read? |
| Evidence-interaction rate | `evidence_open / story_open` | Do readers actually use the evidence layer — IFFA's whole point? |
| Reference click-through | `reference_open / story_open` | Are citations trusted / used? |
| Search-to-story conversion | `story_open (from /search) / search_used` | Is search answering the question? |
| Stories per session | distinct `story_open` per session | Depth of engagement |
| Tamil vs English engagement | `story_open` split by story `scope`/language | Is the Tamil-first promise landing with Tamil readers? |
| Withheld-brief tolerance | `story_open` continuation when `briefState = withheld` | Do honest "no brief yet" states drive people away, or are they accepted? |
| PWA install interest | `pwa_install_prompt(accepted) / pwa_install_prompt(shown)` | Repeat-use intent |
| Partnership conversion | `partnership_cta` clicks | Top of the commercial funnel |

Return usage and session stitching require a provider that supports it in a
privacy-compatible way (e.g. a daily salted visitor hash, never a persistent
id). Until then, only within-session and aggregate rates are available.

## Adding a provider (future)

1. Implement `AnalyticsProvider` (`{ name, send(event) }`) in a new file.
2. Register it in `getProvider()` under a `NEXT_PUBLIC_ANALYTICS` value.
3. Add its script/CSP entry only in the environment where it's enabled.
4. Update this document and the privacy note in `README.md` / the site footer.
5. Add an E2E test that the default (unset) build still makes zero analytics
   requests.
