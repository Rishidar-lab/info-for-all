# IFFA — Milestone B: Research-on-Demand

Continuing from `5431dc5` (Ground-Parity Milestone A).

**Status:** §B.1 (hardened independence detector) **COMPLETE**. §B.2–B.4 (primary-record
fetchers, research trigger, replayable fixtures) **NOT STARTED — awaiting go**, per the
directive's instruction to *"Report before writing any fetcher."*

---

## §B.1 — The independence detector

### What the directive asked for

Before building fetchers, harden the resolver that decides "how many genuinely
independent newsrooms reported this" — the number the brief withholding gate
depends on. Collapse to one family on **any** of: shared parent entity, wire-agency
byline, ≥85% body-shingle overlap, same press release, same registered publisher.

### The frozen-engine constraint (Invariant, §0)

`src/lib/independence/` is part of the **frozen v0.6 claim engine** — byte-identical
vs `v0.10.0` is a release gate. The directive's `src/lib/independence/` target
cannot be modified without failing that gate.

**Resolution:** built the hardened resolver as a **new module, `src/lib/research/independence.ts`**,
outside the frozen engine. The frozen engine keeps feeding the claim pipeline
unchanged; the new resolver reads its output plus the full publisher registry and
produces the stricter family picture the **brief layer** uses.

```
git diff --stat v0.10.0..HEAD -- src/lib/{claims,event-identity,semantic,language,independence}
→ empty.  Quality gate 11/11 identical.  eval:claims 222/223 · 0/71.
```

### What was built — `resolveSourceFamilies(articles, { evidence })`

Union-find over the cluster's articles, collapsing to one family on:

| rule | basis |
|---|---|
| **shared corporate family** | full `src/data/publishers.ts` `familyKey` + `src/data/feeds.ts` `ownershipGroup` — not the frozen engine's 5-entry `PUBLISHER_GROUP` map |
| **same wire agency** | `detectWireCredit` (PTI / ANI / IANS / Reuters / AFP / AP / Bloomberg) on title+excerpt — *every* pickup of one dispatch is one family, always |
| **≥85% verbatim overlap** | 5-gram Jaccard on the excerpt (the closest thing to a body IFFA ingests) when both have one, else on title+excerpt |
| **press-release echo** | ≥60% sentence-overlap with an in-cluster official article or an `Evidence` record, same day |

Each resulting family is classified — and this is the substance of §B.1:

| kind | meaning | counts as an independent newsroom? |
|---|---|---|
| `independent` | a distinct registered newsroom that did its own reporting | **yes** |
| `official-primary` | contains an official alert / primary document / govt statement | no — it's a *primary anchor* |
| `wire` | every member carries the same wire credit | **no** |
| `press-release-echo` | every member echoes one official record | **no** |
| `syndication` | merged in on ≥85% verbatim overlap | **no** |
| `thin` | unregistered outlet, headline only — unknowable | **no** |

Output: `familyCount`, **`genuineIndependentFamilies`** (kind `independent`),
`primaryRecordCount`, `downgrades[]` (every merge past the registry, with a
reason), `wireAgencies`, and a one-line `label`.

### The withholding gate, rewritten (I1 — withhold is a success state)

`src/lib/brief/select.ts`. **Before** (Milestone A):

```
withhold NO_INDEPENDENT_COVERAGE  when  families < 2  and  no official anchor
                                        and  no substantive claim  and  no event state
```

The `no substantive claim` escape was a loophole: a single outlet quoting a
minister ("the minister said X") has an *attributed* claim, so it was delivered.
That is a confident output built on one source — a defect.

**After** (§B.1):

```
anchorOk  = primaryRecordCount ≥ 1  OR  an official article  OR  a CAP alert  OR  a primary record
genuineOk = genuineIndependentFamilies ≥ 2

withhold NO_INDEPENDENT_COVERAGE  when  not genuineOk  and  not anchorOk
  detail: "<n> independent newsroom(s) — <label> (<p> publishers across <f> families).
           Collapsed: <publisher + publisher — reason>; …"
```

The "single official announcement still supports a brief" rule from Milestone A
is preserved (`anchorOk`). A withheld brief now shows the reader **which copies
were collapsed and why** (`familyMerges` on the brief; rendered in `Brief`).

### Measured impact on the 2026-09-03 snapshot

`npx tsx scripts/independence-impact.ts` · 763 routable clusters.

| | value |
|---|---|
| Native-comprehension rate (20-story front door) | **10 → 10 of 20** (unchanged) |
| Whole-corpus brief delivery (53 clusters ≥2 families / official) | **53 → 53** (unchanged) |
| Briefs flipped delivered → withheld **by the §B.1 gate** | **0** |
| Briefs flipped withheld → delivered | 0 |
| Unsupported sentences published | still **0** |
| Family merges applied past the registry | **4** (all `kasturi-and-sons` — The Hindu + BusinessLine in one cluster; the registry `familyKey` already collapsed these, the resolver just logs the reason) |
| Family kinds across all routable clusters | 776 `independent` · 31 `official-primary` · **0** `wire` · **0** `syndication` · **0** `press-release-echo` · **0** `thin` |

*(The 4 clusters my proxy flagged as "flipped" — RBI money-market notices,
auction calendars — are withheld by the **unchanged** `INSUFFICIENT_EVIDENCE`
gate, not by §B.1: single official article, zero extractable claims.)*

### Why zero flips — and why §B.1 still matters

On this snapshot the hardened rules fire almost nowhere, because:

1. **The registry `familyKey` already collapses corporate families.** `ml.coverage.independentSourceFamilies`
   (registry-backed) was already doing the heavy lifting; the frozen engine's
   tiny `PUBLISHER_GROUP` map was the weak spot, and the brief layer never used it.
2. **Wire syndication is invisible without bylines.** IFFA ingests RSS `title` +
   a short `excerpt`. `0 / 60` multi-article clusters carry a visible "(PTI)"
   marker. A byline field is not in the ingestion schema.
3. **Press-release echo needs article bodies.** The excerpt is usually a restated
   headline; cross-family 5-gram Jaccard maxes out at **0.19** in this snapshot,
   nowhere near 0.85.

§B.1 is nonetheless the required foundation for B.2:

- a **single authoritative resolver** the fetchers build on — when a fetcher adds
  a PIB release, it is classified `official-primary` (a valid anchor), never
  inflating the "independent newsroom" count;
- the **`genuine` vs `anchor` vs `wire`/`echo` distinction** the research trigger
  needs to decide whether a story still needs a second source;
- the **loophole closure** (attributed-claim ≠ independence) is a real
  correctness gain that will withhold more as thin single-outlet coverage grows;
- the **collapse-explanation** surfaced to the reader.

### Tests (withhold path first, per §7)

- **`tests/unit/research-independence.test.ts` — 7 tests**: corporate-family
  collapse · wire-dispatch collapse (always) · ≥85% verbatim collapse across two
  families · two genuine newsrooms kept separate · official record = anchor not
  newsroom · press-release + echo = one family · unregistered headline-only ≠
  independent.
- **`tests/unit/brief.test.ts` — updated + 3 new**: withhold on shared wire
  dispatch · withhold on ≥85% verbatim repost · deliver on two genuine newsrooms
  (`coverage.genuineFamilies === 2`) · lead never claims "3+ families" from one
  group. The old "syndicated copies" test now asserts the brief is **withheld**,
  which is the stronger guarantee.
- Full suite: **466 unit** (was 456) · **68 E2E** · **16 @prod** (unchanged).
- Frozen v0.6 engine **byte-identical vs `v0.10.0`**. `quality-gate` 11/11.
  `eval:claims` 222/223 · 0/71. `eval:identity` 99.1 / 100 / 86.
  `eval:category` 100% / 175. All identical.

### What §B.1 does NOT solve (and B.2 will not either)

- **No bylines, no article bodies.** Wire-syndication and press-release-echo
  detection can only fire on the ~1–2 sentences IFFA ingests. The real fix is
  ingesting full article text — a separate concern from research-on-demand.
- **`ml.coverage.independentSourceFamilies` on the story page header / cards is
  still the registry count**, not `genuineFamilies`. Reconciling every displayed
  family number is Milestone C's "coverage fingerprint" work; §B.1 changed only
  the numbers the **brief** owns (`coverage.genuineFamilies`, `coverage.familyLabel`,
  the withhold detail, the card "collecting evidence" line).

### Not claimed

Nothing. §B.1 is a detector-hardening commit with 0 measured brief-decision
changes on the current snapshot. Native-comprehension is unchanged at 10/20.

---

## §B.2–B.4 — NOT STARTED

Awaiting go. Planned per the directive:

- **B.2** — `src/lib/research/` primary-record adapters, priority order `tn_dipr`,
  `pib`/`pib_tn`, `tn_gazette`, `imd_rmc_chennai`, `ecourts`, `district_collectorate`,
  `data_gov_in`, `mca_roc`, `eci_tn_ceo`, `factcheck_verified`. Each persists raw
  bytes + sha256; `parse()` deterministic (no model); robots + rate-limit + ETag;
  a fixture test with a stored real response.
- **B.3** — the research trigger: brief withheld **and** `genuineIndependentFamilies == 1`
  **and** cluster age < 72h **and** ≥1 checkable claim → deterministic
  `ResearchQuery` from the claim's own entities → top-3 adapters → run `verifyBrief`
  against the record → on a hit, add as a family (`official-primary`) and
  re-synthesise; on a miss, upgrade the withhold reason to "single source; N
  official records checked, none corroborating".
- **B.4** — DoD: native comprehension ≥ 13/20 (honest); every new brief ≥2 genuine
  families or 1 primary record; 0 unsupported sentences; frozen gate 11/11; every
  research hit replayable from stored bytes in CI; unit ≥ 520, E2E ≥ 76, @prod ≥ 18;
  `docs/RESEARCH-MODEL.md`.

**The independence detector is ready. Awaiting go for the fetchers.**
