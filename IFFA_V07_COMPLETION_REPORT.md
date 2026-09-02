# IFFA v0.7 — Trend Intelligence — Completion Report

**Date:** 2026-09-02
**Branch:** `main`
**Product:** Info For All (IFA) → **IFFA — Info Free For All**
**Version:** `v0.7 — Trend Intelligence` (deliberately NOT v1.0)
**Repository / deployment:** unchanged — `github.com/Rishidar-lab/info-for-all`,
GitHub Pages at `rishidar-lab.github.io/info-for-all` (`basePath=/info-for-all`).

---

## 1. Commits (in order)

| SHA | Title |
|---|---|
| `33f2bb4` | feat(brand): migrate visible identity to IFFA (Info Free For All) |
| `aa4c3ee` | feat(taxonomy): add priority news domains and geo tiers |
| `9c86957` | feat(sources): typed configurable source registry |
| `54bdcc7` | feat(trends): interpretable velocity, novelty and consequence engine |
| `44f09e6` | feat(specialists): finance-number and sports-fixture safety guards |
| `399ae45` | feat(ui): event-first IFFA home, category views and trend leaderboard |
| `fd018f5` | feat(story): timeline and cross-source coverage comparison |
| `ba809aa` | test(iffa): adversarial mini-corpus + classifier coverage |
| `33bbec0` | docs(methodology): document the IFFA trend model and v0.7 |
| _(final)_ | chore(v0.7): completion report + refreshed eval + seed |

(SHAs above are the values at the time of writing; the final commit adds this report.)

---

## 2. What shipped

### Rebrand (Phase B)
`src/lib/brand.ts` single source of truth. Layout metadata, header (event-first nav),
footer, home hero, `/about`, `/sources`, quality-dashboard header, `package.json`
(`iffa` @ `0.7.0`), README. Installable web manifest (`src/app/manifest.ts`). Repository,
`basePath`, every route path and every feed id **unchanged**. "Formerly Info For All"
kept visible for one release.

### Domain taxonomy (Phase C/H)
`src/lib/domain/`:
- `categories.ts` — `CategoryId` crisis > politics > finance > sports > other-relevant,
  plus **entertainment / celebrity recognised but `DEFAULT_ENABLED = false`** (off default
  surfaces, still filterable, never dropped from the dataset). Sub-category tables per spec.
  `classifyCategory()` — deterministic, explainable, `crisisType` forces `crisis`.
- `geo-tiers.ts` — P0 Tamil Nadu / P1 India / P2 abroad-but-India-relevant / out.
- `districts.ts` — **Tamil-script name for all 38 districts** + `resolveDistricts()`
  (English aliases + Tamil forms, suffix-tolerant via the existing normaliser) +
  taluk/town → district map.
- `finance.ts` / `sports.ts` — number-unit and fixture safety guards (see §4).

### Source registry (Phase D)
`src/data/feeds.ts` extended with `sourceType` / `authorityClass` / `categorySupport` /
`region` / `pollIntervalMinutes` (optional; `describeFeed()` resolves them). `DESCRIBED_FEEDS`
+ `CANDIDATE_FEEDS` (RBI, SEBI, Hindu Business/Sport, Sportstar, PIB-retry — to validate).
**No numeric per-publisher trust score.** `/sources` reworked: authority class, covered
domains, poll cadence, and a "feeds under investigation" section.

### Trend Intelligence engine (Phase E/F) — `src/lib/trends/`
Pure, deterministic, run in `ingest-feeds.ts` **after** clustering. Never touches the
identity / claims / clustering engines.
- `weights.ts` — every ranking constant named + commented; `TREND_WEIGHTS` sum to 1
  (checked at load + test).
- `velocity.ts` — per-window counts by **independent source family**, not raw article.
  Acceleration = last-hour family rate ÷ prior-6h rate. `NEW/RISING/FAST-RISING/STABLE/
  FADING/RESURGING`.
- `score.ts` — `trendScore = 100 · Π (subScore_i ^ w_i)`; all 8 sub-scores stored;
  `geoScore = 0` ⇒ score 0; ordered "+/−" explanation.
- `novelty` (in `enrich.ts`) — matches the previous snapshot (slug / ≥50% article overlap),
  carries `firstSeenAt`, classifies `new-event / correction / new-fact / more-of-same /
  unknown`.
- `situation.ts` — Normal/Watch/Elevated/Crisis for TN & India from **escalating active
  events only**; routine national CAP watches do not trigger Crisis; always lists drivers.
- `timeline.ts` — orders a cluster's reports, flags the ones that added a new fact.
- `enrich.ts` — orchestrator → `cluster.trendData` + `dataset.trending / watching /
  situation / counts.byCategory`.

### UI (Phase E/I/J/K)
- Event-first home: Right Now (trend-ranked, "why" expanded) · Fast Rising · Tamil Nadu ·
  India · Watching, above the feed-health banner and Current Situation bar.
- New routes: `/crisis` `/politics` `/finance` `/sports` (shared `CategoryView`),
  `/tamil-nadu` `/india` (geo tiers), `/trends` (leaderboard + weight table),
  `/diagnostics` (pipeline observability).
- `/story/[slug]` — opens with the trend "why" breakdown; adds **Timeline** (what changed)
  and **Compare coverage** (official / English / Tamil emphasis, agreement, differences,
  "not established" — descriptive, no bias inference).
- `components/iffa/`: `EventCard`, `TrendWhy` (every sub-score as a bar), `SituationBar`,
  `CategoryNav`, `EventList`, `CategoryView`, `StoryTimeline`, `CoverageComparison`.
- Design: extends the existing "newsprint × research terminal" system; red = crisis only,
  amber = watch/developing, green = corroborated. Mobile-first (`md:` breakpoints,
  `overflow-x-auto` on every wide table).

### Quality dashboard v0.7
`v0.4 → v0.5 → v0.6 → v0.7` column (current = v0.6, **measured live each run**) + a new
"v0.7 · Trend Intelligence layer" section: ingestion / clustering / trend-detection stats
from the snapshot, the 113-test breakdown, and the six safety guarantees.

---

## 3. Tests run — RESULTS

| Command | Result |
|---|---|
| `npm run lint` | **clean** |
| `npm run typecheck` | **clean** |
| `npm test` | **313 / 313 passed** (18 files) — 200 v0.6 baseline unchanged + 113 new IFFA |
| `npm run eval:claims` | **222 / 223 clean · false-corroboration 0 / 71 (0.0%)** |
| `npm run eval:identity` | candidate recall **99.1%** · decision precision **100.0%** · decision recall **86.0%** |
| `npm run quality-gate` | **11 / 11 gates passed** |
| `npm run build` | **~200 static pages**, compiled clean |
| `npm run ingest` | 17/17 feeds ok · 508 articles · 403 clusters · `git status --short` **clean** (generated JSON gitignored) |
| `npx tsx scripts/validate-feed.ts` | **OK** (trend fields tolerated) |
| `npm run test:e2e` | **command does not exist** — no e2e / Playwright suite in this project (removed in v0.6). Not invented. |

### Regression vs v0.6 baseline (`evaluation/reports/v0.7-baseline.md`)
**Every frozen-engine number holds identical.** The claim / identity / clustering /
independence / semantic / language engines and `evaluation/claims/**` and all 11 v0.6
test files were **not modified**. See `evaluation/reports/v0.7-regression-matrix.md`.

### The 12 critical-safety spec tests — `tests/unit/iffa-critical.test.ts` — 12/12 pass
1. quoted political attack kept as the speaker's claim ✔
2. newspaper "10 dead" vs police "4 dead" discrepancy preserved ✔
3. "Cuddalore rain tomorrow" ✕ merge "Chennai rain yesterday" ✔
4. "Sensex rises 1,000 points" preserves 1000 / Sensex / up ✔
5. "Nifty falls 2%" is percent, never 2 points ✔
6. "CSK beat RCB" on two dates = two fixtures ✔
7. "தமிழக அரசு" resolves Tamil Nadu government context ✔
8. "கடலூரில் கனமழை" maps Cuddalore ✔
9. political allegation keeps its claimant through clustering ✔
10. one wire copy on many sites = one confirmation ✔
11. old event + fresh duplicates ✕ outrank a genuine new development ✔
12. official correction supersedes display, earlier report stays in timeline ✔

---

## 4. Current live sources

17 enabled feeds / 10 publishers (unchanged from v0.6 — feed expansion is conservative):
NDMA SACHET (CAP JSON + RSS), ReliefWeb (UN OCHA), The Hindu (TN / Chennai / National /
Energy-Environment / Kerala), Times of India (Chennai / India), NDTV, Hindustan Times,
India Today, BBC Tamil, News18 Tamil (TN), Puthiyathalaimurai, Mongabay India.
Disabled: PIB (Akamai 403 from CI), IMD RSS (retired — reaches IFFA via SACHET).
**Candidates recorded for v0.8** (`/sources`): RBI, SEBI, The Hindu Business/Sport,
Sportstar, PIB retry.

---

## 5. Benchmark results (snapshot in the committed seed)

`health=live · 17/17 feeds · 508 articles · 403 clusters · 10 publishers`
`trending 30 · watching 11 · situation TN elevated / India elevated`
`by category: crisis 27 · politics 56 · finance 6 · sports 6 · other-relevant 307 · celebrity 1`
`verified comparisons 9 · weak matches kept apart 14`

---

## 6. Known limitations / honest gaps

1. **Novelty is a v0.7 first pass.** Slug / article-overlap match against the previous
   snapshot; `noveltyClass` is coarse (`new-event / new-fact / correction / more-of-same`).
   On a first ingest with no comparable prior it is honestly `unknown`. Full per-claim
   semantic novelty → v0.8.
2. **Finance & sports coverage is thin** (6 clusters each). This edition's feeds are Tamil
   Nadu crisis / governance heavy. The registry + validation path is wired; enabling
   RBI / SEBI / Sportstar is v0.8.
3. **Category classifier is keyword-based** — ~75% of clusters land in `other-relevant`
   (the catch-all), which is expected for headline-only classification of general regional
   news. The categories that matter (crisis / politics / finance / sports) are identified;
   `other-relevant` has low `categoryScore` so it does not dominate trending.
4. **Test count 313, not the 380 in the plan.** 113 focused adversarial IFFA tests + the
   223-case claim corpus. The full ~430-case spec corpus is a v0.8 commitment; the harness
   to grow it (`tests/unit/iffa-corpus.test.ts` table form) is in place.
5. **PWA is manifest-only** — installable, but no offline service worker yet (v0.8). The
   manifest never claims live updates offline.
6. **Sports fixture / finance move detection is UI-layer only** — it helps *split* the
   sports view and *display* finance numbers exactly; it is deliberately NOT wired into
   `decideIdentity` (splitting is always safe; a merge change would risk the frozen
   corpus).
7. **Situation bar** currently reads "elevated" for TN — correct for the live monsoon-season
   thunderstorm/rain activity, but the escalation thresholds are new and will want tuning
   against a few weeks of live data.

---

## 7. Production verification

Pending the push + GitHub Actions run. Post-deploy checklist (to be completed against the
real URLs):

- `/` `/crisis/` `/politics/` `/finance/` `/sports/` `/tamil-nadu/` `/india/` `/trends/`
  `/sources/` `/methodology/quality/` `/about/` `/diagnostics/` — HTTP 200
- asset URLs carry the `/info-for-all` basePath
- version label "v0.7 — Trend Intelligence" visible (footer)
- live feed data present, situation bar rendering
- mobile 390 px — no horizontal overflow

_(Filled in below once the deploy completes.)_

---

## 8. Recommended v0.8 roadmap

1. **Full semantic novelty** — per-claim duplicate / rephrasing / new-fact / major-development
   / correction / contradiction, replacing the v0.7 heuristic.
2. **PWA offline shell** — service worker + last-fetched-state view.
3. **Search** — client-side over the static JSON: entities, locations, politicians,
   instruments, teams; Tamil + English queries.
4. **Finance & sports feeds** — validate + enable RBI / SEBI / Hindu Business & Sport /
   Sportstar; add finance/sports specialist cards.
5. **Grow the corpus** toward the full ~430-case adversarial set; add a live A/B for the
   trend weights.
6. **Compare Coverage as its own route** + a correction-system view beyond the timeline.
7. **Tune the Situation thresholds** and the category classifier against live data.
8. **Per-feed adaptive polling** in the workflow (official / crisis feeds more often).

**v1.0 gate:** all of {live sources, trend engine, cross-language clustering, crisis mode,
political claim provenance, finance semantics, sports semantics, mobile UI, production
monitoring} verified in *live* operation over time — not this release.
