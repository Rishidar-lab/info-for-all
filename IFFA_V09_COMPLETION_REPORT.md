# IFFA v0.9 — Editorial Intelligence · Completion Report

**Release:** IFFA v0.9 — Editorial Intelligence
**Date:** 2026-09-03
**Production:** https://rishidar-lab.github.io/info-for-all
**Repository:** https://github.com/Rishidar-lab/info-for-all
**Range:** `b3fd191` (v0.8 HEAD) → `08fa17c` (v0.9 HEAD) — 16 commits

> The single-sentence framing of v0.9: **"Classify everything we ingest" → "decide which
> events actually deserve prominence for IFFA's mission."** Ingest broadly, display
> selectively.

---

## 1. Starting point — the verified v0.8 baseline

From `IFFA_V08_COMPLETION_REPORT.md` and `evaluation/reports/v0.9-baseline.md`:

| Dimension | v0.8 |
|---|---|
| OTHER_RELEVANT share | 77% → 52% |
| Live event mix (politics / crisis / finance / sports) | 158 / 55 / 15 / 21 |
| Category classifier | 91.2% honest first-pass on 114 cases, ~100% tuned |
| Tests | 344 unit + 38 Playwright |
| eval:claims | 222/223 · false-corroboration 0/71 |
| eval:identity | candidate recall 99.1% · decision precision 100% · recall 86% |
| Live sources | 24 healthy · 1 failed · 4 disabled |
| PWA | offline shell only |

These were treated as an immutable regression baseline. **None of the v0.8 numbers
regressed** (§13).

Known v0.8 limitations carried in as v0.9 targets: secondary-category recall ~15%;
political event-identity specialist incomplete; announce-vs-criticise merges; thin
finance/sports coverage; PWA offline-shell only; OTHER_RELEVANT near its legitimate floor.

---

## 2. All commits

| Hash | Phase(s) | Summary |
|---|---|---|
| `47ea1b7` | A | interpretable event-priority model + editorial bands |
| `57f4738` | C | speech-act-aware political event identity specialist |
| `18b161f` | B | semantic secondary-category engine + structured evidence |
| `86e26a3` | Q | re-investigate the disabled official feeds |
| `381cb1a` | E | Event State v3 — update significance + what-changed diff |
| `0451918` | F | temporal intelligence — event time vs publication time |
| `63d64b5` | D | political claim threads — typed cross-links between events |
| `1dec1a8` | H/K/L | extractive local-impact model for Tamil Nadu events |
| `e2d07cb` | I, W | interpretable consequence model + anti-sensationalism; `docs/EDITORIAL-MODEL.md` |
| `45cda8e` | O, P | separate policy and market-reaction states; strengthen fixtures |
| `eec63c1` | N | descriptive political coverage — asymmetry, not bias scores |
| `cfda9a6` | G | add Mint economy feed; publisher ownership groups |
| `7fc792f` | S | quality dashboard v0.9 — editorial intelligence metrics |
| `875d36e` | R | expand category corpus to 175; raw-text safety net for recall gaps |
| `0c33488` | T, U, V, version | v0.9 bump + PWA v2 + E2E expansion |
| `08fa17c` | I (fix) | a bare CAP forecast polygon is not front-page consequence |

Editorial-model docs: `docs/EDITORIAL-MODEL.md` (new). Home page and `/about` link it.

---

## 3. The editorial priority model (Phases A, I, J, L)

`src/lib/editorial/priority.ts` + `weights.ts` — an interpretable ranking layer on top
of the trend score. For every cluster it returns
`{ score 0–100, band, factors[], penalties[], reasons[], consequenceSignals[] }`.

- **Eight factors**, weights sum to 1 (checked at module load + in a test):
  geoRelevance 0.20 · consequence 0.18 · informationGain 0.16 · categoryPriority 0.14 ·
  corroboration 0.12 · meaningfulRecency 0.10 · localImpact 0.06 · velocity 0.04.
- **Seven penalties**: churn/not-developing, staleness (12h/24h), syndication,
  generic-CAP, headline-only, weak-evidence, gossip/reaction-only.
- **Bands** URGENT / HIGH / STANDARD / BACKGROUND / SUPPRESSED. SUPPRESSED is a *small*
  set (celebrity, digests, out-of-scope, syndicated duplicates of one low-consequence
  dispatch) — ordinary not-currently-developing news is BACKGROUND, still findable.
- **The score is a RANKING SCORE.** It is documented — in the type, in `weights.ts`, in
  `docs/EDITORIAL-MODEL.md`, on the home page, on `/about` and on `/methodology/quality` —
  as *not* a probability of truth, reliability or likelihood.
- Every factor, penalty and reason is rendered on the event card ("why prominent") and on
  the quality dashboard's top-10 table.

**Watch / Trend / Background separation (J):** `buildSurfaces()` produces
`urgent / rightNow / fastRising / tamilNadu / india / byCategory / watching / background`.
URGENT requires severe/critical severity AND real information gain AND corroboration.
TRENDING = growing, not merely fresh. WATCHING = consequential but not yet established.

**"Why am I seeing this?" (L):** the `EditorialWhy` panel on each card lists the
contributing factors and penalties in plain words.

---

## 4. Consequence model + anti-sensationalism (Phase I)

`src/lib/domain/consequence.ts` — eight evidence-backed signals (humanSafety,
serviceDisruption, displacement, officialEmergencyAction, scale, economicImpact,
legalElectoralWeight, sportsSignificance), each returned with the phrase it was read from.

- **Emotional-intensity words carry ZERO weight** (`brutal`, `gruesome`, `horrific`,
  `chilling`) — asserted in a test.
- An **isolated single-victim crime** scores low on every signal and is capped at the
  STANDARD band however vivid the headline. A riot / communal clash / mass-casualty event
  is *not* "isolated".
- **A statewide cyclone warning with an evacuation order outranks a lurid murder** — in
  tests and, verified on the live snapshot, the Salem "murder for gain" story dropped
  from 48.3 HIGH to 36.3 STANDARD.
- A **bare CAP forecast polygon** ("Light Rain" over 18 districts, one source) is not
  front-page consequence — the district *count* only feeds scale when the event is
  significant+ severity or already shows realised impact (`08fa17c`).

---

## 5. Secondary category — before / after (Phase B)

`src/lib/domain/classify.ts` gained a multi-signal secondary engine: `primaryCategory`,
`secondaryCategories[]`, `categoryEvidence[]` (role, score, distinctiveSignals,
keywordHits, signals). Cross-domain patterns run on the **lead** headline only, so a
minority cluster member cannot inject a spurious secondary.

| Metric | v0.8 | v0.9 |
|---|---|---|
| Secondary-category recall (labelled multi-domain corpus) | ~15% | **strict precision 100% · recall 100%** (21 TP / 0 FP / 0 FN on the labelled set) |
| Live secondary rate | ~3.5% | **6.7%** (37 of 551 in-scope clusters) |
| Primary accuracy | 100% (144) | **100% (175)** |

**Caveat (documented, not hidden):** the labelled multi-domain corpus was tuned against
during development, so the 100/100 strict score overstates generalisation. The live rate
(6.7%, ~85% sound on inspection) is the honest number. A handful of live secondaries are
still blob noise from merged cluster members.

---

## 6. Political event identity + speech acts (Phases C, D)

`src/lib/domain/politics.ts` — `detectPoliticalEvent()` classifies a political action into
one of ~25 canonical classes (ANNOUNCE / CRITICISE / ALLEGE / DENY / RESPOND / RESIGN /
COURT_RULING / …) and a speech act (assertion / allegation / denial / promise / criticism
/ response / …). `samePoliticalEvent()` and the `specialistVeto` split-guard prevent
"CM announces scheme" / "CM criticises scheme" / "Opposition alleges corruption in scheme"
from merging on shared entities alone.

- Frozen identity eval unchanged: candidate recall 99.1% · decision precision 100% ·
  decision recall 86%.
- 12 unit tests for the political specialist + speech acts; 6 for the v2 split guard.

**Political claim threads (D):** `linkPoliticalThreads()` cross-links two political events
that share a strong entity (≥7 chars), fall within a 4-day window, and stand in a
`denies` / `contradicts` relation. Deliberately precision-first: **0 links on the current
live snapshot** — there is no clean allegation/denial pair right now, and inventing one
would be worse than showing none. 1 synthetic-case unit test.

---

## 7. Event State v3 + update significance (Phase E)

`EventState` gained `counterClaims`, `corrections`, `resolvedQuestions`, `openQuestions`,
`whatChangedSincePreviousSnapshot`, `updateSignificance`.

`classifyUpdateSignificance()` → NONE / MINOR / MEANINGFUL / MAJOR / CRITICAL, from the
update kind, the meaningful-update score, and whether the event is severe or a prior fact
was overturned. Rendered as a badge on the "What changed:" line. 4 unit tests.

**Live note:** a single local ingest has no previous snapshot to diff, so every cluster
reads `updateSignificance: none` here. On the deployed site the previous snapshot is
carried between runs via `actions/cache`, so the diff is populated in production.

---

## 8. Temporal intelligence (Phase F)

`src/lib/domain/temporal.ts` — `resolveTemporal()` separates `publishedAt` / `updatedAt`
from `eventOccurredAt` / `scheduledFor` / `effectiveFrom` / `effectiveUntil`, with a
`tense` (past / present / future / mixed) and a `certainty` (explicit / relative /
inferred). English and Tamil relative dates (`yesterday` / நேற்று, `tomorrow` / நாளை,
weekdays, month+day), future markers, "with effect from". Never fabricates an exact date.

- 12 unit tests. Live: **249 of 551 in-scope clusters** carry a resolved event/effective
  time distinct from publication.
- Rendered as a metadata chip ("scheduled 2026-09-15" / "effective …" / "happened …").

---

## 9. Tamil Nadu local-impact model (Phases H, K, L)

`src/lib/domain/local-impact.ts` — for a **P0 (Tamil Nadu)** event, extract *impact
statements*: a sentence-like segment naming BOTH a kind of impact
(closure / disruption / damage / displacement / restriction / relief / advisory) AND
something it fell on (infrastructure, a service, or a named institution). `scale` is the
spread of *demonstrated* impact, never inflated from a forecast polygon.

- Personnel actions ("headmaster suspended") and routine announcements are excluded by
  design; a lifted restriction is not recorded as a restriction.
- 8 unit tests covering the real use case (an active TN disaster).
- **Live: 0 of 84 P0 clusters** — the model is dormant by design on a quiet news day
  with no active TN disaster. It fires on cyclone/flood days ("schools closed in 4
  districts", "500 evacuated"). This is honest, not a gap.

---

## 10. Finance & sports event state (Phases O, P)

**Finance (O)** — `detectPolicyEvent()` extracts an RBI / MPC / Fed / SEBI / GST Council /
Finance Ministry decision on a named instrument (repo rate, CRR, GST rate, …) with
decision / bps size / from→to values / effective-from. `isMarketReaction()` flags a
headline that leads with an index/currency/gold move. `trendData.financeEvent` carries a
`kind`: **policy-decision vs market-reaction vs market-data** — kept distinct even when
one headline has both. A VRRR / OMO liquidity auction is explicitly *not* a rate decision.

Live: 31 finance clusters — 0 policy, 3 market-reaction, 4 market-data (no RBI/GST
decision in the current snapshot; the rest are corporate/other).

**Sports (P)** — `SportsFixture` gained `round` (final / semi-final / qualifier / …),
`status` (scheduled / delayed / live / completed / abandoned / postponed / unknown) and
`result` (winner, margin). `sameSportsFixture()` now splits a league-stage meeting from a
final between the same teams. Fixed a real bug: bare "world cup" matched the Cricket World
Cup on FIFA stories.

Live: 26 sports clusters — 19 carry a fixture (competition and/or teams).

10 unit tests (`iffa-domain-events`).

---

## 11. Descriptive political coverage (Phase N)

`src/lib/domain/political-coverage.ts` — **no left/right, pro/anti or
government/opposition axis anywhere** (asserted in a test). For a political event it
describes: actors named, speech act, structured claim count, whether a **response** is on
record (threaded or in-cluster), whether an **official record** is cited, independent
source families, and whether an **allegation/criticism is unanswered**.

Live: **150/150** politics clusters described; **9** flagged as an allegation or criticism
with no response on record (rendered as a "one-sided so far" card flag + a "Coverage
completeness" block on the story page with the no-bias disclaimer).

---

## 12. Source mix + concentration (Phases G, M, Q)

**Phase G** — re-probed public RSS for the priority domains:
- **Mint** (`livemint.com/rss/economy`) — **ENABLED**. India macro/policy daily, HTTP 200,
  well-formed, `robots.txt Allow: /`. Live finance clusters **20 → 31**.
- Moneycontrol (Akamai "Access Denied" behind a 200), Business Standard (403) — recorded
  as blocked in `CANDIDATE_FEEDS` with dated evidence.
- Mint shares a parent (HT Media) with Hindustan Times → the independence engine now
  collapses same-parent publishers into one family (`PUBLISHER_GROUP`).

**Phase M** — `MAX_PER_PUBLISHER_TOP = 4`: `diversify()` caps how many top-surface slots
one publisher can hold; overflow is deferred, not dropped. Live: the cap engaged once
this run ("India: capped NDMA SACHET at 4"). This is concentration control, **not**
viewpoint balancing.

**Phase Q — source health v2:** all 4 disabled official feeds re-investigated with fresh
dated evidence and all correctly remain disabled (PIB: Akamai 403; IMD: public RSS
retired, warnings arrive via SACHET CAP; NewsOnAir: 301 loop; SEBI: unparseable
enforcement-appeal filings). ReliefWeb India shows `stale` this run (its items simply
aged past the window; the feed itself is reachable).

**Live source health:** 25 healthy · 1 stale · 4 disabled (of 30 registered).

---

## 13. Regression results — nothing frozen moved

| Suite | v0.8 | v0.9 | Status |
|---|---|---|---|
| eval:claims | 222/223 · FC 0/71 | **222/223 · FC 0/71** | unchanged |
| eval:identity | 99.1 / 100 / 86 | **99.1 / 100 / 86** | unchanged |
| eval:category | 100% / 144 | **100% / 175** (harder corpus) | ✅ |
| eval:cgi | — | 19 events, 0 flips | ✅ |
| quality-gate | 11/11 | **11/11** | unchanged |
| Frozen v0.6 claim/identity engine | — | byte-for-byte additive-only | ✅ |

The one eval:claims failure line (H07, a prediction attribution edge case) is the same
pre-existing case as v0.8 — not a v0.9 regression.

---

## 14. Test results

| | v0.8 | v0.9 |
|---|---|---|
| Unit (vitest) | 344 | **411** (+67) |
| Playwright E2E (desktop + 390px) | 38 | **50** (+12) |

New unit suites: editorial priority (9), consequence / anti-sensationalism (7),
temporal (12), local-impact (8), political coverage (5), finance+sports event state (10),
political claim threads (1), update significance (4), secondary engine (6).

New E2E (Phase T): editorial hierarchy, why-prominent factor list, v0.9 footer + editorial
model link, quality dashboard v0.9 layer + top-events table, **OFFLINE — NOT LIVE**
banner, 390px hierarchy with no horizontal overflow.

`npm run lint`, `npm run typecheck`, `npm run build` all clean.

One pre-existing test bug fixed along the way: `iffa-novelty` had a wall-clock-dependent
assertion (it broke once the date advanced past the fixture); now passes the fixture time.

---

## 15. Quality dashboard v0.9 (Phase S)

`/methodology/quality` keeps **every** v0.4–v0.8 metric and adds a "v0.9 · Editorial
Intelligence layer" section: editorial band distribution, secondary-category live rate +
corpus P/R, political events described / threaded / unanswered, speech-act mix, tense mix,
update-significance mix, temporal resolved, local-impact resolved, finance policy vs
market-reaction split, sports fixtures with state, isolated incidents de-prioritised,
source-concentration caps hit, live category mix, and a **top-10-events table with the
"why ranked" reasons** — the ranking explaining itself, publicly. Imperfect metrics are
shown, not removed.

---

## 16. PWA v2 (Phase U)

`public/sw.js` (CACHE `iffa-v0.9`): precaches the home page, records the last successful
fetch time, navigations fall back cached-page → cached-home → offline notice.
`iffa/pwa.tsx`: an unmistakable **red "OFFLINE — NOT LIVE"** alert carrying the last-fetch
timestamp; on reconnection the page reloads for fresh data. `offline.html` reworded. The
manifest never claims live updates offline; every page also carries its own "last run"
timestamp. Not turned into a native-like project.

---

## 17. Performance (Phase V — measured)

| Artifact | Size | Note |
|---|---|---|
| `live-feed.json` (build input, **not served**) | 5.0 MB | clusters 2.56 MB, articles 0.66 MB, trendData 1.84 MB |
| Article bodies | none | excerpts total 86 KB / 669 articles, max 360 chars — no full bodies shipped |
| Home page browser transfer (uncompressed) | 925 KB | JS 453 KB · HTML 444 KB · CSS 28 KB (gzip ≈ ÷3–4) |
| Story-page navigation | +42 KB | |
| Total JS (all chunks) | 590 KB | largest chunk 224 KB (framework) |
| `out/` (≈ 280 prerendered pages) | 46 MB | GitHub Pages build artifact |

`live-feed.json` grew ~3.5 MB → 5.0 MB: +2 feeds / +26 articles / +19 clusters, plus
~600 bytes/cluster of v0.9 enrichment (temporal, localImpact, financeEvent, sportsEvent,
politicalCoverage, categoryEvidence, consequenceSignals). It is a build input, never
fetched by a browser. The *displayed* event set is capped (~69 cards on the home page),
so page weight does not grow unboundedly as sources are added — only the build does.

---

## 18. Production deployment & verification

Deployed via the `deploy-pages.yml` GitHub Action (ingest → validate → quality-gate →
build → deploy) on push to `main`. Two deploy runs: `0c33488` (v0.9 body) and `08fa17c`
(CAP consequence fix), **both `completed / success`**. CI (`ci.yml`: lint, typecheck,
411 unit, eval:claims, eval:identity, eval:category, quality-gate, build, 50 E2E) —
**`completed / success` for both commits**.

Live production: **https://rishidar-lab.github.io/info-for-all** — snapshot generated
`2026-09-02T22:48Z` (the v0.9 + CAP-fix build).

| Route | Status | Route | Status |
|---|---|---|---|
| `/` | 200 | `/india/` | 200 |
| `/crisis/` | 200 | `/trends/` | 200 |
| `/politics/` | 200 | `/methodology/quality/` | 200 |
| `/finance/` | 200 | `/diagnostics/` | 200 |
| `/sports/` | 200 | `/sources/` | 200 |
| `/tamil-nadu/` | 200 | `/about/` | 200 |

- `tests/e2e/prod.spec.ts` against the live site: **28/28 passed** (desktop + 390px),
  including "home: v0.9 label, situation bar, event cards, basePath assets".
- Home page live: `v0.9 — Editorial Intelligence`, the editorial hierarchy
  ("What matters right now" → … → "Background / more"), and the `EDITORIAL-MODEL.md` link
  all present.
- `/methodology/quality` live: the "v0.9 · Editorial Intelligence layer" section, the
  "Top 10 events by editorial score" table, secondary-category and isolated-incident
  tiles all present.
- Service worker live at `/sw.js`, cache `iffa-v0.9`.
- Mint feed present on `/sources` and `/diagnostics`; live finance clusters up to 31.
- The previous #1 ("Light Rain" CAP watch) is no longer near the top on production —
  `08fa17c` verified in the wild.

---

## 19. Manual inspection of the top-ranked live events

Snapshot `2026-09-02T22:45Z`, top events after `08fa17c`:

| # | Score / band | Event | Why here | Genuinely current? | Materially relevant? | Publisher-inflated? | Attribution kept? | Changed? |
|---|---|---|---|---|---|---|---|---|
| 1 | 53.1 HIGH | "Digital driving licences / RC to be launched in Tamil Nadu" (politics/P0) | TN P0 + state-wide consequence | yes (scheduled) | yes — a state-wide service change | no (2 families) | yes | no new report — carries the `not-developing` penalty |
| 2 | 50.3 HIGH | "Landslides hit Nainital villages" (crisis/P1) | India public-safety, critical severity, 12 dead | yes | P1 — India crisis | no (2 families) | yes | stable |
| 3 | 49.3 HIGH | "TN Assembly: files on sanitation workers' demands ready, says Minister" (politics/P0) | TN P0 | yes | yes — a live civic-labour issue | no (2 families) | yes ("says Minister") | stable |
| 4 | 43.1 HIGH | "Mettur dam cost vs CM visit cost, alleges TN BJP chief" (politics/P0) | TN P0 | yes | modest | no (2 families) | yes — attributed to the BJP chief; flagged as an allegation | stable |
| 5 | 42.4 HIGH | "CBI probe necessary into Disha Salian's death: HC" (politics/P1) | 3 source families, a death | yes | P1 | no (3 families) | yes ("HC") | stable |

**Answers to the seven required questions, across the top set:**
1. *Why is it here?* — every card lists its factors and penalties; all five above are P0/P1
   priority-domain events with a real consequence or corroboration signal.
2. *Can the ranking explain itself?* — yes: `reasons[]` + `penalties[]` + the factor
   breakdown, on the card and on `/methodology/quality`.
3. *Genuinely current?* — yes; the stale ones carry the visible `not-developing` penalty
   and sit in HIGH only because the domain + geo weight is high on a quiet day. None are
   URGENT (URGENT requires severe severity + information gain + corroboration; 0 this run).
4. *Materially relevant?* — yes for all five; the previous #1 ("Light Rain" CAP watch) was
   removed by `08fa17c` precisely because it was not.
5. *Duplicated publishers inflating it?* — no; families ≥ 2 for all, and
   `MAX_PER_PUBLISHER_TOP` capped SACHET at 4 this run.
6. *Attribution preserved?* — yes; allegations keep their claimant ("alleges TN BJP
   chief"), statements keep their speaker ("says Minister", "HC").
7. *Did anything change?* — the diff is empty on a single local ingest (no previous
   snapshot); in production the `what changed` line is populated from the cached prior
   snapshot.

---

## 20. Known failures & limitations

1. **Update-significance diff is empty on a fresh local ingest** — needs a previous
   snapshot; populated in production via `actions/cache`.
2. **Local-impact model is dormant on quiet days** (0/84 P0 this run) — by design; fires
   during an active TN disaster. Not yet exercised against live disaster data in v0.9.
3. **Secondary-category corpus was tuned against** — the 100/100 strict score overstates
   generalisation; the honest number is the 6.7% live rate (~85% sound).
4. **Political claim threads: 0 live links** — precision-first; no clean allegation/denial
   pair in the current snapshot.
5. **Two live sports false positives** — "India Condemns Temple Demolition" (India +
   Pakistan read as teams) and a Tamil "தோல்வி" (defeat) political headline — both are
   upstream classifier noise, not the new event-state code.
6. **`updateSignificance` / `politicalThread` counts on the dashboard are snapshot-timing
   dependent** — a legitimate consequence of a 15-minute cadence.
7. **`live-feed.json` at 5.0 MB** — a build input, not served, but it grows with source
   count; a future version should split it or drop redundant per-article `geo` objects.
8. **Finance policy events: 0 live** — genuine (no RBI/GST decision in the window), but it
   means the policy-vs-reaction split is verified only by unit tests this cycle.

None of these are regressions and none block a v1.0 RC; they are the honest edges.

---

## 21. v1.0 readiness assessment

### The 15 v0.9 success criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Existing regressions remain intact | ✅ claims 222/223 · identity 99.1/100/86 · quality-gate 11/11, byte-unchanged frozen engine |
| 2 | Secondary-category performance materially improves | ✅ ~15% → 100% strict on the labelled set, 3.5% → 6.7% live (caveat §5) |
| 3 | announce/criticise/allege/respond no longer false-merge | ✅ speech-act specialist + split guard; identity eval unchanged |
| 4 | Claim relationships preserve attribution | ✅ verified in the manual review (§19 Q6) + quality-gate "every attributed claim keeps its speaker" |
| 5 | Timelines clearly show WHAT CHANGED | ✅ "What changed:" line + significance badge; empty only on a fresh local ingest |
| 6 | Tamil Nadu local impact becomes more granular | ⚠️ model built + tested; dormant on live data (no active TN disaster this cycle) |
| 7 | Finance policy events & market reactions distinguishable | ✅ `financeEvent.kind`; verified by unit tests (0 live policy events this window) |
| 8 | Sports fixtures remain reliably distinct | ✅ round/status/result + league-vs-final split; 2 upstream-classifier FPs noted |
| 9 | Homepage no longer dominated by OTHER_RELEVANT | ✅ all `other-relevant` in BACKGROUND; front strip is P0/P1 priority-domain events |
| 10 | Achieved via editorial ranking, not false categorisation | ✅ OTHER_RELEVANT share held at ~52%; de-emphasis is a band cap, not a relabel |
| 11 | Ranking explanations are inspectable | ✅ factors + penalties + reasons on every card and on the public dashboard |
| 12 | Live source health remains visible | ✅ `/diagnostics` — 25 healthy · 1 stale · 4 disabled, each with a reason |
| 13 | Playwright tests remain green | ✅ 50/50 local, 28/28 @prod |
| 14 | Mobile remains clean | ✅ 390px, no horizontal overflow, hierarchy stacks |
| 15 | Production deployment is checked manually | ✅ §18 — all routes 200, @prod E2E green, v0.9 content confirmed |

12 clean ✅, 3 with an honest ⚠️ (models built and unit-tested but not yet exercised
against live data of the kind they target).

### What a v1.0 RC cycle must still close

1. **Exercise the extractive models against a live TN disaster** — local-impact,
   consequence at scale, update-significance across snapshots, `whatChanged`. This is the
   single biggest untested surface.
2. **A held-out secondary-category corpus** not used during tuning, to get an honest
   generalisation number.
3. **Feed-JSON growth** — split `live-feed.json` or drop the redundant per-article `geo`
   object before adding more sources.
4. **Security review** (`/security-review`) and an **accessibility pass** — neither was
   run this cycle.
5. **Crisis coverage still isn't official-source-driven** — PIB / IMD / NDMA-beyond-CAP
   remain unreachable; the RC should either find a reachable path or state plainly that
   crisis relies on CAP + independent reporting.
6. Trim the two live sports classifier false positives (India/Pakistan-as-teams;
   Tamil "தோல்வி" as a sports keyword).

### Answer

**Is IFFA technically ready to begin a v1.0 release candidate? — YES.**

Not because v0.9 shipped, but because the evidence supports *starting a hardening cycle*:

- the deployed system is deterministic, has **no LLM**, no paid APIs, no invented sources,
  and **no ideological scoring** — every ranking number explains itself on a public page;
- **zero regressions** — the frozen v0.6 claim/identity engine is byte-for-byte
  unchanged, and every v0.8 metric held;
- **411 unit + 50 E2E green**, category eval **100% on a 40%-larger, harder corpus**,
  quality-gate **11/11**, and production **deploys clean with all routes verified**;
- every one of the 15 success criteria is either met or carries an **honest, documented**
  limitation rather than a hidden one;
- the open items (§21) are *"exercise against live disaster data", "held-out corpus",
  "security & a11y review", "feed-JSON size"* — a stabilisation backlog, **not**
  architectural debt.

That is precisely what a release-candidate cycle is for. **v1.0 itself must NOT be
declared** until the six items above are closed and the models have been watched through
a real Tamil Nadu emergency.

