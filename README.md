# Info For All (IFA)

## What it is

IFA is an experimental news-comparison interface designed to show how multiple
sources cover the same underlying event. The central screen is not a list of
articles — it is a single event broken down into:

- **what the sources agree on** (common ground)
- **where their coverage differs** (emphasis and framing, aspect by aspect)
- **source provenance** (editorial perspective and reliability, shown separately,
  with a link out to each publication)

## Why

Reading more articles does not necessarily create understanding. IFA emphasizes
comparison, provenance and visible differences in framing rather than volume.
Neutrality is treated as impossible to claim; transparency — knowing where
information came from, what evidence supports it, and how alternative reporting
differs — is the achievable goal.

## Current MVP

A production-ready static site with four routes:

| Route          | Purpose                                                              |
| -------------- | ------------------------------------------------------------------- |
| `/`            | Homepage — hero, demo notice, story-cluster cards with coverage bars |
| `/story/:slug` | The product page — coverage overview, common ground, where coverage differs, per-source reporting, methodology & limitations |
| `/sources`     | Source directory — publication, perspective, reliability, region, description, website |
| `/about`       | About & methodology — the thesis, the perspective/reliability split, the intended pipeline, limitations |

Coverage model: `left` / `center` / `right` for broad editorial orientation,
kept strictly separate from reliability (`high` / `mixed` / `unknown`). A larger
centre share is never presented as "more accurate".

Every screen carries the demonstration-data disclosure. Unknown story slugs
return a real 404.

## Data status

**DEMONSTRATION DATA.** Every publication, headline, quote, figure, person and
event is synthetic. Publication links point to `.example` domains, which cannot
resolve to a real site. Demonstration stories are written to be realistic and
non-time-sensitive; they are not claims about current events. The dataset lives
in `src/data/demo.ts` and has no dependency on components, so it can be replaced
by a real ingestion/API backend without UI changes.

## Architecture

- **Next.js 16** (App Router, React Server Components, Turbopack) + **TypeScript**
- **Tailwind CSS v4** with a small hand-written design system in
  `src/app/globals.css` ("newsprint × research terminal": editorial serif,
  humanist sans for chrome, mono for metrics; restrained palette; hairline rules)
- Fully static output — the whole site prerenders at build time
  (`○` static + `●` SSG). No database, no runtime services, no API routes.

```
src/
  app/                 # routes: / , /story/[slug] , /sources , /about
  components/
    ifa/               # CoverageBar, StoryClusterCard, badges, DemoNotice
    site-header.tsx    # Info For All · IFA — Home / Sources / Methodology
    site-footer.tsx
  data/demo.ts         # the demonstration dataset + the data model
  lib/
    ifa.ts             # presentation helpers (labels, colours, coverage math)
    format.ts          # cn() + date helpers
tests/unit/demo.test.ts  # dataset-integrity + helper tests (Vitest)
```

### Data model

```ts
type Perspective = "left" | "center" | "right";
type Reliability = "high" | "mixed" | "unknown";

interface Article { id; publication; headline; url; publishedAt; perspective; reliability; excerpt }
interface CoverageDifference { topic; observations: { publication; emphasis }[] }
interface StoryCluster { id; slug; title; summary; category; publishedAt; updatedAt;
  coverage: { left; center; right }; commonFacts: string[];
  coverageDifferences: CoverageDifference[]; articles: Article[] }
interface Source { id; publication; website; perspective; reliability; region; description }
```

## Run locally

```bash
npm run dev        # http://localhost:3000
npm run build      # production build (static export-ready)
npm start          # serve the production build

npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run verify     # lint + typecheck + test + build
```

No environment variables are required.

## Roadmap

1. Legitimate RSS/API ingestion
2. Automated story clustering
3. Claim extraction
4. Provenance / evidence graph
5. Transparent source-classification methodology
6. Classification disputes / corrections
7. Human review
8. Production deployment

Any automated component added along this path must expose uncertainty
(confidence, dissent, unresolved clusters, contested labels) rather than present
classification as objective.

## Note on scope

This MVP intentionally excludes accounts, comments, recommendations, analytics,
databases and any ML/LLM pipeline. The comparison interface and its honest
framing are the product; the pipeline behind it is future work.
