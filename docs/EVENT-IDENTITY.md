# Event identity & semantic recall — v0.5

v0.4 matched events by lexical headline overlap. Paraphrases and anything across
scripts fell through: English same-fact recall ≈ 59%, Tamil ↔ Tamil ≈ 12%,
Tamil ↔ English not implemented. v0.5 adds a structured event-identity engine.

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
- **incident type** — fire / collapse / capsize / blast — a mismatch blocks a merge;
- **date** — Tamil (`இன்று`/`நாளை`) and English relative dates resolved against publication;
- **quantities** — normalised (`120 mm` ≡ `12 cm`, `Rs 500 cr` ≡ `Rs 5 bn`);
- **embedding** — deterministic character-n-gram hash (`src/lib/semantic/embeddings.ts`), a retrieval / secondary signal only.

## Two-stage pipeline (`event-identity/index.ts`, wired into `cluster.ts`)

```
ARTICLE → signature → PERMISSIVE candidate generation (blocking by district /
specific place / strong entity / crisis-type; "Tamil Nadu" is too hot to block
on) → multi-signal similarity → CONSERVATIVE decision gate → SAME / RELATED /
PART-OF / FOLLOW-UP / DIFFERENT / UNCERTAIN
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
different incident types, incompatible dates. A shared **state / broad region
alone is never `same`** — `same` needs a shared district or a shared specific
place.

Cross-language (`ta` ↔ `en`) requires **structured agreement**: a shared
district/place **and** a compatible date **and** (a shared entity **or** the
same action **or** ≥2 shared specific concepts). Translation similarity alone is
never enough, and cross-language confidence is capped at Moderate.

## Merge policy

`high` and `moderate` merge. `low` is recorded but only merges same-publisher
follow-ups — it is the first place false positives appear
(`evaluation/reports/threshold-analysis.md`), so it is not allowed to create a
cross-publisher "corroborated" claim.

## Results (`npm run eval:claims`, `npm run eval:identity`)

| | v0.4 | v0.5 |
|---|---|---|
| Matching precision | 100% | 100% |
| English same-event recall | ≈59% | **94%** |
| Tamil ↔ Tamil recall | 12.5% | **82%** |
| Tamil ↔ English recall | — | **86%** |
| False corroboration (corpus) | 0 / 47 | **0 / 71** |
| Decision precision | — | **100%** |
| Candidate recall | — | **96%** |

Full A/B on the frozen 148-case corpus: `evaluation/reports/ab-matcher.md`.

## Limitations

- The Tamil normaliser is suffix-stripping + a ~90-word concept lexicon + ~50
  place/org aliases — not a morphological analyser. Rare inflections and words
  outside the lexicon are missed.
- Translation is an offline dictionary gloss (`DictionaryTranslationProvider`);
  no model translator is configured.
- Embeddings are a deterministic hash, not a trained model — good for recovering
  near-paraphrases, weak on genuine synonymy.
- State-level aggregate stories with no district ("6 rain deaths across Tamil
  Nadu") match only via a shared distinctive figure.
- No large model is required or used for the deployed build.
