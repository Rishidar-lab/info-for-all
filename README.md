# Info For All (IFA) — India & Tamil Nadu live edition

## What it is

A **crisis-first, evidence-oriented news comparison platform for Tamil Nadu and India.**
The first screen answers: is there an active emergency, where, what does the official alert
say, which independent sources confirm or contextualise it, what remains uncertain, and when
was the information last refreshed.

Scope is exclusive — **primary: Tamil Nadu; secondary: India-wide events that materially
affect Tamil Nadu or carry major national importance.** Generic international news,
entertainment feeds and foreign politics without an India / Tamil Nadu consequence are
filtered out.

## Why

Reading more articles does not create understanding. IFA groups public alerts and reporting
around the same event so a reader can compare them, see where each claim came from, and see
what is still unknown.

## Current MVP

Static Next.js 16 site (no server, no database). Four sections, in editorial order:

1. **Active alerts** — official alerts currently in effect (expired / all-clear excluded).
2. **Tamil Nadu now**
3. **India — major developments**
4. **Coverage comparisons** — clusters with two or more sources.

Language (All / தமிழ் / English), geography (Tamil Nadu / India) and district filters. A
status bar shows LIVE / DEGRADED / STALE, the last successful refresh in IST, and which
feeds failed.

Routes: `/`, `/story/[slug]` (per-cluster comparison), `/sources`, `/about` (methodology),
`/methodology/examples[/…]` (synthetic worked examples, kept fully separate from the live
feed).

## Live ingestion

`scripts/ingest-feeds.ts` → `src/data/generated/live-feed.json`. It:

- fetches configured RSS / Atom / CAP feeds with a 15 s timeout and an identifying UA;
- normalises + sanitises every external string; rejects items without a valid URL or date;
- deduplicates by canonical URL and normalised headline;
- geo-classifies (explainable Tamil Nadu dictionary — 38 districts + state terms + Tamil
  tokens + IMD abbreviations) into `tamil-nadu` / `india` / `india-relevant` / `excluded`;
- detects crisis type deterministically and preserves CAP severity / urgency / certainty
  verbatim;
- ranks 0–100 with a reproducible formula (no opaque AI score);
- clusters deterministically (title tokens + geography + event type + time window);
- retains last-known-good items when a feed fails, and never claims LIVE after a failed run;
- uses **no LLM and no paid API**.

Sources checked reachable from this environment (2026-09-01): NDMA SACHET (CAP JSON + RSS),
ReliefWeb India (UN OCHA), The Hindu (Tamil Nadu + National), NDTV India, Times of India.
PIB is configured but disabled — it returned HTTP 403 (Akamai) here; enable it where
`pib.gov.in` is reachable.

### Evidence labels (no political-orientation ratings)

Role: Official alert · Primary document · Government statement · On-ground report ·
Independent report · Expert analysis · Developing / unverified.
Status: Official primary source · Independently corroborated · Single-source report ·
Developing · Disputed · Unverified.

## Data status

The live sections are built from **public feeds** at the timestamp in the status bar. The
`/methodology/examples` stories are **synthetic** and are never shown as current.

## Run locally

```bash
npm run ingest          # fetch feeds -> src/data/generated/live-feed.json
npm run validate:feed   # sanity-check the generated JSON
npm run build           # static export -> out/
npm run dev             # http://localhost:3000

npm run verify          # lint + typecheck + vitest + build
```

## Deployment

`.github/workflows/deploy-pages.yml` runs every 15 minutes (and on push /
`workflow_dispatch`): restore last-known-good snapshot from cache → ingest → validate →
build static export → deploy to GitHub Pages. The generated JSON is **not** committed; it is
carried between runs via `actions/cache`. Permissions: `contents: read`, `pages: write`,
`id-token: write`.

Live: https://rishidar-lab.github.io/info-for-all/

## Roadmap

1. Add PIB and state-agency feeds where reachable; Tamil-language feeds.
2. CAP polygon / district-centroid mapping.
3. Claim extraction and richer common-ground derivation (human-reviewed).
4. Provenance / evidence graph.
5. A published, versioned, disputable source-classification methodology.

## Not built

Accounts, comments, recommendations, analytics, databases, and any ML / LLM pipeline. The
comparison interface and its honest framing are the product.
