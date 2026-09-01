# IFA — Info For All

**Evidence-first news intelligence.** See the story · check the sources · find the common ground.

Traditional aggregators organise *articles*. IFA organises **events, sources, claims, evidence,
disagreements, timelines, corrections** and **provenance**, so a reader can move from
`headline → story → sources → claims → evidence → uncertainty`.

For any event, IFA helps answer five questions:

1. What happened?
2. What sources are reporting it?
3. Which factual claims are independently corroborated?
4. Where do sources disagree?
5. What evidence actually supports each claim?

> **Product principle.** IFA does not decide what you should believe. It provides sources, claims,
> evidence, provenance, agreement, disagreement, context and uncertainty. The reader decides what
> conclusions are justified. IFA never treats averaging political viewpoints as truth, and it does
> not assign political-bias scores to sources.

> **This repository is IFA MVP v0.1** and ships with synthetic **DEMO DATA** — every publication,
> person, organisation and event in it is fictional. The pipeline is real.

---

## Screenshots

_Placeholder — capture `/`, `/events/[slug]` and the CGI explainer._

| Home | Story page | CGI explainer |
| ---- | ---------- | ------------- |
| `docs/screenshots/home.png` | `docs/screenshots/event.png` | `docs/screenshots/cgi.png` |

---

## Stack

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| Framework | **Next.js 16** (App Router, Turbopack, RSC) | Server components read the DB directly; route handlers expose the API. |
| Language | **TypeScript** (strict) | |
| UI | **React 19**, **Tailwind CSS v4** | Editorial design system, system fonts (hermetic builds), light + dark. |
| Database | **SQLite** via **Drizzle ORM** + `better-sqlite3` | See [decision](#why-sqlite--drizzle-for-v01). Portable schema; Postgres/pgvector is Phase 1. |
| Validation | **Zod v4** | Env, API query/body, ingestion input. |
| Intelligence | Provider abstraction — **mock** (default), Anthropic, OpenAI, OpenAI-compatible | Keyless & deterministic by default. |
| Tests | **Vitest** (unit + integration), **Playwright** (E2E) | |
| Container | **Docker** + **docker-compose** | App image + optional Postgres service. |
| CI | **GitHub Actions** | lint · typecheck · test · build. |

### Why SQLite + Drizzle for v0.1

The master spec recommends PostgreSQL + Prisma. Two deviations, both justified in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md):

- **SQLite instead of Postgres.** DEMO MODE must run with *zero* external services. SQLite gives a
  single-file, dependency-free database that `npm run db:setup` provisions in ~150 ms. The schema is
  written to port cleanly to Postgres, `docker-compose.yml` includes a Postgres service, and
  pgvector-backed search is the documented Phase 1 upgrade behind the existing `SearchService`
  interface.
- **Drizzle instead of Prisma.** At the time of writing, the `prisma` npm `latest` tag points at a
  release candidate whose engine/adapter split is in flux. Drizzle is a mature TypeScript ORM (the
  spec explicitly allows "another mature TypeScript ORM"), has no binary engine or codegen step, and
  keeps migrations as plain SQL we control.

---

## Setup

Requirements: **Node ≥ 20.9**, npm. (Docker optional.)

```bash
npm install
cp .env.example .env        # defaults are fine for demo mode
npm run db:setup            # migrate + seed DEMO DATA
npm run dev                 # http://localhost:3000
```

That's it — no API keys, no database server, no network ingestion required.

### Run command

```bash
npm run db:setup && npm run dev
```

Production:

```bash
npm run build && npm run db:setup && npm start
```

Docker:

```bash
docker compose up --build        # app on :3000, seeded automatically
```

---

## Environment variables

All secrets are read **server-side only** and never exposed to the browser. Full template in
[`.env.example`](.env.example).

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `DATABASE_URL` | `file:./ifa.db` | SQLite file URL. |
| `IFA_DEMO_MODE` | `true` | When true, IFA runs entirely from seed data; shows the DEMO DATA banner. |
| `AI_PROVIDER` | `mock` | `mock` \| `openai` \| `anthropic` \| `openai-compatible`. |
| `AI_API_KEY` | — | Required for any non-mock provider. |
| `AI_BASE_URL` / `AI_MODEL` | — | Override endpoint / model. |
| `INGEST_MAX_BYTES` | `2000000` | Hard cap on ingested feed / body size. |
| `INGEST_ALLOW_PRIVATE_NETWORK` | `false` | Keep false — allows ingestion to reach private IPs. |
| `INGEST_HOST_ALLOWLIST` | — | Comma-separated host allowlist for ingestion. |
| `IFA_WRITE_TOKEN` | — | When set, `POST /api/ingest` and `/analyze` require `Authorization: Bearer <token>`. |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error`. |

Invalid configuration fails fast with a readable message (see `src/lib/env.ts`).

---

## Demo mode

`IFA_DEMO_MODE=true` (the default):

- the application works entirely from seed data;
- no API keys required, no outbound network, no ingestion required;
- a persistent **DEMO DATA** banner marks the instance as synthetic;
- all major UX features remain demonstrable, including the live ingestion pipeline
  (`POST /api/ingest` with `adapter: "manual"`).

---

## Database

```bash
npm run db:generate   # regenerate migration SQL from src/lib/db/schema.ts
npm run db:migrate    # apply pending migrations
npm run db:seed       # load DEMO DATA + run full analysis
npm run db:setup      # migrate + seed
npm run db:reset      # drop the db file and re-migrate
npm run analyze       # recompute independence / corroboration / CGI for all events
```

Migrations live in `drizzle/`. The schema (16 core models + CGI components, corrections and an
ingestion audit log) is in `src/lib/db/schema.ts`.

---

## Testing

```bash
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint (flat config)
npm test                     # vitest: unit + integration
npm run test:unit
npm run test:integration
npm run test:e2e             # playwright (needs: npx playwright install chromium)
npm run verify               # lint + typecheck + test + build
```

Tests are executed, not just written. Coverage includes article normalization, event clustering,
CGI calculation, claim relationships, source independence, API validation, ingestion error handling,
search, SSRF guards, the analysis pipeline, and end-to-end rendering of the home and story pages.

---

## Ingestion

Modular adapters under `src/lib/ingestion/`:

- **`rss/`** — RSS 2.0 / Atom (with an offline `xml` injection path for tests).
- **`manual/`** — an editor pastes a URL + known metadata. No network.
- **`api/`** — generic news-API adapter with a `mapper`, or direct item injection.

Each adapter yields `RawFeedItem`s → the normalizer produces a canonical `Article` → the pipeline
(`src/lib/domain/ingest.ts`) upserts the source, clusters the article into an event, extracts claims
with provenance, detects contradictions, and re-runs analysis.

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{"adapter":"manual","manual":{"url":"https://example.org/a/1","title":"…","content":"…"}}'
```

Ingestion respects `robots.txt` / publisher terms as an operator responsibility, enforces an SSRF
allowlist, and never attempts paywall circumvention.

---

## AI providers

IFA is not hard-coded to any LLM vendor. `src/lib/intelligence/provider.ts` defines the interface
(`generate`, `embed`, `extractClaims`, `summarizeEvent`, `detectContradictions`). Adapters:

- **`mock`** (default) — deterministic, rule-based, keyless. Backs demo mode, development and tests.
- **`anthropic`** — uses `@anthropic-ai/sdk` (an *optional* dependency, loaded lazily).
- **`openai`** / **`openai-compatible`** — uses `openai` (optional, lazy).

To use a real provider: `npm install @anthropic-ai/sdk` (or `openai`), then set `AI_PROVIDER` and
`AI_API_KEY`. Real providers still validate their output and still attach provenance; parse failures
degrade gracefully to the mock.

---

## Methodology

Every number IFA shows is explainable. Full write-up: [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md)
and the in-app [`/methodology`](http://localhost:3000/methodology) page.

### Common Ground Index (CGI)

An **experimental** 0–100 estimate of how far *independently sourced* reporting converges on an
event's core factual claims. It is **not** a truth score and **not** a political-neutrality score.

It starts from a baseline and adds a signed, weighted contribution per component:

| Component | Weight | Direction |
| --------- | -----: | --------- |
| Independent corroboration of core claims | 24 | + |
| Breadth of publications reporting | 7 | + |
| Independence of the source pool | 11 | + |
| Primary-evidence support for core claims | 12 | + |
| Diversity of ownership, type and geography | 7 | + |
| Recency of the latest corroborated update | 4 | + |
| Density of direct contradictions among core claims | 26 | − |
| Share of core claims still unresolved | 19 | − |

Bands: **90–100** very high · **70–89** high · **50–69** mixed · **30–49** substantial disagreement ·
**0–29** very low. Component values are stored per score (`cgi_components`) so the formula can change
without losing history. Every event page shows its exact breakdown.

---

## API

Structured JSON, Zod-validated, structured error bodies (`{ error: { code, message, details }, requestId }`).

| Method & path | |
| ------------- | - |
| `GET /api/health` | database status, version, timestamp |
| `GET /api/events` | `?category&status&topic&sort&limit&offset` |
| `GET /api/events/:id` | full story detail (`:id` = slug or id) |
| `GET /api/events/:id/articles` | coverage + independence report |
| `GET /api/events/:id/claims` | claims + agreement / disagreement partitions |
| `GET /api/events/:id/evidence` | evidence linked to the event |
| `POST /api/events/:id/analyze` | recompute + persist CGI (rate-limited; write-token if configured) |
| `GET /api/sources` / `GET /api/sources/:id` | source directory / profile |
| `GET /api/search` | `?q&type&limit` across events, claims, articles, sources, entities, topics |
| `POST /api/ingest` | run the ingestion pipeline (rate-limited; write-token if configured) |

---

## Security

Implemented from the start (threat model: [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md)):

- environment validation, fail-fast;
- secrets server-side only; `poweredByHeader` off; strict security headers + CSP in `next.config.ts`;
- SSRF protection for ingestion (scheme / credential / port / hostname / DNS-resolution checks,
  private-range blocking, optional host allowlist);
- request-body size limits and JSON content-type enforcement;
- input validation on every endpoint (Zod);
- in-memory rate limiting on write endpoints;
- HTML stripped from all ingested metadata; parameterised queries only (Drizzle);
- no arbitrary shell invocation, no arbitrary file paths.

---

## Observability

Structured JSON logging (`src/lib/logger.ts`) with secret redaction. Logged operations: ingestion,
clustering, AI provider selection, claim extraction, analysis, request completion/failure. Health
endpoint at `GET /api/health`.

---

## Privacy

IFA stores public article metadata, source information and derived analysis. In demo mode it makes no
outbound requests. There is no user tracking and no analytics in this MVP. Any model-generated text
retains references to its source material — IFA never stores a conclusion without provenance.

---

## Limitations

- **Demo data is synthetic.** Scores and relationships illustrate the mechanism, not real events.
- **Heuristic clustering / extraction.** The default mock provider is rule-based; it misses
  paraphrase and implicit claims and can mis-merge stories. A real provider improves recall.
- **CGI weights are hand-set and unvalidated.** The CGI is a starting point for discussion.
- **Single-instance rate limiting** (in-memory) — replace with a shared store before horizontal scaling.
- **Search rebuilds its index per query** — fine at seed scale; Postgres FTS / pgvector is Phase 1.
- **No auth / multi-tenant / RBAC** beyond the optional write token.

---

## Roadmap

Phased plan in [`docs/ROADMAP.md`](docs/ROADMAP.md): foundation → RSS aggregation → story clustering →
claim graph → evidence engine → Common Ground Index → ownership intelligence → personalised analysis
→ realtime monitoring → mobile → public API.

---

## Repository layout

```
src/
  app/                 Next.js routes (pages + /api route handlers)
  components/           editorial UI components
  lib/
    env.ts logger.ts errors.ts http.ts text.ts ui.ts format.ts
    db/                Drizzle schema, client, migrations runner, seed
    domain/            events / sources / claims / analyze / ingest / search / view models
    ingestion/         rss · manual · api adapters, normalizer, SSRF guard
    intelligence/      AIProvider interface, mock + remote providers
    clustering/  independence/  cgi/  search/  nlp/
docs/                  METHODOLOGY · ARCHITECTURE · ROADMAP · THREAT_MODEL
drizzle/               generated migration SQL
scripts/               reset-db · analyze-all
tests/                 unit · integration · e2e · helpers
docker/                Dockerfile
```
