# Event identity & semantic recall — v0.5 → v0.6

v0.4 matched events by lexical headline overlap. Paraphrases and anything across
scripts fell through: English same-fact recall ≈ 59%, Tamil ↔ Tamil ≈ 12%,
Tamil ↔ English not implemented. v0.5 added a structured event-identity engine.
**v0.6** is a recall-hardening pass over that engine: the 10 known missed matches
in the gold corpus were resolved without lowering any decision threshold and
with the zero-false-corroboration guarantee intact
(`evaluation/reports/v0.6-*.md`).

## The four sub-problems (kept separate)

| | Question | Module |
|---|---|---|
| **Event identity** | Do two articles describe the same real-world event? | `src/lib/event-identity/` |
| **Claim identity** | Do two extracted claims represent the same proposition? | `src/lib/claims/normalize.ts` (`mergeByIdentity`) |
| **Claim support** | Does a source actually support a canonical claim? | `src/lib/claims/` (provenance, entailment) |
| **Language normalisation** | Are the differences morphology / script, not meaning? | `src/lib/language/` |

## Event signature (`event-identity/signature.ts`)

A headline (+ excerpt) reduces to language-neutral features:

- **entities** — strong canonical names only (`src/data/entity-aliases.ts`); "government", "police", "minister" are marked weak and never identify an event;
- **places** — `src/lib/language/locations.ts`: districts, cities → district, dams/rivers → district(s), transliteration variants ("Trichy" → Tiruchirappalli);
- **concepts** — a ~55-word shared lexicon (`src/lib/semantic/concepts.ts` for English, `src/lib/language/tamil.ts` for Tamil) so an English and a Tamil headline compare in the same vocabulary;
- **actions** — a small ontology (`src/lib/semantic/actions.ts`) built from corpus failures: `approve` ≠ `discuss` ≠ `propose`, `close` ≠ `reopen`;
- **incident type** — fire / collapse / capsize / blast — a mismatch blocks a merge; a match at the same specific place is a positive co-location signal (v0.6);
- **date** — Tamil (`இன்று`/`நாளை`) and English relative dates resolved against publication;
- **quantities** — normalised (`120 mm` ≡ `12 cm`, `Rs 500 cr` ≡ `Rs 5 bn`);
- **embedding** — deterministic character-n-gram hash (`src/lib/semantic/embeddings.ts`), a retrieval / secondary signal only.

## Two-stage pipeline (`event-identity/index.ts`, wired into `cluster.ts`)

```
ARTICLE → signature → PERMISSIVE candidate generation (blocking by district /
specific place / strong entity / crisis-type / distinctive quantity / two shared
specific concepts for state-level pairs; "Tamil Nadu" is too hot to block on) →
multi-signal similarity → CONSERVATIVE decision gate → SAME / RELATED / PART-OF /
FOLLOW-UP / DIFFERENT / UNCERTAIN
```

Candidate generation is deliberately loose (a missed candidate is a false
negative); the decision gate is strict (a false merge is a fabricated
consensus). The lexical pass runs first and is unchanged; the semantic pass only
*adds* merges the lexical pass missed, and a **semantic veto** lets the
event-identity engine's fuller location model overrule a lexical headline match
(e.g. "boat off Karaikal" is Puducherry, not Nagapattinam).

## The decision (`event-identity/decide.ts`)

`IdentityDecision` — no hidden score. It carries the relation, a confidence
band, every signal, and the blockers. Hard blockers → `different`: different
states, sibling districts, conflicting actions, different hazard types,
different incident types, incompatible dates, reports > 5 days apart. A shared
**state / broad region alone is never `same`** — `same` needs a shared district
or a shared specific place.

Positive `same` paths (all require `sameLoc` + no contradiction penalty):

- shared strong entity + matching action/topic, or same action + high topic overlap → `high`;
- same action + topic overlap, or high topic + (action / semantic), or **two or more distinctive shared concepts** with semantic ≥ 0.45 → `moderate`;
- **same incident sub-type** (fire / collapse / capsize) at the same specific place with one more anchor → `moderate` (v0.6);
- same distinctive figure (`16 districts`, `90 kmph`) with a no-place headline → `moderate`;
- embedding-recovered paraphrase, still same place → `low`.

Cross-language (`ta` ↔ `en`) requires **structured agreement**: a shared
district/place **and** a compatible date **and** (a shared entity **or** the
same action **or** ≥2 shared specific concepts). Translation similarity alone is
never enough, and cross-language confidence is capped at Moderate.

Candidate generation (v0.6) additionally blocks on a **distinctive quantity**
(`district-count`, `speed`, `volume-rate`, `currency`) and, for two state-level
headlines, on **≥ 2 shared specific concepts** (order-independent) — so
"rain hits air & rail across TN" pairs reach the gate. The gate still decides.

## Merge policy

`high` and `moderate` merge. `low` is recorded but only merges same-publisher
follow-ups — it is the first place false positives appear
(`evaluation/reports/threshold-analysis.md`), so it is not allowed to create a
cross-publisher "corroborated" claim.

## Results (`npm run eval:claims`, `npm run eval:identity`)

| | v0.4 | v0.5 | v0.6 |
|---|---|---|---|
| Matching precision | 100% | 100% | **100%** |
| Claim-matching recall (corpus) | 59% | 89% | **100%** |
| English same-event recall | ≈59% | 94% | **100%** |
| Tamil ↔ Tamil recall | 12.5% | 82% | **100%** |
| Tamil ↔ English recall | — | 86% | **100%** |
| False corroboration (corpus) | 0 / 47 | 0 / 71 | **0 / 71** |
| Decision precision | — | 100% | **100%** |
| Candidate recall | — | 96% | **99%** |
| Corpus cases fully clean | 127 / 148 | 211 / 223 | **222 / 223** |

The corpus is small and hand-authored — enough to catch regressions, not a
population estimate. The one remaining corpus failure (`H07`) is a prediction /
attribution-extraction gap, unrelated to event identity. Full A/B on the frozen
148-case corpus: `evaluation/reports/ab-matcher.md`; the v0.6 recall work is
documented in `evaluation/reports/v0.6-false-negative-analysis.md`.

## Limitations

- The Tamil normaliser is suffix-stripping + a ~120-entry concept lexicon +
  ~55 place/org aliases — not a morphological analyser. Rare inflections and
  words outside the lexicon are still missed.
- Translation is an offline dictionary gloss (`DictionaryTranslationProvider`);
  no model translator is configured.
- Embeddings are a deterministic hash, not a trained model — good for recovering
  near-paraphrases, weak on genuine synonymy.
- State-level aggregate stories with no district match only via a shared
  distinctive figure or ≥ 2 shared specific concepts.
- Live data still surfaces borderline cross-language pairs the gate holds at
  `uncertain` — e.g. a quoted-headline form (`'… opens Mettur dam …'`) whose
  action the extractor does not yet read (`evaluation/reports/v0.6-live-audit.md`).
- No large model is required or used for the deployed build.
