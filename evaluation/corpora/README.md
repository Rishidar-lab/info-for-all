# evaluation/corpora — calibration corpora (v0.11)

These corpora measure the media-landscape layer's derived signals. They did not
exist before v0.11; the layer shipped in v0.10 **without a benchmark**, and this
directory is the start of fixing that.

## Status — first-pass, NOT yet human-verified

| Corpus | Target | This cycle | `humanVerified` |
|---|---:|---:|---|
| `stance-gold.json` | ≥ 300 | ~60 | `false` on every entry |
| `framing-gold.json` | ≥ 200 comparisons | ~30 | `false` |
| `evidence-gold.json` | ≥ 200 claims | ~40 | `false` |

**Every label in these files was produced by a first-pass reading against the
definitions below, not by a second human.** The eval scripts (`npm run
eval:stance` / `eval:framing` / `eval:evidence`) therefore report metrics **vs a
first-pass corpus** — they are *indicative*, not a validated accuracy claim. The
directive's rule "do not fabricate labels automatically then evaluate the system
against its own labels" is respected by (a) labelling from the full text with
explicit definitions and recorded rationale, (b) marking every borderline case,
(c) `humanVerified: false` on all entries so a reviewer can accept/reject each,
and (d) never presenting the numbers as a v1.0 gate.

## Stance labels (`stance-gold.json`)

Stance is **how the reporting describes a named entity in one article** — not a
bias score, not a motive claim.

| Label | Definition |
|---|---|
| `SUPPORTIVE` | explicit positive evaluation or advocacy toward the target entity/action |
| `CRITICAL` | explicit criticism, negative evaluation, or adversarial framing |
| `NEUTRAL_DESCRIPTIVE` | primarily reports an event/fact without strong evaluative positioning |
| `MIXED` | substantive positive **and** negative framing both occur |
| `UNCLEAR` | insufficient evidence or genuine ambiguity |

**Quoting criticism ≠ the publisher is critical.** Each entry records
`authorStance` (the article's own framing) and, when a quoted actor's stance
differs, `quotedStance` separately.

## Framing labels (`framing-gold.json`)

For a cross-source set on one event, which aspect each headline **emphasises**
(not intent): `government_action`, `opposition_response`, `human_impact`,
`economic_impact`, `legal_context`, `conflict`, `measurement_data`,
`historical_context`, `personalisation`, `sensationalism`.

## Evidence labels (`evidence-gold.json`)

The correct `ClaimEvidenceStatus` for a claim given its actual source spread:
`HIGHLY_CORROBORATED` / `CORROBORATED` / `PARTIALLY_CORROBORATED` /
`SINGLE_SOURCE` / `DISPUTED` / `UNVERIFIED` / `CORRECTED` / `RETRACTED` /
`SUPERSEDED`. `DISPUTED`, `CORRECTED`, `RETRACTED` are inspected individually —
overall accuracy is not the target.

Primary evidence is labelled `states` vs `proves`: a government order
**states** X; it does not **prove** X is objectively true.
