# IFA claim-quality evaluation

- generated: 2026-09-02T02:11:47.878Z
- corpus reference instant (NOW): 2026-09-02T06:00:00.000Z
- provider mode: **rule-only**
- cases: **148** · fully clean: **127** (85.8%)

## Headline: false corroboration

**0 / 47** unrelated or cross-language pairs were shown as corroborated — **0.0%**. None.

## Metrics

| Metric | Precision | Recall | F1 | Accuracy | n |
|---|---|---|---|---|---|
| Claim matching | 100.0% | 59.1% | 74.3% | — | 85 |
| Claim extraction (expected type recovered) | — | 96.1% | — | 96.1% | 76 |
| Contradiction detection | 100.0% | 90.0% | 94.7% | — | 105 |
| Temporal-update classification | — | — | — | 100.0% | 10 |
| Attribution retention | — | — | — | 96.2% | 26 |
| Primary-evidence linking | 100.0% | 85.7% | 92.3% | — | 7 |
| Source-independence classification | — | — | — | 100.0% | 10 |
| Wire / agency credit detection | — | — | — | 100.0% | 7 |
| Tamil ↔ Tamil matching | — | — | — | 12.5% | 8 |
| Tamil ↔ English held without silent merge | — | — | — | 100.0% | 6 |
| Tamil original text preserved | — | — | — | 100.0% | 6 |

## By category

| Category | Passed | n |
|---|---|---|
| Same fact, different wording | 12 | 18 |
| Related but different fact | 12 | 12 |
| Numeric agreement (unit normalisation) | 5 | 8 |
| Numeric contradiction | 9 | 10 |
| Temporal update (supersedes) | 10 | 10 |
| Attributed statement | 14 | 14 |
| Allegation | 8 | 8 |
| Prediction | 7 | 8 |
| Primary evidence support | 9 | 10 |
| Syndication vs independence | 8 | 10 |
| Tamil ↔ Tamil | 1 | 8 |
| Tamil ↔ English | 8 | 8 |
| Same people, different story | 8 | 8 |
| Same location, different date | 8 | 8 |
| Neighbouring districts | 8 | 8 |

## Failures (24)

| Case | Category | Kind | Expected | Actual |
|---|---|---|---|---|
| A04 | Same fact, different wording | missed-match | A and B corroborate | kept separate |
| A06 | Same fact, different wording | missed-match | A and B corroborate | kept separate |
| A09 | Same fact, different wording | missed-match | A and B corroborate | kept separate |
| A12 | Same fact, different wording | missed-match | A and B corroborate | kept separate |
| A17 | Same fact, different wording | missed-match | A and B corroborate | kept separate |
| A18 | Same fact, different wording | missed-match | A and B corroborate | kept separate |
| A18 | Same fact, different wording | extraction-miss | statistic | event |
| C04 | Numeric agreement (unit normalisation) | missed-match | A and B corroborate | kept separate |
| C05 | Numeric agreement (unit normalisation) | missed-match | A and B corroborate | kept separate |
| C05 | Numeric agreement (unit normalisation) | extraction-miss | statistic | event |
| C06 | Numeric agreement (unit normalisation) | missed-match | A and B corroborate | kept separate |
| D07 | Numeric contradiction | missed-contradiction | flagged disputed | not flagged |
| H07 | Prediction | attribution-lost | attributed | promoted to a bare claim / not extracted |
| H07 | Prediction | extraction-miss | prediction|attribution | official-statement,event |
| I09 | Primary evidence support | missed-evidence-link | CAP supports the claim | no evidence extracted |
| J07 | Syndication vs independence | missed-match | A and B corroborate | kept separate |
| J10 | Syndication vs independence | missed-match | A and B corroborate | kept separate |
| K01 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| K02 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| K03 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| K04 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| K05 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| K06 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |
| K07 | Tamil ↔ Tamil | missed-match | A and B corroborate | kept separate |

