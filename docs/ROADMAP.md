# IFA Roadmap

**Status:** current as of v0.6.

IFA shipped as an MVP service (Drizzle / SQLite / Next.js API routes / Docker),
then **pivoted to a fully static Next.js 16 site** on GitHub Pages before launch.
Everything below reflects that static architecture — see `docs/ARCHITECTURE.md`.

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
- **Evaluation** — a hand-labelled gold corpus (`evaluation/claims/`, 223 cases)
  run against the real pipeline; `npm run eval:claims` / `eval:identity` /
  `quality-gate` / `audit:identity`. CI: lint → typecheck → test → eval → gate →
  build.

## Recent releases

| Version | Theme |
| --- | --- |
| v0.3 | grounded claim intelligence (rule-based extraction, corroboration, contradiction, CGI v0.1) |
| v0.4 | claim quality, the gold corpus + evaluation harness, evidence intelligence |
| v0.5 | semantic recall & multilingual event identity (structured signature, candidate/decision split, Tamil + cross-language) |
| **v0.6** | recall hardening & production-truth pass: 10/10 known false negatives resolved, precision and 0-false-corroboration held, docs/dependency drift removed |

## Near-term (candidate, not committed)

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
