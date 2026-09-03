# Research-on-demand — the primary-record layer (Milestone B §B.2)

_Code: `src/lib/research/`. Runnable: `scripts/research-pass.ts` (`npm run research`)._

## What it does

§B.1 opened one delivery path: **1 independent newsroom + 1 primary anchor → a
brief is delivered.** §B.2 supplies the primary anchor — and, crucially, makes
sure the one newsroom is not itself an unmarked echo of the very record used as
the anchor.

For every **withheld** cluster that meets the trigger, the research pass builds a
deterministic query from the claim's own entities, checks a small set of
primary-record adapters, and writes the result to
`src/data/generated/research.json`. The brief layer reads that file and
re-evaluates the withholding gate.

**No language model** in the query, the fetch, the parse, or the match.

## The §B.2.4 trigger

Research runs for a cluster only when **all** hold:

- the brief is withheld, and
- `genuineIndependentFamilies < 2` (from §B.1), and
- no primary anchor already (no CAP alert, no official article, no evidence), and
- the cluster is < 72h old, and
- there is ≥1 checkable claim (a number, name, place, date, or official action).

Plus a manual re-run: `npm run research` / `RESEARCH_ONLINE=1 npm run research`.

## The adapters

| adapter | what | network | notes |
|---|---|---|---|
| `corpus_official` | links an official article **already in IFFA's corpus** (RBI, NDMA SACHET, IMD) to a withheld news cluster | no | highest yield; the "raw bytes" are the ingested article, re-verifiable from the committed snapshot |
| `tn_dipr_listing` | the TN DIPR press-release **listing** (`www.tn.gov.in/press_release.php`) | yes (identifying UA accepted) | releases are JPG **scans** → every record is `requiresOcr: true`, `ocrConfidence: null`, and **can never anchor a published claim or collapse an article** without a human confirm. Value: the withhold-reason upgrade. |

**Not shipped — `pib_rss`** (file kept, `parsePibRss` unit-tested): PIB's Akamai
layer 403s any User-Agent containing "IFFA" or "bot", on every path including the
RSS. The only way through is a bare browser UA, which reads as evasion and is
against I2 / §B.2.2. Left as a maintainer UA-policy / partnership decision (see §9
of `IFFA_MILESTONE_B2_REPORT.md`).

**Deferred for cause** — `tn_gazette` (G.O. PDFs, low applicability), `ecourts`
(CAPTCHA + needs a case number news rarely prints), `district_collectorate` (27
separate sites), `data_gov_in` (datasets, low news-match precision), `eci_tn_ceo`,
`imd_rmc` (retired RSS, 401-gated API), `rbi_press` (already ingested — covered by
`corpus_official`).

### Adapter contract (`RecordAdapter`)

- `search()` → `RecordCandidate[]` (deterministic lexical relevance)
- `fetch()` → `RawRecord` — **raw bytes + sha256 + fetched_at + url persisted**.
  A record that cannot be re-derived from stored bytes is not a record.
- `parse()` → `PrimaryRecord` — DOM/regex/text only, no model.
- A `verified_factcheck` adapter (none built yet) would be **corroboration, never
  a primary anchor**.

## Offline replay

`scripts/research-pass.ts` is **offline by default**: it uses only the committed
fixtures under `tests/fixtures/research/` plus `corpus_official` (no network).
`RESEARCH_ONLINE=1` fetches and refreshes the fixtures. The deploy workflow runs
it online after ingest; CI and `prebuild` run it offline. The whole research path
replays with zero network.

## Thin-claim matching (`match.ts`) — deliberately strict

A wrong-record "corroboration" is worse than a withhold, so:

1. **Domain must be compatible** — a court claim never matches an RBI release; a
   weather claim only matches a weather/disaster authority.
2. **A specific anchor must be shared** — a proper noun, a place, or a
   number-with-unit. Generic government vocabulary alone is not a match.
3. Then: every claim number matches (with unit), dates match, action verb is
   compatible, and the best-matching record sentence shares ≥2 content words.

Outcomes:

- **corroborated** → attach as a primary anchor with a **stored locator** (char
  offset range into the record — stored, not recomputed at render).
- **contradicted** → a *finding*. The cluster gets a `record_contradicts_reporting`
  flag; the story shows **both values with both citations** in the disagreements
  block, with "best-supported ≠ true" framing.
- **not_found** → the record is silent; the query is logged so the withhold
  reason can name what was checked.

`verifyBrief` runs unchanged on the result — a corroborated claim never pulls
unsupported neighbouring sentences along with it.

## The echo-collapse gate (`echo.ts`, §B.2.1)

When a primary record is attached, `articleEchoesRecord` re-runs echo detection
on every article excerpt **against the record's full text**. An article collapses
into the record when any holds:

- ≥60% of the excerpt's content 5-grams are in the record, or
- the headline is ≥70% token-overlapped with the record's title / first sentence, or
- every number, date and name in the excerpt is in the record and it adds no new
  entity, or
- it was published after the record and adds no observation the record lacks.

A collapsed article is reclassified `press-release-echo` and **stops counting as
a genuine independent family**. Then the gate outcome:

| cluster shape | outcome |
|---|---|
| ≥2 genuine independent newsrooms | deliver (record strengthens it) |
| 1 genuine newsroom + a record | **deliver** — the §B.2 win condition |
| the only report collapses into the record | **withhold** — `SOLE_REPORT_ECHOES_OFFICIAL_RECORD` |
| 0 newsrooms + a record | deliver as **`official_record_only`** — labelled a government record, not journalism |

An OCR record with no confirmed confidence can neither anchor nor collapse.

## The four withhold reasons a reader can use (§B.2.5)

- `SINGLE_SOURCE_NO_RECORD` — "One newsroom reported this. We checked *N* official
  sources — *listed* — and none carry it."
- `SOLE_REPORT_ECHOES_OFFICIAL_RECORD` — "The only report we have restates a
  government release. That is one source, not two."
- `record_contradicts_reporting` — both values surfaced, both cited.
- `official_record_only` — "This is a government record. No independent newsroom
  has confirmed it."

A withheld page is a product surface, not an error state.

## Limitation (carried from §B.1)

IFFA ingests an RSS `title` + a short `excerpt` — **no bylines, no article
bodies**. Wire-syndication, press-release-echo and thin-claim matching can only
fire on that short text. `corpus_official`'s reach is limited to what IFFA
already ingests (RBI, NDMA SACHET). See §9 of the milestone report for the
ingestion-depth options.
