# IFA claim-quality evaluation

- generated: 2026-09-02T03:45:52.178Z
- corpus reference instant (NOW): 2026-09-02T06:00:00.000Z
- provider mode: **rule-only**
- cases: **223** · fully clean: **211** (94.6%)

## Headline: false corroboration

**0 / 71** unrelated or cross-language pairs were shown as corroborated — **0.0%**. None.

## Metrics

| Metric | Precision | Recall | F1 | Accuracy | n |
|---|---|---|---|---|---|
| Claim matching | 100.0% | 89.2% | 94.3% | — | 164 |
| Claim extraction (expected type recovered) | — | 96.4% | — | 96.4% | 83 |
| Contradiction detection | 100.0% | 100.0% | 100.0% | — | 186 |
| Temporal-update classification | — | — | — | 100.0% | 12 |
| Attribution retention | — | — | — | 96.2% | 26 |
| Primary-evidence linking | 100.0% | 85.7% | 92.3% | — | 7 |
| Source-independence classification | — | — | — | 100.0% | 13 |
| Wire / agency credit detection | — | — | — | 100.0% | 9 |
| Tamil ↔ Tamil matching | — | — | — | 84.6% | 26 |
| Tamil ↔ English held without silent merge | — | — | — | 100.0% | 12 |
| Tamil original text preserved | — | — | — | 100.0% | 61 |

## By category

| Category | Passed | n |
|---|---|---|
| Same fact, different wording | 26 | 27 |
| Related but different fact | 13 | 13 |
| Numeric agreement (unit normalisation) | 7 | 8 |
| Numeric contradiction | 10 | 10 |
| Temporal update (supersedes) | 12 | 12 |
| Attributed statement | 14 | 14 |
| Allegation | 8 | 8 |
| Prediction | 7 | 8 |
| Primary evidence support | 9 | 10 |
| Syndication vs independence | 12 | 13 |
| Tamil ↔ Tamil | 22 | 26 |
| Tamil ↔ English | 30 | 33 |
| Same people, different story | 18 | 18 |
| Same location, different date | 10 | 10 |
| Neighbouring districts | 13 | 13 |

## Failures (15)

| Case | Category | Kind | Expected | Actual |
|---|---|---|---|---|
| C05 | Numeric agreement (unit normalisation) | missed-match | A and B corroborate | kept separate |
| C05 | Numeric agreement (unit normalisation) | extraction-miss | statistic | event |
| H07 | Prediction | attribution-lost | attributed | promoted to a bare claim / not extracted |
| H07 | Prediction | extraction-miss | prediction|attribution | official-statement,event |
| I09 | Primary evidence support | missed-evidence-link | CAP supports the claim | no evidence extracted |
| J10 | Syndication vs independence | missed-match | A and B corroborate | kept separate |
| P04 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| P12 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| P13 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| P14 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| Q06 | Tamil ↔ English | missed-match | A and B corroborate | kept separate |
| Q11 | Tamil ↔ English | missed-match | A and B corroborate | kept separate |
| Q14 | Tamil ↔ English | missed-match | A and B corroborate | kept separate |
| S10 | Same fact, different wording | missed-match | A and B corroborate | kept separate |
| S10 | Same fact, different wording | extraction-miss | statistic | event |

