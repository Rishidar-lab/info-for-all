/**
 * Political event identity specialist (v0.9, Phase C / D).
 *
 * Political stories about the same entities but DIFFERENT actions must not merge:
 * "CM announces scheme" ≠ "CM criticises opposition's scheme" ≠ "Opposition
 * alleges corruption in scheme". This module classifies the political ACTION and
 * SPEECH ACT of a headline and decides whether two are the same development.
 *
 * Deterministic, no model. Used by `cluster.ts::specialistVeto` (split-only) and
 * by the /politics coverage view.
 */

export type PoliticalAction =
  | "announce"
  | "launch"
  | "promise"
  | "criticise"
  | "allege"
  | "deny"
  | "respond"
  | "resign"
  | "appoint"
  | "remove"
  | "arrest"
  | "investigate"
  | "campaign"
  | "vote"
  | "pass-legislation"
  | "introduce-bill"
  | "court-ruling"
  | "administrative-order"
  | "protest"
  | "meet"
  | "coalition-action"
  | "election-result"
  | "scheme-action"
  | "other";

export type SpeechAct =
  | "assertion"
  | "allegation"
  | "denial"
  | "promise"
  | "prediction"
  | "appeal"
  | "order"
  | "announcement"
  | "criticism"
  | "question"
  | "response";

interface ActionMatcher {
  action: PoliticalAction;
  speech: SpeechAct;
  re: RegExp;
}

/** Order matters — the first match wins, so specific patterns come first. */
const ACTIONS: ActionMatcher[] = [
  { action: "court-ruling", speech: "order", re: /\b(high court|supreme court|sc |hc )\b.*\b(rules?|orders?|directs?|quashes?|sets? aside|stays?|dismisses?|upholds?|strikes? down)\b|\b(verdict|judgment|bench (?:said|held)|arbitral tribunal|tribunal (?:rules?|orders?))\b/i },
  { action: "arrest", speech: "assertion", re: /\b(arrest\w*|detain\w*|remand\w*|taken into custody|nabbed|held (?:in|for|by police)|sent to jail|granted bail|denied bail)\b/i },
  { action: "investigate", speech: "assertion", re: /\b(ed raids?|cbi (?:probe|raids?)|income tax raids?|it raids?|summoned by ed|chargesheet|vigilance (?:case|probe)|inquiry ordered|orders? (?:an )?(?:inquiry|probe)|opens? (?:an )?(?:investigation|probe|inquiry)|launches? (?:a )?(?:probe|investigation)|probe into|investigation into|registers? (?:a )?case|fir (?:filed|registered)|cb-cid)\b/i },
  { action: "resign", speech: "announcement", re: /\b(resign\w*|quits?|steps? down|tenders? resignation|withdraw\w* resignation|to step aside)\b/i },
  { action: "appoint", speech: "announcement", re: /\b(appoint\w*|takes? charge as|sworn in|named (?:as )?(?:governor|chief secretary|dgp|ceo|chairman)|elevated to|new (?:chief secretary|dgp|governor)|first ceo|pro tem)\b/i },
  { action: "remove", speech: "announcement", re: /\b(sacked|removed from (?:post|office)|dismissed from service|suspended from service|transferred out|shunted|dropped from (?:the )?cabinet)\b/i },
  { action: "introduce-bill", speech: "announcement", re: /\b(introduce[sd]? (?:a )?bill|moves? (?:a )?bill|tables? (?:a )?bill|bill introduced|draft (?:bill|law)|ordinance (?:promulgated|issued))\b/i },
  { action: "pass-legislation", speech: "announcement", re: /\b(assembly (?:passes|clears|adopts)|passes? (?:the )?bill|bill (?:passed|cleared|adopted)|enacts?|law (?:passed|comes into force))\b/i },
  { action: "vote", speech: "assertion", re: /\b(no-confidence (?:motion|vote)|floor test|division of votes|voting (?:begins|held)|trust vote)\b/i },
  { action: "election-result", speech: "assertion", re: /\b(wins? (?:the )?(?:seat|by-?election|bypoll|ward)|declared elected|leads? by|trailing by|counting (?:of votes )?(?:begins|underway)|results? (?:declared|out)|swept the polls)\b/i },
  { action: "coalition-action", speech: "announcement", re: /\b(joins? (?:hands with|congress|bjp|dmk|aiadmk|the alliance)|forms? (?:an )?alliance|seat[- ]sharing|poll (?:pact|tie-up)|merges? with|quits? the (?:alliance|front)|snaps? ties)\b/i },
  { action: "deny", speech: "denial", re: /\b(denies?|rejects? (?:the )?(?:allegation|charge|claim)|refutes?|dismisses? (?:as )?(?:baseless|false)|calls? (?:it|the charge) (?:false|baseless|politically motivated)|there is no (?:truth|substance))\b/i },
  { action: "allege", speech: "allegation", re: /\b(alleg\w+|accus\w+|levels? (?:a )?charge|claims? (?:corruption|irregularit|a scam|fraud)|charges? .* with|points? finger at)\b/i },
  { action: "criticise", speech: "criticism", re: /\b(criticis\w+|slams?|hits? out|jibes?|takes? a (?:dig|jibe)|flays?|lashes? out|mocks?|taunts?|attacks? (?:the )?(?:opposition|government|centre|state)|condemns?|blasts?|questions? the (?:government|decision|move)|dares?|challenges?)\b/i },
  { action: "respond", speech: "response", re: /\b(responds? to|counters?|hits? back|shoots? back|clarifies? on|reacts? to|first reaction|rebuts?|retorts?)\b/i },
  { action: "promise", speech: "promise", re: /\b(promises?|pledges?|assures?|vows?|will (?:provide|ensure|implement|waive|give)|guarantees?|commits? to)\b/i },
  { action: "protest", speech: "assertion", re: /\b(protest\w*|demonstrat\w*|takes? out (?:a )?(?:march|rally)|stages? (?:a )?(?:dharna|sit-in|walkout)|gherao|road[- ]?roko|rail[- ]?roko|hunger strike|boycotts? (?:the )?(?:proceedings|assembly)|black flags?)\b/i },
  { action: "campaign", speech: "assertion", re: /\b(campaign\w*|roadshow|padayatra|poll (?:tour|rally)|election (?:rally|tour)|public meeting|door[- ]to[- ]door|whistle[- ]stop)\b/i },
  { action: "meet", speech: "assertion", re: /\b(meets?|holds? talks?|calls? on|delegation (?:meets?|calls? on)|discusses? with|held a meeting|review meeting|all-party meeting)\b/i },
  { action: "administrative-order", speech: "order", re: /\b(collector (?:orders?|issues?|directs?)|government order|go issued|notifies? (?:new )?rules?|imposes? (?:a )?ban|section 144|prohibitory order|show-cause notice|guidelines? issued|tightens? (?:norms|rules)|comes? into effect)\b/i },
  { action: "scheme-action", speech: "announcement", re: /\b(welfare scheme|new scheme|cash transfer|free (?:bus|bicycles?|laptops?)|pension scheme|housing scheme|gold[- ]ring scheme|scheme (?:launched|extended|expanded|rolled out))\b/i },
  { action: "launch", speech: "announcement", re: /\b(launch(?:e[sd])?|inaugurat\w+|unveil\w+|flags? off|lays? (?:the )?foundation|dedicates? to the nation|rolls? out|kick(?:s|ed)? off)\b/i },
  { action: "announce", speech: "announcement", re: /\b(announce[sd]?|declares?|proposes?|to (?:set up|form|create|establish)|sanctions?|allocat\w+|approves?|clears? (?:a )?(?:project|proposal)|makes? (?:an )?announcement|says? will)\b/i },
];

const ACTOR_RE = /\b(cm|chief minister|dy cm|deputy cm|prime minister|pm|governor|minister|mla|mp|speaker|collector|mayor|dmk|aiadmk|bjp|congress|tvk|vck|pmk|ntk|aimim|ysrcp|opposition|government|centre|union government|state government|assembly|high court|supreme court|court|ed|cbi|cb-cid|election commission)\b/i;

export interface PoliticalEvent {
  action: PoliticalAction;
  speechAct: SpeechAct;
  /** rough object / topic — the noun phrase the action is about. */
  topic?: string;
  hasActor: boolean;
}

const TOPIC_STOP = new Set([
  "the", "a", "an", "of", "in", "on", "for", "to", "and", "over", "at", "as", "by", "with",
  "opposition", "government", "centre", "state", "assembly", "minister", "cm", "party",
]);

function topicOf(text: string): string | undefined {
  // the most salient content noun after the action verb — cheap heuristic
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !TOPIC_STOP.has(w));
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top?.[0];
}

export function detectPoliticalEvent(text: string): PoliticalEvent {
  for (const m of ACTIONS) {
    if (m.re.test(text)) {
      return { action: m.action, speechAct: m.speech, topic: topicOf(text), hasActor: ACTOR_RE.test(text) };
    }
  }
  return { action: "other", speechAct: "assertion", topic: topicOf(text), hasActor: ACTOR_RE.test(text) };
}

/** Actions that, when different, mean two DIFFERENT political developments. */
const INCOMPATIBLE: [PoliticalAction, PoliticalAction][] = [
  ["announce", "criticise"],
  ["announce", "allege"],
  ["launch", "criticise"],
  ["launch", "allege"],
  ["scheme-action", "criticise"],
  ["scheme-action", "allege"],
  ["promise", "criticise"],
  ["promise", "allege"],
  ["allege", "deny"],
  ["criticise", "deny"],
  ["allege", "respond"],
  ["criticise", "respond"],
  ["appoint", "criticise"],
  ["pass-legislation", "protest"],
  ["administrative-order", "protest"],
  ["election-result", "campaign"],
  ["announce", "investigate"],
  ["announce", "arrest"],
];

function incompatible(a: PoliticalAction, b: PoliticalAction): boolean {
  if (a === b) return false;
  return INCOMPATIBLE.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/**
 * Are two political headlines the SAME development? Conservative: only returns
 * false when the actions clearly conflict, or the speech acts conflict
 * (assertion of a fact vs an allegation of it), or one asserts a claim the
 * other denies. Missing signals do not, alone, split.
 */
export function samePoliticalEvent(a: PoliticalEvent, b: PoliticalEvent): boolean {
  if (incompatible(a.action, b.action)) return false;
  // an assertion of X and an allegation of X are different event-states
  if (
    (a.speechAct === "assertion" && b.speechAct === "allegation") ||
    (a.speechAct === "allegation" && b.speechAct === "assertion")
  ) {
    return false;
  }
  if (
    (a.speechAct === "allegation" && b.speechAct === "denial") ||
    (a.speechAct === "denial" && b.speechAct === "allegation")
  ) {
    return false;
  }
  return true;
}

// ── lightweight claim-thread relationships (Phase D) ──
export type ThreadRelation =
  | "responds-to"
  | "denies"
  | "supports"
  | "contradicts"
  | "updates"
  | "corrects"
  | "supersedes"
  | "related";

export function threadRelation(a: PoliticalEvent, b: PoliticalEvent): ThreadRelation | null {
  if (a.action === "deny" && (b.speechAct === "allegation" || b.action === "allege")) return "denies";
  if (a.action === "respond" && b.speechAct !== "response") return "responds-to";
  if (a.speechAct === "response" && b.speechAct === "criticism") return "responds-to";
  if (
    (a.speechAct === "allegation" && b.speechAct === "allegation" && a.topic === b.topic) ||
    (a.action === "investigate" && (b.action === "allege" || b.speechAct === "allegation"))
  ) {
    return "supports";
  }
  if (a.action === b.action && a.topic && a.topic === b.topic) return "updates";
  return null;
}
