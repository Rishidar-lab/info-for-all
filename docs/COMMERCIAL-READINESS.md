# Commercial readiness

**Status:** exploratory. IFFA has **no revenue** and this document invents none.
The public reader stays free and useful without payment. What follows is an
honest map of paths that *could* fund the work, each with the experiment that
would validate it before any build.

The through-line: IFFA's asset is not "news" — it is **structured, provenance-kept
evidence about Tamil Nadu / India current events**: event clusters, source-family
independence, claim status, primary-record links, Tamil↔English alignment. That
is more valuable to researchers, newsrooms and monitoring teams than to a casual
reader.

## Guardrails

- Support / sponsorship **never** changes rankings, the editorial score, or which
  stories appear. If that can't be guaranteed, the money isn't taken.
- No paywall on the core reader.
- No selling of personal data (there is none to sell).
- Any paid tier is a *superset* of the free product, not a mutilation of it.

## Candidate models

### 1. Free reader + supporter tier

| | |
|---|---|
| **User** | A regular reader who values the evidence framing and wants it to continue. |
| **Problem solved** | "I want this to exist and stay independent." |
| **Feature needed** | A visible, honest "support the project" link (GitHub Sponsors / a funding page). No feature gating. |
| **Cost driver** | ~zero infra (static hosting); maintainer time. |
| **Pricing variable** | voluntary; suggested ₹100–500 / month. |
| **Validation experiment** | Add the link; measure `partnership_cta` click-through and actual sign-ups over 60 days against unique visitors. |
| **Conversion metric** | supporters / monthly-active-readers (industry reader-revenue benchmark ≈ 0.5–2%). |
| **Revenue formula** | `MRR = supporters × avg_contribution` |

### 2. Researcher / "pro" export

| | |
|---|---|
| **User** | Academics, students, civil-society analysts studying TN/India media. |
| **Problem solved** | "I need the event/claim/coverage data as structured files, not by scraping a website." |
| **Feature needed** | Authenticated export of the shards + a historical archive (JSON/CSV), a documented schema, a stable snapshot cadence. |
| **Cost driver** | archive storage, an auth layer, support. |
| **Pricing variable** | seats; archive depth (30 days vs full history). |
| **Validation experiment** | Publish the schema + a 7-day sample; collect "I would pay for this" expressions of interest from 3+ named research groups before building auth. |
| **Conversion metric** | trials → paid. |
| **Revenue formula** | `MRR = pro_seats × seat_price` |

### 3. Newsroom / research-team intelligence

| | |
|---|---|
| **User** | A Tamil Nadu or national newsroom's desk; a fact-checking unit. |
| **Problem solved** | "Show me, fast: is this claim independently supported? Who else has it? Is there a primary record? Where does the framing split?" |
| **Feature needed** | A team workspace: watchlists by district/topic/politician, alerting on new independent corroboration or a contradiction, a claim-status API. |
| **Cost driver** | alerting infra, per-tenant config, SLAs, support. |
| **Pricing variable** | contracted; number of watch topics; alert volume; API rate. |
| **Validation experiment** | 2–3 unpaid design-partner desks for one news cycle; measure whether the independence + primary-record signal changed an editorial decision. |
| **Conversion metric** | design partners → contracts. |
| **Revenue formula** | `contracted_revenue = Σ (per-team annual contract)` |

### 4. Regional evidence API / data feed

| | |
|---|---|
| **User** | Dashboards, other apps, monitoring vendors that need TN/India event + evidence data. |
| **Problem solved** | "I need a maintained feed of clustered events with independence and claim-status metadata for a region no global vendor covers well." |
| **Feature needed** | A versioned REST/GraphQL API over the existing derived data; rate limits; a licence that permits redistribution of *derived metadata* (not article text). |
| **Cost driver** | a real server (first departure from the zero-infra model — only if demand is proven), API ops. |
| **Pricing variable** | requests/month; historical depth. |
| **Validation experiment** | 2 integration LOIs before standing up any server. |
| **Revenue formula** | `api_revenue = Σ (tier_price × subscribers_in_tier)` |

### 5. Custom monitoring for Tamil Nadu organisations

| | |
|---|---|
| **User** | An NGO, a district body, a research institute tracking a specific issue (floods, a policy, a court matter). |
| **Problem solved** | "Track everything reported on *this*, tell me what's confirmed vs claimed, in Tamil and English, and flag when the official record and the reporting diverge." |
| **Feature needed** | A scoped instance: custom feeds, a topic model, a weekly evidence digest. |
| **Cost driver** | onboarding + a light-touch managed relationship. |
| **Pricing variable** | project scope; digest cadence. |
| **Validation experiment** | one pro-bono engagement; does the weekly digest get read and cited? |
| **Revenue formula** | `project_revenue = Σ (engagement fee)` |

## Blended model (illustrative — no real numbers)

```
MRR = supporters              × supporter_ARPU
    + pro_seats               × seat_ARPU
    + contracted_teams        × team_ARPU
    + api_subscribers         × api_ARPU
```

Every term starts at zero. The order to test them in is roughly 1 → 3 → 2, because
(1) needs no build, (3) validates the core value proposition with real users, and
(2) is the smallest product step once (3) shows the data is wanted.

## What v0.12 already gives a commercial effort

- A stable, documented derived-data schema (the shards + `FeedItem`).
- An evidence model that is **honest about its limits** — the differentiator in
  every pitch above is "we tell you what we *don't* know".
- A measurement foundation ([PRODUCT-METRICS.md](PRODUCT-METRICS.md)) to run the
  validation experiments.
- A licence decision owed by the owner before any of models 2–4 (redistribution
  terms matter). Flagged, not assumed.
