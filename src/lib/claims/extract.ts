import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { ClaimType } from "./types";
import { clean, detectLanguage } from "@/lib/live/text";
import { stripHeadlinePrefix } from "@/lib/live/entities";
import { parseNumberToken, parseQuantities } from "./quantity";

/**
 * A raw claim candidate drawn from ONE article sentence. Candidates that share a
 * `matchKey` are normalised into one Claim.
 *
 * v0.4 staged extraction:
 *   sentence  →  attribution detection
 *             →  quantity / figure extraction        (numeric claims)
 *             →  generic official-action rule        (closures, orders, releases)
 *             →  specific rules                      (weather warning, dam, s144…)
 *             →  bare attributed statement           (Phase 2/3 — "X said Y")
 *             →  one event-level claim per cluster
 */
export interface ClaimCandidate {
  matchKey: string;
  type: ClaimType;
  canonicalText: string;
  subjects: string[];
  predicates: string[];
  objects: string[];
  attribution?: string;
  figure?: { kind: string; value: number; raw: string };
  sourceText: string;
  sourceTextOriginal?: string;
  language: "ta" | "en" | "unknown";
  articleId: string;
  publisherId: string;
  sourceUrl: string;
  extractionConfidence: number;
}

// ── attribution ────────────────────────────────────────────────────────

/** Verbs that mark a statement as ATTRIBUTED — never promote these to bare fact. */
const ATTRIBUTION_VERBS =
  /\b(said|says|stated|announced|announces|claimed|claims|alleged|alleges|allege|accus\w+|asserted|expects?|expected|believes?|feared?|fears?|warns?|warned|told|according to|per the|per\s+the|estimated|estimates|projected|projects|projection|promised|denied|denies|confirmed|reiterated|added|indicated?|noted|forecasts?|forecast)\b/i;

/** Words that mark an ALLEGATION specifically (a contested assertion, not just a quote). */
const ALLEGATION_VERBS = /\b(alleg\w+|accus\w+|claim\w+|blam\w+|denounc\w+|slam\w+)\b/i;

/** Words that mark a PREDICTION / expectation about the future. */
const PREDICTION_CUES =
  /\b(expects?|expected to|likely to|forecasts?\b|forecast to|predicts?|projected to|projection|(?:could|may|might|would|will)\s+(?:cross|breach|rise|fall|intensify|weaken|reach|make landfall|be inundated|worsen|continue|persist|bring|hit|receive|see)|to (?:cross|make landfall|hit the coast)|set to|braces? for|is expected|anticipat\w+|in the next \d+|over the next|tomorrow|by (?:tonight|midnight|tomorrow|wednesday|thursday|friday))\b/i;

const SPEECH_VERB =
  "said|says|stated|announced|announces|claimed|claims|alleged|alleges|accused|asserted|asserts|warned|warns|told|confirmed|confirms|denied|denies|added|adds|reiterated|reiterates|promised|promises|believes?|expects?|expected|fears?|feared|estimated|estimates|projected|projects|noted|notes|indicated|indicates|forecast|forecasts";

const INSTITUTION =
  "police|officials?|authorities|the government|government|opposition|the minister|minister|chief minister|cm|collector|district administration|revenue officials?|revenue department|imd|india meteorological department|weather office|ndrf|sdrf|ndma|the court|high court|supreme court|hospital|doctors?|experts?|sources?|the fire department|fire department|railways?|corporation|dmk|aiadmk|bjp|congress|petition|activist|union|residents?|farmers?|scientist";

/** Speaker patterns: "<Speaker> said …", "… said <Speaker>", "According to <Speaker>", "…, <role> says". */
export function detectAttribution(text: string): string | undefined {
  const t = clean(text, 300);

  // 1. An institution keyword that sits before a speech / allegation verb — use
  //    the keyword itself as the speaker (robust to intervening words).
  const instRe = new RegExp(`\\b(${INSTITUTION})\\b`, "gi");
  let im: RegExpExecArray | null;
  while ((im = instRe.exec(t))) {
    const after = t.slice(im.index + im[0].length, im.index + im[0].length + 60);
    if (new RegExp(`^\\s*(?:[a-z][\\w'-]*\\s+){0,4}(?:${SPEECH_VERB}|alleg\\w+|accus\\w+|blam\\w+|slam\\w+|denounc\\w+)\\b`, "i").test(after)) {
      return tidySpeaker(im[1]!);
    }
  }

  // 2. Leading proper-noun name + speech verb (name words must be capitalised).
  let m = t.match(new RegExp(`^((?:[A-Z][\\w.'-]+)(?:\\s+[A-Z][\\w.'-]+){0,3})\\s+(?:${SPEECH_VERB})\\b`));
  if (m && !/\b(has|had|have|was|were|will|is|are|been)\b/i.test(m[1]!)) return tidySpeaker(m[1]!);

  // 3. "according to / per X", "said X"
  m = t.match(/\b(?:according to|per)\s+(?:the\s+)?([a-z][\w.'-]*(?:\s+[\w.'-]*){0,3}?)(?=[,.:;]|\s+(?:said|the|that|and|for|in|on)\b|$)/i);
  if (m) return tidySpeaker(m[1]!.replace(/[,.:;].*$/, ""));
  m = t.match(new RegExp(`\\b(?:said|says|told|per)\\s+(?:the\\s+)?((?:[A-Z][\\w.'-]+)(?:\\s+[A-Z][\\w.'-]+){0,3})\\b`));
  if (m) return tidySpeaker(m[1]!);

  // 4. speech verb then institution ("… announced the district administration")
  m = t.match(new RegExp(`\\b(?:${SPEECH_VERB})\\s+(?:by\\s+|the\\s+|that\\s+the\\s+)?(${INSTITUTION})\\b`, "i"));
  if (m) return tidySpeaker(m[1]!);
  return undefined;
}

function tidySpeaker(s: string): string {
  return s
    .replace(/^the\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── figures ────────────────────────────────────────────────────────────

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const NUM =
  "([\\d,]+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|dozen|a dozen)";

/** Which statistic kind does a bare "toll rose to N" refer to, from the surrounding words? */
function kindFromContext(t: string): string | null {
  if (/\b(dead|died|killed|deaths?|toll|lost their lives|fatalit\w+)\b/.test(t)) return "deaths";
  if (/\b(injur\w+|hurt|wounded)\b/.test(t)) return "injuries";
  if (/\b(missing|unaccounted|untraceable)\b/.test(t)) return "missing";
  if (/\b(rescued|evacuat\w+|shifted|moved to (?:relief|safety)|pulled to safety|relief camps?)\b/.test(t)) return "rescued";
  if (/\b(rain(?:fall)?|downpour)\b/.test(t)) return "rainfall_mm";
  if (/\b(houses?|huts?|homes?|dwellings?)\s+(?:were\s+)?(?:damaged|destroyed|collapsed)\b/.test(t)) return "houses_damaged";
  if (/\bcusecs?\b/.test(t)) return "discharge_cusecs";
  return null;
}

/** Numeric facts with clear semantics. Returns kind + value + raw. */
function parseFigures(text: string): { kind: string; value: number; raw: string }[] {
  const t = text.toLowerCase();
  const out: { kind: string; value: number; raw: string }[] = [];
  const seen = new Set<string>();
  const push = (kind: string, re: RegExp) => {
    const g = new RegExp(re, "gi");
    let m: RegExpExecArray | null;
    while ((m = g.exec(t))) {
      // Guard "no one killed" → not a death figure.
      if (/^one$/i.test(m[1]) && /\bno\s+$/i.test(t.slice(0, m.index))) continue;
      const n = parseNumberToken(m[1]);
      if (n == null || !Number.isFinite(n)) continue;
      const k = `${kind}:${n}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ kind, value: n, raw: m[0].trim() });
    }
  };

  const P = "(?:people\\s+|persons?\\s+|residents?\\s+|fishermen\\s+|were\\s+|are\\s+|got\\s+|still\\s+|reported\\s+|feared\\s+|confirmed\\s+|rain-related\\s+|flood-related\\s+|weather-related\\s+|lightning\\s+|storm-related\\s+){0,3}";
  push("deaths", new RegExp(`\\b${NUM}\\s+${P}(?:killed|dead|died|deaths|lost their lives)\\b`));
  push("injuries", new RegExp(`\\b${NUM}\\s+${P}(?:injured|hurt|wounded)\\b`));
  push("missing", new RegExp(`\\b${NUM}\\s+${P}(?:missing|unaccounted)\\b`));
  // "two fishermen from X go missing", "three workers still not traced"
  push(
    "missing",
    new RegExp(
      `\\b${NUM}\\s+(?:fishermen|persons?|people|residents?|workers?|labourers?|crew|sailors?|passengers?|students?|tourists?)\\b[^.]{0,45}?\\b(?:go missing|goes missing|went missing|reported missing|still missing|missing|unaccounted|untraceable|not (?:been )?traced)\\b`,
    ),
  );
  // verb-first forms: "kills 3", "injures 12", "leaves 7 dead", "damages 150 huts"
  push("deaths", new RegExp(`\\b(?:kills?|killing|claim(?:s|ed)? the lives of|leaves?)\\s+${NUM}\\b(?![^.]{0,15}\\binjured)`));
  push("injuries", new RegExp(`\\b(?:injur(?:es|ed|ing)|hurts?|wounds?)\\s+${NUM}\\b`));
  push("missing", new RegExp(`\\bleaves?\\s+${NUM}\\s+(?:unaccounted|missing)`));
  // "toll / deaths ... at N", "count of ... at N"
  push("deaths", new RegExp(`\\b(?:toll|deaths?|dead|killed|fatalit\\w+)\\b[^.]{0,20}?\\bat\\s+${NUM}\\b`));
  push("injuries", new RegExp(`\\b(?:injured|injuries|hurt)\\b[^.]{0,20}?\\bat\\s+${NUM}\\b`));
  push(
    "rescued",
    new RegExp(
      `\\b${NUM}\\s+(?:people\\s+|persons?\\s+|residents?\\s+)?(?:rescued|evacuated|shifted|moved to (?:relief|safety)|pulled (?:to safety|out|from)|shifted to relief camps?)\\b`,
    ),
  );
  push("rescued", new RegExp(`\\b(?:rescued|evacuated|shifted|moved|pull(?:ed)? out)\\s+(?:out\\s+)?${NUM}\\s+(?:people|persons?|residents?|villagers?)?\\b`));
  push("rescued", new RegExp(`\\b${NUM}\\s+(?:shifted|moved)\\s+to\\s+(?:relief|safety)`));
  push("teams", new RegExp(`\\b(?:deploys?|deployed|stations?|stationed|sends?|sent|rushes?|rushed)\\s+${NUM}\\s+(?:ndrf\\s+|sdrf\\s+|rescue\\s+|relief\\s+)?teams?\\b`));
  push("teams", new RegExp(`\\b${NUM}\\s+(?:ndrf|sdrf|rescue|relief)\\s+teams?\\b`));
  push("wind_kmph", new RegExp(`\\b${NUM}\\s?(?:kmph|km/?h|kph|km per hour)\\b`));
  push("flights_delayed", new RegExp(`\\b${NUM}\\s+flights?\\s+(?:were\\s+)?(?:delayed|delays)\\b`));
  push("flights_delayed", new RegExp(`\\b${NUM}\\s+flight\\s+delays?\\b`));
  push("rainfall_mm", new RegExp(`\\b${NUM}\\s?mm\\s+(?:of\\s+)?rain`));
  push("houses_damaged", new RegExp(`\\b${NUM}\\s+(?:houses?|huts?|homes?|dwellings?)\\s+(?:were\\s+)?(?:damaged|destroyed|collapsed)`));
  push("houses_damaged", new RegExp(`\\b(?:damages?|destroys?|damage (?:rises|rose|climbs) to)\\s+${NUM}\\s+(?:houses?|huts?|homes?)`));
  push("discharge_cusecs", new RegExp(`\\b${NUM}[\\d,]*\\s?cusecs?\\b`));
  // reservoir / dam water level in feet — "level at 118 ft", "118 ft of 120 ft"
  if (/\b(dam|reservoir|storage|water level|full level|lake|nears? full|against a full)\b/.test(t)) {
    push("water_level_ft", new RegExp(`\\b${NUM}(?:\\.\\d+)?\\s?(?:ft|feet)\\b`));
  }
  push("relief_camps", new RegExp(`\\b${NUM}\\s+(?:flood\\s+)?relief\\s+(?:camps?|centres?|shelters?)\\b`));
  // people sheltered: "relief camps house/shelter/hold N", "camp population now N"
  push("rescued", new RegExp(`\\brelief camps?\\b[^.]{0,20}?\\b(?:house|houses|shelter|shelters|hold|holds)\\s+${NUM}\\b`));
  push("rescued", new RegExp(`\\bcamp (?:population|count)\\b[^.]{0,15}?\\b(?:now|at|reaches?)\\s+${NUM}\\b`));
  // currency: normalise "Rs 500 crore" and "Rs 5 billion" to the same rupee value.
  for (const q of parseQuantities(t)) {
    if (q.dimension === "currency") {
      const k = `amount_inr:${q.value}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ kind: "amount_inr", value: q.value, raw: q.raw });
      }
    }
    // a large count near a relocation verb → people sheltered / rescued
    if (
      q.dimension === "count" &&
      /\b(shifted|moved|evacuat\w+|relocat\w+|relief camps?|to safety|housed|sheltered)\b/.test(t)
    ) {
      const k = `rescued:${q.value}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ kind: "rescued", value: q.value, raw: q.raw });
      }
    }
  }

  // "toll / count rose to N", "revised the total to N", "now N", "reaches N"
  const riseRe = new RegExp(
    `\\b(?:toll|count|number|total|tally|figure)\\b[^.]{0,40}?\\b(?:rise|rises|rose|risen|climb|climbs|climbed|mount|mounts|mounted|reach|reaches|reached|touch|touches|touched|revised (?:the (?:total|figure|count) )?to|now(?: at)?|up to|stands? at|jump|jumps|jumped|swell|swells|swelled|grow|grows|grew)\\s+(?:at|to)?\\s*${NUM}\\b`,
    "gi",
  );
  let rm: RegExpExecArray | null;
  while ((rm = riseRe.exec(t))) {
    const n = parseNumberToken(rm[1]);
    const kind = kindFromContext(t);
    if (n != null && kind) {
      const k = `${kind}:${n}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ kind, value: n, raw: rm[0].trim() });
      }
    }
  }
  // "rescue count reaches N", "evacuations cross N", "X pulled to safety"
  const actRe = new RegExp(
    `\\b(?:rescue|rescued|evacuation|evacuations|evacuated|shelter|sheltered|shifted|moved)\\b[^.]{0,25}?\\b(?:count|number|tally)?\\s*(?:reach|reaches|reached|cross|crosses|crossed|rise|rises|risen|climb|climbs|climbed|now|hit|hits|touch|touches|touched|to)\\s+(?:to\\s+)?${NUM}\\b`,
    "gi",
  );
  while ((rm = actRe.exec(t))) {
    const n = parseNumberToken(rm[1]);
    if (n != null) {
      const k = `rescued:${n}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ kind: "rescued", value: n, raw: rm[0].trim() });
      }
    }
  }
  push("rescued", new RegExp(`\\b${NUM}\\s+(?:pulled|brought)\\s+to\\s+safety`));
  push("houses_damaged", new RegExp(`\\b(?:damage (?:rises|rose) to|damaged)\\s+${NUM}\\s+(?:houses?|huts?)`));

  // rainfall stated as "N cm" — normalise to mm so it matches an "N mm" figure.
  for (const q of parseQuantities(t)) {
    if (q.dimension === "length" && /\brain/.test(t)) {
      const k = `rainfall_mm:${q.value}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ kind: "rainfall_mm", value: q.value, raw: q.raw });
      }
    }
  }

  return out;
}

// ── generic official-action rule ───────────────────────────────────────

const SUBJECT_CLASS: { re: RegExp; cls: string; noun: string; type?: ClaimType }[] = [
  { re: /\b(schools?|colleges?|educational institutions?|classes|anna university|universit(?:y|ies))\b/i, cls: "education", noun: "Schools / colleges" },
  { re: /\b(semester )?exams?\b/i, cls: "exams", noun: "Examinations" },
  { re: /\b(suburban )?(trains?|rail services?|railways?|emu services?|rail traffic|rail and|air and rail)\b/i, cls: "rail", noun: "Train services", type: "event" },
  { re: /\bmetro\b/i, cls: "metro", noun: "Metro services", type: "event" },
  { re: /\bflights?\b|\bair(?:port)? operations?\b/i, cls: "air", noun: "Flights", type: "event" },
  { re: /\bbus(?:es)? services?\b|\bstate transport\b/i, cls: "bus", noun: "Bus services", type: "event" },
  { re: /\b(power (?:supply|cut|shutdown)?|electricity|tangedco)\b/i, cls: "power", noun: "Power supply", type: "event" },
  { re: /\b(fishing|fishermen|fisherfolk|venture into (?:the )?sea|put to sea)\b/i, cls: "fishing", noun: "Fishing" },
  { re: /\bsection\s*1?44\b|\bprohibitory orders?\b/i, cls: "section-144", noun: "Prohibitory orders (Section 144)" },
  { re: /\bevacuat\w+\b|\bmove(?:d|s)? residents\b|\bresidents (?:were )?moved out\b|\bmoved out of low-lying\b|\bshift(?:ed)? residents\b|\brelocat\w+ residents\b/i, cls: "evacuation", noun: "Evacuation" },
  { re: /\brelief (?:camps?|centres?|shelters?)\b/i, cls: "relief-camps", noun: "Relief camps", type: "event" },
  { re: /\b(?:public |local |government )?holiday\b/i, cls: "holiday", noun: "A public holiday" },
  { re: /\b(mettur|bhavani|amaravathi|sathanur|krishnagiri|vaigai|reservoir)\b[^.]{0,20}\bdam\b|\bdam\b[^.]{0,20}\b(shutters?|storage|level|release)\b/i, cls: "dam", noun: "Dam", type: "event" },
];

const PREDICATE_SYN: { re: RegExp; pred: string }[] = [
  { re: /\b(closed?|shut(?:s|ting|down)?|remain closed|stay shut|holiday declared|declared a?\s*holiday|holiday for)\b/i, pred: "closed" },
  { re: /\b(suspend\w*|halt\w*|stopped?|call(?:ed)? off|off the tracks|not (?:operate|run)|disrupt\w*|hit by|paralys\w+)\b/i, pred: "suspended" },
  { re: /\bcut\b|\bcuts\b|\boutage\b|\bsnapped\b/i, pred: "suspended" },
  { re: /\b(cancel\w*)\b/i, pred: "cancelled" },
  { re: /\b(bans?|banned|banning|prohibit\w*|barred|advised not to|not to venture|kept off|no fishing)\b/i, pred: "banned" },
  { re: /\b(postpone\w*|put off|defer\w*|reschedul\w*)\b/i, pred: "postponed" },
  { re: /\b(open\w*|release\w*|discharg\w*|lift(?:ed|s)? (?:shutters|gates))\b/i, pred: "opened" },
  { re: /\b(impose\w*|clamp\w*|promulgat\w*|comes? into force|in force|slap\w*)\b/i, pred: "imposed" },
  { re: /\b(order\w*|direct\w*|move (?:residents|people)|relocat\w*)\b/i, pred: "ordered" },
  { re: /\b(divert\w*)\b/i, pred: "diverted" },
  { re: /\b(restore\w*|resume\w*|reopen\w*|back to normal)\b/i, pred: "restored" },
  { re: /\b(set up|open\w*|establish\w*|arrang\w*)\b/i, pred: "opened" },
  { re: /\b(declared?|announce\w*|approv\w*|sanction\w*)\b/i, pred: "declared" },
];

interface ActionMatch {
  cls: string;
  noun: string;
  pred: string;
  type: ClaimType;
}

/** Predicates that make sense for each subject class. Anything else is noise. */
const CLASS_PREDICATES: Record<string, Set<string>> = {
  education: new Set(["closed", "suspended", "postponed", "restored"]),
  exams: new Set(["postponed", "cancelled", "restored"]),
  rail: new Set(["suspended", "cancelled", "diverted", "restored"]),
  metro: new Set(["suspended", "restored"]),
  air: new Set(["suspended", "cancelled", "diverted", "restored"]),
  bus: new Set(["suspended", "cancelled", "diverted", "restored"]),
  power: new Set(["suspended", "restored"]),
  fishing: new Set(["banned", "restored"]),
  "section-144": new Set(["imposed", "restored"]),
  evacuation: new Set(["ordered"]),
  "relief-camps": new Set(["opened"]),
  dam: new Set(["opened"]),
  holiday: new Set(["declared"]),
};

/** Sentences that are about a REACTION to an action, not the action itself. */
const REACTION_CUES =
  /\b(welcome[sd]?|hail[sed]*|laud[sed]*|oppos\w+|protest\w*|slam\w*|criticis\w+|criticiz\w+|condemn\w+|demand[sed]*|urge[sd]?|appeal[sed]*|question\w*|flay\w*|assure[sd]?|reacts?|reaction|express\w* (?:concern|anger|happiness))\b/i;

function matchAction(s: string): ActionMatch | null {
  if (REACTION_CUES.test(s)) return null;
  const subject = SUBJECT_CLASS.find((c) => c.re.test(s));
  if (!subject) return null;
  let pred = PREDICATE_SYN.find((p) => p.re.test(s))?.pred;
  // education + "holiday" always means closed
  if (subject.cls === "education" && /\bholiday\b/i.test(s)) pred = "closed";
  // a public holiday is "declared", never "closed"
  if (subject.cls === "holiday") pred = "declared";
  if (subject.cls === "dam" && /\b(open|opened|release|released|discharg|shutter)/i.test(s)) pred = "opened";
  if (!pred) return null;
  const allowed = CLASS_PREDICATES[subject.cls];
  if (allowed && !allowed.has(pred)) return null;
  // A "restored / resumed" negation of a prior suspension is still the same claim family.
  return {
    cls: subject.cls,
    noun: subject.noun,
    pred,
    type: subject.type ?? "official-statement",
  };
}

// ── normalised token key ───────────────────────────────────────────────

const SYN: Record<string, string> = {
  shut: "close", closed: "close", shutdown: "close", closure: "close", holiday: "close",
  ordered: "order", declared: "declare", announced: "announce",
  suspended: "suspend", halted: "suspend", cancelled: "cancel", banned: "ban",
  warned: "warn", warning: "warn", alert: "warn",
  killed: "die", dead: "die", died: "die", deaths: "die",
  injured: "injure", hurt: "injure", wounded: "injure",
  rescued: "rescue", evacuated: "evacuate", shifted: "evacuate",
  rainfall: "rain", downpour: "rain", showers: "rain",
  released: "release", opened: "open",
};

const KEY_STOP = new Set([
  "the", "and", "for", "are", "was", "will", "has", "have", "had", "with", "from", "that", "this",
  "amid", "over", "into", "after", "news", "today", "latest", "report", "reports", "watch", "video",
  "tamil", "nadu", "india", "state", "says", "said", "new", "big", "top",
]);

/** Normalised token key of a phrase, for matching claims across wordings. */
function keyOf(text: string): string {
  return clean(stripHeadlinePrefix(text), 400)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => SYN[w] ?? w)
    .filter((w) => w.length > 2 && !KEY_STOP.has(w))
    .sort()
    .join(" ");
}

// ── specific rules (kept, but routed through consistent keys) ───────────

interface Rule {
  id: string;
  type: ClaimType;
  match: (text: string) => { predicate: string; object: string; subject?: string } | null;
  baseConfidence: number;
}

const RULES: Rule[] = [
  {
    id: "weather-warning",
    type: "official-statement",
    baseConfidence: 0.82,
    match: (t) => {
      const m =
        t.match(/\b(red|orange|yellow)\s+alert\b/i) ||
        t.match(/\b(heavy|very heavy|extremely heavy)\s+rain(?:fall)?\s+(?:warning|alert|likely|forecast)/i);
      if (!m) return null;
      return { subject: "IMD / weather authority", predicate: "issued", object: `a ${m[1].toLowerCase()} rainfall warning` };
    },
  },
  {
    id: "section-144",
    type: "official-statement",
    baseConfidence: 0.85,
    match: (t) => {
      const m = t.match(/\bsection\s*1?44\b|\bprohibitory orders?\b/i);
      return m ? { subject: "district authorities", predicate: "imposed", object: "prohibitory orders (Section 144)" } : null;
    },
  },
  {
    id: "govt-announcement",
    type: "official-statement",
    baseConfidence: 0.6,
    match: (t) => {
      const m = t.match(
        /\b(government|minister|cm|chief minister|assembly|collector)\b.{0,20}?\b(announced?|approved?|sanctioned?|cleared?|launched?)\b\s+(.{4,60})/i,
      );
      if (!m) return null;
      return { subject: m[1].toLowerCase(), predicate: "announced", object: clean(m[3], 60) };
    },
  },
];

// ── extraction ─────────────────────────────────────────────────────────

/** Extract claim candidates from every article of a verified cluster. */
export function extractCandidates(cluster: LiveCluster, articles: LiveArticle[]): ClaimCandidate[] {
  const out: ClaimCandidate[] = [];
  const eventId = cluster.id;

  for (const a of articles) {
    const sentences = [
      stripHeadlinePrefix(a.title),
      ...(a.excerpt ? a.excerpt.split(/(?<=[.!?])\s+|\s+[—–]\s+/) : []),
    ]
      .map((s) => clean(s, 300))
      .filter((s) => s.length > 12);

    const seenKeys = new Set<string>();
    const emit = (c: Omit<ClaimCandidate, "articleId" | "publisherId" | "sourceUrl">) => {
      if (seenKeys.has(c.matchKey)) return;
      seenKeys.add(c.matchKey);
      out.push({ ...c, articleId: a.id, publisherId: a.publisher, sourceUrl: a.url });
    };

    for (const s of sentences) {
      const lang = detectLanguage(s);
      const attribution = ATTRIBUTION_VERBS.test(s) ? detectAttribution(s) : undefined;
      const isPrediction = PREDICTION_CUES.test(s);
      const isAllegation = ALLEGATION_VERBS.test(s);

      // ── numeric statistic claims (value is part of the key) ──────────
      for (const fig of parseFigures(s)) {
        const canonical = attribution
          ? `${cap(attribution)} said ${figurePhrase(fig)}.`
          : `${cap(figurePhrase(fig))}.`;
        emit({
          matchKey: `${eventId}:stat:${fig.kind}:${fig.value}`,
          type: attribution ? "attribution" : "statistic",
          canonicalText: canonical,
          subjects: attribution ? [attribution] : [fig.kind],
          predicates: [fig.kind],
          objects: [String(fig.value)],
          attribution,
          figure: fig,
          sourceText: s,
          sourceTextOriginal: lang === "ta" ? s : undefined,
          language: lang,
          extractionConfidence: attribution ? 0.7 : 0.58,
        });
      }

      // ── generic official-action claim ───────────────────────────────
      const act = matchAction(s);
      if (act) {
        const base = `${act.noun} ${predPhrase(act.pred)}`.replace(/\s+/g, " ").trim();
        const attributed = attribution && act.type !== "event";
        emit({
          matchKey: `${eventId}:action:${act.cls}:${act.pred}`,
          type: attributed ? "attribution" : isPrediction ? "prediction" : act.type,
          canonicalText: attributed ? `${cap(attribution!)} said ${lower(base)}.` : `${base}.`,
          subjects: [act.noun],
          predicates: [act.pred],
          objects: [],
          attribution,
          sourceText: s,
          sourceTextOriginal: lang === "ta" ? s : undefined,
          language: lang,
          extractionConfidence: attributed ? 0.62 : 0.72,
        });
      }

      // ── specific rules ──────────────────────────────────────────────
      for (const rule of RULES) {
        const r = rule.match(s);
        if (!r) continue;
        const subj = r.subject ?? "the event";
        const base = `${cap(subj)} ${r.predicate}${r.object ? ` ${r.object}` : ""}`.replace(/\s+/g, " ").trim();
        const attributed = attribution && rule.type !== "event";
        emit({
          matchKey: `${eventId}:rule:${rule.id}`,
          type: attributed && rule.type === "official-statement" ? "attribution" : rule.type,
          canonicalText: attributed ? `${cap(attribution!)} said ${lower(base)}.` : `${base}.`,
          subjects: [subj],
          predicates: [r.predicate],
          objects: [r.object],
          attribution,
          sourceText: s,
          sourceTextOriginal: lang === "ta" ? s : undefined,
          language: lang,
          extractionConfidence: rule.baseConfidence * (attributed ? 0.9 : 1),
        });
      }

      // ── bare attributed / allegation / prediction statement ─────────
      // Phase 2/3: "the minister said X", "the opposition alleged Y",
      // "officials expect Z" MUST become a claim of their own — attributed,
      // never a bare fact — even when no other rule fired.
      const rawForecastDump =
        /\bisol(?:ated)? places\b|\bissued in past\b|\bnowcast\b|\bat (?:a few|some) places over\b|\bvery likely to (?:occur|affect|commence)\b|\baccompanied with\b|\d+\.\d+°?\s?[nsew]\b/i.test(s);
      if (
        (attribution || isAllegation || isPrediction) &&
        !act &&
        parseFigures(s).length === 0 &&
        s.length <= 220 &&
        !rawForecastDump
      ) {
        const speaker = attribution ?? (isAllegation ? guessAllegationSpeaker(s) : guessPredictionSpeaker(s));
        const kind: ClaimType = isAllegation ? "allegation" : isPrediction ? "prediction" : "attribution";
        // Key on the normalised content so two sources attributing the same
        // statement merge into one claim.
        const contentKey = keyOf(s).split(" ").slice(0, 8).join(" ") || "statement";
        emit({
          matchKey: `${eventId}:${kind === "allegation" ? "alleg" : kind === "prediction" ? "pred" : "attr"}:${contentKey}`,
          type: kind,
          canonicalText: buildAttributedText(s, speaker, kind),
          subjects: speaker ? [speaker] : [],
          predicates: [],
          objects: [],
          attribution: speaker,
          sourceText: s,
          sourceTextOriginal: lang === "ta" ? s : undefined,
          language: lang,
          extractionConfidence: speaker ? 0.6 : 0.45,
        });
      }
    }

    // ── one "the event happened" claim per cluster ────────────────────
    const headLang = detectLanguage(a.title);
    const headText = clean(stripHeadlinePrefix(a.title), 200);
    emit({
      matchKey: `${eventId}:head`,
      type: "event",
      canonicalText: headText,
      subjects: [],
      predicates: [],
      objects: [],
      sourceText: headText,
      sourceTextOriginal: headLang === "ta" ? clean(a.title, 200) : undefined,
      language: headLang,
      extractionConfidence: 0.45,
    });
  }
  return out;
}

// ── phrasing helpers ───────────────────────────────────────────────────

function predPhrase(pred: string): string {
  switch (pred) {
    case "closed": return "were closed";
    case "suspended": return "were suspended";
    case "cancelled": return "were cancelled";
    case "banned": return "was banned";
    case "postponed": return "were postponed";
    case "opened": return "was opened";
    case "imposed": return "were imposed";
    case "ordered": return "was ordered";
    case "deployed": return "were deployed";
    case "diverted": return "were diverted";
    case "restored": return "were restored";
    case "declared": return "was declared";
    default: return pred;
  }
}

function figurePhrase(f: { kind: string; value: number }): string {
  const n = f.value.toLocaleString("en-IN");
  const person = f.value === 1 ? "person" : "people";
  switch (f.kind) {
    case "deaths": return `${n} ${person} were reported killed`;
    case "injuries": return `${n} ${person} were reported injured`;
    case "missing": return `${n} ${person} reported missing`;
    case "rescued": return `${n} ${person} reported rescued or evacuated`;
    case "rainfall_mm": return `${n} mm of rainfall was recorded`;
    case "houses_damaged": return `${n} houses were reported damaged`;
    case "discharge_cusecs": return `${n} cusecs of water was released`;
    case "water_level_ft": return `the reservoir water level was reported at ${n} ft`;
    case "relief_camps": return `${n} relief camps were opened`;
    case "teams": return `${n} rescue teams were deployed`;
    case "wind_kmph": return `winds of ${n} kmph were recorded or forecast`;
    case "flights_delayed": return `${n} flights were delayed`;
    case "amount_inr": return `₹${(f.value / 1e7).toLocaleString("en-IN")} crore was allocated`;
    default: return `${n} ${f.kind}`;
  }
}

function guessAllegationSpeaker(s: string): string | undefined {
  const m = s.match(new RegExp(`\\b(${INSTITUTION})\\b`, "i"));
  if (m) return tidySpeaker(m[1]!);
  const c = s.match(/^([A-Z][\w.'-]*(?:\s+[A-Za-z][\w.'-]*){0,3})\s+(?:alleg\w+|accus\w+|claim\w+|blam\w+|slam\w+)/);
  return c ? tidySpeaker(c[1]!) : undefined;
}

function guessPredictionSpeaker(s: string): string | undefined {
  const m = s.match(/\b(imd|india meteorological department|weather office|officials?|authorities|forecasters?|scientists?)\b/i);
  return m ? tidySpeaker(m[1]!) : undefined;
}

function buildAttributedText(s: string, speaker: string | undefined, kind: ClaimType): string {
  const core = clip(stripLeadSpeaker(clean(s, 200).replace(/\s+/g, " ").trim()), 150);
  const who = speaker && speaker.length <= 40 ? cap(speaker) : undefined;
  if (kind === "allegation") return who ? `${who} alleged: ${core}` : `Allegation reported: ${core}`;
  if (kind === "prediction") return who ? `${who} forecast: ${core}` : `Forecast reported: ${core}`;
  return who ? `${who} stated: ${core}` : `Statement reported: ${core}`;
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
}

const SPEECH_TAIL =
  /(?:said|says|stated|announced|announces|alleged|alleges|accused|claimed|claims|warned|warns|expects?|expected|believes?|noted|added|told reporters|confirmed|reiterated)/i;

/** Strip a leading OR trailing "X said" / "according to X" so the assertion reads cleanly. */
function stripLeadSpeaker(s: string): string {
  const out = s
    .replace(/^according to [^,]+,\s*/i, "")
    .replace(new RegExp(`^(?:more than |over |nearly |about |around |at least |as many as )?`, "i"), "")
    .replace(new RegExp(`^[A-Za-z][\\w.'-]*(?:\\s+[A-Za-z][\\w.'-]*){0,4}\\s+${SPEECH_TAIL.source}\\s+(?:that\\s+)?`, "i"), "")
    .replace(new RegExp(`[,;]?\\s*(?:the\\s+)?[A-Za-z][\\w .'-]{0,34}?\\s+${SPEECH_TAIL.source}\\.?\\s*$`, "i"), "")
    .trim();
  return out || s;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export { keyOf, parseFigures, MONTHS };
