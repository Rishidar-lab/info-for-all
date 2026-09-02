# IFFA Trend Model (v0.7)

> IFFA does not decide what is true by majority vote. Five copied articles are not five
> independent confirmations. The trend engine ranks *what is changing and consequential* —
> it is separate from, and sits on top of, the frozen v0.6 claim / identity engine.

## What "trending" means

A story trends when several signals move **together**, not when it has the most articles.
The composite score is a **weighted geometric mean** of eight sub-scores, each in `[0, 1]`:

```
trendScore = 100 · Π_i ( subScore_i ^ w_i )        with   Σ w_i = 1
```

Geometric (not arithmetic) so a genuinely weak dimension pulls the whole score down, and a
`geoScore` of 0 — an out-of-scope foreign story — removes the item entirely.

| Factor | Weight | What it measures | Source |
|---|---:|---|---|
| `recency` | 0.14 | minutes since the last *meaningful* update (a report that added a new fact) | `timeline.ts` |
| `velocity` | 0.16 | last-hour independent-family publication rate ÷ prior-6h rate | `velocity.ts` |
| `diversity` | 0.12 | number of independent source families, capped at 6 | `independence/` |
| `geo` | 0.14 | `GEO_WEIGHT`: P0 Tamil Nadu 1.00 · P1 India 0.66 · P2 abroad-relevant 0.40 · out 0 | `domain/geo-tiers.ts` |
| `category` | 0.12 | `CATEGORY_WEIGHT`: crisis 1.00 · politics 0.72 · finance 0.60 · sports 0.42 · other 0.30 · entertainment 0.05 · celebrity 0.02 | `domain/categories.ts` |
| `consequence` | 0.16 | `crisisPriority`/100 + official-alert + ≥3 districts + corroborated | `live/crisis.ts` |
| `novelty` | 0.08 | new-event 1.00 · correction 0.90 · new-fact 0.80 · more-of-same 0.25 · unknown 0.50 | `novelty` in `enrich.ts` |
| `corroboration` | 0.08 | official primary + ≥1 family → 1.00 · ≥3 families → 0.90 · 2 → 0.65 · else 0.20 | — |

All weights live in one place: `src/lib/trends/weights.ts` (`TREND_WEIGHTS`, checked to sum
to 1 at module load and in a test). There are no magic numbers in the scorer.

Every sub-score is stored on `cluster.trendData.trend` and rendered on the event card
("why" panel) and on `/trends`.

## Velocity and the syndication guard

Velocity and diversity count **distinct independent source families**, never raw articles.
Two papers running the same PTI dispatch are one family; a publisher's three follow-ups are
one family. So "40 syndicated copies from one origin" contributes 1, not 40 — enforced by
critical test 10 and `src/lib/independence/`.

`acceleration = (families publishing in the last hour) ÷ (families/hour over the previous 6h)`,
floored so a fresh burst still scores. States: `NEW · RISING · FAST-RISING · STABLE · FADING · RESURGING`.

## Novelty (v0.7 first pass)

Each ingest reads the **previous** snapshot (carried between deploy runs by `actions/cache`).
A current cluster is matched to a prior one by slug or ≥50% shared article IDs, then:

- `firstSeenAt` = min(prior first-seen, earliest article);
- `noveltyClass` — `new-event` (no match), `correction` (a "revised/clarifies/retracts"
  headline after the prior snapshot), `new-fact` (the claim set grew, or the timeline gained
  a new-fact entry, after the prior snapshot), else `more-of-same`;
- with no previous snapshot at all, novelty is honestly `unknown` (score 0.50).

Full semantic novelty scoring is a v0.8 commitment.

## Trending vs Watching

- **Trending** — `trendScore ≥ TREND_MIN (20)` **and** (`≥ 2 independent families` **or** an
  official primary source present), category enabled by default, tier ≠ `out`.
- **Watching** — enough consequence (`consequenceScore ≥ 0.55`) or momentum (state NEW /
  RISING / FAST-RISING) or an active crisis lifecycle, but *not* the independent evidence to
  be called trending. A single local report of a bridge collapse enters Watching, never
  "confirmed crisis".

## Current Situation bar

`Normal / Watch / Elevated / Crisis` for Tamil Nadu and India, **derived from active event
signals only**. A national CAP feed always carries a dozen routine flash-flood watches — that
alone is not "Crisis". The bar reads Crisis only when ≥2 *escalating* severe events (severe
**and** corroborated, or CAP severity Severe/Extreme, or ≥4 districts) are active. It always
lists the events it was derived from. IFFA never invents an alert level.

## Worked example

> **Chennai rainfall intensifies; school closures announced** — trend score 71:
> `+ P0 Tamil Nadu (geo 1.00)  + crisis/flood (category 1.00)`
> `+ 6 independent source families (diversity 1.00)  + publication +4.3× prior rate (velocity 1.00)`
> `+ official confirmation (corroboration 1.00)  + new fact: closures announced (novelty 0.80)`
> `− last meaningful update 40 min ago (recency 0.90)  − some transport reports still single-family (consequence 0.74)`

## What the trend engine never does

- change any claim / identity / clustering decision (it only reads `LiveCluster[]` and adds fields);
- merge two clusters (only the frozen engine merges);
- infer political bias from a difference in coverage;
- present a numeric "probability of truth" — evidence states stay categorical.
