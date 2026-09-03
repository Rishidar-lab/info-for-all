/**
 * Per-article coverage stance toward a political entity (v0.10).
 *
 * Deterministic. This is NOT a bias score and NOT a motive claim — it is a
 * reading of how the reporting *describes* an entity in one article: supportive,
 * critical, neutral-descriptive, mixed, or unclear. Every call exposes the
 * phrases it read.
 */
import type { CoverageStance } from "./types";
import type { PoliticalEntity } from "./entities";

const SUPPORTIVE =
  /\b(hails?|lauds?|praises?|welcomes?|thanks?|credits?|boost|milestone|achievement|delivers?|fulfil\w+|keeps? (?:its )?promise|on track|record (?:high|collections|growth)|successful\w*|relief (?:to|for)|benefit\w* (?:to|for)|gift\w* (?:to|for))\b/i;
const CRITICAL =
  /\b(slams?|blasts?|hits? out|attacks?|accuses?|alleges?|flays?|condemns?|criticis\w+|failure|failed to|u-?turn|broken promise|betrayed?|scam|corruption|nepotism|mismanage\w+|neglect\w+|apathy|inaction|backlash|outrage|protest\w* (?:against|over)|demands? (?:the )?resignation|under fire|cornered|on the back ?foot|questions? (?:the )?government)\b/i;
const NEUTRAL_LEAD =
  /\b(announces?|says?|to (?:hold|table|introduce|launch|inaugurate|visit|meet)|releases?|issues?|notifies?|orders?|approves?|clears?|passes?|tables?|schedules?|data shows?|reports?|records?|rises? (?:to|by)|falls? (?:to|by)|stands? at|reaches?)\b/i;

export interface StanceRead {
  stance: CoverageStance;
  phrases: string[];
}

/** Read one article's stance toward `entity` from its headline + excerpt. */
export function readStance(text: string, entity: PoliticalEntity | undefined): StanceRead {
  const low = text.toLowerCase();
  const sup = SUPPORTIVE.exec(text);
  const crit = CRITICAL.exec(text);
  const neu = NEUTRAL_LEAD.exec(text);

  const phrases: string[] = [];
  if (sup) phrases.push(sup[0].trim());
  if (crit) phrases.push(crit[0].trim());
  if (neu && !sup && !crit) phrases.push(neu[0].trim());

  // If the story names an entity but a critical cue targets *someone else*
  // (an opposition figure criticising), that is still "critical coverage of the
  // debate" but we do not over-claim: unclear unless the entity is near the cue.
  const entityNear = entity
    ? entity.aliases.some((a) => {
        const i = low.indexOf(a);
        if (i < 0) return false;
        const j = crit ? low.indexOf(crit[0].toLowerCase()) : -1;
        return j >= 0 ? Math.abs(i - j) < 80 : true;
      })
    : false;

  if (sup && crit) return { stance: "mixed", phrases };
  if (crit && (entityNear || !entity)) return { stance: "critical", phrases };
  if (sup && (entityNear || !entity)) return { stance: "supportive", phrases };
  if (neu) return { stance: "neutral-descriptive", phrases };
  if (crit || sup) return { stance: "unclear", phrases };
  return { stance: "unclear", phrases: [] };
}
