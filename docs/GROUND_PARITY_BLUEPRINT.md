# IFFA Ground-Parity Blueprint

## Goal

IFFA must stop behaving like an annotated RSS feed and become a first-class **news comparison and evidence product**. The reader should be able to understand a story inside IFFA, compare the media landscape, inspect source provenance, see disagreement and blindspots, and only open publishers for verification or deeper reporting.

The design target is functional parity with the core mechanics of Ground News, adapted to Tamil Nadu and India. Do not copy Ground News branding, proprietary data, source code, or exact UI.

## Current gap discovered in the repository

The current story page explicitly says: **“IFFA does not write its own prose account — it structures what the sources say…”**. That is now the wrong product contract. The media-landscape components are useful, but the product still delegates the actual understanding of the event to external publishers.

Current strengths to preserve:

- cross-source event clustering
- Tamil/English semantic identity
- claim extraction and provenance
- source-family independence
- media landscape and ownership metadata
- blindspot gating
- evidence matrix
- headline comparison
- trend/novelty/event-state logic
- static sharding and GitHub Pages deployment
- source and quality dashboards

## Functional parity matrix

| Capability | Ground-style target | IFFA target |
|---|---|---|
| Story clustering | Many articles -> one story | Preserve and improve |
| Story summary | Native neutral summary | **IFFA Brief**, fully cited |
| Full coverage | All sources in one story | Keep, improve filtering/sorting |
| Bias distribution | Publisher political distribution | India/TN observed alignment, sample-gated |
| Bias comparison summary | Cross-spectrum framing summary | **Perspective Compare** using evidence-grounded framing |
| Factuality | Publisher historical rating | External factuality when available + IFFA observed reliability, never article truth |
| Ownership | Publisher ownership category | Provenance-backed ownership graph |
| Blindspots | Lopsided coverage | Political, language, regional, ownership, source-family blindspots |
| Headline comparison | Compare framing | Preserve and improve shared-core / unique-emphasis analysis |
| Search | Query or paste URL -> story coverage | Query/URL -> event research + brief + full coverage |
| Source filters | Bias, factuality, ownership, locality, paywall | Alignment, reliability, ownership, locality, language, paywall |
| Source profiles | Publisher metadata and ratings | Historical observed alignment, ownership, correction/evidence stats |
| Alternative media | Podcasts/YouTube/livestream clips | Tamil YouTube/news video + Reddit/podcasts, kept separate from factual corroboration |
| Personal news diet | My News Bias | Later: My Media Diet |
| Global coverage | Geography view | Tamil Nadu district/language coverage map and India view |
| Browser extension | Any article -> full coverage | Later: URL-to-IFFA extension |
| Claim evidence | Limited in Ground | **IFFA differentiator: atomic claim ledger + primary evidence** |

## Product contract

Every major story page must answer these questions before the user leaves IFFA:

1. What happened?
2. What are the best-supported facts?
3. What remains disputed or unknown?
4. What changed since the previous update?
5. How many independent source families cover it?
6. How are Tamil and English outlets framing it differently?
7. What do relevant political/media groupings emphasize differently?
8. What primary documents exist?
9. Which claims are only single-source or copied from a common origin?
10. Which publishers own the reporting outlets?
11. Is the story under-covered in a language, region, or media cohort?
12. What are public-discourse sources saying, clearly separated from evidence?

## P0: Native IFFA Brief

Create a native, readable, evidence-grounded story explanation. This is the first missing layer.

### Data model

```ts
type CitationBinding = {
  sourceIds: string[];
  claimIds: string[];
  evidenceIds: string[];
};

type BriefSentence = {
  id: string;
  text: string;
  citations: CitationBinding;
  support: "STRONG" | "MODERATE" | "LIMITED" | "DISPUTED";
};

type IFFABrief = {
  eventId: string;
  generatedAt: string;
  language: "en" | "ta";
  shortVersion: BriefSentence[];
  keyFacts: BriefSentence[];
  uncertainties: BriefSentence[];
  whyItMatters: BriefSentence[];
  disagreements: Array<{
    topic: string;
    positions: Array<{ value: string; sourceIds: string[] }>;
    bestSupported?: string;
    reasoning?: string;
  }>;
  whatChanged: BriefSentence[];
  references: string[];
  withheldReason?: string;
};
```

### Rules

- Every factual sentence must bind to claims and sources.
- Unsupported sentences must be rejected before publication.
- Numbers, dates, units, names and locations must be structurally validated.
- If evidence is insufficient, render **Brief unavailable / insufficient coverage**.
- Tamil and English briefs must be generated from the same canonical claim graph.
- Do not copy article paragraphs. Synthesis must be original and source-grounded.

### Story-page hierarchy

1. Headline, location, time, category
2. **IFFA Brief**
3. Coverage bar and source count
4. Perspective comparison
5. Evidence profile
6. What changed
7. Blindspots
8. Headline comparison
9. Full coverage
10. Timeline
11. Primary records
12. Public discourse

Remove the current product statement saying IFFA does not write a prose account. Replace it with an evidence-grounding statement.

## P0: Research-on-demand

The static frontend must never scrape arbitrary sites directly. Add a trusted research pipeline.

### Modes

- `DISCOVERY`: existing feeds/search indexes
- `STANDARD`: cross-language search + primary-source search + multiple independent publishers
- `DEEP`: crisis/politics/finance/high-disagreement events; adds fact checks, counterclaims, background and public discourse

### Trigger conditions

- user pastes a URL
- user searches a topic with weak existing coverage
- important story has <3 independent source families
- a major numeric disagreement appears
- primary evidence is missing
- story becomes urgent / fast-rising / crisis
- user requests `Refresh coverage`

### Architecture

```text
User / scheduled trigger
        |
        v
ResearchJob queue
        |
        +-- Tamil queries
        +-- English queries
        +-- primary-source queries
        +-- fact-check queries
        +-- counter-coverage queries
        +-- alternative-media discovery
        |
        v
Candidate URLs / metadata
        |
        v
Safe fetch + metadata extraction
        |
        v
Claim extraction / entity / time / quantity
        |
        v
Event matching + source-family dedupe
        |
        v
Claim ledger / evidence graph
        |
        v
Brief synthesizer + verifier
        |
        v
Cached static research snapshot
```

### Safe fetching

Do not bypass paywalls, authentication, CAPTCHAs, robots restrictions, Cloudflare/Akamai, or rate limits. Block private IP ranges, localhost, file schemes and non-HTTP(S) URLs to prevent SSRF.

## P0: Perspective Compare

Ground's differentiating interaction is not merely a bias bar; it gives the reader a digest of how different groups cover the same story. IFFA needs an India-specific equivalent.

Create a `PerspectiveCompare` structure:

```ts
type PerspectiveCompare = {
  sharedFactualCore: string[];
  tamilMediaEmphasis: string[];
  englishMediaEmphasis: string[];
  officialSourcesEmphasis: string[];
  localMediaEmphasis: string[];
  nationalMediaEmphasis: string[];
  politicalCohorts?: Array<{
    cohort: string;
    sampleSize: number;
    emphasis: string[];
    omittedCorroboratedClaims: string[];
  }>;
  insufficientDataReasons: string[];
};
```

Political cohorts may only be shown when alignment calibration and sample-size gates are met. Do not map Indian outlets mechanically to the US Left/Center/Right axis.

## P0: Coverage statistics that are useful, not decorative

For every story show:

- total articles
- unique publishers
- independent source families
- Tamil / English counts
- local / Tamil Nadu / national counts
- ownership distribution
- paywall distribution
- source reliability distribution where qualified
- official / primary-document count
- fact-check count
- copied/syndicated count
- claim-status distribution

Do not display a generic percentage as “truth”.

## P0: Full Coverage UX

Current Full Coverage must become a serious comparison tool.

Sort by:

- Latest
- Oldest
- Independent first
- Source reliability
- Ownership
- Locality
- Language

Filters:

- Tamil / English
- Official / news / fact-check / alternative media
- local / Tamil Nadu / national
- ownership category
- source family
- paywall
- alignment only when qualified

Every row should show source, headline, time, language, locality, ownership, source family, reliability metadata, stance/framing, syndication/origin and `Read original`.

## P0: URL-to-coverage

Search must accept either text or a news URL.

URL flow:

1. normalize URL and identify publisher
2. retrieve legal metadata if possible
3. infer title/entities/event
4. search existing corpus
5. research other sources if needed
6. match primary records
7. build/refresh event cluster
8. render IFFA Brief + Full Coverage + Evidence + Perspective Compare

If original URL cannot be fetched, use discoverable title/slug/publisher metadata and search the event elsewhere. Never bypass protections.

## P1: Source-scale strategy

The current ~30-40 healthy-source level is not sufficient for strong media-landscape statistics. Source scale must come from **discovery breadth**, not aggressive scraping.

Separate discovery from enrichment:

```ts
type ArticleCandidate = {
  url: string;
  title?: string;
  publisher?: string;
  publishedAt?: string;
  language?: string;
  snippet?: string;
  discoveryOrigin: string;
};
```

Adapters should support lawful/public mechanisms such as direct RSS/Atom, official APIs/JSON, public sitemaps, GDELT-like discovery when useful, publisher search, fact-check feeds, YouTube metadata and podcast RSS. Discovery service is not the publisher.

## P1: Tamil Nadu parity advantage

IFFA should not imitate Ground's US political model. Its defensible moat is local/language coverage.

Add:

- Tamil vs English coverage asymmetry
- district coverage asymmetry
- Tamil-only emerging stories
- local-first story detection
- district administrations / Tamil Nadu government / IMD / transport / public-safety primary records
- Tamil native summary and headline comparison
- Tamil publisher/source profiles

The home page should surface a visible `Tamil media saw this first` or `Predominantly Tamil-language coverage` badge only when calculated from sufficient evidence.

## P1: Ownership and reliability

Ownership must be provenance-backed. Unknown is preferable to inference.

Reliability must be split into:

- external ratings with provider attribution
- IFFA observed metrics

Observed metrics can include correction behavior, attribution quality, primary-source usage, unsupported-claim rate, and historical contradiction rate, but only after enough data accumulates.

Source reliability is not article truth.

## P1: Blindspot engine

Blindspots should be categorized:

- political coverage asymmetry
- language blindspot
- regional blindspot
- ownership concentration
- source-family concentration

Use `INSUFFICIENT_COVERAGE`, `POSSIBLE_ASYMMETRY`, `CLEAR_ASYMMETRY`. Do not make strong claims from tiny samples.

## P1: Alternative media

Add Tamil YouTube/news video as a meaningful layer. Classify:

- NEWS_REPORT
- INTERVIEW
- DEBATE
- COMMENTARY
- LIVESTREAM
- SHORT
- UNKNOWN

Publisher-produced news video can contribute to coverage analysis. Commentary/creator content stays in Public Discourse unless separately corroborated. Views/likes/comments never count as evidence.

## P2: Personal media diet

After story parity is strong, add a local-first equivalent of My News Bias:

- sources read
- ownership mix
- language mix
- local/national mix
- qualified alignment mix
- blindspot exposure
- factuality/reliability mix

This requires user state and is not a P0 blocker.

## UI redesign target

The product should no longer resemble a two-column static feed.

### Home story card

```text
[category] [Tamil Nadu] Updated 8m
Story headline
2-3 sentence IFFA micro-brief

24 sources | 11 independent families
Tamil 15 | English 9

Coverage distribution / alignment when qualified
Evidence: 7 corroborated | 1 disputed | 2 unresolved
Blindspot: language asymmetry

[Read IFFA Brief] [Compare 24 sources]
```

### Story top section

```text
Headline
IFFA BRIEF
2-4 paragraph cited summary

KEY FACTS      UNCERTAIN      WHAT CHANGED

24 SOURCES | 11 FAMILIES | 3 PRIMARY RECORDS

COVERAGE DISTRIBUTION

[Perspective Compare] [Evidence] [Full Coverage]
```

The information hierarchy must make the native explanation the dominant content, not the publisher links.

## Build sequence

### Milestone A — Native comprehension

1. `src/lib/brief/*` data model and deterministic synthesizer
2. claim-to-sentence citation binding
3. summary verifier
4. native English brief
5. native Tamil brief
6. story page redesign
7. micro-summary on home cards
8. tests for unsupported claims, number/date/location drift

Release gate: a tester can understand 5 real stories without leaving IFFA.

### Milestone B — Research engine

1. `src/lib/research/*`
2. query generation EN/TA
3. safe fetch policy
4. discovery adapters
5. primary-source hunting
6. URL input
7. research caching
8. research diagnostics

Release gate: paste a URL and obtain a useful existing/enriched story cluster without unsafe scraping.

### Milestone C — Perspective parity

1. shared factual core
2. cohort emphasis summaries
3. omission analysis
4. stronger Full Coverage filters
5. coverage bar redesign
6. qualified alignment explanation

Release gate: 5 real multi-source stories clearly show how coverage differs.

### Milestone D — scale and local moat

1. expand healthy source/discovery coverage
2. Tamil publisher and YouTube discovery
3. district primary sources
4. local/language blindspots
5. coverage-depth gates

### Milestone E — reader product

1. saved stories
2. followed topics/sources
3. My Media Diet
4. browser extension / share-to-IFFA
5. notification/watch lists

## Evaluation gates

Add new corpora and metrics:

- brief factual support
- citation correctness
- unsupported-sentence rate
- number/date/location preservation
- Tamil-English factual parity
- shared-core accuracy
- framing/perspective accuracy
- URL-to-event matching
- research source-family diversity
- research blocked/rejected counts

Critical release rule: **unsupported factual sentence rate must be zero on the validated brief gold set**. Also measure recall so the system cannot pass by emitting empty summaries.

## Architecture constraint

The current Next.js static export / GitHub Pages architecture can continue for the reader surface and scheduled snapshots. True on-demand research requires a trusted worker/serverless component because arbitrary web retrieval must not run in client JavaScript. Keep the frontend static if desired, but introduce a separate research worker or queue whose outputs are committed/published as safe static shards.

## Immediate next action for Claude Code

1. Read this blueprint and current v0.11 completion report.
2. Audit 20 current live story pages.
3. Calculate how many have a native explanatory summary. Expect near zero.
4. Identify which article records contain enough excerpt/claim data for a deterministic brief.
5. Implement Milestone A completely before adding more UI statistics.
6. Do not claim Ground-level parity until real live stories satisfy the release gates.

## Product definition of done

IFFA reaches “Ground News-level product” status only when a random user can:

- open IFFA first, not a publisher;
- understand a current story natively;
- inspect a compact multi-source summary;
- compare the media landscape;
- see meaningful coverage asymmetry;
- filter and compare sources;
- inspect ownership and reliability metadata;
- see claim-level evidence and primary documents;
- paste an article URL and find broader coverage;
- understand Tamil-vs-English and local-vs-national differences;
- trace every synthesized fact to references.

The source links should feel like footnotes and deeper reading, not the product itself.
