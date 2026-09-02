# IFA claim-quality evaluation

- generated: 2026-09-02T12:37:27.963Z
- corpus reference instant (NOW): 2026-09-02T06:00:00.000Z
- provider mode: **rule-only**
- cases: **223** · fully clean: **222** (99.6%)

## Headline: false corroboration

**0 / 71** unrelated or cross-language pairs were shown as corroborated — **0.0%**. None.

## Metrics

| Metric | Precision | Recall | F1 | Accuracy | n |
|---|---|---|---|---|---|
| Claim matching | 100.0% | 100.0% | 100.0% | — | 164 |
| Claim extraction (expected type recovered) | — | 98.8% | — | 98.8% | 83 |
| Contradiction detection | 100.0% | 100.0% | 100.0% | — | 186 |
| Temporal-update classification | — | — | — | 100.0% | 12 |
| Attribution retention | — | — | — | 96.2% | 26 |
| Primary-evidence linking | 100.0% | 100.0% | 100.0% | — | 7 |
| Source-independence classification | — | — | — | 100.0% | 13 |
| Wire / agency credit detection | — | — | — | 100.0% | 9 |
| Tamil ↔ Tamil matching | — | — | — | 100.0% | 26 |
| Tamil ↔ English held without silent merge | — | — | — | 100.0% | 12 |
| Tamil original text preserved | — | — | — | 100.0% | 61 |

## By category

| Category | Passed | n |
|---|---|---|
| Same fact, different wording | 27 | 27 |
| Related but different fact | 13 | 13 |
| Numeric agreement (unit normalisation) | 8 | 8 |
| Numeric contradiction | 10 | 10 |
| Temporal update (supersedes) | 12 | 12 |
| Attributed statement | 14 | 14 |
| Allegation | 8 | 8 |
| Prediction | 7 | 8 |
| Primary evidence support | 10 | 10 |
| Syndication vs independence | 13 | 13 |
| Tamil ↔ Tamil | 26 | 26 |
| Tamil ↔ English | 33 | 33 |
| Same people, different story | 18 | 18 |
| Same location, different date | 10 | 10 |
| Neighbouring districts | 13 | 13 |

## Failures (2)

| Case | Category | Kind | Expected | Actual |
|---|---|---|---|---|
| H07 | Prediction | attribution-lost | attributed | promoted to a bare claim / not extracted |
| H07 | Prediction | extraction-miss | prediction|attribution | official-statement,event |

