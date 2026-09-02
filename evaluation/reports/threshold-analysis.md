# Decision-threshold analysis (v0.5, Phase 23)

The identity gate emits `same` at a confidence of high / moderate / low. This
sweep shows what happens as the merge bar is lowered.

| Merge bar | Precision | Recall | False positives | False corroboration |
|---|---|---|---|---|
| high | 100.0% | 37.4% | 0 | 0 |
| high+moderate | 100.0% | 85.2% | 0 | 0 |
| high+moderate+low | 100.0% | 85.2% | 0 | 0 |

## Selected operating point

**`high + moderate`** merges; **`low`** is recorded but only merges same-publisher
follow-ups. Rationale (IFA philosophy — a fabricated consensus is far more
costly than a missed one): the `low` bar adds recall but is the first place
false positives appear, so it is not allowed to create a cross-publisher
"corroborated" claim. The `high+moderate` point holds **0 false corroboration**
on the labelled corpus.
