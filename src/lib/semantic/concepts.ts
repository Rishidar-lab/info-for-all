/**
 * English text → language-neutral concept tokens (v0.5, Phase 14).
 *
 * Mirrors `TAMIL_CONCEPTS` in `src/lib/language/tamil.ts` so an English headline
 * and a Tamil headline can be compared in the SAME small vocabulary. This is a
 * concept lexicon, not translation — it never claims to render a sentence.
 */

const CONCEPTS: Record<string, string[]> = {
  school: ["school", "schools", "classes"],
  college: ["college", "colleges", "university", "universities", "anna university"],
  institution: ["educational institution", "educational institutions"],
  holiday: ["holiday", "local holiday", "public holiday"],
  closure: ["closed", "closure", "shut", "shutdown", "stay shut", "remain closed"],
  exam: ["exam", "exams", "examination", "semester exam"],
  dam: ["dam", "dams", "reservoir", "reservoirs", "shutters", "storage", "full level", "full capacity"],
  reservoir: ["reservoir", "storage level", "full reservoir level", "approaches full"],
  rain: ["rain", "rainfall", "downpour", "showers", "rains"],
  "heavy-rain": ["heavy rain", "very heavy rain", "extremely heavy rain", "torrential rain"],
  flood: ["flood", "floods", "flooding", "waterlogging", "inundation", "inundated", "submerged", "deluge", "river swells", "river in spate", "in spate", "banks overflow", "banks overflowing", "overflowed its banks", "river rising", "water level rising"],
  warning: ["warning", "warned", "warns"],
  alert: ["alert", "alerts", "on alert"],
  red: ["red alert"],
  orange: ["orange alert"],
  yellow: ["yellow alert"],
  order: ["order", "ordered", "directive", "directed"],
  announcement: ["announced", "announcement", "announces"],
  evacuation: ["evacuation", "evacuated", "evacuate", "moved residents", "move residents", "shifted residents", "shift residents", "relocated", "residents out", "people out of", "moved to safety", "shifted to safety", "moved to safer", "taken to safety", "moved to higher ground"],
  rescue: ["rescue", "rescued", "pulled out", "pulled to safety", "brought to safety", "winched"],
  "rough-sea": ["rough sea", "sea turned rough", "sea is rough", "high waves", "swell surge", "kallakkadal", "sea surge", "turbulent sea", "sea churning", "rough sea conditions"],
  boat: ["boat", "boats", "catamaran", "fishing vessel", "fishing vessels", "mechanised boats", "country boats"],
  landfall: ["landfall", "make landfall", "makes landfall", "cross the coast", "crosses the coast", "cross coast", "to cross the coast", "hit the coast", "cross the tamil nadu coast"],
  damage: ["road damaged", "road caved in", "road subsidence", "subsidence", "caved in", "washed away", "breach", "breached", "sustained damage", "extensive damage", "structural damage"],
  diversion: ["diverted", "diversion", "route diverted", "traffic diverted", "rerouted", "route change", "traffic rerouted", "changed route", "alternate route"],
  death: ["killed", "dead", "died", "deaths", "toll", "fatalities", "lost their lives"],
  injury: ["injured", "hurt", "wounded", "injuries"],
  release: ["released", "release", "water released", "discharge", "opened the dam", "let out"],
  water: ["water", "cauvery water", "drinking water"],
  district: ["district", "districts"],
  administration: ["administration", "district administration", "collectorate"],
  government: ["government", "govt", "state government"],
  weather: ["weather", "meteorological"],
  centre: ["meteorological centre", "weather centre", "met centre"],
  cyclone: ["cyclone", "cyclonic storm", "deep depression", "landfall", "make landfall", "makes landfall", "cross the coast", "crosses the coast", "brace for", "to cross", "weaken into"],
  sea: ["sea", "at sea"],
  coast: ["coast", "coastal", "coastline", "shore"],
  fishermen: ["fishermen", "fisherfolk", "fisher community"],
  ban: ["ban", "banned", "prohibited", "barred"],
  "section-144": ["section 144", "prohibitory orders", "prohibitory order"],
  traffic: ["traffic", "road traffic"],
  disruption: ["disrupted", "disruption", "suspended", "halted", "hit by", "affected", "stopped", "off the tracks"],
  rail: ["train", "trains", "rail", "railway", "suburban", "emu"],
  flight: ["flight", "flights", "air traffic", "airport"],
  power: ["power", "electricity", "power supply"],
  "power-cut": ["power cut", "power supply cut", "power shutdown", "outage", "outages", "power suspended", "supply snapped", "supply cut", "no power"],
  "ndrf-teams": ["ndrf team", "ndrf teams", "ndrf battalion", "ndrf battalions", "ndrf unit", "ndrf units", "ndrf personnel", "rescue teams", "sdrf team"],
  festival: ["temple festival", "car festival", "chithirai festival", "festival procession", "aadi festival"],
  landslide: ["landslide", "landslip", "mudslide", "hill slip"],
  bridge: ["bridge", "causeway", "culvert"],
  heatwave: ["heatwave", "heat wave", "severe heat"],
  airport: ["airport", "air traffic control"],
  relief: ["relief", "relief work", "flood relief"],
  camp: ["camp", "camps", "relief camp", "relief centre", "shelter"],
  road: ["road", "roads", "highway"],
  police: ["police"],
  minister: ["minister"],
  "chief-minister": ["chief minister", " cm ", "cm "],
};

/** Concept tokens for a piece of English text. */
export function englishConceptTokens(text: string): Set<string> {
  const t = " " + text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ") + " ";
  const out = new Set<string>();
  for (const [concept, forms] of Object.entries(CONCEPTS)) {
    if (forms.some((f) => t.includes(f.length > 3 ? f : ` ${f} `))) out.add(concept);
  }
  return out;
}

/** Concepts that are near-synonyms for event-identity purposes. */
export const CONCEPT_EQUIV: [string, string][] = [
  ["holiday", "closure"],
  ["warning", "alert"],
  ["heavy-rain", "rain"],
  ["release", "water"],
  ["flood", "rain"],
  ["evacuation", "rescue"],
  ["power-cut", "power"],
  ["sea", "coast"],
];

/**
 * Concepts too generic to establish that two reports are the same event. Sharing
 * "government" or "rain" is background, not signal.
 */
export const GENERIC_CONCEPTS = new Set([
  "government", "administration", "district", "weather", "centre", "police",
  "minister", "chief-minister", "water", "road", "order", "announcement",
]);

/** Loose overlap of two concept sets, treating the equivalences above as matches. */
export function conceptOverlap(a: Set<string>, b: Set<string>): { shared: string[]; score: number } {
  const shared = new Set<string>();
  for (const x of a) {
    if (GENERIC_CONCEPTS.has(x)) continue;
    if (b.has(x)) shared.add(x);
    for (const [p, q] of CONCEPT_EQUIV) {
      if ((x === p && b.has(q)) || (x === q && b.has(p))) shared.add(x);
    }
  }
  const specificA = [...a].filter((c) => !GENERIC_CONCEPTS.has(c));
  const specificB = [...b].filter((c) => !GENERIC_CONCEPTS.has(c));
  const denom = Math.min(specificA.length, specificB.length) || 1;
  return { shared: [...shared], score: shared.size / denom };
}
