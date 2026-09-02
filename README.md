# IFFA — Info Free For All

**See what matters. See what changed. See the evidence.**

Live: **https://rishidar-lab.github.io/info-for-all**
(formerly *Info For All / IFA*; the repository and URL are unchanged.)

## What IFFA is

A **Tamil Nadu-first, India-aware real-time news and current-trend intelligence platform.**
Not a normal news reader — its job is to show *what actually matters right now, what is
changing, what claims are being made, how reliable those claims are, and how the same event
is described across Tamil and English sources.*

IFFA groups reporting into **events**, ranks the events by **what is changing** (not by
publication count), and makes the reasoning visible on every card.

## Geographic focus

- **P0 — Tamil Nadu** (district-level; all 38 districts recognised in English and Tamil script)
- **P1 — India national**
- **P2 — abroad, only when it materially affects Tamil Nadu / India / Indian citizens / the
  economy / markets / foreign policy, or is a major global crisis**

## Category priorities

**Crisis → Politics → Finance → Sports.** Entertainment and celebrity are classified but
**excluded from the default feed** in v0.7 (disabled, not deleted — filterable, and re-enable
is a config change).

## How it works

```
RSS / Atom / official CAP feeds
  → normalise · geo-classify (38 TN districts) · crisis-classify · category-classify
  → deterministic two-pass clustering (lexical, then a conservative semantic gate)
  → grounded claims (corroboration / contradiction / attribution, provenance kept)
  → source-independence analysis (wire credit, syndication, verbatim passage)
  → Trend Intelligence: velocity · novelty · consequence · geo · category → an interpretable score
  → static JSON → Next.js `output: export` → GitHub Pages
```

**No language model in the deployed build. No database. No paid infrastructure.**
`@anthropic-ai/sdk` / `openai` are dormant optional dependencies behind adapters that are
never enabled.

### Event clustering

Two reports join only when time window, geography, event type and either headline overlap or
a structured semantic signature all agree. Neighbouring districts stay distinct; a district
and a city inside it are *part-of*, not *same*. When unsure, IFFA keeps reports apart —
[docs/EVENT-IDENTITY.md](docs/EVENT-IDENTITY.md).

### Source independence

"How many *different* newsrooms actually reported this" — not "how many URLs". Several sites
running one PTI dispatch count as **one** confirmation. `15 reports · 3 independent source
families` — [src/lib/independence/](src/lib/independence/).

### Trend ranking

`trendScore = 100 · Π (subScore_i ^ w_i)` over eight visible factors (recency, velocity,
diversity, geo, category, consequence, novelty, corroboration). Weights in one documented
table; every sub-score shown on the card. [docs/TREND-MODEL.md](docs/TREND-MODEL.md).

### Claims and political allegations

Every claim carries a status (*corroborated / single-source / attributed / disputed /
outdated*) and its provenance. An allegation stays the speaker's claim — "Y alleged that
X…" — and is never promoted to a bare fact unless independent evidence supports it.
"Corroborated" means **≥ 2 independent source families**, never a majority vote.

### Tamil

Tamil is first-class. The original headline, excerpt, entities and source text are kept; an
English semantic representation is added *alongside*, never instead. Tamil ↔ English matches
require a shared district, a compatible date and a shared entity or action — a shared "Tamil
Nadu" alone never merges.

## Routes

`/` (event-first home) · `/crisis` `/politics` `/finance` `/sports` · `/tamil-nadu` `/india`
· `/trends` (leaderboard + weight table) · `/story/[slug]` (timeline, claims, coverage
comparison) · `/sources` · `/about` · `/methodology/quality` · `/methodology/examples` ·
`/diagnostics` (pipeline observability).

## Limitations

- Clustering, geo / category classification and claim extraction are **rule-based and can
  err**. The linked publisher is always authoritative.
- The claim / identity engine's labelled-corpus recall and precision are both 100 % on 223
  cases, but the corpus is small; on live data the engine still holds some genuine matches
  apart (as *uncertain*).
- Novelty tracking is a v0.7 first pass (slug / article-overlap match against the previous
  snapshot); full semantic novelty is v0.8.
- Finance and sports feed coverage is thin — this edition's feeds are Tamil Nadu crisis /
  governance heavy. Candidate official feeds are listed on `/sources`.
- **IFFA is not an emergency service.** For any emergency, follow the issuing authority's own
  instructions.

## Current version

**v0.7 — Trend Intelligence.** Not v1.0: that is reserved for when live sources, the trend
engine, cross-language clustering, crisis mode, political claim provenance, finance and
sports semantics, the mobile UI and production monitoring are all verified in live operation
over time.

## Develop

```
npm install
npm run dev            # local dev (uses the committed demo snapshot)
npm run ingest         # fetch feeds → src/data/generated/live-feed.json (gitignored)
npm run verify         # lint + typecheck + test + build
npm run eval:claims    # claim-quality corpus
npm run eval:identity  # event-identity corpus
npm run quality-gate   # release gates
```

Deployment: GitHub Actions rebuilds and redeploys every 15 minutes (`.github/workflows/`).
Data hygiene: the live snapshot is gitignored and seeded from a committed fixture —
[docs/DATA-HYGIENE.md](docs/DATA-HYGIENE.md).
