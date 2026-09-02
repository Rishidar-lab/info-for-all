# IFFA category-classifier evaluation

- generated: 2026-09-02T15:44:26.198Z
- corpus: 144 hand-labelled real headlines
- **accuracy 100.0% · macro-F1 100.0%**
- secondary-category recall: 100.0% (10/10)
- secondary-set strict precision 100.0% · recall 100.0% (TP 21 / FP 0 / FN 0, over cases with a declared secondary set)

| Category | Support | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| crisis | 21 | 100.0% | 100.0% | 100.0% |
| politics | 55 | 100.0% | 100.0% | 100.0% |
| finance | 22 | 100.0% | 100.0% | 100.0% |
| sports | 17 | 100.0% | 100.0% | 100.0% |
| other-relevant | 27 | 100.0% | 100.0% | 100.0% |
| entertainment | 1 | 100.0% | 100.0% | 100.0% |
| celebrity | 1 | 100.0% | 100.0% | 100.0% |

## Confusion matrix (rows = true, cols = predicted)

| true \ pred | crisis | politics | finance | sports | other-relevant | entertainment | celebrity |
|---|---:|---:|---:|---:|---:|---:|---:|
| crisis | 21 | 0 | 0 | 0 | 0 | 0 | 0 |
| politics | 0 | 55 | 0 | 0 | 0 | 0 | 0 |
| finance | 0 | 0 | 22 | 0 | 0 | 0 | 0 |
| sports | 0 | 0 | 0 | 17 | 0 | 0 | 0 |
| other-relevant | 0 | 0 | 0 | 0 | 27 | 0 | 0 |
| entertainment | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| celebrity | 0 | 0 | 0 | 0 | 0 | 0 | 1 |

## Misclassifications (0)

