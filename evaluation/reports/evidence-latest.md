# IFFA claim-evidence-status evaluation (v0.11)

- corpus: 36 first-pass claim situations (**humanVerified 0 / 36**)
- **overall accuracy 94%** (not the target metric)
- INDICATIVE ONLY.

## Critical statuses (individually inspected)
- **DISPUTED**: recall 100% (2/2) · precision 100%
- **CORRECTED**: recall 100% (2/2) · precision 100%
- **RETRACTED**: recall 100% (1/1) · precision 100%

## Confusion (rows gold, cols predicted)
| gold \ pred | HIGHLY | CORROB | PARTIA | SINGLE | DISPUT | UNVERI | CORREC | RETRAC | SUPERS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| HIGHLY_COR | 5 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| CORROBORAT | 0 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PARTIALLY_ | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| SINGLE_SOU | 0 | 0 | 0 | 5 | 0 | 1 | 0 | 0 | 0 |
| DISPUTED | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| UNVERIFIED | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 |
| CORRECTED | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| RETRACTED | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| SUPERSEDED | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |

## Misses
  e016 want HIGHLY_CORROBORATED, got CORROBORATED — Light-to-moderate rain is likely at isolated places on 
  e035 want SINGLE_SOURCE, got UNVERIFIED — The bypoll was cancelled by the EC after welfare-scheme