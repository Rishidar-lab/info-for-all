# IFFA Media Landscape Intelligence — methodology

*Status: current for v0.10. Companion to `docs/METHODOLOGY.md` (pipeline),
`docs/EDITORIAL-MODEL.md` (ranking) and `docs/EVENT-IDENTITY.md` (clustering).*

IFFA's media-landscape layer answers, for every story: **who is reporting it,
who is not, who owns those sources, how their headlines and framing differ,
which claims the reporting agrees on, which are disputed, and which have
primary-document evidence.** This document states the method and its limits for
each part.

---

## 0. Six things IFFA never conflates

These are non-negotiable and are enforced in the data model and the UI:

1. **BIAS ≠ FALSEHOOD.** A politically aligned article can be entirely accurate;
   a neutral-looking one can be wrong. Media alignment and factual evidence are
   separate fields in the data and separate panels in the UI.
2. **COVERAGE ASYMMETRY ≠ FALSEHOOD.** A blindspot means one group of sources
   covers a story far more than another. It says nothing about whether the story
   is true. Every blindspot description says so.
3. **SOURCE RELIABILITY ≠ ARTICLE TRUTH.** A publisher's track record does not
   decide any individual claim. IFFA-observed reliability signals are inputs to
   context, never to a claim's status.
4. **OFFICIAL SOURCE ≠ AUTOMATIC TRUTH.** A government order or a press release
   is evidence that *the institution stated X* — not that X is objectively true.
5. **FORUM CONSENSUS ≠ EVIDENCE.** A claim repeated across social media, forums
   and video is public discourse, not corroboration. It is never counted as an
   independent factual confirmation.
6. **CORRELATION ≠ EDITORIAL MOTIVE.** Observed coverage patterns describe what
   was *published*. IFFA does not claim to know a newsroom's intent.

---

## 1. Story clustering & full coverage

Unchanged from v0.5–v0.9 — the frozen event-identity engine
(`src/lib/event-identity/`, `docs/EVENT-IDENTITY.md`). Two reports join a cluster
only when entity, geography, event type and time window align. "Full coverage"
is every article in that cluster; IFFA stores only the feed headline, a short
excerpt and metadata, and links to each publisher.

## 2. Source independence

Union-find over article pairs (`src/lib/independence/`). Two publishers running
the same wire copy are **one** independent source family, not two confirmations.
v0.10 adds a corporate-family layer (`src/data/publishers.ts`): publishers with a
shared owner (e.g. The Hindu, BusinessLine and Sportstar under Kasturi & Sons)
are collapsed into one family for every count on the site.

## 3. Ownership

A hand-built registry (`src/data/publishers.ts`) with, per publisher: an
**ownership category** (`INDEPENDENT`, `MEDIA_CONGLOMERATE`, `CORPORATION`,
`GOVERNMENT`, `INDIVIDUAL`, `TRUST_FOUNDATION`, `POLITICAL_ORGANISATION`,
`PUBLIC_BROADCASTER`, `OTHER`, `UNKNOWN`), the owner / parent / ultimate parent,
funding type, and a **provenance** record (source, url, date verified,
confidence).

- Ownership is **metadata**. It is *never* an input to alignment or reliability.
- Every assertion is provenance-backed. Nothing is inferred.
- `UNKNOWN` is valid and is used wherever IFFA cannot verify the fact
  (Puthiyathalaimurai's ultimate ownership, for example, is `UNKNOWN`).

## 4. External bias / factuality ratings

IFFA can display a rating from an external organisation (e.g. a media-bias
monitor) **only** when it is genuinely available, and always **with provider
attribution and the provider's own label reproduced verbatim**. IFFA never
invents an external rating. As of v0.10 no external provider is integrated, so
every publisher shows *"no external rating on record"* — not a guess.

External ratings and IFFA's own observed metrics are kept in **separate,
labelled fields** and are never blended.

## 5. Observed editorial alignment

For each publisher, IFFA reads how its *published coverage* describes tracked
political entities (`src/lib/media-landscape/entities.ts`): supportive,
critical, neutral-descriptive, mixed, or unclear
(`src/lib/media-landscape/stance.ts`, deterministic, exposes the phrases it
read). This is **observed published coverage, not a claim about motive**, and it
is **entity-specific** — there is **no US left/center/right axis**, because
Indian and Tamil Nadu politics is not reducible to that spectrum.

### Sample-size discipline

Alignment is only reported with enough evidence behind it
(`src/lib/media-landscape/alignment.ts`):

| n (evaluable political stories) | band |
|---|---|
| < 20 | **INSUFFICIENT DATA** — no alignment shown |
| 20–49 | low confidence |
| 50–149 | moderate sample |
| ≥ 150 | substantial sample |

These thresholds are documented and adjustable. Every alignment figure ships
with its window, its n and its band. No pseudo-precision.

### Windows and history

The target is rolling 7 / 30 / 90-day windows. Until IFFA has accumulated enough
daily snapshots (`data-history`, `scripts/history-*.ts`), the observed metrics
are **snapshot-scoped** and say so — small samples are indicative, not a
characterisation of the publisher.

## 6. Bias dimensions (separate, never one score)

There is **no single bias score**. Seven dimensions, each exposing its evidence:

1. **Story selection** — how much a source covers an entity/topic relative to
   the cross-source corpus.
2. **Framing divergence** — how far a headline's framing sits from the
   cross-source factual core.
3. **Entity stance** — supportive / critical / neutral / mixed / unclear.
4. **Claim omission** — which widely-corroborated event claims a headline leaves
   out.
5. **Quotation balance** — which actors and institutions are quoted.
6. **Headline sensationalism** — loaded, absolute or emotional language
   (a list of flagged phrases, not a vibe score).
7. **Evidence density** — how many substantive claims have identifiable support.

## 7. Coverage landscape (per story)

`src/lib/media-landscape/coverage.ts` — straight counts over a cluster's
articles: total reports, unique publishers, **independent source families**,
Tamil / English counts, regional vs national, official vs alternative media, and
distributions by ownership category, external-factuality band, language and
locality. A story-level **coverage-alignment bar** is shown only when there is a
defensible grouping; otherwise the UI says **ALIGNMENT DATA INSUFFICIENT** — never
a fake balanced bar.

## 8. Headline comparison

`src/lib/media-landscape/framing.ts` — per headline: emphasis
(government-action, opposition-pressure, measurement-data, human-impact,
accusation, …), stance toward the story's dominant actor, loaded phrases, and
which corroborated claims the headline omits. Plus the **shared factual core**,
the **framing differences** (described neutrally), and **claims unique to one
source**. IFFA never labels a framing "correct".

## 9. Blindspots

`src/lib/media-landscape/blindspot.ts` — five types: `LANGUAGE`, `REGIONAL`,
`OWNERSHIP`, `SOURCE_FAMILY`, `POLITICAL_COVERAGE`. A blindspot fires when one
group covers a story at least 3× more than another (and there are ≥ 4 reports).
Every blindspot's description ends: *"This is a coverage asymmetry, not a
judgement about whether the story is true."*

## 10. Claim evidence matrix

`src/lib/media-landscape/evidence.ts` re-projects the **frozen v0.6 claim
engine** into a per-story matrix. Each claim gets:

- a status: `HIGHLY_CORROBORATED` / `CORROBORATED` / `PARTIALLY_CORROBORATED` /
  `SINGLE_SOURCE` / `DISPUTED` / `UNVERIFIED` / `CORRECTED` / `RETRACTED` /
  `SUPERSEDED`;
- supporting and contradicting articles, and independent-family counts;
- **primary-document** references (`government-order`, `court-judgment`,
  `rbi-release`, `weather-bulletin`, …), each stating *what the document
  establishes* — "the institution stated X", not "X is true";
- fact-check references (when a public fact-checker's verdict matches).

### Evidence Profile

Counts, never "X% true": *N substantive claims — A corroborated, B partial,
C disputed, D unresolved; E independent families; F/N primary-document-supported;
G corrections.*

### Evidence Strength Score

An **optional internal 0–100 ranking**. It exposes every component
(independent corroboration, primary evidence, source reliability, claim
agreement, contradiction penalty, single-source penalty, correction penalty) and
carries the disclaimer *"NOT a probability that the story is true"* wherever it
is stored. It is **never** rendered as "X% true" and will not be until a
calibration study proves it is probabilistically calibrated.

## 11. Fact-check integration

An adapter registry (`src/lib/factcheck/`) for publicly and legally accessible
fact-checking organisations relevant to India. Each stored verdict keeps the
fact-checker, the verdict text, the claim, the date, a methodology reference and
a match confidence. **Government fact-checking is not treated as inherently
authoritative** — it is recorded as one input, attributed.

## 12. Public discourse

`src/lib/discourse/` — a **separate** ingestion path for Reddit, YouTube
metadata/captions, podcasts and public social feeds, using only public,
provider-rules-compliant endpoints (no CAPTCHA / paywall / auth / anti-bot
bypass, no media download or re-hosting). A `DiscourseMention` records the
platform, channel, url, timestamp, public engagement metadata (**never used for
scoring**), text, matched event, extracted claims and stance.

**Discourse never counts as factual corroboration.** A claim seen repeatedly in
discourse but absent from news and primary sources is surfaced as an
**EMERGING / UNVERIFIED PUBLIC CLAIM**, with its mention count and its zero
news/primary count shown side by side.

## 13. Limitations

- Stance and emphasis detection is deterministic and English-first; Tamil and
  Tanglish are handled with lexicons, not full NLP, and are weaker.
- Observed alignment is snapshot-scoped until the history store matures — treat
  small-n figures as indicative only.
- The ownership registry is hand-built; a structure can change between reviews.
- Blindspot thresholds are heuristic and will be tuned against the evaluation
  corpora.
- No external bias-rating provider is integrated yet.
- `live-feed.json` is a build input (not served to browsers) and grows with the
  source count; a future version shards it.
