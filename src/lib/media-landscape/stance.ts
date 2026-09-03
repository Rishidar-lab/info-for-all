/**
 * Per-article coverage stance toward a political entity (v0.10, revised v0.11).
 *
 * Deterministic. NOT a bias score, NOT a motive claim — a reading of how the
 * reporting *describes* an entity in ONE article. It distinguishes the ARTICLE'S
 * OWN framing (`authorStance`) from a quoted actor's framing (`quotedStance`),
 * because "BJP slams DMK" does not make the *publisher* critical of the DMK.
 *
 * Measured against evaluation/corpora/stance-gold.json (`npm run eval:stance`).
 * The classifier is deliberately conservative: it returns `unclear` rather than
 * guess, and observed alignment is gated on this measured performance.
 */
import type { CoverageStance } from "./types";
import type { PoliticalEntity } from "./entities";

/** The article's OWN voice evaluating the entity — loaded editorial framing. */
const AUTHOR_POSITIVE =
  /\b(masterstroke|game[- ]?changer|landmark|historic (?:win|move|step)|wins? over|vindicat\w+|delivers? on|fulfil(?:s|led)? (?:its )?promise|triumph\w*|boost\w* for|shot in the arm for|feather in the cap)\b/i;
const AUTHOR_NEGATIVE =
  /\b(total failure|abject failure|in disarray|in tatters|debacle|fiasco|floundering|floundered|u-?turn|broken promise|betrayed?|betrayal|stalling|sits on|dithering|apathy|more questions than answers|leadership or theatre|caught (?:napping|flat[- ]footed)|on the back ?foot|humiliat\w+|setback for|blow to|embarrassment for)\b/i;
const AUTHOR_MIXED_CUE = /\b(mixed (?:report card|bag|picture)|but (?:critics|the opposition|questions|concerns)|yet (?:critics|questions)|however,? (?:critics|the opposition))\b/i;

/** Attribution — the article is REPORTING a political exchange, not taking a side. */
const REPORTING_VERB =
  /\b(alleges?|accus(?:es|ed|ation)|slams?|blasts?|hits? out|flays?|mocks?|taunts?|rubbishes?|dismisses?|counters?|responds?|reacts?|hits? back|welcomes?|hails?|lauds?|praises?|condemns?|demands?|urges?|says?|said|according to|claims? that|charges?|questions?|defends?|denies?|rejects?)\b/i;
/** Cues that a REPORTED stance is negative / positive toward the target. */
const REPORTED_NEGATIVE =
  /\b(alleg\w+|accus\w+|slams?|blasts?|hits? out|flays?|condemns?|criticis\w+|failure|failed to|scam|corruption|neglect\w+|inaction|demands? (?:the )?resignation|under fire|questions? (?:the )?government|betrayed?)\b/i;
const REPORTED_POSITIVE = /\b(hails?|lauds?|praises?|welcomes?|thanks?|credits?|congratulat\w+|backs?|supports?)\b/i;

/** Plain report verbs — an event described without evaluation. */
const NEUTRAL_LEAD =
  /\b(announce\w*|inaugurat\w+|open(?:s|ed)?|launch\w*|releases?|issues?|notifies?|orders?|approves?|clears?|passes?|adopts?|tables?|introduces?|appoints?|nominates?|schedules?|to (?:hold|table|meet|visit|inaugurate|launch|introduce|reconvene|take up)|holds?|meets?|met|visits?|visited|inspects?|reviews?|sets? aside|upholds?|dismisses?|quashes?|strikes? down|directs?|recommends?|constitutes?|reshuffles?|convenes?|data shows?|reports?|records?|rises? (?:to|by)|falls? (?:to|by)|slips? to|stands? at|reaches?|declines? to (?:entertain|interfere)|calls? on|to be held)\b/i;

export interface StanceRead {
  /** The article's own framing toward the entity. */
  stance: CoverageStance;
  /** A quoted actor's framing, when it differs from the author's. */
  quotedStance?: CoverageStance;
  phrases: string[];
}

/** Read one article's stance toward `entity` from its headline (+ excerpt). */
export function readStance(text: string, entity: PoliticalEntity | undefined): StanceRead {
  const phrases: string[] = [];
  const grab = (re: RegExp) => {
    const m = re.exec(text);
    if (m) phrases.push(m[0].trim());
    return !!m;
  };

  const authorPos = grab(AUTHOR_POSITIVE);
  const authorNeg = grab(AUTHOR_NEGATIVE);
  const authorMixed = grab(AUTHOR_MIXED_CUE);

  // 1. The article's OWN voice evaluates the entity → author stance.
  if (authorMixed || (authorPos && authorNeg)) return { stance: "mixed", phrases };
  if (authorNeg) return { stance: "critical", phrases };
  if (authorPos) return { stance: "supportive", phrases };

  // 2. The article REPORTS a political exchange ("X slams Y", "X alleges", "X: quote").
  //    The AUTHOR stance is neutral-descriptive; the quoted actor may be critical
  //    or supportive of the target.
  const reporting = grab(REPORTING_VERB);
  if (reporting) {
    let quoted: CoverageStance | undefined;
    if (REPORTED_NEGATIVE.test(text) && REPORTED_POSITIVE.test(text)) quoted = "mixed";
    else if (REPORTED_NEGATIVE.test(text)) quoted = "critical";
    else if (REPORTED_POSITIVE.test(text)) quoted = "supportive";
    return { stance: "neutral-descriptive", quotedStance: quoted, phrases };
  }

  // 3. A plain event report.
  if (grab(NEUTRAL_LEAD)) return { stance: "neutral-descriptive", phrases };

  // 4. Too little signal — say so.
  void entity;
  return { stance: "unclear", phrases };
}
