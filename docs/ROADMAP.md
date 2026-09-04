# IFFA Roadmap

**Status:** current as of **v0.12 — Productization Release Candidate**. (Product
renamed from *Info For All / IFA* to **IFFA — Info Free For All** in v0.7;
repository, GitHub Pages base path and every route unchanged.)

IFA shipped as an MVP service (Drizzle / SQLite / Next.js API routes / Docker),
then **pivoted to a fully static Next.js 16 site** on GitHub Pages before launch.
Everything below reflects that static architecture — see `docs/ARCHITECTURE.md`.
Per-release detail is in [`docs/releases/`](releases/) and
[`docs/releases/archive/`](releases/archive/).

## Current architecture (what is built and deployed)

- **Static Next.js 16 + TypeScript + Tailwind v4**, editorial design system.
  `output: "export"`, deployed to GitHub Pages by a scheduled workflow. No
  database, no server, no API routes at runtime.
- **Ingestion** — RSS / Atom / CAP(SACHET JSON) via `fast-xml-parser`;
  SSRF-guarded URLs; canonical-URL + dedupe-key normalisation; explainable
  Tamil-Nadu geo-classification; deterministic 0–100 crisis priority with CAP
  fields preserved verbatim.
- **Event identity (v0.5–v0.6)** — a structured, language-neutral event
  signature; permissive candidate retrieval; a conservative, fully explainable
  decision gate (no hidden merge score). Two-pass clustering (lexical + semantic,
  semantic-veto).
- **Multilingual (v0.5–v0.6)** — Tamil news-domain normalisation, a Tamil↔English
  concept lexicon, an offline dictionary gloss, canonical place resolution. A
  cross-language merge requires structured agreement and is capped at Moderate
  confidence. Tamil original text is always kept.
- **Claim intelligence (v0.3–v0.6)** — rule-based extraction with mandatory
  attribution retention; corroboration by union-find (syndicated copies collapse
  to one independent group); contradiction detection for genuine numeric /
  temporal conflicts only; primary-evidence linking; a documented confidence
  formula (`docs/CLAIM-CONFIDENCE-v2.md`).
- **Common Ground Index v0.1** — experimental, component-based, no political
  labels, only shown with ≥2 publishers.
- **Trend Intelligence (v0.7)** — an *additive* layer over the frozen v0.6
  engine: a news-domain taxonomy (crisis / politics / finance / sports, with
  entertainment & celebrity disabled by default), P0/P1/P2 geo tiers, first-class
  Tamil-script recognition for all 38 districts, a typed source registry, and an
  interpretable trend score (`trendScore = 100 · Π subScore_i ^ w_i` over
  recency / velocity / diversity / geo / category / consequence / novelty /
  corroboration — weights in one documented table, every sub-score shown). Event
  timelines, a Current Situation bar derived from active signals only, and a
  descriptive cross-source coverage comparison. See `docs/TREND-MODEL.md`.
- **Evaluation** — a hand-labelled gold corpus (`evaluation/claims/`, 223 cases)
  run against the real pipeline; `npm run eval:claims` / `eval:identity` /
  `quality-gate` / `audit:identity`. v0.7 adds ~113 unit tests including a
  12-case critical-safety corpus. CI: lint → typecheck → test → eval → gate →
  build.

## Recent releases

| Version | Theme |
| --- | --- |
| v0.3 | grounded claim intelligence (rule-based extraction, corroboration, contradiction, CGI v0.1) |
| v0.4 | claim quality, the gold corpus + evaluation harness, evidence intelligence |
| v0.5 | semantic recall & multilingual event identity (structured signature, candidate/decision split, Tamil + cross-language) |
| v0.6 | recall hardening & production-truth pass: 10/10 known false negatives resolved, precision and 0-false-corroboration held, docs/dependency drift removed |
| v0.7 | Trend Intelligence + rebrand to IFFA: news-domain taxonomy, geo tiers, first-class TN districts, typed source registry, interpretable trend/velocity/novelty engine, event-first UI, timelines, coverage comparison. |
| v0.8 | Live Signal Intelligence: multi-signal category classifier, +8 live finance/sports feeds, 5-state source health, claim-aware novelty v2, evidence-aware event severity, domain specialists in clustering, Playwright E2E, PWA offline shell. |
| v0.9 | Editorial Intelligence: interpretable editorial-priority ranking (8 factors + penalties + bands, "why prominent" on every card), consequence model, speech-act political identity, temporal + local-impact models. |
| v0.10 | Media Landscape: provenance-backed ownership registry, coverage landscape, headline/framing comparison, 5-type blindspot engine, claim-evidence matrix, compliant Reddit-RSS discourse. Story page rebuilt around 7 tabs. |
| v0.11 | Data Depth & Calibration: Tamil share 4.5%→16%, first calibration benchmarks (stance 54.7%, framing 75%/41%, evidence 94% — all indicative), blindspot confidence gating, search-index de-inlined to a served shard. |
| Ground-Parity A | Native IFFA Brief: `DeterministicBriefSynthesizer` + `verifyBrief` hallucination firewall, Tamil brief from the same claim ids, inline citations. "IFFA does not write its own prose account" removed. |
| Milestone B §B.1–B.2 | Hardened source-family resolver (`genuineIndependentFamilies` gates the brief); primary-record research adapters behind an echo-collapse gate; claim-domain-scoped "sources checked" trail. |
| **v0.12** | **Productization RC: one unified feed card, progressive loading (`/india` HTML −90%), real mobile navigation, full server-render (removed a JS-only loading shell), every story deep-linkable, dead-dep + dead-component removal, analytics foundation (no provider), case study + commercial-readiness docs.** |

## Next major track — Coverage Discovery

The measured bottleneck: **96% of routable clusters have exactly one genuine
independent newsroom** — not because clustering misses merges (0 missed on a
frozen re-search), but because IFFA ingests only ~36 feeds. The next track finds
*the other newsrooms reporting the same event* (Tamil, Indian English, regional,
official, fact-checkers) and feeds those candidates through the **existing**
identity / independence / claim / brief engines — never replacing them.

- A `CoverageDiscoveryAdapter` abstraction (EVENT → possible related URLs), with
  every candidate passing URL canonicalisation → publisher resolution → event
  identity → time/entity compatibility → dedupe → source-family resolution before
  it joins a story.
- GDELT DOC 2.0 as a *discovery origin only* (never represented as
  corroboration); first-party RSS search; existing-corpus re-search first.
- Verification-only fetching, tightly scoped: never bypass 403 / CAPTCHA /
  paywall / robots; never rotate identities; never republish full text.
- Real metric: top-20 native-comprehension before → after; no threshold tuning.

Work in progress on branch `feat/milestone-b3-discovery` (Phase 0 baseline +
query generation done).

## Near-term (candidate, not committed)

- **Secondary-category detection** — v0.8 classifies the PRIMARY domain at ~99%
  on the gold corpus but secondary recall is ~15%. A budget story is finance +
  politics; surface both.
- **Search** across entities / locations / politicians / instruments / teams,
  client-side over the static JSON.
- **Grow the category corpus** past 114 cases toward the ~430-case spec set, with
  a held-out split that is never tuned against.
- **Politics identity specialist** — split "CM announces scheme" from "CM
  criticises opposition's scheme" (v0.8 wired sports + finance specialists only).
- **PWA background refresh** — v0.8 ships the offline shell; add a "new snapshot
  available" prompt on reopen.
- **Compare Coverage as its own route**; correction-system UI beyond the timeline.
- Reduce remaining event-identity misses surfaced by the live audit (e.g. detect
  an action from a quoted-headline form like `'… opens Mettur dam …'`).
- CGI v0.2: per-claim rather than per-event convergence; sensitivity analysis on
  weights, all formulations stored side by side.
- More Tamil / cross-language corpus coverage; a small, corpus-driven bilingual
  lexicon rather than an open-ended dictionary.
- Wider Indian-language handling (Hindi) if feeds justify it.

## Longer-term (designed-for, not built)

- **Ownership intelligence** — source-ownership graph, media-ecosystem map,
  "reached you through N independent owners" explainers.
- **Personalised information analysis** — opt-in, local-first media-diet and
  blind-spot views.
- **Realtime monitoring** — streaming ingestion, live event pages, alerts on new
  contradictions / corrections / CGI shifts. Would require reconsidering the
  static model.
- **Mobile client** and a **documented public API**.

Adopting any longer-term item — especially a persistent store or a server — is an
explicit architecture decision. The static model is intentional until a
requirement genuinely cannot be met within it.
