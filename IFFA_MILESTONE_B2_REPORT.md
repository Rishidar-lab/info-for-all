# IFFA — Milestone B §B.2: Primary-Record Fetchers

Continuing from `0e8dc90` (§B.1). Invariants I1–I5 in force.

**Status: SHIPPED.** §B.2.0 profiler · §B.2.1 echo-collapse gate · §B.2.2 adapter
contract + 2 adapters · §B.2.3 strict thin-claim matching · §B.2.4 trigger +
deterministic queries + offline replay · §B.2.5 four reader-usable withhold
reasons.

**Native comprehension: 10/20 → 10/20 (unchanged).** On the 2026-09-03 snapshot
the reachable primary sources corroborate **0** additional withheld claims. Per
the directive — *"If it lands at 12/20 or 13/20 rather than 15/20, ship that
number. A delivery rate bought by relaxing the echo gate is a failed milestone"* —
this is the reported number, and the echo gate was not relaxed to move it.

---

## §B.2.0 — the withheld-claim profile (built before adapter #1)

`scripts/withheld-claim-profile.ts` → `reports/withheld-claim-profile.json`.
708 withheld routable clusters classified:

| claim type | n | | claim type | n |
|---|---|---|---|---|
| other (celebrity / misc) | 433 | | weather_event | 19 |
| official_action | 113 | | court | 17 |
| scheme_allocation | 42 | | electoral | 9 |
| crime | 30 | | entertainment | 9 |
| sports | 25 | | quantity | 6 |
| | | | casualty_count / appointment | 5 |

**Adapter ranking** (withheld clusters each would be *queried* for; checkable = has
an entity / number / date / authority):

| adapter | total | front-door | checkable | fetchability (probed 2026-09-03) |
|---|---|---|---|---|
| pib | 152 | 5 | 119 | RSS reachable with a non-browser UA; **full text behind an Akamai bot-wall** |
| tn_gazette | 113 | 5 | 83 | G.O. PDFs — low real applicability (most "official_action" news is a DIPR release, not a G.O.) |
| data_gov_in | 48 | 1 | 45 | open API works; **datasets only** — a news claim rarely matches a CSV row |
| tn_dipr | 27 | 3 | 27 | 100% TN-tie — but releases are **JPG scans** → OCR + human confirm |
| district_collectorate | 33 | 1 | 26 | 27 separate district sites |
| ecourts | 17 | 1 | 15 | form/CAPTCHA-gated; needs a case number news rarely prints |
| imd_rmc_chennai | 19 | 0 | 15 | public RSS retired (404); warnings API 401-gated |
| rbi_press | 6 | 0 | 6 | RSS **already ingested** by IFFA → covered by `corpus_official` |

**The finding that drove adapter selection:** the B→E default priority list
(`pib`, `tn_dipr`, `imd`, `ecourts`, …) runs straight into a wall — PIB is
Akamai-gated, TN DIPR is image scans, IMD retired its feed, eCourts is CAPTCHA'd.
The reachable, clean primary sources (RBI, NDMA SACHET) are **already in IFFA's
ingestion pipeline**. So §B.2's real work is *linking* those existing official
records to news clusters + the echo gate + the withhold-reason upgrade — not new
fetching.

### Adapters shipped

| adapter | value | network |
|---|---|---|
| `corpus_official` | links an official article already in IFFA's corpus (RBI, NDMA SACHET, IMD) to a withheld news cluster | no |
| `tn_dipr_listing` | records that a TN DIPR release *exists* for a date; `requiresOcr: true`, `ocrConfidence: null` — **can never anchor a claim** without a human confirm | yes (identifying UA accepted) |

Not shipped — **`pib_rss`** (file kept, `parsePibRss` unit-tested). PIB's Akamai
layer 403s any UA containing "IFFA" or "bot", on *every* path including the RSS.
The only way through is a bare browser UA — evasion, against I2 / §B.2.2. Left as
a maintainer decision (§9).

Deferred for cause: `tn_gazette`, `ecourts`, `district_collectorate`,
`data_gov_in`, `eci_tn_ceo`, `imd_rmc`.

---

## §B.2.1 — the echo-collapse gate (collapse-case test FIRST)

`src/lib/research/echo.ts`. `tests/unit/research-echo.test.ts` opens with a
fixture pairing a **real PIB railway-safety release (03 Sep 2026)** against a
single-outlet wire copy derived almost verbatim from it — the collapse case is
test #1, written before any happy path.

When a primary record is attached, echo detection re-runs on each article excerpt
**against the record's full text**. A collapsed article → `press-release-echo`,
no longer a genuine independent family. Gate outcomes:

| shape | outcome |
|---|---|
| ≥2 genuine newsrooms | deliver (record strengthens) |
| 1 genuine newsroom + record | **deliver** — the §B.2 win |
| the sole report collapses into the record | **withhold** `SOLE_REPORT_ECHOES_OFFICIAL_RECORD` |
| 0 newsrooms + record | **`official_record_only`** — labelled a government record, not journalism |

An unconfirmed-OCR record can neither anchor nor collapse. Tested.

---

## §B.2.3 — strict thin-claim matching

`src/lib/research/match.ts`. A wrong-record "corroboration" is worse than a
withhold, so the gate is:

1. **domain compatible** — a court claim never matches an RBI release
2. **a specific anchor shared** — a proper noun, a place, or a number-with-unit
   (generic government vocabulary alone is not a match)
3. every claim number matches with unit · dates match · action verb compatible ·
   best record sentence shares ≥2 content words

Outcomes: `corroborated` (attach + **stored char-offset locator**) ·
`contradicted` (a *finding* — both values surfaced with both citations, in the
existing disagreements block) · `not_found` (logged).

This is what caught the false positives an earlier, looser version produced — a
"green crackers" claim "corroborated" by an RBI repo-rate release, a "Delhi HC
notice" claim "corroborated" by the same. `tests/unit/research-match.test.ts`
locks the domain + specificity gates.

---

## §B.2.4 — trigger, queries, offline replay

Trigger: withheld · `genuineIndependentFamilies < 2` · no primary anchor · < 72h ·
≥1 checkable claim. Plus `npm run research` for editorial use.

`ResearchQuery` is built **deterministically from the claim's own entities /
numbers / dates / places** (`src/lib/research/query.ts`) — never a paraphrase,
never a model-written string — and stored with the result.

Custody (`src/lib/research/raw-store.ts`): every fetched record's raw bytes are
persisted with `sha256` under `tests/fixtures/research/`. `scripts/research-pass.ts`
is **offline by default** (fixtures + `corpus_official`, zero network);
`RESEARCH_ONLINE=1` refreshes fixtures. `prebuild` and CI run it offline; the
deploy workflow runs it online after ingest and caches `research.json` between
runs. **The whole research path replays with zero network in CI.**

---

## §B.2.5 — four withhold reasons a reader can use

`src/components/media/brief.tsx`:

- `SINGLE_SOURCE_NO_RECORD` → "One newsroom reported this. We checked *N* official
  sources — NDMA SACHET (releases held in IFFA's corpus); Reserve Bank of India
  … — and none carry it."
- `SOLE_REPORT_ECHOES_OFFICIAL_RECORD` → "The only report we have restates a
  government release. That is one source, not two."
- `record_contradicts_reporting` → a red banner + both values in "Where sources
  disagree", with "best-supported ≠ true".
- `official_record_only` → an evidence-toned banner: "Government record — not
  independent journalism. No independent newsroom has confirmed it yet."

---

## Measured impact — 2026-09-03 snapshot

| metric | before §B.2 | after §B.2 |
|---|---|---|
| **native comprehension** (20-story front door) | 10/20 | **10/20** |
| research trigger fired | — | 102 withheld clusters |
| adapters surfaced ≥1 record | — | 17 clusters |
| claims **corroborated** | — | **0** |
| claims **contradicted** | — | **0** |
| withheld pages upgraded to `SINGLE_SOURCE_NO_RECORD` (names the sources checked) | 0 | **94** |
| `SOLE_REPORT_ECHOES_OFFICIAL_RECORD` (echo gate withheld a false second source) | — | 0 |
| `official_record_only` briefs | — | 0 |
| unsupported sentences published | 0 | **0** |
| frozen v0.6 vs `v0.10.0` · quality-gate | identical · 11/11 | **identical · 11/11** |
| `eval:claims` / `eval:identity` / `eval:category` | 222/223 · 99.1/100/86 · 100% | **unchanged** |
| unit tests | 466 | **478** (+7 echo, +6 match, +independence updates) |
| E2E / @prod | 68 / 16 | 68 / 17 (adding a §B.2.5 check) |

### Why 0 corroborations

The 94 clusters the trigger fired on are political-speech coverage, court matters
with no case number, and single-outlet regional news. The reachable clean
primary corpus is **RBI + NDMA SACHET** (73 official articles in the snapshot) —
neither covers those stories. The one adapter with real reach into TN government
action, `tn_dipr_listing`, returns image scans that cannot anchor a claim.

**§B.2's real product win on this snapshot is §B.2.5:** 94 withheld pages now tell
the reader *which* official sources were checked and came up empty — genuinely
informative, and the correct output when there is no second source. The
machinery (trigger, adapters, echo gate, strict matcher, offline replay) pays off
as (a) IFFA's official-feed corpus grows, (b) monsoon season fills the weather
class, and (c) a UA-policy / partnership decision (§9) unlocks PIB / TN DIPR full
text.

---

## Definition of done — §B.2

- [x] `reports/withheld-claim-profile.json` published; adapter order justified by it.
- [x] Top-2 adapters (not 3 — PIB blocked; "a fourth adapter is worth less than a correct echo gate"), stored-bytes fixtures, full research path runs offline in CI.
- [x] Echo-collapse gate; **collapse-case test written before the happy path**.
- [x] No brief delivered on `1 newsroom + 1 record` where that newsroom collapses into the record — test enforces it.
- [x] `official_record_only` visually distinct + labelled a government record.
- [x] Contradictions surface both values with both citations.
- [x] Native comprehension reported honestly: **10/20**, no gate relaxed.
- [x] Unsupported sentences published: **0**.
- [x] Frozen v0.6 quality gate: **11/11 identical**.
- [x] Tests: unit **478** (target ≥ 520 not met — see below), E2E 68, @prod 17.
- [x] `docs/RESEARCH-MODEL.md`.
- [x] This report.

**Test count 478, not ≥520.** The §B.2 surface that warranted testing — echo gate
(7), thin-claim matcher (6), PIB parser, offline replay — is fully covered. The
extra ~40 the target implies would be adapter-specific tests for the 8 deferred
adapters, which were not built. Padding the count with tests for code that does
not exist is anti-goal #6 in spirit. Reporting the real number.

---

## Anti-goals — held

1. Built **2** adapters, not 10, with the echo gate as the centrepiece.
2. `verified_factcheck` — no adapter built; the tier can never satisfy the anchor condition (encoded in `match.ts`).
3. An official record never counts toward the independent-newsroom bar (§B.1 preserved; `resolveSourceFamilies` classifies it `official-primary`).
4. No model in `parse()` or query generation.
5. No brief published from a record whose raw bytes were not stored (`sha256` on every `RawRecord`).
6. Native comprehension not moved by loosening the echo threshold — the threshold is argued with the collapse-case fixture, and the reported number is 10/20.

---

## §9 — the ingestion-depth question (raised, NOT decided)

§B.1 established that title + short-excerpt ingestion makes wire and
press-release detection nearly inert. §B.2's echo gate and thin-claim matcher
only work where a fetched record supplies the missing full text — and the two
richest primary sources for Indian news, **PIB and TN DIPR, are not lawfully
automatable from a server** as things stand:

- **PIB** — the release body is reachable, but only with a bare browser
  User-Agent; every "IFFA"-identifying UA is 403'd by Akamai on all paths.
- **TN DIPR** — the listing is reachable with an identifying UA, but the releases
  themselves are JPG scans requiring OCR.

Every milestone after this one meets the same ceiling. The options, with their
costs — **for Rishi to weigh, deliberately, not to drift into:**

| option | what | robots / terms | copyright (India) | posture |
|---|---|---|---|---|
| **A. Stay RSS-only** | ingest what publishers syndicate; `corpus_official` stays limited to RBI / SACHET / whatever feeds are live | clean | clean | verification stays thin outside weather/finance; honest withholds dominate |
| **B. Full article text, verification-only** | fetch the full text of an article or a government release, use it **only** to run `verifyBrief` / the echo gate / `matchClaimToRecord`, and **never republish** more than the short attributed excerpt IFFA already shows | most publisher terms restrict automated access; a government release is a government work (India: §52(1)(q) permits reproduction of certain government works, narrower than it sounds) | verification-only use is a materially weaker copyright exposure than republication — but "weaker" is not "none" | strongest verification; needs a written robots + rate-limit + per-domain allowlist policy and a clear "we store for verification, we do not redistribute" statement |
| **C. Licensed / partner feeds** | PIB API access, a wire-service licence, a publisher partnership | contractual | contractual | cleanest; slowest; may cost money |

A browser-UA impersonation to get PIB bodies is **not** on this list — it reads as
evasion and IFFA should not do it regardless of which option is chosen.

**Recommendation to consider (not a decision):** B, scoped tightly — full text
fetched only for a cluster the research trigger already fired on, stored only as
`RawRecord` bytes for replay, never surfaced beyond the excerpt, with a published
policy. That turns `corpus_official` + a `pib_fulltext` / `tn_dipr_ocr` adapter
into the workhorses §B.2 was meant to have.
