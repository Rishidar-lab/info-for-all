# IFFA — Ground-Parity Milestone A: Native Comprehension

**Status: SHIPPED.** Deterministic native brief + hallucination firewall + Tamil
brief + Perspective Compare (v1) + disagreement UI + story-page rebuild + home
micro-briefs. Branch `feat/ground-parity-milestone-a`.

**Ground-News-level parity is NOT claimed.** This milestone closes the single
most embarrassing gap — *IFFA did not actually explain the news*. Milestones B–E
(research-on-demand / URL-to-coverage, mature Perspective Compare, source scale,
reader personalisation) remain.

Snapshot used throughout: `src/data/generated/live-feed.json`, generated
`2026-09-03T07:59:03Z` — 913 articles, 763 clusters.

---

## 1. The 20-story audit (mandated — run before and after)

`npm run` → `npx tsx scripts/audit-native-comprehension.ts`. Sample = the 20
stories a reader actually lands on: the home-page editorial surfaces (urgent ·
right-now · fast-rising · Tamil Nadu · India), in page order.

Question, per story: **can a normal reader accurately explain the essential event
from IFFA alone, without opening a single external link?**

| | event | arts | families | excerpts | claims | primary ev. | current native summary | BEFORE | AFTER |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Rs 1,200-cr Secretariat / Olympic City / F1 — Vijay | 7 | 5 | ✓ | ✓ | – | none | no | **YES** (rich) |
| 2 | Flood (official alert) | 1 | 1 | ✓ | ✓ | ✓ | none | YES | **YES** (rich) |
| 3 | Supreme Court: BCI can't punish law students | 2 | 2 | ✓ | ✓ | – | none | no | **YES** (rich) |
| 4 | Setback for MK Stalin — HC rejects TVK Kolathur plea | 10 | 4 | ✓ | ✓ | – | none | no | **YES** |
| 5 | 4,260 special buses for Krishna Jayanti (TA) | 2 | 2 | ✓ | ✓ | – | none | no | **YES** |
| 6 | Udhayanidhi Stalin speech (TA) | 2 | 2 | ✓ | ✓ | – | none | no | **YES** |
| 7 | Tamil for Madras HC — CM Vijay to move resolution | 2 | 2 | ✓ | ✓ | – | none | no | **YES** |
| 8 | Flood (official alert) | 3 | 1 | ✓ | ✓ | ✓ | none | YES | **YES** (rich) |
| 9 | ₹1,200-cr new Assembly + Secretariat, Chennai (TA) | 6 | 3 | ✓ | ✓ | – | none | no | **YES** |
| 10 | Digital driving licences to launch in TN Sep 15 | 2 | 2 | ✓ | ✓ | – | none | no | **YES** |
| 11 | Perambalur lorry–omni bus crash, 2 dead (TA) | 1 | 1 | ✓ | – | – | none | no | withheld — NO_INDEPENDENT_COVERAGE |
| 12 | PWD tightens construction-site safety, Kerala | 1 | 1 | ✓ | – | – | none | no | withheld — NO_INDEPENDENT_COVERAGE |
| 13 | War over 7.8% GDP data | 1 | 1 | ✓ | – | – | none | no | withheld — NO_INDEPENDENT_COVERAGE |
| 14 | Assam: 2 police shot dead by colleague | 1 | 1 | – | – | – | none | no | withheld — NO_INDEPENDENT_COVERAGE |
| 15 | 79% of Polavaram canal in YSR tenure — Naidu | 1 | 1 | ✓ | – | – | none | no | withheld — NO_INDEPENDENT_COVERAGE |
| 16 | ED raids ganja supplier, Cyberabad | 1 | 1 | ✓ | – | – | none | no | withheld — NO_INDEPENDENT_COVERAGE |
| 17 | CM Vijay speech — TN police recruitment (TA) | 9 | 1 | ✓ | ✓ | – | none | no | withheld — NO_INDEPENDENT_COVERAGE (9 syndicated copies, 1 family) |
| 18 | TN Assembly adopts Tamil-as-official-language resolution | 1 | 1 | ✓ | – | – | none | no | withheld — NO_INDEPENDENT_COVERAGE |
| 19 | Kerala seeks Mullaperiyar safety review | 1 | 1 | ✓ | – | – | none | no | withheld — NO_INDEPENDENT_COVERAGE |
| 20 | Temple mobile-phone ban — minister replies (TA) | 1 | 1 | ✓ | – | – | none | no | withheld — NO_INDEPENDENT_COVERAGE |

### NATIVE_COMPREHENSION_RATE

| | value |
|---|---|
| **BEFORE** | **2 / 20 = 10%** |
| **AFTER** | **10 / 20 = 50%** |
| of which withheld (single independent source) | 10 / 20 |
| **briefs delivered where coverage supports one** | **10 / 10** |

The 10 "AFTER: no" rows are **all single-independent-source** (1 family, or 9
syndicated copies of one wire). Every one is **withheld with a stated reason** —
the blueprint's required behaviour ("If evidence is insufficient, render *Brief
unavailable / insufficient coverage*"). Closing that gap is **Milestone B**
(research-on-demand), not more synthesis.

### Whole-corpus view

Across **all 53 clusters that have ≥2 independent source families OR an official
CAP alert**:

| metric | value |
|---|---|
| brief delivered | **53 / 53 (100%)** |
| withheld | 0 |
| sentences dropped by the firewall | 7 (3 attributed-as-fact, 3 allegation-not-marked, 1 unit mismatch) — the firewall doing its job; no lead sentence was dropped |

---

## 2. `src/lib/brief/` — the subsystem

| module | role |
|---|---|
| `types.ts` | `CitationBinding`, `BriefSentence`, `IFFABrief`, `MicroBrief`, `PerspectiveCompare` |
| `select.ts` | gather structured evidence + **the withholding gate** (`isJunkFact` too) |
| `synthesize.ts` | **DeterministicBriefSynthesizer** — no LLM |
| `verify.ts` | **the hallucination firewall** — `verifyBrief` |
| `tamil.ts` | Tamil brief from the same facts (no MT) |
| `perspective.ts` | `buildPerspectiveCompare` |
| `build.ts` | `buildBrief` / `buildBriefs` / `microBrief` orchestration |
| `text.ts` | shared cleaners + number/date/unit/entity extractors used by both synth and verify |
| `labels.ts` | reader-facing labels |
| `index.ts` | public surface |

Dataset-coupled view layer: `src/lib/live/brief-view.ts`
(`briefsForCluster` / `microBriefForCluster` / `perspectiveForCluster`, memoised).

Data model implemented per the blueprint:

```ts
CitationBinding { sourceIds; claimIds; evidenceIds }
BriefSentence   { id; text; citations; support; attributedTo? }
IFFABrief       { shortVersion; keyFacts; uncertainties; whyItMatters;
                  whatChanged; disagreements; references; withheldReason?; … }
```

---

## 3. DeterministicBriefSynthesizer — built FIRST, no LLM

Sentences are assembled from the data IFFA already produces — canonical event
identity, extracted claims, evidence statuses, source-family independence,
primary evidence, current event state, novelty, temporal metadata, local impact,
political attribution, finance quantities, crisis state, sports state.

Category-aware leads: **official CAP alert** ("Authority X issued a … alert for
… in effect …"), **finance policy** (authority · decision · new/old value ·
effective date), **sports** (needs two teams or a result), **political
announcement / allegation / court ruling**, then the corroborated event claim,
then the cleaned headline.

An LLM synthesiser can later be added **behind `synthesizeBrief`'s signature**;
the deterministic path is the product. `optionalDependencies` (`@anthropic-ai/sdk`,
`openai`) are present but unused in this path.

---

## 4. Citation binding — every fact

Every sentence in `shortVersion`, `keyFacts`, `whyItMatters`, `whatChanged`
carries `{ claimIds, sourceIds, evidenceIds }`. A sentence with an empty binding
on every axis is dropped by the verifier. The story page renders `[1] [2]`
markers; tapping one opens an in-page card (publisher · title · date · evidence
role · claims supported · short excerpt · **Read original ↗**) — the reader is
**not** ejected from IFFA to see what a citation is.

**Citation-correctness check (verifier):** for each cited claim, at least one of
its `supportingArticleIds` must be among the sentence's `sourceIds`, or a cited
`evidenceId` must be one of the claim's `primaryEvidenceIds`.

---

## 5. Hallucination firewall — `verifyBrief`

Per sentence, checked against the concatenated text of its cited claims (+
`canonicalTextOriginal`, subjects/objects, provenance `sourceText`), cited
articles (title + excerpt), cited primary records, the CAP fields (+ IST-formatted
variants), cluster districts and event-state numbers:

| check | drop when |
|---|---|
| claim exists | a cited claim id does not resolve |
| citation exists | nothing bound |
| source supports claim | no cited source is a supporter of a cited claim |
| attribution preserved | attributed claim rendered as bare fact / allegation not marked |
| entity names | a proper noun is absent from the cited source text (alias-aware: "Chief Minister" ↔ "CM", "IMD" ↔ "India Meteorological Department", tracked political entities) |
| numbers | a number is absent from the cited source text (day/hour/minute ≤ 31 excepted when an ISO datetime is present; 4-digit years verbatim) |
| dates | an explicit calendar/clock token is absent |
| units | a `number+unit` pair is absent |

Failing sentences are removed and the reason recorded in
`brief.verification.dropReasons`. Empty short version ⇒ `NO_VERIFIABLE_SENTENCE`.

**Release rule met:** the unsupported-factual-sentence rate *published to readers*
is **zero** — unverified sentences never render.

### Firewall test coverage (`tests/unit/brief.test.ts`, 18 tests)

- ✅ unsupported sentence rejected
- ✅ wrong number rejected (`900` vs `200`)
- ✅ wrong district rejected (`Coimbatore` vs `Thanjavur`)
- ✅ wrong unit rejected (`cusecs` vs `mm`)
- ✅ fabricated entity rejected (`The World Bank`)
- ✅ no citation binding rejected · ✅ non-existent claim id rejected
- ✅ allegation rendered as a bare fact rejected; allegation marked as such kept
- ✅ a quote / official statement stays attributed ("announced" / "said" required)
- ✅ conflicting numbers stay visible (both `4` and `7` in `disagreements`)
- ✅ syndicated copies don't inflate corroboration (1 independent group ⇒ never "STRONG")
- ✅ single-source story with no official anchor is withheld
- ✅ a single OFFICIAL announcement still supports a brief
- ✅ Tamil & English briefs share claim ids; Tamil text is actually Tamil
- ✅ microBrief: text for a covered story, withheld flag for a thin one

---

## 6. Story page — rebuilt around the brief

`src/app/story/[slug]/page.tsx`. New order:

```
Headline · location · category · updated
─────────────────────────────
IFFA BRIEF   (always visible, dominant)
  The short version   [cited]
  ✓ Key facts         [cited]
  ? Developing / uncertain
  → Why it matters     [cited]
  ↻ What changed       [cited]
  Where sources disagree   (both values, "best-supported ≠ true")
  "IFFA synthesises this brief from the reporting and primary records listed
   below. Every factual statement is linked to its evidence…"
─────────────────────────────
Coverage at a glance  (sources · families · Tamil/English · official · primary-doc)
Official alert — as issued   (CAP box, verbatim, when present)
Why is this story prominent? — editorial ranking (collapsed)
─────────────────────────────
Tabs: Perspectives · Evidence · Headlines · Media landscape ·
      Full coverage · Timeline · References · Public discourse
```

**Removed:** the "IFFA does not write its own prose account…" statement, and the
"Overview" tab (its content is now the always-visible brief + coverage glance).
The metadata `description` now uses the brief's lead sentence.

---

## 7. Inline citation UX

`src/components/media/brief.tsx` (client). `[n]` markers, ordered + de-duplicated
per brief. Tap → a card **inside IFFA** first (publisher, title, date, evidence
role, claims supported, permissible excerpt), then **Read original ↗**. An
EN / தமிழ் toggle appears when a Tamil brief exists.

---

## 8. Home cards — micro-briefs

- `src/components/media/story-card.tsx` (media cards, home "right now" / urgent):
  a ~30–60-word native micro-brief + **Read IFFA Brief →**, or
  "IFFA Brief: collecting evidence — N publishers, M independent families" when
  withheld.
- `src/components/iffa/event-card.tsx` (TN / India / Watching lists): a compact
  one-line micro-brief.
- `scripts/shard-dataset.ts` now writes `brief` into each compact cluster in
  `public/data/index/latest.json` (759.9 KB → 813.8 KB) for the future
  client-side list. Not served to any route yet — no first-load impact.

---

## 9. Perspective Compare (v1)

`src/lib/brief/perspective.ts` + `src/components/media/perspective.tsx`. Axes:
shared factual core (corroborated claims), **Tamil-media vs English-media
emphasis**, **local/TN vs national emphasis**, **what official/primary sources
state**. No US Left/Center/Right axis.

**Political cohorts: INSUFFICIENT DATA** — IFFA's observed-alignment calibration
is below the sample threshold (as of v0.11), so cohorts are not shown; the tab
shows the language / locality contrasts and states why cohorts are omitted.

---

## 10. Disagreement UI

From the frozen engine's genuine `disputes`. Both values shown with publishers +
timestamps. "Currently best-supported" is chosen by independent-support count, or
by treating a later report as an update (earlier figure stays on the timeline).
Every disagreement carries: **"Best-supported is not a guarantee of truth."**
Values are unit-formatted (e.g. `7330000000` → `₹733 crore`).

---

## 11. English + Tamil — one evidence graph

`src/lib/brief/tamil.ts`. No fluent MT exists in IFFA (dictionary gloss only), so
the Tamil brief is generated from the **same selected facts**:

1. a claim with Tamil source text → that Tamil text, cleaned
2. a structured fact → a Tamil template (deaths / injuries / rainfall / wind /
   closures / Section 144 / red alert / holiday)
3. otherwise → the Tamil sentence is **dropped** (never fabricated)

Same sentence ids + citations ⇒ provable factual parity; the verifier runs on
both. Tamil brief attempted only for Tamil Nadu / P0 / Tamil-carrying clusters.
In the `2026-09-03` snapshot most Tamil-native clusters had their Tamil article
mis-clustered onto an unrelated gold-price feed item, so several Tamil briefs are
withheld — a **data** limitation (Tamil coverage depth, a v0.11/v0.12 concern),
not a synthesiser failure. `NO_VERIFIABLE_SENTENCE` on the Tamil side keeps the
English brief + all references visible with a Tamil "not yet available" note.

---

## 12. Brief withholding

Reasons surfaced to the reader: `COLLECTING`, `NO_INDEPENDENT_COVERAGE`,
`INSUFFICIENT_EVIDENCE`, `NO_VERIFIABLE_SENTENCE`. Coverage + every reference stay
visible under a withheld brief. `isJunkFact` blocks known parse artefacts
(`₹0 crore was allocated`, the `amount_inr → "was allocated"` template, spurious
"A public holiday was declared") from ever reaching a brief.

---

## 13. Category-specialised briefs

- **Crisis / official alert:** authority · event · area · window · severity;
  key facts from event state; uncertainties call out missing casualty/damage
  data + "not independently corroborated yet".
- **Politics:** speech-act aware lead (announcement / allegation / criticism /
  denial / court ruling); attributed statements stay attributed.
- **Finance:** policy lead (authority · decision · new/old value · effective
  date); market moves as key facts; disputed rupee figures unit-formatted.
- **Sports:** result / fixture lead only with two teams or a result, else the
  headline; competition + round preserved.

---

## 14. Tests

- **`tests/unit/brief.test.ts` — 18 tests, all passing** (§5).
- **`tests/e2e/smoke.spec.ts`** — added *"a story page leads with the native IFFA
  Brief and links every fact to a source"* (checks the `IFFA Brief` region, that
  "does not write its own prose account" is gone, the new evidence-grounding
  statement is present, the References tab exists). Updated the two tests that
  referenced the removed "Overview" tab.
- Full suite: **456 unit tests pass** (was 438) · **68 E2E pass** (desktop +
  mobile-390).
- Frozen v0.6 engine **byte-identical vs `v0.10.0`** (`git diff --stat
  v0.10.0..HEAD -- src/lib/{claims,event-identity,semantic,language,independence}`
  → empty).
- `quality-gate` **11/11**. `eval:claims` **222/223 · 0/71**. `eval:identity`
  **99.1 / 100 / 86**. `eval:category` **100% / 175**. All identical to pre-milestone.

---

## 15. Live acceptance test — 5 real production stories

Close / ignore every external link. *Can a normal reader accurately explain the
essential event from IFFA alone?*

| # | category | story | verdict |
|---|---|---|---|
| 1 | TN politics | Rs 1,200-cr Secretariat / Olympic City / F1 track — CM Vijay | **PASS** — lead + 4 key facts: CM announced a ₹1,200-cr integrated Secretariat, a "world-class Olympic City" and an F1-4 motorsports centre in Chennai, citing tourism / auto industry / jobs |
| 2 | Crisis (official alert) | Very Heavy Rain — 13 districts of Madhya Pradesh | **PASS** — authority + event + area + effective window; key facts + uncertainties (no casualty data, not independently corroborated); 204.5 vs 204.4 mm shown as a disagreement |
| 3 | National politics | Ram temple trust — new appointees | **MARGINAL** — lead conveys "retired air marshal, businessman, lawyer among new appointees"; the engine extracted only the headline claim, so no key facts. Headline-level comprehension only |
| 4 | Finance | Arcil IPO — ₹733-cr offer, opens Sep 9 | **PASS** — lead: opens Sep 9, ₹733-cr offer priced ₹132–139; disagreement: one source earlier put the size at ₹428 cr, later figure treated as an update |
| 5 | Sports | Tilak — wants to play the Duleep Trophy final | **PASS** — lead + key fact: Tilak has said he wants to play in the Duleep Trophy final |

**4 / 5 full pass, 1 marginal** (thin extracted claims, not a synthesis defect).

No multi-source **Tamil-Nadu-local disaster** existed in the `2026-09-03`
snapshot — every TN-local incident (Perambalur bus crash, Erode forest fire,
Cuddalore road accidents) is single-source and correctly withheld. That gap is
itself the argument for Milestone B and continued Tamil source expansion.

---

## 16. Not claimed / deferred

Ground-parity needs later milestones:

- **B — research-on-demand / URL-to-coverage.** The single biggest lever: 50% of
  front-door stories are withheld purely for lack of a second independent source.
  Requires a trusted worker/queue (no arbitrary retrieval in client JS; block
  private IPs / non-HTTP; respect robots / paywalls / rate limits).
- **C — mature Perspective Compare** (cohort emphasis + omission analysis; needs
  observed-alignment calibration to clear the sample gate).
- **D — source scale** via lawful discovery breadth; Tamil publisher + YouTube
  discovery; district primary-record feeds.
- **E — reader product** (saved stories, followed topics, My Media Diet,
  share-to-IFFA extension).

Known rough edges in this milestone (documented, not blockers): key facts drawn
from quote-shaped attributed claims can read list-y; the Tamil brief is
template-thin until Tamil coverage deepens; `sentenceCaseHeadline` occasionally
lowercases the second word of a two-word proper noun ("Olympic city").

---

## 17. Preserved

Frozen v0.6 claim engine · 222/223 claim benchmark · 0/71 false corroboration ·
source-family independence · v0.11 calibration + history + source expansion ·
Phase N sharding · Playwright · production Pages deployment. Nothing chased for
test-count.

---

## 18. Completion output

| metric | before | after |
|---|---|---|
| native-comprehension rate (20-story front door) | 10% (2/20) | **50% (10/20)** |
| briefs where coverage supports one | — | **10/10** |
| whole-corpus brief delivery (53 clusters ≥2 families / official) | — | **100% (53/53)** |
| briefs generated (front-door sample) | 0 | 10 |
| briefs withheld (front-door sample) | — | 10 (all single independent source) |
| unsupported sentences rejected by the firewall (53-cluster corpus) | — | 7 |
| unsupported sentences **published** | n/a | **0** |
| Tamil brief — same claim ids as English | n/a | ✅ (verified in test) |
| cross-language factual drift | n/a | 0 (structurally impossible — shared ids) |
| unit tests | 438 | **456** (+18 brief) |
| E2E | 66 | **68** (desktop + mobile) |
| frozen v0.6 engine vs `v0.10.0` | identical | **identical** |
| quality-gate | 11/11 | **11/11** |

**Milestone A is complete. Ground-parity is not yet claimed.**
