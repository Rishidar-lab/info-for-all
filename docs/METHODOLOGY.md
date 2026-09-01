# IFA Methodology

IFA is designed to encourage verification rather than demand trust. This document states the method —
**and its weaknesses** — for each stage of the pipeline. Nothing here is hidden or hand-waved.

The in-app `/methodology` page is a condensed version of this document generated from the live
weight table.

---

## 0. Principle

IFA distinguishes:

- **factual convergence** — independent sources agree on a checkable claim;
- **narrative agreement** — sources tell a similar story but without independent confirmation;
- **ideological framing** — the same facts, presented to different ends;
- **disputed interpretation** — sources draw incompatible conclusions from shared facts;
- **uncertain information** — not enough is known yet;
- **unsupported claims** — asserted without evidence.

Only the first is what the Common Ground Index tries to measure. IFA never collapses the others into
a single "balance" number, and never assigns political-bias scores to sources.

---

## 1. Article ingestion & normalization

**Method.** Adapters (`rss`, `manual`, `api`) yield `RawFeedItem`s. The normalizer:

- strips all HTML from title / summary / content and decodes a small set of entities;
- canonicalises the URL — lowercases the host, drops `www.`, removes tracking parameters
  (`utm_*`, `fbclid`, `gclid`, …) and fragments, sorts remaining params, trims trailing slashes;
- derives the source domain and a stable de-duplication key from the canonical URL;
- parses the publication date, falling back to "now" for missing or implausibly-future dates;
- clamps field lengths.

**Weaknesses.** Canonicalisation is rule-based and will not catch every duplicate (e.g. AMP vs
canonical, mobile subdomains). Date parsing trusts the feed. No language detection beyond the
declared value.

---

## 2. Story clustering

**Method.** `HeuristicClustering` scores an incoming article against each candidate event with a
weighted blend:

| Signal | Weight |
| ------ | -----: |
| Title content-token overlap (Jaccard) | 0.40 |
| Named-entity overlap (Jaccard) | 0.35 |
| Body keyword similarity (cosine over term frequencies) | 0.15 |
| Temporal proximity (`exp(-Δhours / 72)`) | 0.10 |

The article joins the best-matching event when the blended score ≥ **0.38** *and* it either shares
an entity with that event or has a title Jaccard ≥ 0.5. Otherwise a new event is created. Temporal
proximity alone can never cause a merge.

**Weaknesses.** Lexical/heuristic clustering mislabels heavily rewritten headlines, can merge
distinct sub-stories of one running topic, and is sensitive to the small entity extractor. It is a
replaceable module (`ClusteringService`); an embedding-based candidate retrieval + learned reranker
is the planned upgrade.

---

## 3. Claim extraction

**Method (mock provider).** Deterministic and rule-based:

1. split content into paragraphs, then sentences (abbreviation-aware);
2. keep sentences that look claim-like — contain a figure, a quotation, an attribution cue
   (`said`, `according to`, …) or a multi-word proper noun, and are 6–60 tokens long;
3. classify by type: `statistic`, `attribution`, `official_statement`, `prediction`, `allegation`,
   `opinion`, `historical`, or `observation`;
4. assign an extraction-confidence heuristic (base 0.55 ± signals; clamped 0.30–0.95);
5. record provenance — the source article and the **paragraph index**.

Each claim keeps `normalizedMeaning` (sorted content tokens) for corroboration / de-duplication.

**Method (real providers).** The LLM is asked for a JSON array of claims constrained to the same
schema. Output is validated; type falls back to `observation`; provenance and entities are enriched
from the deterministic pass; any failure degrades to the mock. Model output is treated as a lead to
verify, not as fact.

**Weaknesses.** The rule-based extractor misses paraphrase, implicit claims, and anything requiring
coreference resolution. It over-extracts from quote-heavy copy. Confidence is a heuristic, not a
calibrated probability.

---

## 4. Corroboration

**Method.** Claims are grouped as "the same claim" when their `normalizedMeaning` Jaccard ≥ 0.60 or
an explicit `DUPLICATES` edge links them. `SUPPORTS` / `REFINES` edges relate *distinct* claims and
deliberately do **not** merge them.

A claim group is credited with **one point of corroboration per independent source cluster** that
either:

- authored a claim in the group, **or**
- published an article whose text lexically entails the group's strongest *factual* claim
  (≥ 70 % of that claim's content tokens present in the article body; fact-type claims only).

**Weaknesses.** Lexical entailment is a crude proxy for "this source reports this fact" and can be
fooled by an article that quotes a claim in order to dispute it. The 0.60 grouping threshold is
tuned against demo data.

---

## 5. Contradiction detection

**Method.** Claim pairs that share an entity or wording are checked for:

- **negation mismatch** — one asserts what the other denies (`not`, `denied`, `rejected`, …);
- **scope conflict** — one says `all` / `every` / `blanket`, the other `only` / `high-risk` /
  `limited to` about overlapping entities;
- **numeric conflict** — two `statistic` claims give materially different first figures.

Detected conflicts are stored as `CONTRADICTS` edges with a confidence and a short rationale. Other
relationship types (`SUPPORTS`, `REFINES`, `DUPLICATES`) are also emitted.

**IFA does not automatically decide which side is correct.** The event page shows both statements and
their evidence side by side. A claim touched by a contradiction is marked `DISPUTED`.

**Weaknesses.** Purely lexical. Misses semantic contradictions with no shared wording; can
false-positive on quotation and hypotheticals. Confidence is heuristic.

---

## 6. Source independence

**Method.** Ten outlets reprinting one wire dispatch are not ten independent confirmations. Articles
are collapsed into independent clusters (union-find) when they:

- share an ownership group / parent company, **or**
- carry the same wire service (or the same `syndicatedFromSourceId`), **or**
- have near-duplicate body text (5-gram shingle Jaccard > 0.82).

Outputs: the count of independent clusters, an independence ratio, per-article discount weights
(`1 / clusterSize`), and the list of ownership groups present. These feed the CGI.

**Weaknesses.** Ownership data is only as good as the `sources` table. Cross-ownership editorial
independence (or lack of it) is not modelled. Text-similarity threshold is fixed.

---

## 7. Evidence hierarchy

**Method.** Evidence has a type and an `isPrimary` flag. Primary sources — legislation, official
statements, transcripts, filings, datasets, public records — are surfaced separately from journalism
and visually distinguished in the UI.

For **scoring**, a stricter "strong primary" set is used: `primary_document`, `official_statement`,
`public_record`, `dataset`, `transcript`. A **not-yet-peer-reviewed research paper** counts as
primary *provenance* (and is shown as such) but **not** as authoritative confirmation, so it does not
lift the CGI's primary-evidence component or move a claim to `CONFIRMED`.

Claim ↔ evidence links carry a stance: `supports`, `contradicts`, `contextualizes`.

**Weaknesses.** "Primary" is a coarse binary. Document authenticity is asserted, not verified;
`contentHash` / `archiveUrl` fields exist for a future verification step.

---

## 8. Information status

Derived per claim after analysis (manual `RETRACTED` / `OUTDATED` are preserved):

| Condition | Status |
| --------- | ------ |
| a contradiction touches the claim and it has ≥ 1 corroboration | `DISPUTED` |
| uncontradicted, backed by strong primary evidence, ≥ 1 corroboration | `CONFIRMED` |
| ≥ 3 independent corroborating sources | `CORROBORATED` |
| exactly 2 | `PARTIALLY_CORROBORATED` |
| ≤ 1, event still developing | `DEVELOPING` |
| otherwise | `UNVERIFIED` |

Visual indicators are restrained. IFA never presents an uncertain claim with the styling of a
confirmed one.

---

## 9. Common Ground Index (`cgi-v0.1`)

An **experimental** 0–100 measure of factual convergence on an event's **core** (key) claims.
Explicitly **not** a truth score and **not** a political-neutrality score.

```
score = clamp(
  BASE(36)
  + 24 · (share of core claims corroborated by ≥ 2 independent sources)
  +  7 · min(1, log10(articles + 1) / log10(25))
  + 11 · (independent sources / total articles)
  + 12 · (share of core claims with strong primary evidence)
  +  7 · avg(ownershipGroups/6, sourceTypes/4, countries/5, each capped at 1)
  +  4 · exp(-hoursSinceLastUpdate / 168)
  - 26 · min(1, contradiction pairs among core claims / core-claim count)
  - 19 · (share of core claims that are DISPUTED / UNVERIFIED / DEVELOPING),
  0, 100)
```

Each term is stored as a `cgi_components` row with its raw value, weight, signed contribution and a
templated explanation containing the actual numbers. Bands: 90–100 very high · 70–89 high ·
50–69 mixed · 30–49 substantial disagreement · 0–29 very low.

**Weaknesses.** The weights and the baseline are **hand-set and unvalidated**. There is no ground
truth to calibrate against. The score is sensitive to which claims an editor / extractor marks as
"key". The CGI is a conversation-starter, not a settled metric — treat the *component breakdown* as
the real output and the single number as a rough summary.

---

## 10. Uncertainty surfacing

"What we don't know yet" is generated, not optional. It lists: core claims with no primary document,
claims resting on a single or anonymous source, active disputes, still-developing events, and
single-source claims. The CGI narrative separately calls out claims that rest on one anonymous source.

---

## 11. Provenance & AI limitations

Every AI-generated artefact (event summary, extracted claim, detected contradiction) keeps references
to the material it was produced from — article IDs for summaries, article + paragraph for claims.
IFA never stores a conclusion without its provenance. The mock provider is a rule engine, not a
model; a configured model provider is more capable but its output is still validated, still carries
provenance, and is still framed as something to check rather than something to trust.
