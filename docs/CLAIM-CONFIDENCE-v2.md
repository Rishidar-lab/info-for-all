# Claim confidence — v0.4

Supersedes [CLAIM-CONFIDENCE.md](CLAIM-CONFIDENCE.md). The v0.3 formula is
unchanged in spirit; v0.4 adds the independence engine's signal and a hard
ceiling for unknown independence.

Confidence is an **internal 0–100 score** shown to readers only as a band:

| Band | Score | Meaning |
|---|---|---|
| **High** | ≥ 70 | Independently corroborated and/or backed by a primary record; recent; no dispute. |
| **Moderate** | 40–69 | Reported, with partial corroboration or a single strong source. |
| **Low** | < 40 | Single source, attributed, disputed, or extracted with low confidence. |

It is **not a truth rating**. It describes the state of the *reporting*.

## The formula (`src/lib/claims/confidence.ts`)

```
start                                          30

+ independent source groups
    3 or more                                  +32
    exactly 2                                  +24
    exactly 1 (with ≥1 publisher)              +14
    0                                          +0
+ a supporting primary-evidence record         +18
+ direct (not attributed) reporting            +6
+ recency: last seen < 6h / < 24h / older      +6 / +2 / 0

− claim is an attributed statement             −16
− claim is disputed                            −22
− all support in one syndication group (>1 pub)−8
− mean extraction confidence < 0.5             −6
− independence of supporting reports is UNKNOWN −6      ← v0.4

clamp to 0–100
```

### v0.4 ceiling — unknown independence is never "confirmed"

If **every** cross-publisher pair among the supporting reports is classified
`unknown` by the independence engine (`src/lib/independence/`) **and** there is
no confirmed independent group, the score is capped at **69** — it can never
reach the High band. "We could not tell whether these two reports are
independent" must not read as "independently confirmed".

Providers of the independence relation:

| Relation | Contributes |
|---|---|
| `independent` / `likely-independent` | counts toward independent groups |
| `syndicated` / `likely-syndicated` | collapses into one group; triggers the −8 syndication demerit |
| `unknown` | −6 demerit **and** the High-band ceiling |

## Worked examples

| Situation | Groups | Primary evidence | Notes | Score | Band |
|---|---|---|---|---|---|
| CAP flood alert + 3 independent papers, 2h old | 3 | yes | direct | 30+32+18+6+6 = **92** | High |
| 2 independent papers, same closure, 4h old | 2 | no | direct | 30+24+6+6 = **66** | Moderate |
| Minister's aid figure, 2 papers quoting him | 1 | no | attributed | 30+14−16+6 = **34** | Low |
| One paper, one wire pickup, `unknown` independence | 1 | no | direct, capped | 30+14+6+6−6 = 50 → **cap 69** = 50 | Moderate |
| 3 papers, `deaths` figure disputed 8 vs 3 | 3 | no | disputed | 30+32+6+6−22 = **52** | Moderate |

## Provider-assisted claims

A claim admitted from a model (`src/lib/claims/provider/`) enters normalisation
with `extractionMethod: "model"` and an extraction confidence **capped at 0.55**,
halved again if the source text tripped the injection scanner and multiplied by
0.6 if the entailment guard downgraded it. In practice this means a model-only
claim almost never clears the Moderate band on its own — it can only *raise* a
claim that rule extraction already found, never stand alone as "High".

## CGI

The Common Ground Index is a **separate, event-level** score built from the claim
layer (`src/lib/claims/cgi.ts`), documented in
[CLAIM-CONFIDENCE.md](CLAIM-CONFIDENCE.md#common-ground-index). Its sensitivity to
each weight is measured by `npm run eval:cgi` — see
`evaluation/reports/cgi-sensitivity.md`. It remains **EXPERIMENTAL**.
