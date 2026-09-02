# IFA Architecture

**Status:** current as of v0.6. This document describes what the repository
actually builds and deploys today. An earlier revision described a
Drizzle / SQLite / Next.js-API-route service that was **abandoned** before
launch — see [Superseded design](#superseded-design) at the end.

## What IFA is, structurally

A **fully static Next.js 16 site**. No database, no API routes, no server at
runtime. Everything is computed at build time from a committed data snapshot and
emitted as static HTML + JSON for GitHub Pages.

- `next.config.ts`: `output: "export"`, `trailingSlash: true`, `basePath` from
  `PAGES_BASE_PATH`.
- Deploy: `.github/workflows/deploy-pages.yml` (push, 15-min schedule, manual
  dispatch) runs the ingest + build and publishes `out/`.
- The deterministic, rule-based pipeline runs in `scripts/` and `src/lib/`. **No
  LLM / paid API is called in the deployed build.** `@anthropic-ai/sdk` /
  `openai` are optional, dormant dependencies gated behind `IFA_*_PROVIDER` env
  vars that are never set in CI.

## Pipeline

```mermaid
flowchart TD
    SR[Source registry<br/>src/data/feeds.ts] --> ING[Fetch / ingest<br/>scripts/ingest-feeds.ts<br/>RSS · Atom · CAP/SACHET JSON]
    ING --> NORM[Normalisation<br/>src/lib/live/normalize.ts<br/>clean HTML · canonical URL · dedupe key · SSRF-safe URLs]
    NORM --> GEO[Geo + crisis classification<br/>src/lib/live/geo.ts · crisis.ts]
    GEO --> SIG[Event signature<br/>src/lib/event-identity/signature.ts<br/>entities · places · concepts · actions · quantities · date]
    SIG --> CAND[Candidate retrieval<br/>src/lib/event-identity/index.ts<br/>permissive blocking: district · place · entity · crisis · quantity · state+concept]
    CAND --> DEC[Identity decision<br/>src/lib/event-identity/decide.ts<br/>conservative gate · explainable · no hidden score]
    NORM --> LEX[Lexical clustering<br/>src/lib/live/cluster.ts<br/>scorePair + semantic veto]
    LEX --> DEC
    DEC --> CL[Clusters<br/>src/lib/live/cluster.ts]
    CL --> CLAIM[Claim extraction<br/>src/lib/claims/extract.ts<br/>attribution-preserving · rule-based]
    CLAIM --> CORR[Corroboration / independence / evidence<br/>src/lib/claims · src/lib/independence]
    CORR --> CGI[Common Ground Index v0.1<br/>src/lib/claims/cgi.ts · experimental · gated on ≥2 publishers]
    CGI --> DS[Static dataset<br/>src/lib/live/dataset.ts]
    DS --> EXP[next build → static export<br/>152 pages]
    EXP --> GH[GitHub Pages]
```

## Render flow

```mermaid
flowchart LR
    subgraph Build
      D[src/data/generated/live-feed.json<br/>gitignored · seeded from fixtures] --> RSC[Server Components<br/>src/app/*]
      RSC --> HTML[Static HTML + JSON]
    end
    subgraph Browser
      HTML --> P[Home / Story / Sources / Methodology]
      P --> F[Client filters only<br/>language · geography · district]
    end
```

Pages are all `○ (Static)` or `● (SSG)`. `generateStaticParams` enumerates every
cluster (`/story/[slug]`, `/methodology/clusters/[slug]`) and worked example
(`/methodology/examples/[slug]`).

## Module boundaries

| Module | Responsibility |
| ------ | -------------- |
| `src/data/feeds.ts` | the source registry — publisher, URL, kind, language, evidence role. No URL is invented. |
| `src/lib/live/parse.ts` | RSS / Atom / CAP(SACHET JSON) → `RawItem` via `fast-xml-parser` |
| `src/lib/live/normalize.ts` | `RawItem` → `LiveArticle`: HTML strip, entity decode, canonical + SSRF-safe URL, dedupe key, language detect |
| `src/lib/live/geo.ts` · `crisis.ts` | explainable TN geo-classification; deterministic 0–100 crisis priority; CAP severity/urgency/certainty preserved verbatim |
| `src/lib/event-identity/*` | "are these two articles the same event?" — `buildSignature`, `candidatePairs` (permissive), `decideIdentity` (conservative, explainable) |
| `src/lib/semantic/*` | `concepts.ts` (EN→concept lexicon), `actions.ts` (action ontology), `embeddings.ts` (deterministic hashing embedding, retrieval-only) |
| `src/lib/language/*` | `tamil.ts` (conservative news-domain normaliser + concept/place/org lexicon), `locations.ts` (canonical place registry + `placeRelation`), `translation.ts` (offline dictionary gloss) |
| `src/lib/live/cluster.ts` | two-pass clustering: lexical `scorePair`, then a semantic pass that only ADDS merges; "semantic veto" lets the identity engine's location model overrule a lexical match |
| `src/lib/claims/*` | rule-based claim extraction with mandatory attribution retention; `normalize`, `corroborate` (union-find; syndicated copies collapse to one group), `contradict` (genuine numeric/temporal conflicts only), `evidence`, `confidence`, `cgi` (experimental), `present` |
| `src/lib/independence/*` | pair-classified independence (independent / likely / syndicated / likely-syndicated / **unknown**) + wire-service detection |
| `src/lib/live/dataset.ts` | assembles the final view model the pages read |
| `src/app/*` | Next.js RSC pages — read the dataset, render, no data fetching |

Every heavy step is a plain function over plain data, unit-tested in isolation
(`tests/unit/`, Vitest). The evaluation harness (`evaluation/claims/`) runs the
**real** pipeline against a hand-labelled gold corpus.

## Data

- **Snapshot:** `src/data/generated/live-feed.json` (gitignored). In CI it is
  produced by `scripts/ingest-feeds.ts`; locally it is seeded from
  `src/data/fixtures/live-feed.seed.json` by `scripts/prepare-data.ts` (an npm
  `pre*` hook), so `npm test` / `npm run build` work with no network.
- **No persistent store.** Each build is a pure function of the snapshot. There
  are no migrations, no ORM, no timestamps-as-rows.
- **Hygiene:** running `npm run ingest` / the eval scripts refreshes committed
  report artifacts under `evaluation/reports/` and `src/data/claim-eval.json`
  (timestamps + minor runtime jitter). Those are release artifacts, not tree
  dirt. `next dev` re-adds the agent block to `AGENTS.md`.

## Safety properties enforced in code + CI

- **No fabricated consensus.** The identity gate that emits `relation: "same"` is
  deliberately strict; permissiveness lives only in candidate generation.
  `npm run quality-gate` fails the build if the live snapshot shows any
  fabricated corroboration.
- **Attribution is never dropped.** "the minister said X" extracts as an
  attributed claim, never a bare fact.
- **Cross-language merges require structured agreement** — a shared district or
  specific place, a compatible date, and a shared entity/action or ≥2 shared
  specific concepts. A shared "Tamil Nadu" alone never merges. Confidence is
  capped at Moderate.
- **Tamil original text is always preserved** alongside any normalised form.
- **SSRF:** feed URLs are validated to `http(s)` only; localhost / RFC1918 /
  link-local / metadata addresses are rejected at ingest.
- **No political-orientation labels** on live content. Left/Center/Right appear
  only in the static worked examples at `/methodology/examples`.

## Possible future architecture (NOT built)

These are designed-for, not present. Adopting any of them is an explicit
decision, not implied by this document.

- Streaming / realtime ingestion and live event pages.
- A persistent store (only if incremental state across builds is actually
  needed — the static model is intentional until then).
- A model-assisted extraction / translation provider behind the existing
  `IFA_CLAIM_PROVIDER` / `IFA_TRANSLATION_PROVIDER` / `IFA_EMBEDDING_PROVIDER`
  seams.
- Source-ownership graph, personalisation, a public API, a mobile client.

See `docs/ROADMAP.md` for the phased view.

## Superseded design

An earlier revision of this file (and `docs/ROADMAP.md` Phase 0) described:

> Drizzle schema (16 core models), SQLite via `better-sqlite3` with a
> PostgreSQL/`pgvector` upgrade path, Next.js `/api` route handlers with Zod
> validation, `src/lib/{domain,ingestion,intelligence,clustering,cgi}`, a
> `docker/Dockerfile` + `docker-compose.yml`, `GET /api/health`.

That service was built as an MVP and then **abandoned**: its uncommitted pglite
DB layer failed during `next build`, and the project was refocused onto the
comparison UI as a fully static site. The code was removed (recoverable at commit
`e99ae64`). `package.json` still lists `@electric-sql/pglite`, `postgres`,
`drizzle-orm`, `drizzle-kit` — retained only to avoid a risky `npm install` in
the constrained build environment; nothing imports them (see
`evaluation/reports/v0.6-dependency-audit.md`).
