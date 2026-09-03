# IFFA v0.10 — Media Landscape Intelligence — Completion Report

**Release:** v0.10 — Media Landscape Intelligence
**Date:** 2026-09-03
**Repository:** https://github.com/Rishidar-lab/info-for-all
**Production:** https://rishidar-lab.github.io/info-for-all
**Merge commit:** `c97d44b` (branch `feat/media-landscape`, 10 commits `13e9b81..f4eff69`)

> **Naming note.** `v0.9` was already shipped and tagged (`v0.9.0` → `28e1ef7`)
> as *Editorial Intelligence*. This pivot was built **additively as v0.10**, the
> editorial-priority layer retained and reused. See
> `IFFA_V09_MEDIA_LANDSCAPE_PLAN.md` §1. **v1.0 is NOT declared.**

---

## 1. What changed — the product

IFFA moved from *"a smarter news feed"* to **news comparison + media-landscape
analysis + coverage-bias analysis + claim-level evidence**. Every story page now
answers the twelve core questions from the brief: what happened · who is
reporting it · who is not · who owns those sources · how their headlines differ ·
how their framing differs · which claims the sources agree on · which are
disputed · which have primary evidence · which are single-source · what changed
over time · what people are discussing outside the news.

The **home page** leads with *"See the coverage, not just the headline"* and
landscape story cards (source count, independent families, a coverage-alignment
bar, an evidence profile, a blindspot badge). The **story page** is now the core
product, tabbed: Overview · Full coverage · Media landscape · Headlines ·
Evidence · Timeline · Public discourse.

---

## 2. New architecture — `src/lib/media-landscape/` + `src/lib/discourse/`

| Module | Purpose |
|---|---|
| `types.ts` | `PublisherProfile`, `PublisherOwnership` (+ `OwnershipProvenance`), `SourceFamily`, `ExternalBiasRating`, `ObservedAlignment`, `ReliabilityObservation`, `CoverageLandscape`, `FramingComparison`, `Blindspot`, `ClaimEvidence` (9-value status), `PrimaryEvidenceRef`, `FactCheckRef`, `EvidenceProfile`, `EvidenceStrengthScore`, `DiscourseMention`, `EmergingClaim` |
| `src/data/publishers.ts` | hand-built ownership registry, 27 publishers, provenance per assertion, `UNKNOWN` where unverified |
| `publishers.ts` | `describePublisher()` (registry ∪ feeds ∪ snapshot), `buildSourceFamilies()` |
| `entities.ts` / `stance.ts` | political-entity registry (no left/right axis) + deterministic per-article stance |
| `coverage.ts` | `buildCoverageLandscape()` — counts + ownership / factuality / language / locality distributions |
| `framing.ts` | headline emphasis, stance, loaded phrases, omitted claims, shared core, framing differences |
| `blindspot.ts` | `LANGUAGE / REGIONAL / OWNERSHIP / SOURCE_FAMILY / POLITICAL_COVERAGE` asymmetry |
| `evidence.ts` | `buildClaimEvidence()` from the **frozen v0.6 claim engine**, `EvidenceProfile` (counts), `evidenceStrength()` (internal, disclaimed) |
| `alignment.ts` / `observed.ts` / `history.ts` | sample-size bands, snapshot-scoped observed metrics, the daily-aggregate history store |
| `dashboard.ts` / `quality-metrics.ts` | `/landscape` aggregates + `/methodology/quality` layer |
| `src/lib/discourse/` | Reddit RSS adapter, `matchDiscourse()`, `detectEmergingClaims()` |

Wired into `enrich.ts` as a final pass: `cluster.trendData.mediaLandscape` on
**every** cluster, plus `dataset.emergingClaims`.

**The frozen v0.6 claim / identity / semantic / language / independence engine
is byte-identical to the `v0.9.0` tag** (`git diff v0.9.0..HEAD -- src/lib/{claims,event-identity,semantic,language,independence}` is empty).

---

## 3. Sources — before / after

| | v0.9 | v0.10 |
|---|---|---|
| Configured feeds | 30 (26 enabled) | **36** (32 enabled) |
| Healthy on a typical run | ~24–25 | **~29–31** |
| Publishers with live articles | ~16 | **20** |
| Fact-checkers | 0 | **2** (Alt News, Factly — new `EvidenceRole "fact-check"`) |

New: The Indian Express, Frontline (The Hindu Group), Business Standard,
Moneycontrol (the earlier Akamai block has cleared), Alt News, Factly.

**Honest gap:** the brief's target was ~100 healthy sources. The real number is
~31. Most Tamil-native newspaper feeds (Dinamalar, Daily Thanthi, Hindu Tamil,
Dinamani) return Akamai / anti-bot blocks and cannot be ingested compliantly.
GDELT discovery was scoped but not built this cycle. This is the largest
remaining gap — see §11.

---

## 4. Publisher / ownership coverage

| Metric | Value |
|---|---|
| Publishers profiled (registry) | **27** |
| Ownership completeness | **96%** (26/27 known; Puthiyathalaimurai deliberately `UNKNOWN`) |
| External-ratings coverage | **0%** — no provider integrated; the UI shows *"no rating on record"*, never a guess |
| Source families | **21** (4 multi-publisher: Kasturi & Sons, HT Media, Network18/Reliance, NDTV/Adani) |
| Every ownership assertion carries provenance | **yes** (source, url, verifiedAt, confidence) — asserted in a test |

---

## 5. Observed editorial alignment

- Corpus-derived, **entity-specific**, **no US left/right axis** (asserted in a test).
- **Sample-size discipline:** `< 20` political stories → INSUFFICIENT DATA (no
  alignment shown); 20–49 low / 50–149 moderate / 150+ substantial. Documented
  and adjustable.
- **Alignment-qualified publishers this snapshot: 3 / 20.** The rest are below
  n = 20 and correctly show INSUFFICIENT DATA.
- **History store:** `scripts/history-append.ts` appends a compact daily
  per-publisher aggregate (carried by `actions/cache`). Rolling 7/30/90-day
  windows populate as days accumulate — **1 day on record now**, so rolling
  alignment is *accumulating, not yet available*. This is the honest state by
  design, not a bug.

---

## 6. Per-story landscape — live results (committed seed, 736 articles / 598 clusters)

| Metric | Value |
|---|---|
| Clusters with a media landscape | **598 / 598** |
| Clusters with ≥ 1 blindspot | **9** (REGIONAL, OWNERSHIP, SOURCE_FAMILY seen) |
| Clusters with a claim-evidence matrix | **68** |
| Claim-evidence claims total | **119** |
| Primary-document-supported claims | **16 / 119** |
| Corroborated / disputed claims | **24 / 9** |
| Tamil / English articles | **33 / 701** (Tamil coverage is thin this run — a real gap) |
| Public-discourse mentions (Reddit) | **75 pulled**, 12 matched across 9 clusters |
| Emerging / unverified public claims | **0** (needs ≥ 3 mentions / ≥ 2 channels of an unmatched claim; honest at this discourse volume) |

Headline comparison, coverage-alignment bars, blindspot panels and the evidence
matrix render on every multi-source story. Alignment bars show **"ALIGNMENT DATA
INSUFFICIENT"** rather than a fake balanced bar wherever there is no defensible
grouping (which is most stories, until per-publisher history matures).

---

## 7. Methodology & the six "≠"

`docs/MEDIA-LANDSCAPE.md` (new) + a `/methodology` hub page. The six
non-negotiables, enforced in the data model and the UI:

1. **BIAS ≠ FALSEHOOD** · 2. **COVERAGE ASYMMETRY ≠ FALSEHOOD** ·
3. **SOURCE RELIABILITY ≠ ARTICLE TRUTH** · 4. **OFFICIAL SOURCE ≠ AUTOMATIC TRUTH** ·
5. **FORUM CONSENSUS ≠ EVIDENCE** · 6. **CORRELATION ≠ EDITORIAL MOTIVE**

Ownership is metadata, never a bias determinant. External ratings and IFFA
observed metrics are separate, labelled fields — never blended. The Evidence
Profile is **counts, not "% true"**; the Evidence Strength Score is internal,
exposes every component, and carries *"NOT a probability that the story is true"*.

---

## 8. Tests & evaluation

| Suite | Result |
|---|---|
| Unit (vitest) | **438 / 438** (+27: media-publishers 10, media-landscape 12, discourse 5) |
| Playwright E2E | **66 / 66** (desktop + 390 px; +11 v0.10 media-landscape tests) |
| `eval:claims` | **222 / 223 · false-corroboration 0 / 71** — unchanged (frozen) |
| `eval:identity` | **99.1 / 100 / 86** — unchanged (frozen) |
| `eval:category` | **100% / 175** — unchanged |
| `eval:cgi` | 23 events · **0 band flips** |
| `quality-gate` | **11 / 11** |
| `next build` | **296 static pages**, clean |
| Frozen v0.6 engine | **byte-identical vs the `v0.9.0` tag** |
| lint · typecheck | clean |

**Not delivered this cycle** (brief's evaluation §): the ≥ 625-case
stance / entity-alignment / framing / omission / evidence-status / primary-doc /
blindspot / independence / ownership / discourse corpora, and the 50-cluster
manual audit. The deterministic extractors have unit coverage; a labelled
benchmark and the manual audit are the top evaluation backlog item — no accuracy
claim is made for stance/framing/alignment without one.

---

## 9. Compliance

- Reddit: **public RSS only** (`/r/<sub>/hot/.rss`) — the same class of endpoint
  as every other feed. Descriptive User-Agent, one request per subreddit, 6 s
  delay, 8 s backoff on 429, best-effort (exits 0 on failure). No CAPTCHA /
  paywall / auth / anti-bot bypass. Engagement metadata is display-only, never
  scored.
- YouTube / podcasts: **designed** in `docs/rfcs/001-video-integrity-lab.md`,
  **not built** here.
- No full-article republication anywhere — headline + short excerpt + link only.
- No paid APIs, no LLM in the deployed build.

---

## 10. Production deployment & verification — DONE

- Merge commit **`c97d44b`** pushed to `main` (10-commit `feat/media-landscape` branch).
- **CI** ([run 33726099319](https://github.com/Rishidar-lab/info-for-all/actions/runs/33726099319)) — `completed / success`.
- **Deploy** (`deploy-pages.yml`, [run 33726099308](https://github.com/Rishidar-lab/info-for-all/actions/runs/33726099308)) — `completed / success`. The deploy ran a fresh `ingest:discourse` → `ingest` → `history:append` → `build`.
- **18 / 18 production routes → HTTP 200** (incl. `/landscape/`, `/tamil-nadu/landscape/`, `/search/`, `/source/the-hindu/`, `/source/compare/`, `/methodology/`).
- **`@prod` Playwright E2E: 28 / 28** against the live site.
- **Live content confirmed:**
  - Home: *"See the coverage, not just the headline"*, the who-reports / who-owns framing, *"The most-covered stories right now"*, landscape story cards (`N SOURCES` · independent families · Coverage alignment bar · Blindspot badge), footer `v0.10 — Media Landscape Intelligence`.
  - A live story page (`/story/up-floods-over-16k-evacuated…`): tabs **Full coverage · Media landscape · Headlines · Evidence · Timeline**; *"Who is covering this — and how it breaks down"*; the Evidence Profile *"Counts, not a '% true'"* and the Evidence Strength disclaimer *"NOT a probability that the story is true"*.
  - `/source/the-hindu/`: ownership **MEDIA CONGLOMERATE** — The Hindu Group / **Kasturi & Sons Ltd** — funding *mixed commercial*, full provenance line (*"…widely-reported Indian media-ownership records ↗ (verified 2026-09-03, confidence: high)"*), *"Ownership is metadata"*, *"no external rating on record… kept separate from IFFA's own observed metrics"*, and a per-entity **coverage-stance table**.
  - `/landscape/`: *"Today's media landscape"*, Independent families, *"Most asymmetrically covered stories"*, *"Ownership is metadata"*.
- **Tag `v0.10.0`** → `c97d44b`, pushed (annotated).

---

## 11. Known limitations & the v0.11 backlog

1. **~31 healthy sources, not ~100.** Tamil-native newspapers are Akamai-blocked;
   GDELT discovery not built. Biggest gap — directly limits blindspot and
   alignment signal quality, especially for Tamil-language coverage (33 of 736
   articles this run).
2. **Rolling observed alignment not yet available** — the history store has 1
   day; needs ~7–30. Snapshot-scoped metrics ship in the meantime, clearly
   labelled INSUFFICIENT below n = 20.
3. **No evaluation corpora / manual audit** for stance / framing / alignment /
   blindspot — the top honesty gap. No accuracy claim is made.
4. **No external bias-rating provider integrated** — every publisher shows "no
   rating on record".
5. **`live-feed.json` seed is 7.6 MB** (+3 MB of enrichment). A build input,
   never served, but it grows with sources — **sharding** (`events/<date>/`,
   `sources/`, `landscape/`, `claims/`) is the next architectural step.
6. **Discourse is Reddit-only** and rate-limited (2–3 of 7 subreddits per run);
   YouTube / podcasts are RFC-only.
7. **Stance / emphasis detection is deterministic and English-first** — Tamil /
   Tanglish are lexicon-only and weaker.
8. **Ownership registry is hand-built** — a corporate structure can change
   between the quarterly review dates recorded in each entry's provenance.

---

## 12. Does IFFA now visibly function as a media-landscape comparison product?

### YES.

The evidence:

- **A first-time visitor sees it in five seconds.** The home page headline is
  *"See the coverage, not just the headline"* and the first content is a grid of
  story cards each showing a **source count, independent-family count, a
  coverage-alignment bar, an evidence profile, and a blindspot badge** — not
  headlines-and-blurbs. It does not read as a news feed.
- **The story page is the product.** For any multi-source story, production shows,
  on real data: every reporting source with its **ownership, source family,
  language, locality and stance** (Full coverage); a **headline-comparison grid**
  (emphasis · stance · omitted claims · shared factual core · framing
  differences); a **coverage landscape** (counts + ownership / factuality /
  locality distributions); **blindspots** ("a coverage asymmetry, not a
  judgement about whether the story is true"); a **claim evidence matrix** with
  primary-document references and an Evidence Profile that is **counts, not
  "% true"**; and, where matched, **public discourse** ("never counts as
  corroboration").
- **Ownership is real and cited.** `/source/[publisher]` shows provenance-backed
  ownership for 27 publishers (96% known, `UNKNOWN` where unverified), separate
  from external ratings (none integrated → "no rating on record"), separate from
  IFFA's own observed metrics. `/source/compare` puts two publishers side by side.
- **The landscape dashboards exist** — `/landscape` and `/tamil-nadu/landscape`
  show volume, ownership mix, entities, asymmetry, disputed vs corroborated
  stories, and under-covered districts.
- **No fake statistics.** Where real data is missing, the UI says **INSUFFICIENT
  DATA** / **no rating on record** / **ALIGNMENT DATA INSUFFICIENT** — verified
  live. Bias is never conflated with falsehood; there is no single bias score;
  observed alignment is withheld below n = 20.

### The honest caveats (why this is v0.10, not v1.0)

- Only **~31 healthy sources** (target was ~100) — Tamil-native newspapers are
  Akamai-blocked; Tamil coverage is thin (33 of 736 articles this run).
- **Rolling observed alignment is not yet available** (1 day of history);
  snapshot-scoped metrics ship in the meantime, and only 3/20 publishers clear
  the n = 20 bar.
- **No labelled evaluation corpora or manual audit** for stance / framing /
  alignment / blindspot — so no accuracy claim is made for those.
- **The feed JSON is unsharded** (7.6 MB build input) — the next architectural step.

IFFA v0.10 **is** a media-landscape comparison product in the ways a user can
see and click. It is **not** a finished one — §11 is the road to v0.11 and,
eventually, v1.0.

