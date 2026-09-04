# IFFA — engineering case study

*A Tamil Nadu-first news-evidence engine that is deliberately honest about what
it doesn't know.*

**Live:** https://rishidar-lab.github.io/info-for-all ·
**Repo:** https://github.com/Rishidar-lab/info-for-all ·
**Stack:** Next.js 16 (App Router, `output: export`), React 19, TypeScript
(strict), Tailwind v4, Playwright, Vitest · **Runtime deps:** 6 ·
**Infra:** GitHub Pages only — no server, no database, no LLM in the deployed
build, no paid services.

> **On AI assistance:** IFFA was built rapidly with heavy use of an AI coding
> assistant (Claude Code) as a pair — architecture, implementation, tests and
> docs. The engineering judgement in what follows — the invariants, the
> deliberate scope cuts, the decision to *withhold* rather than fabricate — is
> the project's, and is what this case study is about.

---

## 1. The problem

News aggregators optimise for *volume of coverage*. That produces a specific
failure: ten outlets running one wire dispatch look like ten confirmations, an
allegation hardens into a fact through repetition, and a reader can't tell a
primary record from a re-write of a press release. For Tamil Nadu specifically,
no global product handles the Tamil↔English split or district-level geography
well.

IFFA's thesis: **the useful, differentiated thing is the evidence structure
underneath the news** — who *independently* reported an event, what the reports
agree and disagree on, whether a primary record exists, and how framing splits
across language and ownership — presented without inventing precision the models
don't have.

## 2. Constraints (self-imposed)

| Constraint | Why |
|---|---|
| No LLM in the deployed build | Determinism, auditability, zero cost, no vendor. Every displayed assertion must be reproducible from the inputs. |
| Static export to GitHub Pages | Forces the whole pipeline to be a pure function: feeds in → JSON → HTML. No hidden server state. |
| No paid infrastructure | The project must be sustainable at zero marginal cost. |
| Five invariants | (1) withholding is a success state; (2) no LLM in any publish path; (3) every displayed assertion is traceable to a source; (4) bias axes are *documented, not inferred*; (5) "parity" with commercial products is never claimed. |

## 3. Architecture

A deterministic pipeline, ~28k lines of application/library TypeScript across 15
subsystems in `src/lib/`:

```
RSS / Atom / CAP feeds (~36)
  → normalise · geo-classify (38 TN districts, EN + Tamil) · crisis · category
  → two-pass event clustering  (lexical, then a conservative semantic gate)
  → grounded claims            (corroboration / contradiction / attribution, provenance kept)
  → source-family independence (shared owner · wire credit · 5-gram overlap · PR echo)
  → primary-record research    (link existing official records; echo-collapse gate)
  → trend + editorial ranking  (8 visible factors, geometric mean)
  → DeterministicBriefSynthesizer + verifyBrief firewall  (EN + Tamil, citation-bound)
  → shards + 962 static pages  → GitHub Pages
```

### Decisions worth calling out

**Event identity is conservative by design.** Two reports merge only when time
window, geography and event type agree *and* either headlines overlap or a
structured semantic signature matches. When unsure, it keeps them apart and
labels the relationship `uncertain`. Cross-language pairs never merge on a shared
"Tamil Nadu" alone. Measured: 99.1% candidate recall, 100% decision precision on
a 223-case corpus — recall is deliberately traded for precision.

**Independence is a graph collapse, not a count.** `resolveSourceFamilies()`
folds publishers to one family on a shared corporate parent (a hand-built
registry), a shared wire credit, ≥85% 5-gram body overlap, or a press-release
echo. `genuineIndependentFamilies` — families that did their *own* reporting — is
what gates a brief. This is the anti-manipulation core: a story can have 15 URLs
and still be one confirmation.

**The brief is synthesised, then a firewall deletes anything it can't prove.**
`DeterministicBriefSynthesizer` builds prose only from cited reporting and
primary records. `verifyBrief` then checks every sentence — claims, numbers,
dates, entities, attribution — against its sources and *drops* any that don't
trace. If nothing survives, the brief is withheld and the page says why. On the
snapshot: 0 unsupported sentences published, ~50% of front-door stories get a
brief, the rest are single-source and correctly withheld.

**Calibration is measured and the weak parts are not hidden.** Evidence-status
classification tests at ~94%; stance at **54.7%** and framing at
**75% / 41% precision/recall** — all on small, not-yet-human-verified corpora.
Because stance/framing aren't calibrated, IFFA shows *observed* coverage and
framing, gated by sample size, and **never a bias percentage**. The evaluation
dashboard (`/methodology/quality`) publishes the bad numbers.

## 4. Tamil / English handling

The original Tamil headline, excerpt, entities and source text are always kept.
An English semantic representation is added *alongside*, never instead. Tamil
district names are recognised in native script; Tamil digits are normalised for
number-drift checks. Tamil and English coverage of the same event feed the same
identity and brief systems — one story, two languages, no duplicate.

## 5. Test & evaluation strategy

- **478 unit tests** (Vitest) — the deterministic subsystems, property-style
  where possible (e.g. "Tamil original text is always preserved", "no fabricated
  consensus in the snapshot").
- **84 E2E tests** (Playwright, desktop + mobile-390) — every route loads with no
  fatal error and no horizontal overflow at 320–1440px; the brief renders; the
  withheld state renders; progressive loading works; mobile nav works; every nav
  link resolves; pages server-render with JS disabled.
- **7 hand-labelled evaluation corpora** with `npm run eval:*` — claim quality,
  event identity, category, evidence status, stance, framing, plus a
  71-case false-corroboration set that must stay at 0%.
- **11 release gates** (`npm run quality-gate`) — hard pass/fail on the corpus
  numbers and on snapshot invariants (no fabricated consensus, every attributed
  claim keeps its speaker, no model-only claim rendered).
- A **frozen engine** contract: `src/lib/{claims,event-identity,semantic,
  language,independence}` must stay byte-identical against a tagged release, so
  downstream features can't silently drift the core.

## 6. Productization (v0.12)

The v0.11 engine was strong but the product read like an internal dashboard.
v0.12 kept the engine and rebuilt the surface — see
[docs/releases/v0.12-productization.md](releases/v0.12-productization.md):

- One card component replacing two, with model reasoning and raw tokens moved off
  the card and onto the story page.
- Progressive loading: `/india` HTML **1,054,627 B → ~106,000 B**; mobile page
  height **21,969 px → ~7,200 px**. First page server-rendered, "load more"
  hydrates from a compact shard.
- A real mobile navigation menu; `aria-current`; a global focus-visible ring;
  `prefers-reduced-motion`.
- Every page fully server-renders again (removed a route-level Suspense boundary
  that was shipping a JS-only "Loading…" shell into `<main>`).
- Every in-scope story (763) gets a page — fixes a real dead internal link and
  makes every story deep-linkable.
- 4 dead npm packages removed; 9 dead components removed; the repo root reduced
  to 3 files.

## 7. Known limitations

- Rule-based clustering / classification can err; the linked publisher is
  authoritative.
- Stance and framing are not calibrated — hence no bias rating.
- The corpus is ~36 feeds; a single-newsroom story often has no independent
  second source *in IFFA* even when wider coverage exists. Widening this
  ("Coverage Discovery") is the next major track.
- Not v1.0 — see the release notes for the remaining criteria.

## 8. What was learned / demonstrated

- Designing a system where **"we don't know" is a first-class, tested output** —
  and defending it against the constant pressure to show *something*.
- A deterministic NLP pipeline (clustering, claim extraction, independence
  resolution, brief synthesis) with an explicit hallucination firewall, no LLM.
- Evaluation-driven development: publishing your weak metrics and letting them
  gate the release.
- Shipping a fast, accessible, static product surface over a large derived
  dataset — measured, not guessed.
- Bilingual (Tamil/English) information design without duplicating events.
