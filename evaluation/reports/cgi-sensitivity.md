# CGI sensitivity analysis

_The Common Ground Index is **experimental**. This report measures how 
stable it is — it is not a claim that the weights are correct._

- events analysed (≥2 publishers, CGI present): **19**
- mean CGI: **55.6** · band distribution: {"moderate":14,"low":5}

## Weight perturbation (±20%), ranked by impact

| Weight | Change | value | mean |Δscore| | max |Δ| | band flips |
|---|---|---|---|---|---|
| thinBaseCap | −20% | 68→54 | 6.95 | 14 | 0 |
| thinBaseCap | +20% | 68→82 | 6.63 | 14 | 9 |
| corroboratedGain | −20% | 45→36 | 1.74 | 6 | 0 |
| corroboratedGain | +20% | 45→54 | 1.63 | 6 | 4 |
| singleSourcePenalty | −20% | 25→20 | 0.74 | 5 | 0 |
| singleSourcePenalty | +20% | 25→30 | 0.74 | 5 | 0 |
| attributedPenalty | +20% | 12→14 | 0.47 | 2 | 0 |
| attributedPenalty | −20% | 12→10 | 0.37 | 1 | 0 |
| evidenceBonus | −20% | 10→8 | 0 | 0 | 0 |
| evidenceBonus | +20% | 10→12 | 0 | 0 | 0 |
| disputedPenalty | −20% | 30→24 | 0 | 0 | 0 |
| disputedPenalty | +20% | 30→36 | 0 | 0 | 0 |
| hardDisputePenalty | −20% | 8→6 | 0 | 0 | 0 |
| hardDisputePenalty | +20% | 8→10 | 0 | 0 | 0 |
| syndicationPenalty | −20% | 8→6 | 0 | 0 | 0 |
| syndicationPenalty | +20% | 8→10 | 0 | 0 | 0 |

## Scenario: no primary evidence retrieved

Stripping every CAP/SACHET record: mean CGI drop **0** points, **0** of 19 events change band.

## Reading this

- A weight whose ±20% swing moves the mean score by only a point or two, with no band flips, is not doing much work — the score is dominated by the corroboration ratio and the presence of primary evidence, which is the intent.
- If `corroboratedGain` or `evidenceBonus` show the largest impact, that is expected and desirable: CGI *should* be most sensitive to genuine corroboration and to a primary record.
- Large `disputedPenalty` sensitivity with band flips means a single disputed claim can tip an event out of the moderate band — deliberately conservative.

