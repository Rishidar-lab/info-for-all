# IFFA category-classifier evaluation

- generated: 2026-09-03T03:07:34.322Z
- corpus: 175 hand-labelled real headlines
- **accuracy 100.0% · macro-F1 100.0%**
- secondary-category recall: 100.0% (10/10)
- secondary-set strict precision 100.0% · recall 80.8% (TP 21 / FP 0 / FN 5, over cases with a declared secondary set)

### Secondary-set errors

- `FN  finance	Madras High Court orders the state to clear ₹430 crore in pending `
- `FN  crisis	Sivaganga collector bans the sale of loose sweets during Deepavali`
- `FN  crisis	Anna University postpones semester exams in Chennai and Chengalpat`
- `FN  finance	State cabinet approves a 3% DA hike for government employees, effe`
- `FN  finance	Coimbatore airport handles a record 2.1 million passengers this fi`

| Category | Support | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| crisis | 27 | 100.0% | 100.0% | 100.0% |
| politics | 61 | 100.0% | 100.0% | 100.0% |
| finance | 28 | 100.0% | 100.0% | 100.0% |
| sports | 21 | 100.0% | 100.0% | 100.0% |
| other-relevant | 36 | 100.0% | 100.0% | 100.0% |
| entertainment | 1 | 100.0% | 100.0% | 100.0% |
| celebrity | 1 | 100.0% | 100.0% | 100.0% |

## Confusion matrix (rows = true, cols = predicted)

| true \ pred | crisis | politics | finance | sports | other-relevant | entertainment | celebrity |
|---|---:|---:|---:|---:|---:|---:|---:|
| crisis | 27 | 0 | 0 | 0 | 0 | 0 | 0 |
| politics | 0 | 61 | 0 | 0 | 0 | 0 | 0 |
| finance | 0 | 0 | 28 | 0 | 0 | 0 | 0 |
| sports | 0 | 0 | 0 | 21 | 0 | 0 | 0 |
| other-relevant | 0 | 0 | 0 | 0 | 36 | 0 | 0 |
| entertainment | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| celebrity | 0 | 0 | 0 | 0 | 0 | 0 | 1 |

## Misclassifications (0)

