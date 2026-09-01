# IFA production data-quality audit — 2026-09-01

Audited: `https://rishidar-lab.github.io/info-for-all/` (live deployment), plus a local
re-ingest against the same real feeds to inspect the pipeline that produced it. Three
confirmed factual-integrity bugs were found and fixed in-place (see **Fixes applied**
below); all figures in this document are from the **post-fix** dataset unless marked
*(pre-fix)*.

## Summary of findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Every cluster card said "Compare coverage →", including single-source clusters | Misleading label | **Fixed** |
| 2 | Cluster `verificationStatus` was hardcoded to `"official-alert"` for any crisis cluster, even ones with zero official sources (e.g. an independent-only landslide report showed "Official primary source") | Factual-integrity bug | **Fixed** |
| 3 | An independent newspaper's own headline mentioning a Collector/Minister/CM was reclassified `government-statement` and counted as an **official** source — inflating official counts and producing contradictory tallies ("1 source · 1 official · 1 independent") | Factual-integrity bug | **Fixed** |
| 4 | Two ReliefWeb items with no India reference at all ("Lebanon: Conflict Intensity Snapshot", a global MEAL review) were included in the India feed on the strength of the feed's own India-query focus alone | Off-topic content | **Fixed** |
| 5 | 16 unrelated official flood bulletins for 16 different rivers across Odisha/Jharkhand/West Bengal/Bihar were merged into one cluster titled plain "Flood", because "both India-scope, both with no matched TN district" was treated as geographic overlap | Duplicate/over-merged cluster | **Fixed** |
| 6 | "No active alert" copy didn't match the required wording and didn't distinguish "genuinely none" from "filtered to none" | Honesty-of-state gap | **Fixed** |
| 7 | No `EMPTY` health state existed for "zero valid scoped items" (currently unreachable given the seed + 7 working feeds, but the type modelled only live/degraded/stale) | Defensive gap | **Fixed** |

## Fixes applied

- `src/lib/live/normalize.ts` — `evidenceRole()` no longer promotes a non-official feed's
  article to `government-statement` from title/author keywords (collector, minister, CM,
  govt…). Only the feed's own `official` flag can produce an official evidence role.
- `src/lib/live/cluster.ts` — cluster `verificationStatus` now uses the cluster's actual
  dominant role (`official.length > 0 ? "official-alert" : …`), not `isCrisis` as a proxy
  for official backing.
- `src/lib/live/cluster.ts` — clustering geography gate no longer treats "both India-scope,
  both zero TN-district" as overlap; only real district overlap (or same-Tamil-Nadu-with-
  no-district, a single state) counts. Removed a false-merge path that produced a 16-member
  cluster of unrelated river-gauge bulletins.
- `src/lib/live/geo.ts` — added `FeedSource.trustFeedScope` (default true). Feeds that are
  India-specific by construction (a paper's India/TN desk, NDMA) may still default a
  zero-signal item to India scope. Feeds only filtered to India by a query parameter
  (ReliefWeb) may not — `reliefweb-india` is now `trustFeedScope: false`, so an item with no
  India/TN reference in its own text is excluded rather than assumed. Added several more
  country names (incl. Lebanon) to the foreign-context exclusion list.
- `src/lib/live/dataset.ts` — new `clusterLabel()`: **Single report** (≤1 source, CTA
  "Inspect report"), **Coverage comparison** (2+ sources incl. ≥1 independent, CTA "Compare
  coverage"), **Official alert** (2+ sources, all official, CTA "View source context").
  Wired into the homepage cards (`cluster-card.tsx`) and the story page.
- `src/components/live/status-banner.tsx` — "Last successfully refreshed: … IST" wording;
  added an honest `EMPTY` message.
- `src/components/live/live-feed.tsx` — the active-alerts empty state now shows the exact
  required sentence *"No active official crisis alert was found in the latest successful
  refresh."* only when there is genuinely nothing in this refresh; a separate message is
  shown when filters, not the data, produced zero results.
- `src/lib/live/types.ts`, `scripts/ingest-feeds.ts`, `scripts/validate-feed.ts` —
  `FeedHealth` gains `"empty"`, computed from zero valid scoped items (not just feed
  failures).
- Tests: 8 new (`tests/unit/live.test.ts`) covering the label rule, the evidence-role
  non-promotion, the verification-status fix, and the geo `trustFeedScope` behaviour
  (including the Lebanon case). 55/55 pass.

## Audit table (first 10 clusters shown on the homepage, post-fix)

| Cluster | Scope | Sources | Timestamp (IST) | Classification | Result | Problem |
|---|---|---|---|---|---|---|
| Flash Flood (Uttarkashi/Nainital region) | India | 1 official | 01 Sep, 19:55 | Single report · Official alert | PASS | none |
| Flash Flood (earlier bulletin, same region) | India | 1 official | 01 Sep, 13:30 | Single report · Official alert | PASS | none |
| Moderate Thunderstorms with surface wind | India | 1 official | 01 Sep, 19:16 | Single report · Official alert | PASS | none |
| Very Heavy Rain (Uttarakhand) | India | 1 official | 01 Sep, 15:58 | Single report · Official alert | PASS | none |
| Very Heavy Rain (Chhattisgarh) | India | 1 official | 01 Sep, 13:40 | Single report · Official alert | PASS | none |
| Very Heavy Rain (Madhya Pradesh) | India | 1 official | 01 Sep, 13:27 | Single report · Official alert | PASS | none |
| Moderate Rain — Chengalpattu, Cuddalore, Dharmapuri +18 more | **Tamil Nadu** | 1 official (IMD Chennai) | 01 Sep, 19:00 | Single report · Official alert, Developing | PASS | Generic "Moderate Rain" title; district list (21 TN districts) is accurate against `cap.areaDescription` |
| Ambasamudram former MLA Esakki Subaya … withdrawing resignation | Tamil Nadu | 1 independent (The Hindu — TN) | 01 Sep, 21:04 | Single report | PASS (after fix) | *(pre-fix: mislabeled "Official primary source" on a different item of the same type — see Finding 2/3)* |
| Villupuram Collector issues guidelines for Vinayaka Chaturthi | Tamil Nadu | 1 independent (The Hindu — TN) | 01 Sep, 20:11 | Single report | PASS (after fix) | *(pre-fix: this exact item showed "1 official" because it mentions "Collector" — Finding 3, now 0 official / 1 independent)* |
| Madras High Court directs T.N. Nursing Council … | Tamil Nadu | 1 independent (The Hindu — TN) | 01 Sep, 16:55 | Single report | PASS | none |

All ten: headline readable, source attribution present, publication time valid and in a
sane range, event type reasonable (no crisis label on routine administrative/political
news), scope correctly Tamil Nadu or India (no item included merely because "Chennai" or
"Madras" appeared incidentally — see `geo.reason` on each item), no raw HTML/XML markup
in any title or excerpt, no broken Unicode (Tamil-script items render correctly), no item
misrepresented as more current than its timestamp. **3 Of Assam Family Die In Landslide**
and the **Mettur Dam** items (spot-checked outside the top 10, see Findings 2–3) were the
ones that surfaced the verification/official-count bugs and are now correct.

## Original-source link check

Sampled across all 7 working feeds (GET requests, browser user agent):

- **NDMA SACHET** (`FetchXMLFile?identifier=…`) — 200, loads the alert detail page.
- **The Hindu** (TN + National) — 200 on every sampled article.
- **Times of India** — 200 on every sampled article.
- **NDTV** — sampled article URLs returned **403** from this audit environment (confirmed
  in a real headless-browser context, not just `curl`). The URLs themselves are correctly
  formed (NDTV's own slug/ID scheme); this reads as an access-control response to this
  environment's request pattern/IP, the same class of block already documented for PIB.
  IFA does not attempt to bypass it. Real end users on ordinary residential/mobile networks
  are very unlikely to see this. Left as a documented limitation, not a code defect.

## Clustering analysis: why article and cluster counts move together

Post-fix (this run: 227 articles → 223 clusters):

- **Singleton clusters:** 223
- **Multi-source clusters:** 0 — see note below
- **Largest cluster:** 3 members (3 headlines from *The Hindu — Tamil Nadu* about the same
  Mettur Dam / Cauvery release event); `sourceCount` is still 1 because all 3 are the same
  publication, so the card correctly shows **Single report**, not a comparison
- **Merge rate:** (227 articles − 223 clusters) / 227 ≈ **1.8%** — almost everything is its
  own cluster
- **Active official alerts:** 45 distinct in-effect SACHET alerts (`active`/`update`
  lifecycle with ≥1 official source)
- **Independent-report articles:** 150
- **Stale items (from a feed marked `stale` this run):** 0 — all 7 configured feeds
  responded on the run used for this audit
- **Oldest displayed item:** 2026-08-31T02:11:51Z — "Direct Karnataka to release backlog of
  17.604 tmcft Cauvery…" (The Hindu — National)
- **Newest displayed item:** 2026-09-01T15:45:00Z — an IMD thunderstorm alert (SACHET RSS)

**Why 230-ish items became ~175 clusters before the fix, and ~223 after:** the *pre-fix*
figure (175 clusters from 230 articles, a 24% merge rate) was **not** genuine coverage
overlap — it was substantially the Finding 5 bug (SACHET's templated river-bulletin
wording being read as topical similarity across unrelated rivers/states). Once that gate
was tightened, the merge rate dropped to ~2%, which is a **more honest picture of this
feed mix**, not a regression: NDMA SACHET issues one alert per river-gauge/warning area,
and the four news feeds have not, in this particular snapshot, published near-duplicate
headlines about the same event. **There are currently 0 genuine coverage-comparison
clusters** (2+ sources with at least one independent report). This is reported plainly
rather than manufactured — see "Do not manufacture comparison content" in the brief.
Comparisons will appear organically once an independent outlet and an official alert (or
two independent outlets) cover the same identifiable event within the clustering window.

## Site-state language

- **LIVE** is correctly shown only when all configured *enabled* feeds respond
  (`workingFeeds === feeds.length`); with PIB disabled and only 7 feeds enabled, "LIVE"
  means "all 7 enabled feeds," not "every source described in the methodology" — the
  About page and Sources page separately disclose that PIB is configured-but-disabled and
  why, so the site does not imply an inoperative source is running.
- **DEGRADED** is shown (and was observed on a prior deploy run) when ReliefWeb or another
  enabled feed fails; failed feed names are listed in the banner.
- **STALE** path (all feeds fail) retains and marks last-known-good data; verified via the
  ingestion script's fallback logic and unit tests, not currently triggered live (feeds are
  healthy).
- **EMPTY** (new) — added for the "zero valid scoped items" case the brief calls out;
  not currently reachable with 7 working feeds and a non-empty seed, but the type and copy
  now exist rather than silently defaulting to "live".

## Active-alert safety copy

Confirmed in source and (given today's data) not visible live, since alerts exist: when
the **unfiltered** active-alerts list is empty, the homepage shows the exact required
sentence: *"No active official crisis alert was found in the latest successful refresh."*
A separate, distinguishable message is shown when a language/geography/district filter —
not the underlying data — produces zero results, so a reader is never told "found no
crisis" when the true state is "your filter hid it." Neither path implies "there is
definitely no emergency."

## IST timestamps

Status banner reads (live, current run): **"LIVE · Last successfully refreshed: 01 Sep
2026, 21:22 IST (2 min ago) · 7 / 7 feeds responding."** Cluster cards show `updated <date>,
<time> IST`; the story detail page shows `Updated <date>, <time> IST` and, for CAP alerts,
`Effective from / until … IST`. All timestamp rendering goes through one shared
`Asia/Kolkata`-zoned formatter (`istTimestamp` / `fmtIST`), so there is one place that
could get the zone wrong, and it is correct.

## Screenshots and browser checks

Captured (not committed — regenerable via `qa-prod/`, gitignored working files):
`ifa-desktop.png` / `-full.png` (1440×900), `ifa-mobile.png` / `-full.png` (390×844).
Playwright pass against the production deployment and a local base-path build covering:
homepage → cluster (single-source) → back, `/sources/`, `/about/`, `/methodology/examples/`,
direct refresh on the essay/cluster/sources/about routes — 0 console errors, 0 failed
requests, no horizontal overflow at 390px on any of the four required routes.
