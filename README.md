# IFFA — Info Free For All

**See what matters. See what changed. See the evidence.**

Live: **https://rishidar-lab.github.io/info-for-all**
(formerly *Info For All / IFA*; the repository and URL are unchanged.)

**Current version: v0.8 — Live Signal Intelligence.** v0.8 made the v0.7 event/trend
architecture genuinely useful against live Tamil Nadu + India news: a multi-signal category
classifier (OTHER_RELEVANT 77% → ~51%, Tamil headlines now classified), +8 live finance/sports
feeds, claim-aware novelty, evidence-aware event severity, domain specialists wired into event
clustering, 5-state source health, and a real browser E2E suite. The v0.6 claim/identity
engine is byte-unchanged — its corpus numbers (222/223, 0/71) hold.

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

### Category classification (v0.8)

A deterministic multi-signal classifier — headline + excerpt + an English gloss of Tamil +
extracted entities + semantic concepts + finance instruments + sports competitions + a
"government actor takes a governance action" pattern + casualty-count detection. Returns a
primary category, a confidence CLASS (STRONG/MODERATE/WEAK/UNKNOWN — not a probability), the
signals that matched, and the runners-up. Measured against 114 hand-labelled real headlines
(`npm run eval:category`): honest first-pass 91%, ~99% after principled tuning.

### Trend ranking

`trendScore = 100 · Π (subScore_i ^ w_i)` over eight visible factors (recency, velocity,
diversity, geo, category, consequence, novelty, corroboration). Weights in one documented
table; every sub-score shown on the card. [docs/TREND-MODEL.md](docs/TREND-MODEL.md).

### Novelty & severity (v0.8)

Claim-aware novelty compares the *factual units* between snapshots — a headline rewrite scores
~0.15, an official confirmation ~0.85, a corrected toll ~0.9 — and classifies the update
(duplicate / new-fact / new-number / new-official-confirmation / correction / retraction / …).
Event **severity** (informational → watch → significant → severe → critical) is derived from
casualty counts, CAP severity and confirmed impact — it is *how bad the event is*, never a
statement about whether the reports are true.

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
- The classifier is keyword + signal based and can err. ~51% of events are "other-relevant"
  (genuine general / regional news with no crisis / politics / finance / sports angle);
  secondary-category detection is weak (~15% recall) — a v0.9 target.
- Novelty compares snapshots and can miss a fact expressed only in prose; on the very first
  ingest it is honestly "unknown".
- Sports and finance live volume is now real (~20 / ~15 clusters) but still smaller than
  crisis + politics — this edition's feeds are Tamil Nadu heavy.
- PWA: installable, offline shell + cached-snapshot fallback (it never claims cached data is
  live). Background sync is not implemented.
- **IFFA is not an emergency service.** For any emergency, follow the issuing authority's own
  instructions.

## Not v1.0 yet

v1.0 is reserved for when live sources, the trend engine, cross-language clustering, crisis
mode, political claim provenance, finance and sports semantics, the mobile UI and production
monitoring are all verified in *live* operation over time.

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
