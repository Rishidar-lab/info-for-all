# The IFFA Brief — native, evidence-grounded story explanation

_Ground-Parity Milestone A. Code: `src/lib/brief/`._

## Why

Until this milestone the story page told the reader:

> "IFFA does not write its own prose account — it structures what the sources say…"

That was the wrong product contract. A news-comparison product has to let the
reader **understand the event inside IFFA**, and treat the publisher links as
references / deeper reading — not the primary reading experience.

## What a brief is

```
IFFABrief
  shortVersion   2–4 readable sentences, every fact cited
  keyFacts       ✓ corroborated / attributed facts + official event state
  uncertainties  ? open questions the reporting has not answered
  whyItMatters   → evidence-grounded consequences only
  whatChanged    ↻ what moved since the last snapshot
  disagreements  conflicting values, both kept visible, "best-supported ≠ true"
  references     every source + primary record, with a short excerpt
  withheldReason set when the evidence is too thin for any of the above
```

Each sentence carries a `CitationBinding { sourceIds, claimIds, evidenceIds }`.

## How it is built — deterministic, no LLM

`synthesizeBrief(cluster, articles, { language })` reads only data IFFA already
produced:

- the frozen v0.6 claim engine (`cluster.claims`) — canonical claims, status,
  independent source groups, primary evidence, disputes
- the v0.10 media-landscape layer — coverage, framing, blindspots
- event state, novelty, temporal, local-impact, political-attribution,
  finance-event and sports-event models
- the CAP alert, verbatim, for official warnings

Sentences are assembled from category-aware templates (crisis / politics /
finance / sports) plus the cleaned claim text. Nothing is paraphrased from an
article body; only short, attributed excerpts appear in `references`.

An LLM synthesiser may later be added **behind** this function's signature. The
deterministic path is the product and must always work offline.

## The hallucination firewall — `verifyBrief`

Every factual sentence is re-checked against the evidence it cites:

| check | drop if… |
|---|---|
| claim exists | a cited claim id does not resolve |
| citation exists | no source / claim / record is bound |
| source supports claim | no cited source is in a cited claim's supporters |
| entity names | a proper noun in the sentence is not in the cited source text |
| numbers | a number is not in the cited source text (small day/time tokens excepted) |
| dates | an explicit date is not in the cited source text |
| units | a number+unit pair is not in the cited source text |
| attribution | an attributed claim is rendered as a bare fact, or an allegation is not marked as one |

A sentence that fails **any** check is **dropped**. If the short version ends up
empty the brief is withheld (`NO_VERIFIABLE_SENTENCE`).

Release rule: **the unsupported-factual-sentence rate published to readers is
zero** — by construction, because unverified sentences never render.

## Withholding

A brief is withheld — with a specific reason shown to the reader — when:

- there are 0 articles (`COLLECTING`)
- there is one independent newsroom and no official record, and no substantive
  claim or event state (`NO_INDEPENDENT_COVERAGE`)
- no structured claim / event state / CAP alert could be extracted
  (`INSUFFICIENT_EVIDENCE`)
- nothing survived verification (`NO_VERIFIABLE_SENTENCE`)

A single **official** announcement still supports a brief — "Authority X
announced Y" is directly evidenced.

## English + Tamil

IFFA has no fluent machine translation. The Tamil brief is **not** a translation
of the English prose — it is generated from the **same selected facts**:

1. a fact whose claim has Tamil source text → that Tamil text, cleaned
2. a structured fact (a figure, a closure, an alert) → a Tamil template
3. anything else → the Tamil sentence is dropped

Both briefs keep the same sentence ids and citations, so they are provably about
the same claims and the verifier runs on both unchanged.

## Disagreement UI

When two sources report different values IFFA shows **both**, with publishers and
timestamps, and a "currently best-supported" value chosen by independent-support
count or by treating a later report as an update. "Best-supported" is explicitly
**not** a claim of truth; earlier figures stay on the timeline.

## Perspective Compare (first version)

`buildPerspectiveCompare` contrasts coverage along axes IFFA can evidence: the
shared factual core, Tamil-vs-English emphasis, local-vs-national emphasis, and
what official sources state. It does **not** use a US Left/Center/Right axis.
Political cohorts appear only when observed-alignment calibration and sample
gates are met — they are not yet, so that dimension reports "INSUFFICIENT DATA"
and the language / locality contrasts are shown instead.

## What is NOT claimed

This is Milestone A only. Ground-News-level parity also needs:

- **B** — research-on-demand / URL-to-coverage (a trusted worker; no scraping in
  client JS)
- **C** — mature Perspective Compare with cohort emphasis + omission analysis
- **D** — much larger lawful source / discovery coverage
- **E** — reader personalisation, saved stories, a share-to-IFFA extension
