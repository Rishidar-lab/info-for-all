# Event-identity evaluation (v0.5)

Full corpus — 115 true same-event pairs, 58 different / cross-language pairs.

| Stage | Value |
|---|---|
| Candidate recall (true pair reached the gate) | **95.7%** |
| Decision precision (merged pairs that were correct) | **100.0%** |
| Decision recall (candidate true pairs the gate merged) | **80.0%** |

Missed at candidate generation: D05, J08, J10, P13, S01

Reached the gate but not merged: A09, A15, A16, C01, C02, C05, C08, D04, D08, D09, E03, E05, E07, E10, O08, P04, P12, P14, Q06, Q11, Q14, S06, S10, T08

**Reading it:** losses split between retrieval (a true pair never became a candidate) and decision (the pair was a candidate but the conservative gate held). The gate is deliberately strict — see the threshold analysis.
