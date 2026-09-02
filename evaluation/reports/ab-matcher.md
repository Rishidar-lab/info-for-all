# v0.4 vs v0.5 matcher — A/B on the frozen 148-case corpus

Both matchers run on **exactly the same inputs**. v0.4 = lexical `scorePair`
only (no event-identity engine). v0.5 = lexical + semantic second pass +
semantic veto.

| Metric | v0.4 | v0.5 | Δ |
|---|---|---|---|
| Matching precision | 92.7% | 93.2% | 0.5 pp |
| Matching recall | 72.9% | 98.6% | +25.7 pp |
| False positives | 4 | 5 | 1 |
| Tamil ↔ Tamil recall | 0.0% | 100.0% | +100.0 pp |
| Tamil ↔ English recall | 0.0% | 100.0% | +100.0 pp |
| Runtime (148 pairs) | 354 ms | 291 ms | +-63 ms |
