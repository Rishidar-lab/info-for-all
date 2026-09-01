# Claim confidence — how IFA scores a claim

IFA v0.3 attaches a confidence score to every extracted claim. The score is
**deterministic, rule-based, and documented here**. It is not a truth rating and
it never requires a paid model.

Readers see a band — **High / Moderate / Low** — with the numeric score available
on the claim detail panel. No fake precision: the number exists to order claims
and to make the band boundaries legible, not to imply four-significant-figure
certainty.

## The formula

Implemented in [`src/lib/claims/confidence.ts`](../src/lib/claims/confidence.ts),
`scoreClaim()`.

| Factor | Adjustment | Why |
| --- | --- | --- |
| Base | **30** | Every claim starts from the same floor. |
| Independent source groups — 3 or more | **+32** | Several sources IFA believes are independent of each other. |
| Independent source groups — exactly 2 | **+24** | Two independent confirmations. |
| Independent source groups — 1, with ≥1 publisher | **+14** | Reported, but all support traces to one source group. |
| Independent source groups — 0 | **+0** | No corroboration yet. |
| A supporting primary-evidence record | **+18** | An official alert / government document backs the claim. |
| Direct reporting (claim type is not `attribution`) | **+6** | Stated as reporting, not as someone's quoted assertion. |
| Claim is an attributed statement | **−16** | "The minister said …" is the speaker's claim, not an established fact. |
| Recency — last seen < 6 h | **+6** | Fresh. |
| Recency — last seen < 24 h | **+2** | Recent. |
| Claim is disputed | **−22** | Sources genuinely disagree on part of it. |
| All support in one cross-publisher syndication group | **−8** | Looks like one wire copy re-run, not extra confirmation. |
| Average extraction confidence < 0.5 | **−6** | The rule that produced the claim is a weak match — wording may be loose. |

The result is clamped to **0–100**.

## Bands

| Band | Score | Shown as |
| --- | --- | --- |
| High | ≥ 70 | `High confidence` |
| Moderate | 40–69 | `Moderate confidence` |
| Low | < 40 | `Low confidence` |

## What the score deliberately ignores

- **Publisher politics.** IFA does not run left/centre/right ratings for Indian
  publications and no orientation label feeds the score.
- **Publication count on its own.** Ten outlets running one agency report is one
  independent group, not ten. See
  [`corroborate.ts`](../src/lib/claims/corroborate.ts).
- **Headline similarity.** Similar wording between unrelated stories does not
  raise confidence; only a shared *claim* (same predicate + object, or same rule
  match) does.

## Worked examples

- **"Mettur dam opened for water release"** — matched by the dam-release rule in
  three publishers' reporting, no dispute, seen in the last few hours:
  30 + 32 (≥3 groups) + 6 (direct) + 6 (recent) − 8 (one Hindu desk ran several
  pieces) = **66 → Moderate**.
- **"12 rescued, the minister said"** — one source, attributed:
  30 + 14 (1 group) − 16 (attributed) + 6 (recent) = **34 → Low**, status
  `attributed`. The number is *not* promoted to a factual claim unless a
  separate source or record supports it.
- **"Two killed" vs "five killed" with no clear time ordering** — both claims are
  marked `disputed`: 30 + 14 (1 group) + 6 (direct) − 22 (disputed) =
  **28 → Low**.
- **"Two killed" early, "six killed" three hours later** — the later figure is
  treated as an update: the "two killed" claim becomes `outdated`, the "six
  killed" claim carries an update record, and neither is marked `disputed`.

## Common Ground Index

The event-level CGI is **experimental** and is documented alongside the code in
[`src/lib/claims/cgi.ts`](../src/lib/claims/cgi.ts). It summarises the state of
*reporting* about an event (how much is corroborated, contradicted, or
single-voiced) and is never presented as a verdict on the event itself. It uses
none of the political-orientation signals IFA already refuses to compute.
