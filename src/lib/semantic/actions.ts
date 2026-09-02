/**
 * Action ontology (v0.5, Phase 7).
 *
 * Deliberately SMALL. Built only from actual benchmark failures, plus the
 * negative pairs that must NOT collapse. Two claims/events describe the same
 * action if their surface verbs map to the same family — but "discuss" is not
 * "approve", "propose" is not "approve", and "consider closing" is not "close".
 *
 * Each family lists surface forms (regex-ish substrings, lower-cased match).
 */

export type ActionFamily =
  | "close"
  | "welcome"
  | "reopen"
  | "approve"
  | "propose"
  | "discuss"
  | "announce"
  | "evacuate"
  | "release-water"
  | "warn"
  | "impose-order"
  | "lift-order"
  | "suspend"
  | "resume"
  | "rescue"
  | "deploy"
  | "arrest"
  | "die"
  | "injure"
  | "damage"
  | "inspect"
  | "protest"
  | "allege";

const FAMILIES: Record<ActionFamily, string[]> = {
  close: [
    "closed", "closure", "shut", "shuts", "shut down", "remain closed", "stay shut", "kept shut",
    "declared a holiday", "holiday declared", "holiday for", "ordered to close", "ordered closure",
    "suspend classes", "no classes", "call off classes",
  ],
  reopen: ["reopen", "re-open", "resume classes", "back to normal", "reopened"],
  approve: [
    "approved", "approves", "approval", "cleared", "clears", "sanctioned", "sanctions",
    "gave approval", "gave the nod", "gives the nod", "give the nod", "green-lit", "greenlit",
    "okayed", "ratified", "passed the", "nod for", "nod to",
  ],
  propose: ["proposed", "proposes", "proposal", "mooted", "plan to", "plans to", "seeks approval", "to introduce"],
  discuss: ["discussed", "discusses", "discussion", "deliberated", "reviewed", "review meeting", "held talks", "considered"],
  announce: [
    "announced", "announces", "announcement", "declared", "declares", "unveiled", "rolled out",
    "said it would", "set to introduce", "notified", "issued an order",
  ],
  evacuate: [
    "evacuated", "evacuation", "ordered evacuation", "moved residents", "move residents", "moving residents",
    "shifted residents", "shift residents", "relocated", "moved out", "move ", "moved to safety",
    "shifted to relief", "moved to relief", "shifted to camp", "moved to camp", "housed in relief",
    "vacate", "asked to leave", "residents out", "people out of", "shifted to safer",
  ],
  "release-water": [
    "released water", "water released", "water release", "opened the dam", "dam opened", "opened dam",
    "open the dam", "opened shutters", "open shutters", "open the shutters", "dam shutters", "shutters",
    "lifted the shutters", "lift the shutters", "discharge", "discharged", "surplus water", "let out water",
    "let out", "outflow", "released from", "water to be released", "release water",
  ],
  warn: [
    "red alert", "orange alert", "yellow alert", "warning issued", "issued a warning", "issues red alert",
    "sounded an alert", "sounds red alert", "storm warning", "flood warning", "rain warning",
    "cyclone warning", "put on alert", "on high alert", "alert issued", "alert sounded", "alert for",
    "warns of", "warned of", " alert ", "issued an alert",
  ],
  "impose-order": [
    "section 144", "prohibitory orders", "imposed", "clamped", "promulgated", "curfew", "banned",
    "prohibited", "restrictions imposed", "curbs imposed", "came into force", "fishing banned",
    "advised not to", "asked not to", "warned against venturing", "not to venture", "kept ashore",
    "no fishing", "fishing ban",
  ],
  "lift-order": ["lifted", "withdrew", "relaxed restrictions", "eased curbs", "revoked"],
  suspend: [
    "suspended", "suspends", "halted", "halts", "stopped", "disrupted", "disrupts", "disrupt",
    "disruption", "cancelled", "canceled", "cancels", "called off", "put off", "postponed",
    "hit by", "traffic hit", "affected by", "paralysed", "grounded flights", "off the tracks",
    "services affected", "not operate", "were hit", "power cut", "supply cut", "cut power",
    "power supply cut", "snapped", "power shutdown",
  ],
  resume: ["resumed", "restored", "back in service", "operations normal"],
  rescue: [
    "rescued", "rescue", "pulled out", "pulled to safety", "brought to safety", "saved", "winched",
    "plucked to safety", "shifted to relief camp", "sheltered",
  ],
  deploy: ["deployed", "deploys", "stationed", "pressed into service", "rushed to", "sent teams"],
  arrest: ["arrested", "detained", "taken into custody", "held", "booked"],
  die: ["killed", "dead", "died", "deaths", "toll", "lost their lives", "fatalities", "perished"],
  injure: ["injured", "hurt", "wounded", "injuries"],
  damage: ["damaged", "destroyed", "collapsed", "razed", "washed away", "submerged", "inundated", "flooded"],
  inspect: ["inspected", "visited", "toured", "surveyed", "took stock", "review of relief"],
  protest: ["protested", "protest", "demonstration", "staged a", "blocked road", "road roko", "agitation", "strike", "oppose", "opposed", "condemn"],
  welcome: ["welcome", "welcomed", "welcomes", "hails", "hailed", "lauds", "lauded", "thanks", "thanked", "expresses joy"],
  allege: ["alleged", "alleges", "accused", "accuses", "claimed", "blamed", "flayed", "slammed", "hit out"],
};

/** Families that are commonly confused and must be kept distinct. */
export const ACTION_CONFUSIONS: [ActionFamily, ActionFamily][] = [
  ["approve", "propose"],
  ["approve", "discuss"],
  ["announce", "discuss"],
  ["close", "reopen"],
  ["impose-order", "lift-order"],
  ["suspend", "resume"],
  ["welcome", "protest"],
];

/** All action families a piece of text expresses. */
export function detectActions(text: string): Set<ActionFamily> {
  const t = " " + text.toLowerCase().replace(/\s+/g, " ") + " ";
  const out = new Set<ActionFamily>();
  for (const [family, forms] of Object.entries(FAMILIES) as [ActionFamily, string[]][]) {
    if (forms.some((f) => t.includes(f))) out.add(family);
  }
  return out;
}

export type ActionRelation = "same" | "compatible" | "conflicting" | "unrelated" | "unknown";

/** Compare the actions of two texts. */
export function actionRelation(a: Set<ActionFamily>, b: Set<ActionFamily>): ActionRelation {
  if (a.size === 0 || b.size === 0) return "unknown";
  for (const [x, y] of ACTION_CONFUSIONS) {
    if ((a.has(x) && b.has(y) && !b.has(x)) || (a.has(y) && b.has(x) && !a.has(y))) return "conflicting";
  }
  const shared = [...a].filter((f) => b.has(f));
  if (shared.length > 0) return "same";
  // casualty/damage families co-occur with the same incident
  const incidentFams: ActionFamily[] = ["die", "injure", "damage", "rescue"];
  if ([...a].some((f) => incidentFams.includes(f)) && [...b].some((f) => incidentFams.includes(f))) {
    return "compatible";
  }
  // a weather WARNING and the ORDER it triggers (fishing ban, section 144,
  // evacuation) describe the same civic response
  const responseFams: ActionFamily[] = ["warn", "impose-order", "evacuate", "close"];
  if ([...a].some((f) => responseFams.includes(f)) && [...b].some((f) => responseFams.includes(f))) {
    return "compatible";
  }
  return "unrelated";
}
