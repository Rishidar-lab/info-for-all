# CGI sensitivity analysis

_The Common Ground Index is **experimental**. This report measures how 
stable it is — it is not a claim that the weights are correct._

- events analysed (≥2 publishers, CGI present): **8**
- mean CGI: **58.1** · band distribution: {"moderate":5,"low":2,"high":1}

## Weight perturbation (±20%), ranked by impact

| Weight | Change | value | mean |Δscore| | max |Δ| | band flips |
|---|---|---|---|---|---|
| corroboratedGain | −20% | 45→36 | 4.5 | 9 | 0 |
| corroboratedGain | +20% | 45→54 | 4.13 | 9 | 2 |
| thinBaseCap | −20% | 68→54 | 2.5 | 14 | 0 |
| thinBaseCap | +20% | 68→82 | 1.75 | 14 | 1 |
| singleSourcePenalty | +20% | 25→30 | 1 | 2 | 0 |
| singleSourcePenalty | −20% | 25→20 | 0.75 | 3 | 0 |
| attributedPenalty | −20% | 12→10 | 0.5 | 1 | 0 |
| attributedPenalty | +20% | 12→14 | 0.5 | 1 | 0 |
| evidenceBonus | −20% | 10→8 | 0 | 0 | 0 |
| evidenceBonus | +20% | 10→12 | 0 | 0 | 0 |
| disputedPenalty | −20% | 30→24 | 0 | 0 | 0 |
| disputedPenalty | +20% | 30→36 | 0 | 0 | 0 |
| hardDisputePenalty | −20% | 8→6 | 0 | 0 | 0 |
| hardDisputePenalty | +20% | 8→10 | 0 | 0 | 0 |
| syndicationPenalty | −20% | 8→6 | 0 | 0 | 0 |
| syndicationPenalty | +20% | 8→10 | 0 | 0 | 0 |

## Scenario: no primary evidence retrieved

Stripping every CAP/SACHET record: mean CGI drop **0** points, **0** of 8 events change band.

## Reading this

- A weight whose ±20% swing moves the mean score by only a point or two, with no band flips, is not doing much work — the score is dominated by the corroboration ratio and the presence of primary evidence, which is the intent.
- If `corroboratedGain` or `evidenceBonus` show the largest impact, that is expected and desirable: CGI *should* be most sensitive to genuine corroboration and to a primary record.
- Large `disputedPenalty` sensitivity with band flips means a single disputed claim can tip an event out of the moderate band — deliberately conservative.

