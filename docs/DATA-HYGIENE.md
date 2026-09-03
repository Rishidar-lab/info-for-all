# Data hygiene — fixtures vs. generated output

IFA reads exactly one file at build time for its live edition:
`src/data/generated/live-feed.json`. That file is a **volatile build artefact**,
not source. This document is the rule for keeping it out of version control while
still guaranteeing a deterministic build.

## The two files

| File | Tracked? | Who writes it | Purpose |
|------|----------|---------------|---------|
| `src/data/fixtures/live-feed.seed.json` | **yes** | a human, via `npm run seed:refresh` | Deterministic seed. Guarantees `npm ci && npm run build` works with zero network. Also the dataset the unit tests and the demo build run against. |
| `src/data/generated/live-feed.json` | **no** (gitignored) | `npm run ingest` (and `scripts/prepare-data.ts` as a fallback) | The current snapshot. Overwritten on every ingest. |

`src/data/generated/` keeps a committed `.gitkeep` so the directory always
exists; the JSON inside it never does.

## How it stays deterministic without churn

`scripts/prepare-data.ts` runs automatically before `dev`, `build`, `typecheck`,
`test` and `ingest` (npm `pre*` hooks). It copies the seed into the generated
slot **only when the generated file is missing** — a fresh clone, a cleaned
tree, or a CI cache miss. It never overwrites a snapshot that ingestion just
produced.

Result:

- `git status` stays clean after `npm run ingest`, `npm test`, `npm run build`.
- A fresh clone builds from the committed seed with no network.
- CI restores the previous snapshot from `actions/cache`; on a cache miss it
  falls back to the seed instead of failing.

## Refreshing the seed (deliberate)

```
npm run ingest         # fetch a fresh snapshot into the gitignored slot
npm run seed:refresh   # promote it to src/data/fixtures/live-feed.seed.json
git add src/data/fixtures/live-feed.seed.json && git commit
```

Do this when the feed *shape* changes or the committed demo data has gone stale
— not routinely. `seed:refresh` refuses to write an empty or malformed snapshot.

## Served data shards (v0.11 Phase N)

`scripts/shard-dataset.ts` (`npm run shard`, and in the `prebuild` hook) reads
the enriched `src/data/generated/live-feed.json` and writes small **served**
shards under `public/data/`:

| Shard | Contents | Consumed by |
|---|---|---|
| `meta.json` | generatedAt / health / counts | (available; external) |
| `search/index.json` | one compact row per cluster (~345 KB) | `<Search>` fetches it on mount |
| `index/latest.json` | 763 compact clusters, no framing / evidence-matrix internals | (available; v0.12 list pages) |
| `landscape/latest.json` | India + Tamil Nadu landscape summary | (available; external) |
| `sources/index.json` | per-publisher profile summary | (available; external) |

`live-feed.json` itself is a **build input** — copied from the seed by
`prepare-data`, read during SSG, **never served**. The shards are the served
surface for anything that needs a summary rather than the whole corpus.

`public/data/` is **gitignored** and rebuilt on every `npm run build` /
`npm run shard`. Next copies `public/` into `out/`, so a shard at
`public/data/x.json` is fetchable at `<basePath>/data/x.json`.

## Evaluation outputs

Same principle. `npm run eval:claims` writes a timestamped
`evaluation/reports/run-<ts>.{json,md}` (gitignored) and updates
`evaluation/reports/latest.{json,md}` (tracked — the public
`/methodology/quality` dashboard imports `latest.json`).
