# IFFA category-classifier evaluation

- generated: 2026-09-02T14:33:46.387Z
- corpus: 114 hand-labelled real headlines
- **accuracy 100.0% · macro-F1 100.0%**
- secondary-category recall: 15.4% (2/13)

| Category | Support | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| crisis | 21 | 100.0% | 100.0% | 100.0% |
| politics | 38 | 100.0% | 100.0% | 100.0% |
| finance | 16 | 100.0% | 100.0% | 100.0% |
| sports | 10 | 100.0% | 100.0% | 100.0% |
| other-relevant | 27 | 100.0% | 100.0% | 100.0% |
| entertainment | 1 | 100.0% | 100.0% | 100.0% |
| celebrity | 1 | 100.0% | 100.0% | 100.0% |

## Confusion matrix (rows = true, cols = predicted)

| true \ pred | crisis | politics | finance | sports | other-relevant | entertainment | celebrity |
|---|---:|---:|---:|---:|---:|---:|---:|
| crisis | 21 | 0 | 0 | 0 | 0 | 0 | 0 |
| politics | 0 | 38 | 0 | 0 | 0 | 0 | 0 |
| finance | 0 | 0 | 16 | 0 | 0 | 0 | 0 |
| sports | 0 | 0 | 0 | 10 | 0 | 0 | 0 |
| other-relevant | 0 | 0 | 0 | 0 | 27 | 0 | 0 |
| entertainment | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| celebrity | 0 | 0 | 0 | 0 | 0 | 0 | 1 |

## Misclassifications (0)

