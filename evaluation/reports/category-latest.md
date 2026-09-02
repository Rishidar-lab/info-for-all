# IFFA category-classifier evaluation

- generated: 2026-09-02T14:14:55.485Z
- corpus: 84 hand-labelled real headlines
- **accuracy 100.0% · macro-F1 100.0%**
- secondary-category recall: 25.0% (2/8)

| Category | Support | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| crisis | 19 | 100.0% | 100.0% | 100.0% |
| politics | 26 | 100.0% | 100.0% | 100.0% |
| finance | 11 | 100.0% | 100.0% | 100.0% |
| sports | 7 | 100.0% | 100.0% | 100.0% |
| other-relevant | 19 | 100.0% | 100.0% | 100.0% |
| entertainment | 1 | 100.0% | 100.0% | 100.0% |
| celebrity | 1 | 100.0% | 100.0% | 100.0% |

## Confusion matrix (rows = true, cols = predicted)

| true \ pred | crisis | politics | finance | sports | other-relevant | entertainment | celebrity |
|---|---:|---:|---:|---:|---:|---:|---:|
| crisis | 19 | 0 | 0 | 0 | 0 | 0 | 0 |
| politics | 0 | 26 | 0 | 0 | 0 | 0 | 0 |
| finance | 0 | 0 | 11 | 0 | 0 | 0 | 0 |
| sports | 0 | 0 | 0 | 7 | 0 | 0 | 0 |
| other-relevant | 0 | 0 | 0 | 0 | 19 | 0 | 0 |
| entertainment | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| celebrity | 0 | 0 | 0 | 0 | 0 | 0 | 1 |

## Misclassifications (0)

