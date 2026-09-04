# IFFA v0.7 — Trend Intelligence — Implementation Plan

**Product rename:** Info For All (IFA) → **IFFA — Info Free For All**
**Version target:** `v0.7 — Trend Intelligence` (NOT v1.0)
**Repository:** existing `github.com/Rishidar-lab/info-for-all` (unchanged)
**Deployment:** existing GitHub Pages at `rishidar-lab.github.io/info-for-all` (unchanged, `basePath=/info-for-all`)
**Date:** 2026-09-02
**Author of record:** principal-engineer pass (autonomous), decisions documented inline.

---

## PHASE A — AUDIT (complete)

### A.1 Current architecture (as built, v0.6)

```
RSS / Atom / SACHET-CAP feeds  (src/data/feeds.ts — 17 enabled, 10 publishers)
        │  scripts/ingest-feeds.ts   (Node, no LLM, 15s timeout, last-known-good on failure)
        ▼
parse.ts (fast-xml-parser) ──► RawItem[]
        ▼
normalize.ts ──► LiveArticle
  ├─ text.ts        string hygiene, entity decode, lone-surrogate strip, stem/synonym fold
  ├─ geo.ts         38-district TN dictionary + India/foreign classifier (explainable)
  └─ crisis.ts      deterministic crisis-type matchers + 0–100 priority (reproducible)
        ▼
dedupe (canonical URL + per-publisher normalised-headline key)
        ▼
finaliseCrisisPriority (re-score once cross-source corroboration is known)
        ▼
cluster.ts  TWO-PASS
  1. lexical scorePair  (Jaccard tokens + rare-entity overlap + district + figures; hard geo/hazard blockers)
  2. semantic pass      candidatePairs() permissive blocking → decideIdentity() conservative gate
     event-identity/    signature.ts (EventSignature) · similarity.ts · decide.ts (explainable, no hidden score)
     language/          tamil.ts (suffix stripper + concept lexicon) · locations.ts (place ontology) · translation.ts
     semantic/          concepts.ts · actions.ts · embeddings.ts (deterministic hash n-gram)
        ▼
claims/  buildEventClaims → structured, provenance-preserving claims (corroborate / contradict / attribution / CGI)
independence/  analyseIndependence → "how many DIFFERENT newsrooms" (wire credit, syndication, verbatim passage)
        ▼
src/data/generated/live-feed.json   (GITIGNORED — volatile; seeded from src/data/fixtures/live-feed.seed.json)
        ▼
Next.js 16 App Router, output:"export"  →  out/  →  GitHub Pages
  routes: / · /sources · /about · /methodology/quality · /methodology/examples[/slug]
          · /methodology/clusters/[slug] · /story/[slug] · /robots.txt
```

### A.2 Verified baseline (2026-09-02, commit `7e5b29e`)

| Check | Command | Result |
|---|---|---|
| Lint | `npm run lint` | clean |
| Typecheck | `npm run typecheck` | clean |
| Unit tests | `npm test` | **200 / 200** (11 files) |
| Claim eval | `npm run eval:claims` | **222 / 223 clean**, false-corroboration **0 / 71** |
| Identity eval | `npm run eval:identity` | candidate recall **99.1%**, decision precision **100%**, decision recall 86.0% |
| Quality gate | `npm run quality-gate` | **11 / 11** |
| Build | `npm run build` | **151 static pages**, compiles clean |
| `npm run test:e2e` | — | **does not exist** (Playwright config removed in v0.6; no e2e suite) |

These are the **regression baseline**. v0.7 must not move any of them backwards.

### A.3 Technical debt found

| Item | Severity | Plan |
|---|---|---|
| `package.json` version still `0.3.0` | cosmetic | bump to `0.7.0` |
| Dead deps: `@electric-sql/pglite`, `postgres`, `drizzle-orm`, `drizzle-kit`, `@playwright/test` | low | remove (env has network + npm; safe to regen lock) — documented in `evaluation/reports/v0.6-dependency-audit.md` |
| `/config/feeds.ts` — stale pre-MVP artefact, gitignored, unused | low | leave (already gitignored); real registry is `src/data/feeds.ts` |
| `docs/METHODOLOGY.md`, `docs/THREAT_MODEL.md` — partially superseded (v0.6 added status blockquotes) | low | extend, don't rewrite |
| No category taxonomy — everything is "crisis or not" | — | Phase C |
| No geo tiers — `GeographicScope` conflates "is TN" with "priority" | — | Phase C |
| Feed is **article-list-shaped** in the UI even though clustering exists | — | Phase E/K |
| No trend / velocity / novelty signal anywhere | — | Phase F |
| Source independence engine exists but is **not surfaced** on the home feed | — | Phase F/K |

### A.4 Components to PRESERVE UNCHANGED (regression surface)

- `src/lib/event-identity/**` — signature, similarity, decide, index
- `src/lib/claims/**` — extraction, corroborate, contradict, quantity, CGI
- `src/lib/independence/**`
- `src/lib/semantic/**`, `src/lib/language/**`
- `src/lib/live/cluster.ts`, `crisis.ts`, `geo.ts` (geo.ts **extended, not rewritten** — new exports only)
- `evaluation/claims/**` (frozen corpus + harness)
- All 11 existing test files
- `.github/workflows/**`, `next.config.ts`, data-hygiene scripts

**Rule:** every v0.7 engine addition is a NEW module that *reads* `LiveArticle[]` / `LiveCluster[]` and *adds* fields. No existing decision threshold is touched.

---

## PHASE B — REBRAND (IFA → IFFA)

**Decision:** visible identity only. Repo name, `basePath`, route paths, workflow names, feed IDs — all unchanged (renaming any of them risks the deployment; the spec explicitly allows deferring the repo rename).

New files:
- `src/lib/brand.ts` — single source of truth: `BRAND = { name: "IFFA", full: "Info Free For All", legacy: "Info For All", tagline: "See what matters. See what changed. See the evidence.", … }`

Edited (copy / metadata only):
- `src/app/layout.tsx` — `metadata.title`, `description`, `applicationName`
- `src/components/site-header.tsx`, `src/components/site-footer.tsx`
- `src/app/page.tsx` hero, `src/app/about/page.tsx`, `src/app/sources/page.tsx`, `src/app/methodology/quality/page.tsx` header
- `package.json` `name` → `iffa`, `version` → `0.7.0`, `description`
- `README.md`
- `public/` — add `manifest.webmanifest` (Phase: PWA-lite)

Backward compatibility: keep an "formerly Info For All" note in the footer + about page for one release.

---

## PHASE C — DOMAIN TAXONOMY (categories + geography)

New module `src/lib/domain/`:

### `categories.ts`
```
type CategoryId =
  | "crisis" | "politics" | "finance" | "sports"
  | "other-relevant" | "entertainment" | "celebrity"

CATEGORY_ORDER: crisis > politics > finance > sports > other-relevant > (entertainment, celebrity)
CATEGORY_WEIGHT: crisis 1.00, politics 0.72, finance 0.60, sports 0.42, other-relevant 0.30,
                 entertainment 0.05, celebrity 0.02
DEFAULT_ENABLED: entertainment=false, celebrity=false   (excluded from default surfaces, still filterable)
```
- Sub-category tables per the spec (crisis weather/flood/…; politics election/…; finance rbi/…; sports cricket/…).
- `classifyCategory(text, { crisisType?, evidenceRole? }) → { category, subCategory?, matchedTerms[], reason, confidence }`
  deterministic keyword matcher in the `crisis.ts` style. `crisisType` present ⇒ `crisis` immediately.
- Entertainment/celebrity keyword list is deliberately broad (film, actor, box office, wedding, "spotted", trailer, …) so it *demotes* aggressively.

### `geo-tiers.ts`
```
type GeoTier = "P0" | "P1" | "P2" | "out"     (P0 Tamil Nadu, P1 India, P2 abroad-but-India-relevant, out excluded)
geoTierOf(article) — derives from existing GeographicScope + isIndiaRelevantToTN + a foreign-affects-India check
GEO_WEIGHT: P0 1.00, P1 0.66, P2 0.40, out 0
```

### `districts.ts` — first-class TN district recognition (extends, does not replace, `geo.ts`)
- Re-exports `TN_DISTRICTS` (already all 38). Adds:
  - `TN_DISTRICTS_TAMIL` — Tamil-script name + common inflected forms for every district (சென்னை, கடலூர், கோயம்புத்தூர், …)
  - `resolveDistricts(text) → { district, matchedTerm, script }[]` — English + Tamil, feeds the existing `classifyGeo` matched-terms
  - `TALUK_CONSTITUENCY` stub map (extract when present, never infer)

Tests: `tests/unit/iffa-taxonomy.test.ts`, `tests/unit/iffa-geo.test.ts`.

---

## PHASE D — SOURCE REGISTRY

**Decision:** extend `src/data/feeds.ts` (the real, tracked registry). Do **not** create `config/sources.ts` (that path is `.gitignore`d and holds a dead pre-MVP file).

Add to `FeedSource`:
```
sourceType:   "official" | "public_broadcaster" | "wire" | "newspaper"
            | "digital_native" | "financial" | "sports" | "local" | "data_feed"
authorityClass: "primary-authority" | "accredited-media" | "aggregator" | "specialist"
categorySupport: CategoryId[]          // what this feed usefully covers
region:       "tamil-nadu" | "india" | "kerala" | "global"
pollIntervalMinutes: number            // advisory; ingestion still runs on the 15-min workflow cadence
```
- **No numeric per-publisher "truth score"** — spec-forbidden. Reliability stays contextual (evidence-role + independence engine).
- `/sources` page: show the registry grouped by `authorityClass`, with category-support chips and live per-feed status (already have `FeedStatus`).
- Candidate new feeds to INVESTIGATE (RSS/official only, no paywall/captcha bypass) — recorded in `docs/source-registry.md`, enabled only after `scripts/validate-sources.ts` passes:
  RBI press releases RSS, SEBI RSS, PIB (retry — currently 403 from CI), The Hindu Business/Sport desks, ESPNcricinfo RSS, Sportstar RSS, IMD (SACHET already covers), NSE/BSE announcements (public JSON if ToS-clean).
  *This pass wires the registry + validation path; feed expansion itself is conservative and may land partly in v0.8.*

---

## PHASE E + F — EVENT-CENTRIC FEED + TREND ENGINE

New module `src/lib/trends/` — **pure functions**, unit-tested directly, also called from `ingest-feeds.ts` after `clusterArticles()`.

### `velocity.ts`
For each cluster: article `publishedAt` histogram over windows `15m / 1h / 3h / 6h / 12h / 24h` (+ prior-6h vs last-1h ratio).
`state ∈ NEW · RISING · FAST_RISING · STABLE · FADING · RESURGING` from the window deltas **and** `firstSeenAt`.
Syndication guard: velocity counts **independent source families** (from `analyseIndependence`), not raw article count — "40 syndicated copies from one origin" ≠ 40.

### `novelty.ts` (v0.7 first pass)
`ingest-feeds.ts` reads the **previous** `live-feed.json` (already carried between deploy runs via `actions/cache`). Match a current cluster to a prior one by slug OR ≥50% shared article IDs.
- `firstSeenAt` = min(prior.firstSeenAt, earliest article). `lastMeaningfulUpdateAt` = latest article whose claim-set is not a duplicate of what the prior snapshot already had (uses the existing claim-matching — no new matcher).
- `noveltyClass ∈ new-event · new-fact · more-of-same` (coarse; full semantic novelty scoring → v0.8, documented).

### `score.ts` — the interpretable trend score
```
trendScore = 100 * (
    w.recency      * recencyScore        //  age of lastMeaningfulUpdateAt
  * w.velocity     * velocityScore       //  normalised window acceleration
  * w.diversity    * sourceDiversityScore //  independent families / cap
  * w.geo          * geoScore            //  GEO_WEIGHT[tier]
  * w.category     * categoryScore       //  CATEGORY_WEIGHT[cat]
  * w.consequence  * consequenceScore    //  crisisPriority + official + district span
  * w.novelty      * noveltyScore        //  new-fact/correction >> more-of-same
  * w.corroboration* corroborationScore  //  ≥2 independent families or official primary
)
```
- Every `wX` is a named constant in one exported `TREND_WEIGHTS` table, documented in `docs/TREND-MODEL.md`. **No inline magic numbers.**
- Each sub-score (0–1) is stored on the cluster: `trend.recencyScore`, `.velocityScore`, … plus `trend.score`, `trend.state`, `trend.explanation: string[]` (`"+ 11 independent source families"`, `"− moderate uncertainty remains"`).
- Product-of-normalised-factors (geometric) so a zero in any dimension (e.g. `geoScore=0` for `out`) removes the item — matches "don't let generic international content pollute the feed".

### Type extension (`src/lib/live/types.ts`)
```
LiveArticle  += category?: CategoryClassification, geoTier?: GeoTier
LiveCluster  += category?: CategoryClassification, geoTier?: GeoTier,
                trend?: TrendSignal, firstSeenAt?, lastSeenAt?, lastMeaningfulUpdateAt?,
                sourceFamilies?: number, independence?: IndependenceSummary
LiveDataset.counts += byCategory: Record<CategoryId, number>
LiveDataset  += trending: string[] (slugs), watching: string[] (slugs), situation: SituationBar
```
`validate-feed.ts` / `quality-gate.ts` tolerate extra fields (verified) — no change needed there, but add a light `trend`-shape check to `validate-feed.ts`.

### Watching vs Trending
- **Trending**: `trend.score ≥ TREND_MIN` AND (`sourceFamilies ≥ 2` OR official primary present).
- **Watching**: crisis/high-`consequenceScore` OR single-family early report that has NOT cleared the trending bar. Never auto-promoted to "confirmed".

### "Current Situation" bar (`situation.ts`)
`Normal / Watch / Elevated / Crisis` for Tamil Nadu and for India, **derived from active event signals only** (count + priority of active crisis clusters in tier). Never a fabricated alert level; shows the events it's derived from.

---

## PHASE G — CATEGORY SPECIALISTS (lightweight in v0.7)

- **Crisis**: already strong. Add crisis-card fields: `confirmed[] / uncertain[] / official guidance[] / changed since last update[]` — populated from existing `claims` + `commonGround` + `unknowns` + novelty diff. "Never invent emergency instructions" — guidance strings come verbatim from official-alert `cap` fields / attributed claims only.
- **Politics**: reuse the claims engine's **attribution** (already 96% retention). Political card renders `WHAT HAPPENED / WHO CLAIMED WHAT / EVIDENCE / OTHER SIDE / VERIFIED / UNKNOWN` from claim `status` + `provenance.attribution` + contradiction links. No sentiment, ever. Party/office alias table added to `entity-aliases.ts` (CM/முதல்வர், DMK/திமுக, …) — resolution only, never infers affiliation.
- **Finance**: `quantity.ts` already preserves currency / percent / points exactly. Add finance dimensions `index-points`, `percent-change`, `bps`, `price` and a `financeInstrument` signature field (Nifty/Sensex/rupee/gold/crude/…). Critical tests 4 & 5 (spec) covered here.
- **Sports**: add a `competition` + `teams[]` + `matchDate` signature dimension so "CSK beat RCB" on two different dates never merges (critical test 6). Uses the existing date + incident machinery.

---

## PHASE H — TAMIL NADU INTELLIGENCE

- `districts.ts` Tamil name table (Phase C) wired into `classifyGeo` and `signature.ts` Tamil branch.
- Tamil political/party alias table into `entity-aliases.ts`.
- Preserve original Tamil headline + excerpt + entities (already done; add explicit `originalTitle` passthrough on the event card so a Tamil source's own words are shown, not only the English cluster title).

---

## PHASE I — TIMELINES (v0.7 = data, minimal UI)

- `timeline.ts`: build `TimelineEntry[]` from a cluster's articles ordered by `publishedAt`, each entry = `{ at, sourceName, headline, novelty }` where `novelty` marks the entries that added a NEW fact (claim not present earlier). Rendered as a compact list on `/story/[slug]`.
- Full "what changed" narrative diffing → v0.8.

---

## PHASE J — COVERAGE COMPARISON

- Extend the existing `/story/[slug]` comparison block: "Tamil outlets emphasise / English outlets emphasise / Official sources say / Points of agreement / Points of disagreement / Only in one source family" — built from `claims` (grouped by supporting article language + evidence role) + `differences` + `commonGround`. **Descriptive only — no "bias" inference.**

---

## PHASE K — NEW UI (event-first)

Routes (all static, `output:"export"` — `generateStaticParams` where needed):

| Route | Purpose |
|---|---|
| `/` | IFFA home — Situation bar · Right Now (trending) · Fast Rising · Tamil Nadu · India · Watching |
| `/crisis/` `/politics/` `/finance/` `/sports/` | category views (event clusters, trend-ranked) |
| `/tamil-nadu/` `/india/` | geo views |
| `/trends/` | trend leaderboard + "why is this ranked here" inspector |
| `/story/[slug]` | event detail — timeline, claims, sources, coverage comparison (extended) |
| `/sources/` `/about/` `/methodology/quality` `/methodology/examples[/slug]` `/methodology/clusters/[slug]` | preserved, rebranded, extended |
| `/diagnostics/` | dev observability page (ingest counts, parser failures, feed lag, family counts) |

New components: `EventCard` (info-dense, mobile-first, trend + confidence + source families + "why trending"), `SituationBar`, `TrendWhy`, `CategoryNav`, `CrisisCard`, `PoliticalClaimCard`.
Design: extend the existing "newsprint × research terminal" system in `globals.css`. `red = crisis only`, `amber = watch/developing`, `green = strongly corroborated`. No redesign of the token set.
Mobile: test 360 / 390 / 412 / tablet / desktop; no horizontal overflow; cards legible unexpanded.

---

## PHASE L — TESTING

New corpus `evaluation/iffa/` + tests `tests/unit/iffa-*.test.ts`:

| Suite | Count (v0.7) | Notes |
|---|---|---|
| taxonomy (category classifier) | ~40 | incl. entertainment/celebrity demotion |
| geo / district resolution (EN + Tamil) | ~40 | all 38 districts, Tamil forms, foreign-context |
| trend engine (velocity, families, score components) | ~30 | syndication guard, NEW/RISING/FADING states |
| **12 critical spec tests** | 12 | quote-not-assertion, discrepancy preserved, no cross-district merge, exact finance numbers, no cross-match sports, TN gov context, Cuddalore mapping, allegation attribution, syndication ≠ confirmation, old event ≠ new development, correction supersedes |
| cross-language current-trend cases | ~20 | காவிரி நீர் திறப்பு ↔ Cauvery release, சென்னை பள்ளி விடுமுறை ↔ Chennai schools closed |
| duplicate / syndication | ~20 | |
| temporal-update / correction | ~15 | |

Target: **≥ 380 total unit tests** (200 existing + ~180 new), all green. Existing 200 unchanged.
The full 430-case spec corpus is a v0.8 commitment — v0.7 ships a meaningful adversarial subset (~180) and the harness to grow it.

Also run unchanged: `npm test`, `eval:claims`, `eval:identity`, `quality-gate`, `build`.

---

## PHASE M — DEPLOYMENT

1. `npm run lint && npm run typecheck && npm test && npm run eval:claims && npm run eval:identity && npm run quality-gate && npm run build` — all green.
2. `npm run ingest` (env has network) → verify `git status --short` stays clean (generated JSON is gitignored).
3. `npm run seed:refresh` → commit the refreshed seed **deliberately** (so CI/local render the same trend data as production).
4. Logical commits (see Git discipline below).
5. `git push origin main` → GitHub Actions: CI + "Ingest live feeds & deploy to GitHub Pages".
6. Fetch real production URLs and verify: `/ /crisis/ /politics/ /finance/ /sports/ /tamil-nadu/ /india/ /trends/ /sources/ /methodology/quality /about/ /diagnostics/` — HTTP 200, correct `basePath`, version label, live data, mobile 390px.
7. Write `IFFA_V07_COMPLETION_REPORT.md`.

---

## DATA MODEL (new interfaces)

```ts
// src/lib/domain/categories.ts
interface CategoryClassification { category: CategoryId; subCategory?: string;
  matchedTerms: string[]; reason: string; confidence: "high"|"medium"|"low" }

// src/lib/trends/types.ts
interface TrendSignal {
  score: number; state: TrendState;
  recencyScore; velocityScore; sourceDiversityScore; geoScore;
  categoryScore; consequenceScore; noveltyScore; corroborationScore;   // each 0–1
  windows: Record<"m15"|"h1"|"h3"|"h6"|"h12"|"h24", number>;
  explanation: string[];
}
interface IndependenceSummary { families: number; reports: number;
  wireCredits: string[]; label: string }
interface SituationBar { tamilNadu: SituationLevel; india: SituationLevel;
  derivedFrom: { slug: string; title: string; tier: GeoTier }[] }
type SituationLevel = "normal"|"watch"|"elevated"|"crisis"
interface TimelineEntry { at: string; sourceName: string; language: "ta"|"en"|"unknown";
  headline: string; addedNewFact: boolean }
```

No database. Everything stays static JSON + `output:"export"`, per the ₹0 constraint.

---

## TREND RANKING — worked example (for `docs/TREND-MODEL.md`)

> *Chennai rainfall intensifies; school closures announced* — ranked #2 because:
> `+ P0 Tamil Nadu (geo 1.00)  + crisis/flood (cat 1.00)  + 6 independent families (diversity 0.85)`
> `+ velocity +430% last hour (0.92)  + official confirmation (corroboration 1.00)  + new fact: closures (novelty 0.80)`
> `− lastMeaningfulUpdate 40 min ago (recency 0.88)  − some transport reports still single-family (consequence 0.74)`
> `⇒ trendScore 71`

---

## REGRESSION RISKS & MITIGATIONS

| Risk | Mitigation |
|---|---|
| Touching the identity/claims engine breaks eval | v0.7 adds only NEW modules; engine files in the preserve list are not edited |
| New `trend` fields break `validate-feed` / `quality-gate` | verified both tolerate extra keys; add positive `trend` shape check only |
| Seed drift → CI renders different data than prod | `seed:refresh` after ingest, committed deliberately; UI also defensive to missing `trend` |
| Category classifier over-claims (calls politics "crisis") | conservative keyword lists, `crisisType` is the only hard override, `confidence` surfaced |
| Rebrand breaks deep links / basePath | no route/path/basePath change; only copy + `<title>` + manifest |
| Trend score becomes an opaque box | every sub-score stored + shown; weights in one documented table; `/trends` "why" inspector |
| Entertainment exclusion loses stories permanently | classified + disabled-by-default, never dropped from the dataset; filter re-enables |

---

## PHASED EXECUTION ORDER (this session)

1. **B** brand module + rebrand copy  → commit `feat(brand): migrate visible identity to IFFA`
2. **C** taxonomy (categories, geo-tiers, districts) + tests  → `feat(taxonomy): add priority news domains and geo tiers`
3. **H** TN district Tamil table + party aliases  → `feat(geo): first-class Tamil Nadu district + party resolution`
4. **D** source registry fields + `/sources` rework  → `feat(sources): typed configurable source registry`
5. **F** trend engine module + ingest wiring + type extension + tests  → `feat(trends): interpretable velocity, novelty and consequence engine`
6. **G** category-specialist signature fields (finance instrument, sports competition) + tests  → `feat(specialists): finance-number and sports-competition identity guards`
7. **E/K** event-first home + category/geo/trends routes + EventCard + SituationBar  → `feat(ui): event-first IFFA home and category views`
8. **I/J** timeline + coverage-comparison on `/story/[slug]`  → `feat(story): timeline and cross-source coverage comparison`
9. **L** IFFA adversarial corpus + 12 critical tests  → `test(iffa): trend-intelligence and critical-safety corpus`
10. quality dashboard v0.7 section + docs (README, TREND-MODEL, METHODOLOGY, ROADMAP, ARCHITECTURE)  → `docs(methodology): document IFFA ranking model and v0.7`
11. `npm run ingest` + `seed:refresh`  → `chore(data): refresh committed seed with v0.7 trend fields`
12. full verify + build → push → verify production → `IFFA_V07_COMPLETION_REPORT.md`

## DEFERRED TO v0.8 (documented, not dropped)

PWA offline shell + service worker (v0.7 ships installable manifest only) · full semantic novelty scoring · search across entities/locations/instruments · Compare-Coverage as its own route · correction-system UI beyond timeline · the remaining ~250 corpus cases · finance/sports deep specialists · taluk/constituency resolution beyond stubs · per-feed adaptive polling in the workflow.

**v1.0 gate:** all of {live sources, trend engine, cross-language clustering, crisis mode, political claim provenance, finance semantics, sports semantics, mobile UI, production monitoring} verified in *live* operation over time — not this release.
