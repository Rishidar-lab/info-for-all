# IFFA v0.11 — Data Depth & Calibration — Completion Report

**Not a feature release.** v0.11's one job: make the media-landscape data
**deeper, more representative, measured and defensible**.

**Date:** 2026-09-03
**Branch:** `feat/v0.11-data-depth` (off `main` @ `5fdf0ea`, tag `v0.10.0`)
**Baseline:** `evaluation/reports/v0.11-baseline.md` (exact counts)

---

## 1. `METRIC | BASELINE | v0.11 RESULT | STATUS`

| Metric | Baseline | v0.11 result | Status |
|---|---:|---:|---|
| Healthy useful sources | 29 | **~34–36** | improved; below the ≥75 target — audit (§3) documents why |
| Tamil-native source publishers | 3 | **6** (Hindu Tamil, ABP Tamil, Nakkheeran + News18/BBC/PTM) | improved |
| Tamil articles / snapshot | 33 (4.5%) | **149 (16%)** | **materially improved** (4.7×) |
| Total articles / snapshot | 736 | **~906** | +23% |
| Publishers (registry) | 27 | **31** | improved |
| Source families | 21 | **~24** | improved |
| Multi-publisher clusters (≥2) | 25 | **28** | improved |
| Days of alignment history | 1 | **1** (store now wired to CI) | **time-gated — cannot be forced** |
| Alignment-qualified publishers (n≥20) | 3 / 20 | **3 / 24** | unchanged — needs history |
| Stance labelled examples | 0 | **64** (first-pass) | started; target ≥300 |
| Framing labelled examples | 0 | **30** (first-pass) | started; target ≥200 |
| Evidence labelled claims | 0 | **36** (first-pass) | started; target ≥200 |
| Manually audited clusters | 0 | **18** (first-pass) | started; target 50 |
| Stance classifier accuracy | unmeasured | **21.9% → 54.7%** (measured + improved) | measured; still weak |
| Framing emphasis P / R | unmeasured | **75% / 41%** | measured; recall weak |
| Evidence-status accuracy | unmeasured | **94%** | measured; **strong** |
| `live-feed.json` (build input, never served) | 7.55 MB pretty | ~9.8 MB pretty / 5.9 MB min | grew with more sources — but it is not shipped (§11) |
| Search route first load | ~940 KB | **584 KB** | **–38%** — index de-inlined to a served shard |
| Home `index.html` first load | *unmeasured* | ~936 KB (measured) | unchanged; measured for the first time |
| Served `/data/` shards | 0 | **5** | new architecture |

---

## 2. Regression — all green

| Check | Value |
|---|---|
| `npm test` | **438 / 438** |
| `npm run test:e2e` | **66 / 66** |
| `eval:claims` | **222 / 223** · false-corroboration **0 / 71** |
| `eval:identity` | **99.1 / 100 / 86** |
| `eval:category` | **100% / 175** |
| `eval:cgi` | 0 band flips |
| `quality-gate` | **11 / 11** |
| `npm run build` | 351 pages, clean |
| **Frozen v0.6 engine** | **byte-identical vs `v0.10.0`** (empty diff) |

---

## 3. Source acquisition (P0) + Tamil (P1)

### The Tamil root cause — measured, not guessed

| Cause | Effect | Status |
|---|---|---|
| `SOURCE_NOT_CONFIGURED` | only 3 Tamil-native feeds | **fixed** — +3 (The Hindu Tamil, ABP Tamil, Nakkheeran) via validated direct feeds |
| `LANGUAGE_CLASSIFICATION_FAILURE` | 31/57 News18 Tamil articles mis-tagged `en` | **fixed** — `detectLanguage()` rework (hard Tamil-script floor; title-first detection; feed-language preference). News18 Tamil now 57/57 `ta`. |
| `ACCESS_BLOCKED` (Akamai/Cloudflare) | Dinamani, Hindu Tamil `.xml`, Zee Biz | documented `BLOCKED` |
| `FEED_NOT_AVAILABLE` | Dinamalar, Daily Thanthi, Dinakaran, DT Next, Maalai Malar, Vikatan | documented `NO_FEED` — no working public feed on any tried path |
| `EVENT_FILTERING` (7-day age) | ~140 News18 items/run dropped | legitimate; those feeds are low-velocity |
| `DISCOVERY_ONLY` | Google News RSS (`hl=ta-IN`) — ~110 Tamil items, publisher names — **NOT integrated** | `news.google.com/robots.txt` does not `Allow: /rss/`. Recorded, left to a maintainer compliance decision. **The single biggest potential Tamil unlock.** |

**`scripts/source-discovery-audit.ts`** (`npm run source-discovery-audit`) — a
structured, one-polite-request-per-candidate audit of ~28 publishers, classified
`DIRECT_FEED` / `DISCOVERY_ONLY` / `BLOCKED` / `NO_FEED` / etc. →
`evaluation/reports/source-discovery-audit.{md,json}`.

### Feeds added (validated 2026-09-03, direct public RSS, no bypass)

The Hindu Tamil, ABP Tamil, Nakkheeran (all Tamil-native), The Free Press
Journal, The Hindu Puducherry.

### Honest gap

The ~100 target is not reached. The realistic compliant ceiling for Tamil-native
direct feeds is ~6–10. Getting past that needs either (a) a maintainer decision
on Google News RSS, or (b) publisher-side feed provision. This is documented, not
worked around.

---

## 4. Discovery vs ingestion (P2/C)

`scripts/source-discovery-audit.ts` separates **discovery** (can we find the
article?) from **ingestion** (can we get metadata?). Google News RSS is the
canonical `DISCOVERY_ONLY` case — a `DiscoveryAdapter` that yields
`url / headline / publisher / publishedAt / language / snippet` without scraping.
The adapter interface is sketched in the audit; it is **not wired into the
pipeline** pending the compliance decision above.

**GDELT (Phase D):** not evaluated this cycle. The discovery-vs-ingestion split
is the prerequisite and is now in place; GDELT evaluation is a v0.12 item.

---

## 5. Historical store (P2/E)

- `src/lib/media-landscape/history.ts` — `computeDailyAggregate()` (compact
  per-publisher: entity-stance counts, topic counts, sensationalism, primary-use)
  + `rollupWindows()` (7 / 30 / 90-day).
- `scripts/history-append.ts` (`npm run history:append`) — appends one dated
  aggregate per run; gitignored; carried by `actions/cache`. **Wired into
  `deploy-pages.yml`.**
- **1 day on record.** Rolling windows return `HISTORY INCOMPLETE` until ≥7
  valid days. **No backfill was fabricated.** This is the correct state — the
  directive says so.

---

## 6. Calibration (P3/P6) — the core of v0.11

First-pass corpora + real eval scripts (all say **INDICATIVE**, none is a gate):

| Corpus | Size | `eval:*` result |
|---|---:|---|
| `stance-gold.json` | 64 | **accuracy 54.7% / macro-F1 53.8%** (was 21.9% before a general readStance rework separating author voice from quoted speech) |
| `framing-gold.json` | 30 | label **P 75% / R 41%** / exact-set 33% |
| `evidence-gold.json` | 36 | status **accuracy 94%** — `DISPUTED`/`CORRECTED`/`RETRACTED` individually inspected |

**Implication (now shown on `/methodology/quality`):** the **claim-evidence
matrix is well-calibrated** (it is built on the frozen claim engine); **stance
and framing are not strong enough to claim alignment accuracy**. So observed
editorial alignment ships as raw counts + a prominent caveat, gated on sample
size, and **never as a "DMK-leaning" / "BJP-leaning" label** (Phase H).

### `readStance()` rework (Phase F)

Now returns `{ stance (author voice), quotedStance (reported speech), phrases }`.
"BJP slams DMK" → author `neutral-descriptive`, quoted `critical` — the publisher
is not made critical of the DMK by reporting an attack (docs/MEDIA-LANDSCAPE.md
rule 1, 6). General fix, not corpus-tuned.

---

## 7. Manual audit (P4) — 18 / 50

`evaluation/manual/v0.11-cluster-audit.json` + `evaluation/reports/v0.11-manual-audit.md`.
Stratified (6 politics / 4 crisis / 3 finance / 3 sports / 2 other). First-pass,
`humanVerified: false`.

Result: clustering 16/18 OK · source-family 17/18 · **ownership 18/18** ·
claim-extraction 15/18 · **headline comparison 1 OK / 11 WEAK / 2 WRONG** ·
**framing 3 OK / 10 WEAK / 3 WRONG** · blindspot 16/18.

**Findings drove a fix:** F3 — OWNERSHIP / SOURCE_FAMILY blindspots were noise on
routine sports content → now gated to consequential stories only.

---

## 8. Blindspot calibration (P5) — done

Every `Blindspot` now carries `confidence`: `INSUFFICIENT_COVERAGE` /
`POSSIBLE_ASYMMETRY` / `CLEAR_ASYMMETRY`, from publisher/family counts on **both**
sides of the divide. Live seed: **2 CLEAR_ASYMMETRY, 3 POSSIBLE, 19
INSUFFICIENT_COVERAGE** of 24 — the gating works. Weak cases now read
*"Predominantly covered by Tamil-language media"* / *"Primarily a local story"* —
data, not an accusation. The story card only flags `CLEAR_ASYMMETRY`.

**LANGUAGE blindspot** (Phase §): counts Tamil vs English independent publishers
and states the fact without calling English media biased.

---

## 9. Statistical uncertainty (P) + no truth score (T) — done

- **P:** `/source/[id]` entity-stance now shows **"3/7"** below n=10 (not
  "42.9%"), and a **"LOW SAMPLE"** tag below n=20. Percentages only for mature n.
- **T:** grep audit — **no truth% / bias% / reliability% is displayed
  anywhere**. Every match is a disclaimer ("NOT a bias score", "Counts, not a
  '% true'", "NOT a probability that the story is true").

---

## 10. Ownership re-audit (S) — done, honestly

The registry (31 publishers) was re-checked. **Confidence downgraded where the
evidence is a report rather than a filing:** ABP Tamil, Business Standard,
Nakkheeran, Free Press Journal, ESPNcricinfo carry `confidence: moderate`;
Puthiyathalaimurai stays `UNKNOWN`. The 18-cluster audit found **0 ownership
errors**. Ownership completeness: **~94%** category-known (a lower, more honest
number than a blanket "96%").

---

## 11. Data sharding (P8/N) — measured, then partly done

**Measurement first (the directive's rule).** `live-feed.json` is **5.9 MB
minified / 9.8 MB pretty-printed**, but it is a **build input** — `prepare-data`
copies the seed into it, `next build` reads it during SSG, and it is **never
served**. Measured *shipped* first-load, before any change:

| Route | HTML | + shared JS | first load |
|---|---:|---:|---:|
| Home | 373 KB | 563 KB | ~936 KB |
| India / Tamil Nadu | ~1.0 MB | 563 KB | ~1.56 MB |
| Search | 383 KB | 566 KB | ~940 KB |
| Story detail | 154 KB | 580 KB | ~735 KB |

No route serialises the dataset — every dataset consumer is a **server
component**, so only *rendered output* ships. The one exception was `/search`:
its client `<Search>` received a 763-row index (~340 KB) inlined into the page.

**What was built (`scripts/shard-dataset.ts`, `npm run shard`, in `prebuild` +
the deploy workflow):**

- `public/data/meta.json` — generatedAt / health / counts
- `public/data/search/index.json` — the search index (**345 KB, now a cacheable
  served shard**, fetched by `<Search>` on mount)
- `public/data/index/latest.json` — 763 compact clusters (no framing-observation
  arrays, no per-claim evidence matrix — the fields a card actually reads)
- `public/data/landscape/latest.json` — India + TN landscape summary
- `public/data/sources/index.json` — per-publisher profile summary

**Result:** search page HTML **383 KB → 18 KB**; search route first-load **940 KB
→ 584 KB**. `public/data/` is gitignored and regenerated every build.

**Deferred (honestly):** the India / Tamil Nadu list pages are ~1 MB each — 60
information-dense `event-card`s of *rendered markup*, not corpus payload.
Reducing that means fewer cards or pagination, a UX change out of scope for a
no-redesign release — and TN story visibility should not shrink in the release
that widens Tamil coverage. Converting those list pages to consume
`index/latest.json` client-side is the v0.12 item; the shard now exists for it.

---

## 12. What did NOT get done (honest list)

| Item | Why | Where it lands |
|---|---|---|
| ≥75 sources / ≥20 Tamil-native | compliant direct feeds don't exist; Google News RSS is robots-grey | v0.12 — needs a compliance decision or publisher feeds |
| GDELT evaluation | discovery/ingestion split was the prerequisite (now done) | v0.12 |
| Stance/framing/evidence corpora to 300/200/200 | hand-labelling volume | v0.12 — the 64/30/36 seeds + eval scripts are the infrastructure |
| 50-cluster audit (did 18) | review volume; needs a human anyway | v0.12 |
| YouTube / podcast discourse | needs the video adapter (RFC 001) | v0.12 |
| List-page pagination / density | UX change, out of scope for no-redesign | v0.12 — `index/latest.json` shard now exists to feed it |
| Peer-group selection divergence (R) | `selectionDivergence` exists corpus-wide; peer conditioning not added | v0.12 |
| 7+ days of history | **elapsed time — impossible this cycle** | accrues automatically |

---

## 13. v0.11 release gate

| # | Gate | Status |
|---|---|---|
| 1 | frozen regressions green | ✅ 438 unit / 66 E2E / evals / quality-gate / frozen byte-identical |
| 2 | source coverage materially increases OR documented why not | ✅ +5 feeds, +2 categories; the audit documents the ceiling |
| 3 | Tamil-native representation materially improves | ✅ **4.5% → 16%** |
| 4 | discovery separated from ingestion | ✅ audit + adapter interface; Google News RSS classified DISCOVERY_ONLY |
| 5 | rolling historical analytics persist | ✅ `history-append` wired to CI; 1 day, growing |
| 6 | stance evaluation exists + real metrics | ✅ 54.7%, honestly reported as weak |
| 7 | framing evaluation exists | ✅ 75% / 41% |
| 8 | evidence-status evaluation exists | ✅ 94% |
| 9 | 50-cluster audit completed/documented | ⚠️ **18 / 50** — a documented first pass |
| 10 | blindspot labels sample-size gated | ✅ INSUFFICIENT / POSSIBLE / CLEAR |
| 11 | source profiles show observation period + sample size | ✅ "LOW SAMPLE", "3/7" not "42.9%" |
| 12 | home/story data sharded | ⚠️ **partial** — search index de-inlined to a served shard; 5-shard `/data/` surface wired into prebuild + deploy; list pages not yet paginated |
| 13 | initial payload materially smaller | ⚠️ **reframed** — the ~7.6 MB was always the build input, never served; search route first-load **940 KB → 584 KB**; home unchanged at ~936 KB |
| 14 | production verified | ✅ CI + Pages green; 15/15 `@prod` live E2E; shards serve at basePath |

**Verdict: v0.11 ships as a real data-depth-and-calibration step.** Gate 9 (audit)
is at 18/50. Gates 12/13 are partially met and the residue is honestly bounded:
measurement showed the "7.6 MB payload" never existed — `live-feed.json` is a
build input, and Next.js per-page renders, so no route ever loaded the corpus.
The one genuine oversized client blob (the ~340 KB search index) is now a
cacheable served shard. The India / Tamil Nadu list pages remain ~1 MB of
*rendered markup* for 60 dense cards; trimming that is a card-density decision
deferred past a no-redesign release. Nothing is faked.

---

## 14. Production deployment

Local verification before merge (all green):

| Check | Result |
|---|---|
| `npm run lint` / `npm run typecheck` | clean |
| `npm test` | **438 / 438** |
| `npm run test:e2e` (`BASE_PATH=/info-for-all`) | **66 / 66** — exercises the search-shard fetch on the production path layout |
| `eval:claims` | 222 / 223 · false-corroboration 0 / 71 |
| `eval:identity` / `eval:category` / `eval:cgi` | 99.1·100·86 / 100% · 175 / 0 flips |
| `eval:stance` / `eval:framing` / `eval:evidence` | 54.7% / 75%·41% / 94% (INDICATIVE) |
| `quality-gate` | 11 / 11 |
| `npm run build` | 351 pages, shards emitted |
| Frozen v0.6 engine | **byte-identical vs `v0.10.0`** |

`feat/v0.11-data-depth` (7 commits, `5fdf0ea..96a8228`) fast-forward-merged to
`main` and pushed.

- **CI** (`ci.yml`, run `33732668351`): ✅ success (~1m40s)
- **Pages deploy** (`deploy-pages.yml`, run `33732668557`): ✅ success (~3m)
- **Live verification** (`tests/e2e/prod.spec.ts --grep @prod`): **15 / 15 green**
  against `https://rishidar-lab.github.io/info-for-all`
  - all 12 core routes → 200
  - footer shows `v0.11 — Data Depth & Calibration`
  - `/data/{meta,search/index,index/latest,landscape/latest,sources/index}.json`
    all 200 at the production basePath (search shard 345 KB, index shard 780 KB)
  - `/search/` ships an 18.9 KB shell; typing "tamil nadu" resolves results
    fetched from the shard (new `@prod` test)
  - `/methodology/quality/` renders the v0.11 "Calibration & data depth" and
    "Payload & data shape" sections
  - no horizontal overflow at 390 px

Tag **`v0.11.0`** cut on `edb4faa` (`main` HEAD) after verification.

---

## 15. v1.0-rc.1 eligibility

### NOT YET ELIGIBLE FOR v1.0-rc.1 — because historical calibration is incomplete.

| v1.0-rc.1 condition | Required | Now |
|---|---:|---:|
| Healthy useful sources | ≥ 75 | ~34 |
| Tamil-native sources | ≥ 20 | 6 |
| Tamil article representation | ≫ baseline | 16% (was 4.5%) — improved, not yet ≥20 native sources |
| **Historical collection** | **≥ 7 complete days** | **1 day** |
| Stance gold corpus | ≥ 300 | 64 |
| Framing gold corpus | ≥ 200 | 30 |
| Evidence gold corpus | ≥ 200 | 36 |
| Manual event audit | ≥ 50 | 18 |
| Regressions green | yes | ✅ |
| E2E green | yes | ✅ |
| Production verified | yes | *(§14)* |
| Payload sharded | yes | ❌ |

Per the directive: **7 days have not elapsed, so observed editorial alignment
cannot be claimed, and v1.0-rc.1 is not eligible. That is the correct result.**
v0.11 made everything *except elapsed time and hand-labelling volume* closer.
The single safest next step is to let the history store accrue while the gold
corpora are expanded and reviewed by a human.
