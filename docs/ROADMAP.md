# IFA Roadmap

Phased, each phase building on the last. **Phase 0–5 are substantially present in this MVP**; later
phases are designed-for, not built.

## Phase 0 — Foundation ✅ (this MVP)

- Next.js 16 + TypeScript + Tailwind v4, editorial design system.
- Drizzle schema (16 core models + CGI components, corrections, ingestion log), migrations, seed.
- Env validation, structured logging, structured error responses, security headers, SSRF guard.
- Vitest (unit + integration) and Playwright (E2E), CI workflow, Docker.

## Phase 1 — RSS aggregation 🟡 (adapter built; scheduling + Postgres pending)

- RSS/Atom adapter with SSRF protection and size caps — **done**.
- Scheduled polling of a configured feed list; per-feed dedupe; ingestion-run dashboard.
- Move to PostgreSQL (schema is portable); `PostgresFtsSearch` behind `SearchService`.
- Publisher-terms / robots.txt registry.

## Phase 2 — Story clustering 🟡 (heuristic built)

- Embedding-based candidate retrieval (`AIProvider.embed` + pgvector) with a learned reranker.
- Cluster splitting / merging tools for editors; cluster quality metrics.
- Multilingual clustering (shared entity space).

## Phase 3 — Claim graph 🟡 (relational model + mock extraction built)

- Higher-recall extraction with a real provider; coreference resolution.
- Claim canonicalisation across events; a proper graph store (or `pg` recursive CTEs) for
  `SUPPORTS` / `CONTRADICTS` / `REFINES` / `DUPLICATES` traversal.
- Claim-level subscriptions and diffs.

## Phase 4 — Evidence engine 🟡 (model + linking built)

- Automated primary-source discovery (government / court / filing indexes, research-paper matching).
- Document fetching, hashing, archival snapshots, authenticity checks.
- Fact-check integration as a distinct evidence type.

## Phase 5 — Common Ground Index 🟡 (v0.1 built, explainable)

- Calibration against a labelled corpus; sensitivity analysis on weights.
- `cgi-v0.2` with per-claim rather than per-event convergence; confidence intervals.
- A/B of alternative formulations, all stored side by side.

## Phase 6 — Ownership intelligence

- Source ownership graph; media-ecosystem map; funding and cross-holding data.
- "This story reached you through N independent owners" explainers.

## Phase 7 — Personalised information analysis

- Personal media diet, blind-spot discovery, framing analysis — all opt-in, all local-first.
- Newsletter generation from a watchlist.

## Phase 8 — Realtime monitoring

- Streaming ingestion; live event pages; alerts on new contradictions / corrections / CGI shifts.

## Phase 9 — Mobile application

- Read-optimised native/React Native client over the public API.

## Phase 10 — Public API

- Documented, versioned, rate-limited, keyed public API; researcher and journalist tooling; browser
  extension.

---

## Explicitly out of scope for now

Source ownership graph · media ecosystem map · government document indexing · research paper matching
· fact-check integration · event geolocation · multilingual ingestion (Tamil / Hindi) · translation ·
narrative-evolution view · headline-framing analysis · watchlists · alerts · researcher dashboards ·
browser extension. The data model and module interfaces are shaped to accommodate these later.
