# IFFA — Media Landscape Intelligence — implementation plan

**Status:** Phase 0 (audit) complete. Implementation **blocked on one version-identity decision** (§1). The full phased plan and the gap matrix below are ready to execute the moment that is resolved.

**Date:** 2026-09-03
**Prepared by:** autonomous engineering run — principal engineer / release manager / media-systems architect

---

## 1. ⚠️ Blocking discrepancy — "v0.9" is already shipped

The directive states **"CURRENT: v0.8 — Live Signal Intelligence"** and **"STOP THE PREVIOUS v0.9 EDITORIAL-INTELLIGENCE PLAN"**, and asks for a new `v0.9 — Media Landscape Intelligence` with `IFFA_V09_MEDIA_LANDSCAPE_PLAN.md` / `IFFA_V09_MEDIA_LANDSCAPE_COMPLETION_REPORT.md`.

**Reality on `main` right now:**

| Fact | Value |
|---|---|
| `main` HEAD | `7e43fee` (clean, `== origin/main`, deployed) |
| `src/lib/brand.ts` | `version: "0.9"`, `versionLabel: "v0.9 — Editorial Intelligence"` |
| `package.json` | `"version": "0.9.0"` |
| git tag | **`v0.9.0`** → `28e1ef7` (annotated, **pushed to origin**) |
| on `main` | `IFFA_V09_COMPLETION_REPORT.md` (21 sections), `docs/EDITORIAL-MODEL.md`, `src/lib/editorial/` |
| production | `https://rishidar-lab.github.io/info-for-all` serves **"v0.9 — Editorial Intelligence"**, SW cache `iffa-v0.9` |
| earlier this session | v1.0.0-rc.1 qualification of v0.9-Editorial (NO-GO, `IFFA_V1_RC1_QUALIFICATION_REPORT.md` on branch `chore/v1.0.0-rc.1-qualification`), then a deployed dashboard hotfix (`1db5cb5`, `7e43fee`) |

So v0.9-Editorial is **not a "previous plan" to stop — it is shipped, tagged, and live.** "v0.9" as a label and `v0.9.0` as a tag are taken.

**This blocks nothing about the *product* work** — Media Landscape Intelligence is almost entirely additive and *uses* the editorial layer (framing divergence, coverage alignment, and the redesigned story cards all build on `src/lib/editorial/`). It blocks three concrete things I must not guess on:

1. **Version number.** `v0.9.0` is pushed. Options: `v0.10.0 — Media Landscape Intelligence` (recommended — next minor, nothing overwritten) · re-cut `v0.9` (requires moving/deleting a pushed tag — I will not do this without an explicit instruction) · `v1.0.0`.
2. **Disposition of the shipped editorial-intelligence layer.** Recommended: **keep it, build on it.** Reverting `src/lib/editorial/` would break the live home page and remove infrastructure this plan depends on. If "STOP" means "revert it," say so — that is a separate, destructive, outward-facing change I need told to make.
3. **Report / doc filenames.** `IFFA_V09_COMPLETION_REPORT.md` exists. I have written this plan as `IFFA_V09_MEDIA_LANDSCAPE_PLAN.md` (distinct name, no collision); the completion report would be `IFFA_V010_MEDIA_LANDSCAPE_COMPLETION_REPORT.md` under the recommended option, or as directed.

**Recommended resolution (proceed on this unless told otherwise):** ship as **`v0.10 — Media Landscape Intelligence`**, additive, editorial layer retained, on a feature branch, deploying per phase. Everything below is written to that assumption and is trivially re-labelled if the answer differs.

---

## 2. Phase 0 — audit of the current system

### 2.1 What already exists and is usable

| Capability | State | Reusable for media landscape? |
|---|---|---|
| Article ingestion (RSS/Atom/CAP) | 30 feeds, 26 enabled, 17 publishers; SSRF-guarded; canonical-URL dedupe | ✅ the discovery substrate |
| Event clustering | `src/lib/event-identity/` (frozen v0.6) + `src/lib/live/cluster.ts` | ✅ = "story clustering" / "full coverage" |
| Cross-language (Ta/En) semantics | `src/lib/language/`, `src/lib/semantic/` (frozen) | ✅ = "Tamil-English comparison" |
| Claim extraction + status | `src/lib/claims/` (frozen v0.6) — `corroborated / partially-corroborated / single-source / disputed`, `Evidence`, `EvidenceType`, provenance, corrections | ✅ **the differentiator core is already built** |
| Source independence (families) | `src/lib/independence/` — union-find over article pairs, counts families not articles; `PUBLISHER_GROUP` (5 groups) | ✅ = "independent source families" |
| Novelty / "what changed" | `src/lib/trends/novelty.ts`, Event State v3 | ✅ = story "Timeline" / "What changed" |
| Trend + editorial priority | `src/lib/trends/`, `src/lib/editorial/` (v0.9) — 8-factor interpretable ranking, bands | ✅ story ordering + a base for framing/alignment |
| Category classifier | `src/lib/domain/classify.ts` — primary + weak secondary | ⚠️ usable; held-out generalisation is poor (35–50% primary, 0% secondary — see `IFFA_V1_RC1_QUALIFICATION_REPORT.md`) |
| Story page | `/story/[slug]` — synopsis, a "Coverage" block (report/publisher/family/syndication/primary-source counts), per-source reporting rows with language + evidence role, a CAP-record panel, a timeline | ⚠️ **the skeleton of "Full Coverage" exists**; needs the landscape/headline/evidence tabs |
| Diagnostics / source health | `/diagnostics` — 5-state health, HTTP state, lag | ✅ feeds the `/landscape` "source health" section |
| Quality dashboard | `/methodology/quality` — every v0.4–v0.9 eval + the v0.9 editorial layer | ✅ extend, don't replace |
| E2E (Playwright) | 50 local + 28 `@prod` | ✅ extend |
| PWA shell | `public/sw.js` (`iffa-v0.9`) | ✅ bump cache key per release |

### 2.2 What does NOT exist (the build)

| Missing | Notes |
|---|---|
| `PublisherProfile` / any publisher-level entity | feeds carry `publisher` (string), `ownershipGroup` on **5 / 26**, `region` on **9 / 26**. No profile, no `firstSeenAt/lastSeenAt`, no `articleCount`. |
| Ownership registry with provenance | only the 3-group `PUBLISHER_GROUP` map + `ownershipGroup` strings. No owner / parent / ultimateParent / fundingType / `source` / `verifiedAt` / `confidence`. |
| External bias / factuality ratings | none. No adapter, no attribution model. |
| Observed editorial alignment | none. No rolling per-publisher × per-entity coverage analysis, no stance model, no sample-size gating. |
| Source reliability profile (IFFA-observed) | none. `citationDensity`, `correctionHistory`, `sensationalismRate`, `unsupportedClaimRate` — not computed. |
| `CoverageLandscape` per cluster | partial — counts exist ad hoc on the story page; no typed `CoverageLandscape` with ownership / reliability / alignment / language / locality distributions. |
| Headline comparison / framing extraction | none. No per-article `emphasis` / `stance` / `omitted claims` / headline-feature extraction. |
| Blindspot engine | none. `src/lib/media-landscape/blindspot.ts` does not exist. |
| Claim **evidence matrix** as a first-class per-cluster product | claims exist; a `ClaimEvidence[]` view with `HIGHLY_CORROBORATED … SUPERSEDED`, `PRIMARY_DOCUMENT` class, fact-check links, per-family counts — not assembled. |
| Fact-check adapters / registry | none. |
| Public discourse / forums / YouTube / Reddit / podcasts | none. No `DiscourseMention`, no discovery adapters beyond RSS/Atom/CAP. |
| GDELT discovery | none. |
| Source profile pages `/source/[publisher]` | none. |
| Source comparison | none. |
| `/landscape` dashboard | none. |
| `/tamil-nadu/landscape` | none (there is a `/tamil-nadu` list page). |
| Search | none (v0.8 roadmap item, never built). |
| Historical persistence (for rolling windows) | **only `actions/cache` one-run-back snapshot.** No time-series store. This is the hard architectural gap for "observed alignment over 7/30/90 days". |
| Sharded static data | none — one `live-feed.json` (~5 MB build input, not served). Fine now; will not scale to 100+ sources + history + discourse. |
| Home page redesign | current home is the editorial-hierarchy feed; not landscape-first. |

### 2.3 Data / feed reality

- **26 enabled feeds** (directive's "24 healthy" ≈ correct on a typical run): **19 English, 5 Tamil, 2 mixed**. **17 distinct publishers.**
- Tamil-native newspaper feeds (Dinamalar, Daily Thanthi, Dinakaran) — **not present** (no bot-friendly feed found in v0.8; must re-investigate).
- Ownership metadata: **~19%** of enabled feeds. External ratings: **0%**. Observed alignment: **0%**.
- Storage policy is already correct: headlines + ≤360-char excerpts, **no article bodies**, links to origin. Seed 4.5 MB.
- Persistence: the workflow restores the previous run's snapshot from `actions/cache` and saves the new one — **one generation of history only.**

### 2.4 Blunt assessment vs the directive's success bar

> *"a random user opening IFFA immediately understands: THIS IS A NEWS-COMPARISON / MEDIA-INTELLIGENCE PLATFORM, NOT ANOTHER NEWS FEED."*

Today: **No.** The home page reads as a (smart) feed. The story page is ~40% of the way there (it already shows source/family/syndication/primary counts and per-source rows) but buries it below the synopsis and has no ownership, alignment, headline-comparison, blindspot, or evidence-matrix surfaces. The publisher/ownership/alignment/discourse layers do not exist at all.

---

## 3. Gap matrix

Complexity: **S** ≤ ~1 focused commit · **M** a few commits + a model + tests · **L** a subsystem (new dir, corpus, pages) · **XL** needs new architecture (persistence / sharding / a new ingestion pipeline).

| # | Ground-style capability | Current IFFA state | Required change | Data required | Complexity |
|---|---|---|---|---|---|
| 1 | **Story clustering** | Built (frozen v0.6 + live cluster.ts) | none — reuse | have it | — |
| 2 | **Full coverage list** | Partial — story page has a per-source reporting list | Promote to a first-class "Full Coverage" tab: sort (latest/reliability/alignment/ownership/locality), filter (lang/role/ownership/reliability/alignment/locality/family) | per-article: publisher, lang, locality, family, ownership, external factuality, observed alignment, stance, paywall, syndication | M |
| 3 | **Coverage statistics** | Ad-hoc counts on the story page | Typed `CoverageLandscape` per cluster: totals, families, languages, Ta/En, regional/national, official/alternative, + ownership/reliability/alignment/language/locality **distributions** | publisher profiles + per-article locality + family map | M |
| 4 | **Publisher bias / alignment** | None | `ObservedAlignment` — rolling 7/30/90-day per-publisher × per-entity coverage: supportive/critical/neutral/mixed/unclear + storySelectionDeviation, headlineFraming, quotationDiversity, claimOmissionRate, sensationalismRate; **sample-size bands** (`<20` INSUFFICIENT … `150+` SUBSTANTIAL) | **historical article store** (the XL dependency) + a per-article stance model + a political-entity registry | L (+ XL dep) |
| 5 | **Factuality / reliability** | None | `SourceReliabilityProfile` — keep **external ratings** and **IFFA-observed metrics** (correctionHistory, primarySourceUsage, citationDensity, attributionQuality, sensationalismRate, historicalContradictionRate, unsupportedClaimRate) in **separate, labelled** fields | external adapters (attributed) + corpus-derived observed metrics | L |
| 6 | **Ownership** | 3-group map + 5 `ownershipGroup` strings | `PublisherOwnership` registry: owner/parent/ultimateParent/fundingType + **provenance** (`source`, `verifiedAt`, `confidence`); category enum (INDEPENDENT … UNKNOWN); **never inferred**, `UNKNOWN` allowed | hand-built registry, each row cited | M |
| 7 | **Headline comparison** | None | A per-event headline grid: source, headline, language, stance, emphasis, omitted key claims, ownership; + shared factual core / framing differences / unique claims | headline-feature extraction (deterministic + optional model) over cluster members | L |
| 8 | **Blindspots / coverage asymmetry** | None | `src/lib/media-landscape/blindspot.ts` — POLITICAL / LANGUAGE / REGIONAL / OWNERSHIP / SOURCE-FAMILY blindspot types, each = asymmetry ≠ truth | `CoverageLandscape` + publisher profiles | M |
| 9 | **Source filtering** | None | Filter controls on Full Coverage + `/landscape` (lang, role, ownership, reliability, alignment, locality, family) | (2)+(3)+(6) | S |
| 10 | **Source profile pages** | None | `/source/[publisher]` — profile, ownership, external ratings, IFFA observed metrics (30/90d), entity-stance distribution, topics, selection divergence, sensationalism, corrections, evidence density; **every metric shows window + n + last-updated + methodology link** | publisher profiles + observed alignment + reliability | L |
| 11 | **Alternative media / public discourse** | None | `DiscourseMention` + a **separate** ingestion pipeline (Reddit / YouTube / podcast RSS / public social — provider-rules-compliant, no bypass); "EMERGING / UNVERIFIED PUBLIC CLAIM" surface; discourse **never** counts as factual corroboration | new discovery adapters + a discourse store | XL |
| 12 | **Claim evidence matrix** | Claims + status + evidence exist (frozen) | Assemble `ClaimEvidence[]` per cluster: `HIGHLY_CORROBORATED … SUPERSEDED`, `PRIMARY_DOCUMENT` class, supporting/contradicting articles, official statements, fact-checks, per-family counts; an "Evidence Profile" (counts, not "84% true"); optional internal **Evidence Strength Score** with exposed components — **never** shown as truth probability | reuse frozen claim engine + a `PRIMARY_DOCUMENT` classifier + fact-check adapters | L |
| 13 | **Media landscape dashboard** | None | `/landscape` + `/tamil-nadu/landscape` — today's ingestion, clusters, publishers, families, Ta/En share, ownership/alignment distributions, top entities, most-asymmetric stories, most-disputed/corroborated, top publishers, largest selection divergence, insufficient-data publishers; district coverage + under-covered districts for TN | everything above | L |
| — | **Fact-check integration** | None | Adapter registry for publicly/legally accessible India fact-checkers; store verdict/claim/date/methodology/matchConfidence; government fact-checks **not** treated as authoritative | public fact-check feeds/APIs | M |
| — | **Source acquisition → ~100 healthy** | 26 | Add Tamil-native, TN-regional, Indian-English, finance, sports, official, independent, fact-checker feeds; only **live, useful** feeds count | feed discovery + validation | L |
| — | **GDELT discovery** | None | Evaluate GDELT 2.1 (DOC/GKG) for TN/India URL discovery; use as **discovery only**, dedupe against direct feeds | GDELT API | M |
| — | **Search** | None | Client-side over sharded JSON: headline/topic/politician/party/district/publisher/URL; a pasted URL → find/create its cluster → Full Coverage | a search index shard | M |
| — | **Historical persistence** | `actions/cache` one-run-back | Time-series aggregate store (versioned compressed snapshots / GitHub Releases / an ingestion-time SQLite that emits static aggregates) — **no paid DB** | design + workflow change | XL |
| — | **Sharded static data** | one `live-feed.json` | `events/<date>/`, `sources/`, `landscape/`, `claims/` shards; lazy-load story detail; never ship the whole corpus to a browser | build-pipeline change | L |
| — | **Home redesign** | editorial-hierarchy feed | Landscape-first: "SEE THE COVERAGE, NOT JUST THE HEADLINE"; top-story cards showing source count / coverage-alignment bar / evidence profile / blindspot indicator | (3)+(4)+(8)+(12) | M |
| — | **Story card redesign** | feed-style card | Rebuild around landscape data (sources, families, alignment bar, evidence counts, Ta/En split, actions: Full Coverage / Evidence / Compare Headlines) | (3)+(4)+(8)+(12) | M |
| — | **Methodology doc** | `docs/METHODOLOGY.md` + `docs/EDITORIAL-MODEL.md` | Research-style doc: clustering, independence, external ratings, observed alignment, selection bias, framing divergence, entity stance, ownership, reliability, evidence strength, corroboration, blindspots, discourse, limitations; the 6 "≠" statements | writing | M |
| — | **Evaluation corpora** | category (175), claims (223), identity | +≥625 cases across 10 new corpora (stance ×100, entity-alignment ×100, framing-diff ×75, claim-omission ×75, evidence-status ×75, primary-doc ×50, blindspot ×50, independence ×50, ownership ×50, discourse-match ×50), Ta+En, held-out splits | hand labelling | L |
| — | **Human audit** | none formal | 50-cluster reproducible manual audit (20 politics / 10 crisis / 10 finance / 10 sports); disagreements documented | audit time | M |

**Two hard dependencies gate the "observed alignment" and "discourse" pillars:** a **historical store** (matrix row 4) and a **discourse ingestion pipeline** (row 11). Everything else can proceed against the current architecture. The plan front-loads the historical store in Phase 1.5 so alignment work is not blocked.

---

## 4. Non-negotiable methodology rules (locked into the code + UI)

1. **No US Left/Center/Right as the primary Indian model.** `ObservedAlignment` is corpus-derived and entity-specific. External L/C/R ratings shown **only** if a real external provider supplies them, **with attribution**. Never invent an external rating.
2. **Ownership is metadata, never a bias determinant.** Every ownership row carries provenance. `UNKNOWN` is a valid, common value. Never inferred.
3. **No single magic bias score.** Seven separate, evidence-exposing dimensions (selection / framing divergence / entity stance / claim omission / quotation balance / headline sensationalism / evidence density).
4. **Bias ≠ falsehood.** Media alignment and factual evidence are separate in the data model and the UI.
5. **Reliability is not a "truth score"** and IFFA-observed metrics are never mixed invisibly with external ratings.
6. **Sample size is always exposed;** below `n=20` → INSUFFICIENT DATA, no alignment shown. No pseudo-precision.
7. **Forum/discourse consensus is never factual corroboration.** Emerging claims are labelled UNVERIFIED.
8. **Official source ≠ automatic truth** — a press release is evidence that "the institution stated X".
9. **No chatbot, no AI prose wall.** Models may assist internally; outputs stay inspectable.
10. **No paywall/CAPTCHA/auth/anti-bot bypass.** Public endpoints only. No full-article republication. No repo explosion (metadata + excerpts + hashes only).

---

## 5. Implementation order (Phases 1–14)

Each phase = its own commit(s) with the directive's prefixes, verified (lint/typecheck/test/build), landing on a feature branch; deploy at phase checkpoints (3, 7, 12, 14).

| Phase | Deliverable | Key files | Gate |
|---|---|---|---|
| **1** | `src/lib/media-landscape/` — `PublisherProfile`, `PublisherOwnership` (+ provenance), `SourceFamily`, `SourceRelationship`; ownership registry (hand-built, cited) for all 17 publishers | `src/lib/media-landscape/{types,publishers,ownership}.ts`, `src/data/publishers.ts` | types + registry tests; `describePublisher()` |
| **1.5** | Historical aggregate store — versioned compressed daily snapshots committed to an orphan `data-history` branch / GitHub Releases; `scripts/history-*.ts`; workflow step | `scripts/`, `.github/workflows/` | a 2-snapshot round-trip test |
| **2** | `CoverageLandscape` per cluster in `enrich.ts` — totals, families, language/ownership/reliability/alignment/locality distributions | `src/lib/media-landscape/coverage.ts`, `enrich.ts` | unit tests over fixture clusters |
| **3** | Story page **Full Coverage** tab — article rows with all metadata, sort + filter | `src/app/story/[slug]/`, `src/components/media/` | E2E: tab renders, filters work; **deploy checkpoint** |
| **4** | **Headline comparison** — per-article `emphasis`/`stance`/`omittedClaims` extraction; the comparison grid; shared core / framing diff / unique claims | `src/lib/media-landscape/framing.ts`, story tab | framing corpus (75) |
| **5** | **Observed editorial alignment** — political-entity registry; per-article stance; rolling 7/30/90-day per-publisher × per-entity aggregation off the historical store; sample-size bands | `src/lib/media-landscape/{alignment,entities,stance}.ts` | stance corpus (100) + entity-alignment corpus (100) |
| **6** | **Blindspot engine** — 5 blindspot types | `src/lib/media-landscape/blindspot.ts` | blindspot corpus (50) |
| **7** | **Claim Evidence Matrix** — `ClaimEvidence[]` assembly, `PRIMARY_DOCUMENT` class, fact-check adapter registry, Evidence Profile, internal Evidence Strength Score (components exposed) | `src/lib/media-landscape/evidence.ts`, `src/lib/factcheck/` | evidence-status (75) + primary-doc (50); **deploy checkpoint** |
| **8** | **Source expansion** — Tamil-native / TN-regional / Indian-English / finance / sports / official / independent / fact-checker feeds → target ~100 live-useful; GDELT discovery adapter (discovery only, deduped) | `src/data/feeds.ts`, `src/lib/discovery/` | each feed validated (HTTP 200 + parseable + fresh) |
| **9** | **Public discourse** — `DiscourseMention`; Reddit / YouTube-metadata+captions / podcast-RSS / public-social adapters (compliant); "EMERGING / UNVERIFIED PUBLIC CLAIM" surface; story **Public Discourse** tab | `src/lib/discourse/`, story tab | discourse-match corpus (50); discourse never = corroboration (locked test) |
| **10** | **Source profile pages** `/source/[publisher]` + **Compare Sources** | `src/app/source/[publisher]/`, `src/app/source/compare/` | E2E; every metric shows window + n + updated + method link |
| **11** | **`/landscape`** + **`/tamil-nadu/landscape`** dashboards | `src/app/landscape/`, `src/app/tamil-nadu/landscape/` | E2E; no fake stats — UNKNOWN/INSUFFICIENT where real data absent |
| **12** | **Home + story-card redesign** around landscape data; **Search** (client-side over shards; paste-URL → cluster) | `src/app/page.tsx`, `src/components/media/story-card.tsx`, `src/app/search/` | E2E: 5-second "this is a comparison product" test (heading + landscape cards); **deploy checkpoint** |
| **13** | **Evaluation** — extend `/methodology/quality` with the media-landscape sections (keep all v0.4–v0.9 history); run every new corpus; the 50-cluster **human audit**; `docs/METHODOLOGY.md` rewrite | `src/app/methodology/quality/`, `evaluation/media-landscape/`, `docs/` | all corpora reported with held-out splits; audit doc committed |
| **14** | **Production verification** — full deploy, CI + Pages green, 12+ route smoke, `@prod` E2E, live inspection of ≥5 major stories showing real coverage/families/headlines/ownership/alignment/evidence/blindspot; screenshots; `IFFA_V010_MEDIA_LANDSCAPE_COMPLETION_REPORT.md` with the YES/NO verdict | — | the success-criteria checklist in the directive |

**Performance / persistence / repo-size / copyright constraints** (directive §PERFORMANCE, §PERSISTENCE, §REPOSITORY SIZE, §COPYRIGHT) are handled in Phases 1.5 (history store), 2–3 (sharding introduced with `CoverageLandscape`), and enforced throughout (metadata + excerpt + hash only; official embed/links only).

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| **Observed alignment needs history that doesn't exist yet** | Phase 1.5 builds the store first; until it has ≥7 days, alignment shows INSUFFICIENT DATA (honest, per rule 6) |
| **Stance/framing classification is hard and easy to get wrong** | deterministic-first + optional model; every output exposes its evidence; held-out corpora; the 50-cluster human audit is a hard gate |
| **Discourse pipeline (YouTube/Reddit) compliance + volume** | strictly public endpoints, provider rules, no bypass; discourse is a separate store and never factual corroboration; this is the XL item — if an adapter can't be done compliantly it ships as "not available", not faked |
| **100 sources is ambitious** | count only live-useful feeds; if the honest number is 60, the report says 60, not 100 |
| **GitHub Pages scale** | sharding + lazy-load from Phase 2; the whole corpus never goes to the browser |
| **The category classifier's poor generalisation** (from the RC-1 qualification) | it is not on the critical path for landscape features; stance/alignment get their own corpora |
| **Scope is 14 phases** | phased branch + deploy checkpoints; each phase independently verified and revertible |

---

## 7. The one decision needed to start

Answer **§1**: version number for this release, and whether "STOP the editorial-intelligence plan" means *keep it and build on it* (recommended) or *revert `src/lib/editorial/`*. On the recommended answers (`v0.10`, keep) I begin Phase 1 immediately and run through Phase 14 without further check-ins, per the directive.
