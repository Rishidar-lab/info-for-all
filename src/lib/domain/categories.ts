/**
 * IFFA news-domain taxonomy (v0.7, Phase C).
 *
 * A deterministic, explainable keyword classifier — same design as
 * `src/lib/live/crisis.ts` and `src/lib/live/geo.ts`: plain arrays, every result
 * carries the terms that matched and a reason, and it never guesses sentiment.
 *
 * Priority order (spec):  CRISIS > POLITICS > FINANCE > SPORTS > OTHER_RELEVANT
 * Entertainment and celebrity are recognised but DISABLED by default — excluded
 * from default surfaces, still filterable, never deleted from the dataset.
 */

export type CategoryId =
  | "crisis"
  | "politics"
  | "finance"
  | "sports"
  | "other-relevant"
  | "entertainment"
  | "celebrity";

export const CATEGORY_ORDER: CategoryId[] = [
  "crisis",
  "politics",
  "finance",
  "sports",
  "other-relevant",
  "entertainment",
  "celebrity",
];

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  crisis: "Crisis",
  politics: "Politics",
  finance: "Finance",
  sports: "Sports",
  "other-relevant": "Other relevant",
  entertainment: "Entertainment",
  celebrity: "Celebrity",
};

/** Ranking weight for the trend engine. Crisis dominates; celebrity is near-zero. */
export const CATEGORY_WEIGHT: Record<CategoryId, number> = {
  crisis: 1.0,
  politics: 0.72,
  finance: 0.6,
  sports: 0.42,
  "other-relevant": 0.3,
  entertainment: 0.05,
  celebrity: 0.02,
};

/** Categories shown on default surfaces. Entertainment / celebrity opt-in only. */
export const DEFAULT_ENABLED: Record<CategoryId, boolean> = {
  crisis: true,
  politics: true,
  finance: true,
  sports: true,
  "other-relevant": true,
  entertainment: false,
  celebrity: false,
};

export interface CategoryClassification {
  category: CategoryId;
  subCategory?: string;
  matchedTerms: string[];
  reason: string;
  confidence: "high" | "medium" | "low";
}

export interface CategoryMatcher {
  category: CategoryId;
  subCategory: string;
  any: string[];
}

// ── CRISIS ─────────────────────────────────────────────────────────────
const CRISIS: CategoryMatcher[] = [
  { category: "crisis", subCategory: "cyclone", any: ["cyclone", "cyclonic storm", "deep depression", "landfall"] },
  { category: "crisis", subCategory: "flood", any: ["flood", "floods", "flooding", "inundation", "waterlogging", "deluge", "submerged", "flash flood"] },
  { category: "crisis", subCategory: "heavy_rain", any: ["heavy rain", "very heavy rain", "torrential rain", "red alert", "orange alert", "rainfall warning", "downpour"] },
  { category: "crisis", subCategory: "weather", any: ["imd warning", "weather warning", "squall", "gale warning", "thunderstorm warning", "lightning warning"] },
  { category: "crisis", subCategory: "heatwave", any: ["heatwave", "heat wave", "severe heat", "heat advisory"] },
  { category: "crisis", subCategory: "drought", any: ["drought", "water scarcity", "rain deficit", "crop failure due to"] },
  { category: "crisis", subCategory: "earthquake", any: ["earthquake", "quake of magnitude", "tremor felt", "seismic"] },
  { category: "crisis", subCategory: "landslide", any: ["landslide", "landslip", "mudslide", "rockfall", "hill slip"] },
  { category: "crisis", subCategory: "fire", any: ["fire broke out", "massive fire", "building fire", "forest fire", "wildfire", "gutted in fire"] },
  { category: "crisis", subCategory: "industrial_accident", any: ["gas leak", "chemical leak", "factory blast", "boiler blast", "ammonia leak", "cracker unit blast", "industrial accident"] },
  { category: "crisis", subCategory: "transport_accident", any: ["train derail", "derailment", "bus accident", "road accident", "boat capsized", "boat capsizes", "capsizes in", "plane crash", "air crash", "pile-up", "falls into gorge", "falls into a gorge", "van overturns", "lorry overturns", "vehicle plunges", "car plunges"] },
  { category: "crisis", subCategory: "casualties", any: ["killed as", "killed in", "dead as", "feared dead", "death toll", "toll rises", "toll mounts", "confirmed dead", "bodies recovered", "rivers breach banks", "breach their banks", "rescued hours later"] },
  { category: "crisis", subCategory: "kidnap", any: ["kidnapped", "abducted", "held hostage", "ransom demand"] },
  { category: "crisis", subCategory: "public_health", any: ["disease outbreak", "epidemic", "dengue surge", "cholera", "leptospirosis", "nipah", "food poisoning", "health advisory"] },
  { category: "crisis", subCategory: "disease_outbreak", any: ["outbreak", "cases surge", "fever cases rise", "quarantine"] },
  { category: "crisis", subCategory: "law_and_order", any: ["curfew", "section 144", "prohibitory orders", "clashes", "communal tension", "lynching", "murder", "murdered", "hacked to death", "found dead", "body parts", "gang-rape", "sexual assault", "was assaulted", "molested", "kidnap", "abduct", "honour killing", "custodial death", "fake currency", "counterfeit currency", "burglary", "house break-in", "robbery", "dacoity", "loot", "heist", "chain snatching", "extortion", "smuggling racket", "drug haul"] },
  { category: "crisis", subCategory: "riot", any: ["riot", "arson", "mob attack", "group clash"] },
  { category: "crisis", subCategory: "protest_disruption", any: ["road blockade", "rail roko", "highway blocked by protest", "shutdown call", "bandh"] },
  { category: "crisis", subCategory: "infrastructure_failure", any: ["bridge collapse", "building collapse", "flyover crack", "wall collapse", "dam breach"] },
  { category: "crisis", subCategory: "power_outage", any: ["power outage", "grid failure", "blackout", "major power cut", "power shutdown", "power supply snapped", "supply snapped", "substation fire", "transformer blast", "power supply cut"] },
  { category: "crisis", subCategory: "water_crisis", any: ["water crisis", "no water supply", "drinking water shortage", "tanker supply", "reservoir dead storage"] },
  { category: "crisis", subCategory: "dam_reservoir", any: ["dam nears full", "dam near full", "surplus water", "water released downstream", "shutters opened", "spillway", "reservoir near full", "inflow rises", "flood cushion", "released from the dam"] },
  { category: "crisis", subCategory: "cyber_incident", any: ["data breach", "ransomware", "cyber attack", "hacked", "server outage nationwide"] },
  { category: "crisis", subCategory: "environmental_disaster", any: ["oil spill", "toxic foam", "mass fish kill", "chemical contamination"] },
  { category: "crisis", subCategory: "missing_person_mass_event", any: ["feared drowned", "go missing", "still missing", "unaccounted for", "search operation"] },
  { category: "crisis", subCategory: "terror_security", any: ["terror attack", "ied", "blast near", "security alert", "encounter with militants"] },
  { category: "crisis", subCategory: "war_external", any: ["air strike", "shelling", "ceasefire violation", "border firing", "missile strike"] },
];

// ── POLITICS ───────────────────────────────────────────────────────────
const POLITICS: CategoryMatcher[] = [
  { category: "politics", subCategory: "election", any: ["election", "poll date", "by-election", "bypoll", "voter list", "voter roll", "electoral roll", "election commission", "nomination", "special intensive revision", "sir voter"] },
  { category: "politics", subCategory: "campaign", any: ["campaign", "roadshow", "public meeting", "rally", "padayatra", "election tour", "poll strategist", "as pm", "for pm", "pm pitch", "prime minister in 2029"] },
  { category: "politics", subCategory: "manifesto", any: ["manifesto", "poll promise", "election promise", "seven guarantees", "guarantee scheme"] },
  { category: "politics", subCategory: "government_policy", any: ["government policy", "cabinet approves", "cabinet clears", "policy announced", "go issued", "government order", "tightens norms", "notifies rules", "sets sights on", "to formulate", "govt tightens", "government tightens"] },
  { category: "politics", subCategory: "assembly", any: ["assembly session", "state assembly", "legislative assembly", "in the assembly", "in assembly", "attend the assembly", "attend assembly", "assembly passes", "assembly clears", "assembly adopts", "walkout", "adjournment motion", "clears bill", "passes bill", "tables bill", "moves bill", "moves a bill", "bill to exempt", "bill to do away", "bill to amend", "resolution against", "under rule 110", "rule 110", "mla", "mlas", "legislator", "legislators"] },
  { category: "politics", subCategory: "parliament", any: ["parliament", "lok sabha", "rajya sabha", "monsoon session", "winter session", "bill passed", "bill cleared", "sco summit", "pmo"] },
  { category: "politics", subCategory: "policy_row", any: ["policy row", "language policy", "language row", "policy u-turn", "parties clash over", "clash over", "cries foul", "draws opposition flak", "opposition flak", "pushback"] },
  { category: "politics", subCategory: "court_governance", any: ["high court", "supreme court", "sc says", "sc rules", "sc bench", "hc says", "hc orders", "hc directs", "apex court", "madras high court", "delhi hc", "petition against", "stays order", "sets aside order", "quashes", "contempt", "pil filed", "moves court", "moves supreme court", "arbitral tribunal", "arbitration ruling", "nclt", "nclat"] },
  { category: "politics", subCategory: "minister_statement", any: ["minister said", "cm said", "chief minister said", "minister announces", "minister announced", "cm announces", "cm announced", "minister assured", "minister appeals", "minister urges", "minister for", "cm slams", "hits out", "clarifies on", "orders inquiry", "orders probe", "seeks report", "seeks stringent action", "pays tribute"] },
  { category: "politics", subCategory: "party_statement", any: ["party alleged", "party demands", "party condemns", "opposition slams", "dmk", "aiadmk", "bjp", "congress", "tvk", "vck", "pmk", "ntk", "aimim", "ysrcp", "ncpi", "iuml", "joins congress", "joins bjp", "joins dmk"] },
  { category: "politics", subCategory: "coalition", any: ["alliance", "coalition", "seat sharing", "seat-sharing", "poll pact", "joins hands", "may form coalition", "eyes"] },
  { category: "politics", subCategory: "appointment", any: ["appointed as", "takes charge as", "sworn in", "new chief secretary", "named governor", "elevated to", "ceo selection", "first ceo", "pro tem"] },
  { category: "politics", subCategory: "resignation", any: ["resigns", "quits", "steps down", "tenders resignation", "removed from post"] },
  { category: "politics", subCategory: "corruption_allegation", any: ["corruption charge", "graft", "bribe", "kickback", "disproportionate assets", "scam alleged", "irregularities", "allegation of", "denies allegation"] },
  { category: "politics", subCategory: "investigation", any: ["ed raids", "cbi probe", "income tax raids", "summoned by ed", "chargesheet", "raids premises", "vigilance case", "cb-cid registers", "cb-cid", "cbi registers", "case over deepfake", "registers case over"] },
  { category: "politics", subCategory: "legislation", any: ["bill introduced", "ordinance", "amendment bill", "act amended", "draft law", "introduced in assembly", "introduced in parliament"] },
  { category: "politics", subCategory: "regulation", any: ["new rules notified", "guidelines issued", "regulatory order", "ban notified", "directs 5-star", "fssai directs", "norms for contract", "tightens rules", "tightens safety rules", "safety rules after", "comes into effect", "smartphone ban", "phone ban", "ban at 52", "rule comes into"] },
  { category: "politics", subCategory: "local_government", any: ["corporation council", "panchayat", "municipality", "municipal polls", "ward", "mayor", "councillor", "local body", "cmda", "township project", "demolishes encroachment", "demolishes 40 encroachment", "encroachment removal", "eviction drive", "removes encroachments", "corporation demolishes"] },
  { category: "politics", subCategory: "centre_state", any: ["centre-state", "gst council", "central funds", "denied funds", "governor vs government", "union government", "indus waters treaty", "sindhu nadi", "cauvery water dispute", "mekedatu"] },
  { category: "politics", subCategory: "public_scheme", any: ["welfare scheme", "cash transfer", "free bus", "kalaignar magalir", "pension scheme", "housing scheme", "dbt", "gold-ring scheme", "gold ring scheme", "newborn gold"] },
  { category: "politics", subCategory: "administrative_action", any: ["suspended from service", "suspended over", "suspended for", "transferred", "collector orders", "collector's concurrence", "collectors concurrence", "show-cause notice", "departmental inquiry", "hostel to reopen", "post-metric hostel"] },
  { category: "politics", subCategory: "protest_politics", any: ["takes out march", "march to", "protest march", "stages protest", "sit-in", "dharna", "gherao", "black flag", "human chain", "protest against the government", "against the government", "boycott work", "workers boycott", "strike work", "go on strike", "call for a strike", "wildcat strike", "downs tools"] },
];

// ── FINANCE ────────────────────────────────────────────────────────────
const FINANCE: CategoryMatcher[] = [
  { category: "finance", subCategory: "rbi", any: ["rbi", "reserve bank", "repo rate", "monetary policy", "mpc", "cash reserve ratio"] },
  { category: "finance", subCategory: "sebi", any: ["sebi", "market regulator", "securities and exchange board"] },
  { category: "finance", subCategory: "banking", any: ["bank merger", "npa", "loan waiver", "bank fraud", "psu bank", "deposit rate", "lending rate", "atm fraud", "atm skimming", "crr", "cash reserve ratio", "treasury bills", "t-bills", "auction result", "g-sec", "bond yield"] },
  { category: "finance", subCategory: "inflation", any: ["inflation", "cpi", "wpi", "retail inflation", "price rise", "food prices"] },
  { category: "finance", subCategory: "employment", any: ["unemployment rate", "jobs data", "payroll", "hiring", "layoffs", "job losses", "epfo"] },
  { category: "finance", subCategory: "tax", any: ["income tax", "direct tax", "tax collection", "tax notice", "tds", "tax relief"] },
  { category: "finance", subCategory: "gst", any: ["gst", "gst rate", "gst collection", "gst council", "input tax credit"] },
  { category: "finance", subCategory: "budget", any: ["union budget", "state budget", "fiscal deficit", "budget allocation", "revised estimates"] },
  { category: "finance", subCategory: "stock_market", any: ["sensex", "nifty", "bse", "nse", "stock market", "share price", "bull run", "market crash", "ipo"] },
  { category: "finance", subCategory: "commodity", any: ["gold price", "silver price", "crude oil", "brent", "commodity prices"] },
  { category: "finance", subCategory: "forex", any: ["rupee", "dollar", "forex reserves", "rupee falls", "rupee gains", "exchange rate"] },
  { category: "finance", subCategory: "crypto", any: ["bitcoin", "cryptocurrency", "crypto", "ethereum", "virtual digital asset"] },
  { category: "finance", subCategory: "corporate_results", any: ["quarterly results", "q1 profit", "q2 profit", "net profit", "revenue rose", "earnings", "sales fall", "sales rise", "sales grew", "sales dip", "auto sales", "vehicle sales", "two-wheeler sales", "car sales", "passenger vehicle sales", "monthly sales", "demand stays weak", "rural demand"] },
  { category: "finance", subCategory: "corporate_action", any: ["acquisition", "merger", "stake sale", "buyback", "dividend", "bonus issue", "delisting"] },
  { category: "finance", subCategory: "fraud", any: ["financial fraud", "ponzi", "chit fund scam", "investment scam", "investors duped", "duped of rs", "loses rs", "lost rs", "fell for", "falls prey to", "default on payment", "loan app fraud", "trading scam"] },
  { category: "finance", subCategory: "startup", any: ["startup funding", "series a", "series b", "valuation", "unicorn", "venture capital"] },
  { category: "finance", subCategory: "trade", any: ["exports", "imports", "trade deficit", "trade agreement", "tariff", "wto"] },
  { category: "finance", subCategory: "agriculture_market", any: ["msp", "minimum support price", "mandi price", "procurement price", "farm gate price"] },
  { category: "finance", subCategory: "fuel_price", any: ["petrol price", "diesel price", "petrol, diesel", "petrol and diesel", "lpg price", "fuel price", "fuel prices", "cng price", "prices cut by rs", "a litre"] },
  { category: "finance", subCategory: "interest_rate", any: ["interest rate", "emi", "home loan rate", "fixed deposit rate"] },
  { category: "finance", subCategory: "economic_policy", any: ["gdp growth", "economic survey", "fiscal policy", "disinvestment", "pli scheme", "manufacturing output", "iip"] },
];

// ── SPORTS ─────────────────────────────────────────────────────────────
const SPORTS: CategoryMatcher[] = [
  { category: "sports", subCategory: "cricket", any: ["cricket", "test match", "test series", "odi series", "t20i", "ipl", "csk", "rcb", "mumbai indians", "bcci", "ranji trophy", "wtc final", "wtc test", "asia cup", "scores a century", "hits a century", "took a fifer", "wickets", "batting collapse", "run chase", "four-dayers", "hand a t20i debut"] },
  { category: "sports", subCategory: "football", any: ["football", "isl", "fifa", "premier league", "la liga", "champions league", "goal in the"] },
  { category: "sports", subCategory: "chess", any: ["candidates tournament", "chess olympiad", "world chess championship", "chess title", "checkmate", "fide rating"] },
  { category: "sports", subCategory: "hockey", any: ["hockey", "fih", "hockey india", "penalty corner"] },
  { category: "sports", subCategory: "badminton", any: ["badminton", "bwf", "all england", "thomas cup", "uber cup"] },
  { category: "sports", subCategory: "athletics", any: ["marathon", "javelin", "long jump", "asian games athletics", "national record", "diamond league", "wins gold with", "m throw", "clocks a", "gold medal at the"] },
  { category: "sports", subCategory: "kabaddi", any: ["kabaddi", "pro kabaddi", "raid points"] },
  { category: "sports", subCategory: "tennis", any: ["tennis", "atp tour", "wta tour", "grand slam", "wimbledon", "us open", "french open", "australian open"] },
  { category: "sports", subCategory: "motorsport", any: ["formula 1", "f1 grand prix", "motogp", "rally championship"] },
  { category: "sports", subCategory: "other_sports", any: ["olympics", "asian games", "commonwealth games", "medal tally", "wrestling bout", "boxing bout", "shooting gold", "wrestling federation", "cleared to compete", "doping ban", "lifts suspension"] },
];

// ── ENTERTAINMENT / CELEBRITY (demote aggressively) ────────────────────
const ENTERTAINMENT: string[] = [
  "movie review", "box office", "trailer launch", "teaser out", "first look", "film review",
  "web series", "ott release", "streaming now", "music album", "song release", "audio launch",
  "release date announced", "censor board", "film shooting", "movie sequel", "biopic",
  "director's next", "production house", "film festival", "award ceremony", "filmfare",
  "cinema hall", "reboot of the film", "franchise film", "clocks", "re-release",
];
const CELEBRITY: string[] = [
  "spotted at", "spotted in", "dating rumours", "breakup", "wedding pics", "engagement",
  "birthday celebration", "vacation photos", "airport look", "red carpet", "fashion statement",
  "trolled for", "slams trolls", "instagram post goes viral", "cryptic post", "fan frenzy",
  "gym look", "baby shower", "housewarming", "pens emotional note", "reacts to viral",
];

const ALL: CategoryMatcher[] = [...CRISIS, ...POLITICS, ...FINANCE, ...SPORTS];

/** Exposed for the v2 multi-signal classifier (`classify.ts`). */
export const CATEGORY_MATCHERS = { CRISIS, POLITICS, FINANCE, SPORTS, ENTERTAINMENT, CELEBRITY, ALL };

function hasTerm(hay: string, term: string): boolean {
  if (/[a-z0-9]/.test(term)) {
    const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    return re.test(hay);
  }
  return hay.includes(term);
}

export interface CategoryInput {
  title: string;
  excerpt?: string;
  /** From `detectCrisisType` — its presence forces `crisis`. */
  crisisType?: string;
}

/**
 * Classify a story into one IFFA news domain.
 *
 * Order of precedence: an active crisis type wins outright; otherwise the domain
 * with the most matched terms wins, ties broken by CATEGORY_ORDER. Entertainment
 * / celebrity only win when NOTHING in crisis/politics/finance/sports matched.
 */
export function classifyCategory(input: CategoryInput): CategoryClassification {
  const hay = " " + [input.title, input.excerpt].filter(Boolean).join(" . ").toLowerCase() + " ";

  if (input.crisisType) {
    return {
      category: "crisis",
      subCategory: input.crisisType,
      matchedTerms: [input.crisisType],
      reason: `Active crisis type from the disaster classifier (${input.crisisType}).`,
      confidence: "high",
    };
  }

  interface Bucket {
    terms: string[];
    subs: Map<string, number>;
  }
  const perCategory = new Map<CategoryId, Bucket>();
  for (const m of ALL) {
    const hits = m.any.filter((t) => hasTerm(hay, t));
    if (hits.length === 0) continue;
    const bucket: Bucket = perCategory.get(m.category) ?? { terms: [], subs: new Map<string, number>() };
    bucket.terms.push(...hits);
    bucket.subs.set(m.subCategory, (bucket.subs.get(m.subCategory) ?? 0) + hits.length);
    perCategory.set(m.category, bucket);
  }

  if (perCategory.size > 0) {
    let best: CategoryId = "other-relevant";
    let bestScore = -1;
    for (const cat of CATEGORY_ORDER) {
      const b = perCategory.get(cat);
      if (!b) continue;
      if (b.terms.length > bestScore) {
        best = cat;
        bestScore = b.terms.length;
      }
    }
    const b = perCategory.get(best)!;
    const topSub = [...b.subs.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
    const uniqTerms = [...new Set(b.terms)];
    return {
      category: best,
      subCategory: topSub,
      matchedTerms: uniqTerms.slice(0, 6),
      reason: `${CATEGORY_LABEL[best]} keywords matched: ${uniqTerms.slice(0, 4).join(", ")}.`,
      confidence: uniqTerms.length >= 2 ? "high" : "medium",
    };
  }

  const entHits = ENTERTAINMENT.filter((t) => hasTerm(hay, t));
  const celHits = CELEBRITY.filter((t) => hasTerm(hay, t));
  if (celHits.length > entHits.length && celHits.length > 0) {
    return { category: "celebrity", matchedTerms: celHits.slice(0, 5), reason: `Celebrity / personal-life keywords: ${celHits.slice(0, 3).join(", ")}.`, confidence: celHits.length >= 2 ? "high" : "medium" };
  }
  if (entHits.length > 0) {
    return { category: "entertainment", matchedTerms: entHits.slice(0, 5), reason: `Entertainment-industry keywords: ${entHits.slice(0, 3).join(", ")}.`, confidence: entHits.length >= 2 ? "high" : "medium" };
  }

  return {
    category: "other-relevant",
    matchedTerms: [],
    reason: "No crisis / politics / finance / sports / entertainment keyword matched — general relevant news.",
    confidence: "low",
  };
}

/** Is this category shown on default surfaces? */
export function isDefaultEnabled(cat: CategoryId): boolean {
  return DEFAULT_ENABLED[cat];
}
