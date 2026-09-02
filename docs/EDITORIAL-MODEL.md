# IFFA Editorial Model (v0.9 — Editorial Intelligence)

> The editorial score is a **ranking score**. It decides how much *prominence* an
> event gets on the IFFA home page. It is **not** a probability that the reporting
> is true, not a reliability rating, and not a political-preference score. A story
> can rank low and be completely true; a story can rank high and still be
> developing, contested, or wrong in its particulars.

v0.8 answered *"what category is this?"*. v0.9 answers a different question:

**"Which events actually deserve prominence for IFFA's mission?"**

IFFA ingests broadly — every item from every healthy feed is normalised,
clustered, classified and kept. It then **displays selectively**: the home page
shows the events that a Tamil Nadu / India reader most needs to see right now,
and everything else remains one click away in *Background / More* and on the
category pages. This document explains how that selection is made and, just as
importantly, what it deliberately does **not** do.

---

## 1. Six things the model is careful **not** to conflate

### classification ≠ importance
`category = politics` does not make an event important, and `category =
other-relevant` does not make it unimportant. A parking-fee revision and a
no-confidence motion are both "politics". A statewide water-supply failure
classified `other-relevant` outranks most of the politics feed. Category is one
weighted input (`categoryPriority`, weight 0.14) among eight — never the verdict.

### trend ≠ truth
The trend engine (`docs/TREND-MODEL.md`) measures *what is changing and being
reported quickly*. Velocity is the acceleration of independent reporting, not a
signal of accuracy. A false rumour can trend. That is why `velocity` carries the
**smallest** editorial weight (0.04) and why a fast-rising item with weak
corroboration is routed to *Watching* ("potentially consequential but not yet
established"), not *Urgent*.

### source count ≠ independent confirmation
Forty newspapers running the same PTI dispatch are **one** independent source
family, not forty confirmations. Every count that feeds the editorial score —
`corroboration`, `localImpact`, the syndication penalty — uses **independent
source families** (`src/lib/trends/independence/`), never raw article counts.
Syndicated copies of one low-consequence dispatch with no independent reporting
are actively suppressed.

### severity ≠ certainty
`severity` describes *how bad the event is if the reports hold* — deaths,
injuries, evacuations, an official emergency declaration. It says nothing about
whether the reports are confirmed. "IMD issues an orange alert" and "flooding has
occurred" are **different evidence states**; a warning is not a realised impact.
The model keeps them separate: a warning contributes through `consequence` and
`categoryPriority`, a realised impact additionally through `localImpact` and
`informationGain`.

### editorial priority ≠ political preference
There are **no** left/right, pro/anti, or government/opposition scores anywhere in
IFFA, and there never will be in this model. Political prominence is driven by
consequence, official action, corroboration and novelty — the same factors as
every other domain. What IFFA *does* measure for politics is **descriptive
coverage symmetry** (`docs`/Phase N): were the claim, the response, the official
record and independent reporting all present? That surfaces information
asymmetry; it does not grade ideology. Source-concentration control
(`MAX_PER_PUBLISHER_TOP`) caps how many of the top slots one publisher can hold —
it is concentration control, not viewpoint balancing, and it never suppresses a
publisher for its politics.

### OTHER_RELEVANT ≠ error
About half of what IFFA ingests classifies as `other-relevant`, and that is
**correct** — it is legitimate general-interest Tamil Nadu and regional news that
simply is not one of the four priority domains (crisis, politics, finance,
sports). v0.9 does **not** try to force that number down by reclassifying those
stories. Instead it de-emphasises them *editorially*: an `other-relevant` event
is capped at the STANDARD band unless it is genuinely consequential and
Tamil-Nadu-local, and most flow to BACKGROUND. Broad ingestion, selective
display — the 52% figure stays honest and the home page stops being dominated by
it.

---

## 2. The score

`computeEditorialPriority()` (`src/lib/editorial/priority.ts`) produces, for every
cluster:

```
{ score: 0–100, band, factors[], penalties[], reasons[], suppressedByRule? }
```

`score` is `100 ·` a **weighted arithmetic mean** of eight factors in `[0,1]`,
minus penalties. All weights are in `src/lib/editorial/weights.ts`, checked to
sum to 1 at module load and in a unit test. There are no magic numbers in the
scorer.

| Factor | Weight | What it measures |
|---|---:|---|
| `geoRelevance` | 0.20 | Tamil Nadu (P0) 1.0 · India (P1) 0.5 · abroad-but-India-relevant 0.28 · out 0 |
| `consequence` | 0.18 | human safety, service disruption, official action, affected-population signal — see §3 |
| `informationGain` | 0.16 | a *new* fact / number / location / official confirmation / correction ≫ "more of the same" |
| `categoryPriority` | 0.14 | crisis 1.0 · politics 0.72 · finance 0.64 · sports 0.52 · other-relevant 0.22 · entertainment/celebrity ≈ 0 |
| `corroboration` | 0.12 | independent source **families** + presence of an official primary source |
| `meaningfulRecency` | 0.10 | minutes since a fact last *changed* — not since a wire copy was re-posted |
| `localImpact` | 0.06 | named affected TN districts / infrastructure / institutions (`src/lib/domain/local-impact.ts`) |
| `velocity` | 0.04 | independent-family publication acceleration — deliberately the smallest lever |

### Penalties (subtracted from the factor sum, 0–1 scale)

| Penalty | Max | When |
|---|---:|---|
| `churn` / `not-developing` | 0.22 | a fresh article that added no information (`rephrasing`); or no new report at all since the last snapshot (`duplicate`, lighter) |
| `staleness` | 0.26 | no meaningful update in > 24 h (0.12 after 12 h) |
| `syndication` | 0.16 | scaled by `syndicated ÷ reports` |
| `generic-cap` | 0.34 | a SACHET-only national CAP watch with a generic title, no named district, one family |
| `headline-only` | 0.09 | a single headline with no excerpt anywhere to assess |
| `weak-evidence` | 0.12 | one source family **and** no official primary |
| `gossip` / `reaction-only` | 0.60 / 0.10 | celebrity / personal-life content; or a pure quip/jibe with no concrete action |

Every factor and every penalty is returned with its value, weight and
contribution. The event card and the `/methodology/quality` dashboard render
them. Nothing about the score is hidden.

---

## 3. The consequence model (Phase I)

`assessConsequence()` (`src/lib/domain/consequence.ts`) is deliberately built to
**resist sensationalism**. A gruesome single-victim crime headline must not
outrank a statewide cyclone warning just because its wording is more vivid.

It scores interpretable signals only, each backed by a phrase in the reporting:

- `humanSafety` — deaths / injuries / people missing / rescue operations
- `serviceDisruption` — schools, transport, power, water named as stopped
- `displacement` — evacuations, relief camps
- `officialEmergencyAction` — an evacuation order, `section 144`, a disaster declaration
- `scale` — districts affected, "lakh/crore/thousands of people"
- `economicImpact` — quantified financial loss, market-wide moves
- `legalElectoralWeight` — a court ruling, legislation, an election result
- `sportsSignificance` — a final / knockout / national-team fixture

Emotional-intensity words (`brutal`, `gruesome`, `horrific`, `chilling`) carry
**zero weight**. An isolated crime with one victim, one family and lurid wording
scores low on every signal above — as it should. A cyclone warning covering six
districts with an evacuation advisory scores high on `scale` and
`officialEmergencyAction` even though its headline is flat.

---

## 4. Bands

The score maps to a band, after hard rules:

| Band | Meaning | Home-page surface |
|---|---|---|
| `URGENT` | major, consequential, verified/new development needing immediate prominence — requires `severe`/`critical` severity **and** real information gain **and** corroboration | the *Urgent* strip (only when justified) |
| `HIGH` | clearly matters now | *Right now* |
| `STANDARD` | relevant, not leading | *Right now* tail / category pages |
| `BACKGROUND` | relevant context, not currently developing | *Background / More*, category pages |
| `SUPPRESSED` | genuine junk only | nowhere on default surfaces; still in the dataset and on `/diagnostics` |

`SUPPRESSED` is a **small** set: celebrity/entertainment, multi-topic digests,
out-of-scope foreign items, and syndicated duplicates of one low-consequence
dispatch. Ordinary not-currently-developing news is `BACKGROUND`, **not**
suppressed — it stays findable. Suppressed items are never deleted; the reason is
recorded (`suppressedByRule`) and visible on `/diagnostics`.

### Urgent / Trending / Watching / Background (Phase J)

- **URGENT** — as above; a verified, consequential, *new* development.
- **TRENDING** (*Right now* / *Fast rising*) — rapid meaningful information growth
  with adequate evidence. Not "freshly published" — *growing*.
- **WATCHING** — potentially consequential but not yet established: an active
  crisis lifecycle, a consequence sub-score ≥ 0.5, or a rising trend state, that
  has **not** cleared the evidence bar for the front strip.
- **BACKGROUND** — everything else relevant.

---

## 5. Why broad ingestion **and** a selective home page

IFFA could raise its "priority-domain %" overnight by dropping the general Tamil
Nadu feeds. It deliberately does not, for three reasons:

1. **Context.** A reader following a political-corruption story is served by also
   seeing the local-government, civic and court news around it — even when those
   items are individually `other-relevant`.
2. **Honesty of the metric.** The 52% `other-relevant` figure is a real
   description of the Tamil Nadu general-news feed mix. Forcing it down by
   reclassification would make IFFA's own quality numbers a lie.
3. **Recall for the priority domains.** Crisis and civic-disruption stories very
   often *first* appear in a general regional feed, not a disaster feed. Dropping
   those feeds would lose early signal.

So the pipeline keeps everything and the **editorial layer** — not the classifier
— decides the front page. That is the core design decision of v0.9.

---

## 6. What this model still cannot do

- It cannot verify a claim. It ranks; the claim/identity engine (frozen, v0.6)
  and the CGI assess evidence.
- `consequence` and `localImpact` are extractive — on a quiet news day they are
  near-dormant, and they depend on the reporting actually stating an impact.
- Secondary-category and political-thread signals are precision-first and will
  miss real cases rather than invent them.
- The weights were set from one v0.8 top-20 audit
  (`evaluation/reports/v0.9-baseline.md`) and a ~30-case editorial-ranking
  corpus. They are a defensible first calibration, not a proven optimum.

Imperfect metrics are kept visible on `/methodology/quality`, never removed.
