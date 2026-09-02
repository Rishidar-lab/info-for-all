/**
 * IFFA multi-signal category classifier (v0.8, Phase A).
 *
 * v0.7's `classifyCategory()` matched English keywords against the headline
 * string only — so Tamil headlines and the dominant "CM / State government
 * announces X" pattern fell straight into OTHER_RELEVANT (measured: 77% of
 * clusters; ~29% of those carried a clear political signal, ~13% were Tamil).
 *
 * v2 scores every category from MANY deterministic signals — headline, excerpt,
 * an English gloss of Tamil text, extracted entities, semantic concepts and
 * actions, resolved districts, `crisisType`, finance instruments, sports
 * competitions — and returns a primary + secondary categories, a confidence
 * CLASS (not a fake probability), the signals that matched, and the runners-up.
 *
 * It never invents facts and never exposes a probability of truth.
 */
import {
  type CategoryId,
  type CategoryClassification,
  CATEGORY_ORDER,
  CATEGORY_LABEL,
  CATEGORY_MATCHERS,
} from "./categories";
import { detectFinanceInstruments } from "./finance";
import { detectCompetition, detectTeams } from "./sports";
import { dictionaryGloss } from "@/lib/language/translation";

export type ConfidenceClass = "STRONG" | "MODERATE" | "WEAK" | "UNKNOWN";

export interface ClassifyInput {
  title: string;
  excerpt?: string;
  language?: "ta" | "en" | "unknown";
  /** Canonical strong entities from the event signature. */
  entities?: string[];
  /** Language-neutral concept tokens from the signature. */
  concepts?: string[];
  /** Action families from the signature. */
  actions?: string[];
  /** Resolved Tamil Nadu districts. */
  districts?: string[];
  state?: string;
  /** From the disaster classifier — its presence forces `crisis`. */
  crisisType?: string;
}

/** Structured, per-category evidence — why a category was (or wasn't) assigned. */
export interface CategoryEvidence {
  category: CategoryId;
  role: "primary" | "secondary";
  score: number;
  /** count of distinctive (non-background) signals */
  distinctiveSignals: number;
  /** count of plain keyword hits */
  keywordHits: number;
  /** the human-readable reasons, most specific first */
  signals: string[];
}

export interface CategoryResultV2 extends CategoryClassification {
  primaryCategory: CategoryId;
  secondaryCategories: CategoryId[];
  /** primary + each secondary, with the evidence that put it there */
  categoryEvidence: CategoryEvidence[];
  confidenceClass: ConfidenceClass;
  matchedSignals: string[];
  competingCategories: { category: CategoryId; score: number }[];
  scores: Record<CategoryId, number>;
}

// ── entity → category (canonical names as they appear in entity-aliases.ts) ──
const ENTITY_CATEGORY: Record<string, CategoryId> = {
  // crisis authorities
  IMD: "crisis", NDMA: "crisis", NDRF: "crisis", SDRF: "crisis", TNSDMA: "crisis",
  INCOIS: "crisis", "Central Water Commission": "crisis", "NDMA SACHET": "crisis",
  // civic bodies — governance
  "Greater Chennai Corporation": "politics", CMWSSB: "politics", TANGEDCO: "politics",
  CMDA: "politics", "district administration": "politics",
  "Tamil Nadu Assembly": "politics", "Tamil Nadu government": "politics",
  "Union government": "politics", "Madras High Court": "politics", "Supreme Court": "politics",
  CWMA: "politics", "Election Commission": "politics", "Raj Bhavan": "politics",
  "Anna University": "politics",
  // parties
  DMK: "politics", AIADMK: "politics", BJP: "politics", Congress: "politics",
  TVK: "politics", NTK: "politics", VCK: "politics", PMK: "politics", TASMAC: "politics",
  // finance
  RBI: "finance", "Reserve Bank of India": "finance", SEBI: "finance",
};

// ── concept → category. "strong" concepts are specific; "weak" ones (bare
//    "government" / "minister" / "order") are background, not a category on their own.
const CONCEPT_CATEGORY_STRONG: Record<string, CategoryId> = {
  flood: "crisis", "heavy-rain": "crisis", cyclone: "crisis", "rough-sea": "crisis",
  landfall: "crisis", landslide: "crisis", evacuation: "crisis", rescue: "crisis",
  "ndrf-teams": "crisis", "power-cut": "crisis", heatwave: "crisis", damage: "crisis",
  death: "crisis", injury: "crisis", "section-144": "crisis",
  disruption: "crisis", camp: "crisis", relief: "crisis",
  dam: "crisis", reservoir: "crisis", release: "crisis",
};
const CONCEPT_CATEGORY_WEAK: Record<string, CategoryId> = {
  warning: "crisis", red: "crisis", orange: "crisis", alert: "crisis",
  minister: "politics", "chief-minister": "politics", government: "politics",
  administration: "politics", order: "politics", announcement: "politics",
};

// ── action family → category (only the ones that genuinely indicate a domain) ──
const ACTION_CATEGORY: Partial<Record<string, CategoryId>> = {
  evacuate: "crisis", "release-water": "crisis", warn: "crisis", rescue: "crisis",
  deploy: "crisis", die: "crisis", injure: "crisis", damage: "crisis",
  "impose-order": "politics", "lift-order": "politics", approve: "politics",
  propose: "politics", discuss: "politics",
};

// ── Tamil keyword tables (matched as substrings; Tamil has no ASCII breaks) ──
const TAMIL_KEYWORDS: Record<CategoryId, string[]> = {
  crisis: [
    "மழை", "கனமழை", "பெருமழை", "வெள்ளம்", "வெள்ள", "புயல்", "சூறாவளி", "நிலநடுக்கம்", "நிலச்சரிவு",
    "விபத்து", "விபத்", "தீ விபத்", "தீ பரவ", "வெடி விபத்", "படகு கவிழ", "மூழ்க", "இடி மின்னல்",
    "வெப்ப அலை", "கடல் சீற்ற", "அபாய", "உயிரிழ", "பலி", "படுகாய", "காயமடைந்த",
    "மீட்பு பணி", "வெளியேற்ற", "நிவாரண முகாம்", "மண் சரிந்த", "கட்டிடம் இடிந்த", "சாலை விபத்",
    "மின் தடை", "மின்வெட்டு", "தண்ணீர் தட்டுப்பாடு", "கொலை", "படுகொலை", "கோஷ்டி மோதல்",
    "கடத்தல்", "கடத்திச் சென்ற", "பாலியல் பலாத்கார", "தீ விபத்து",
  ],
  politics: [
    "அரசு", "தமிழக அரசு", "மாநில அரசு", "மத்திய அரசு", "முதல்வர்", "முதலமைச்சர்", "அமைச்சர்",
    "சட்டசபை", "சட்டப்பேரவை", "பேரவை", "நாடாளுமன்றம்", "மக்களவை", "மாநிலங்களவை", "மசோதா", "சட்டம்",
    "அறிவித்த", "அறிவிப்பு", "திட்டம்", "நலத்திட்டம்", "கொள்கை", "தேர்தல்", "வாக்கு", "கூட்டணி",
    "திமுக", "அதிமுக", "பாஜக", "காங்கிரஸ்", "தவெக", "விசிக", "பாமக", "நாம் தமிழர்", "மஜ்லிஸ்",
    "எதிர்க்கட்சி", "ஆளுங்கட்சி", "வழக்குப்பதிவு", "மனு", "உயர் நீதிமன்றம்", "உச்ச நீதிமன்றம்", "நீதிமன்றம்", "ஹைகோர்ட்", "சுப்ரீம் கோர்ட்",
    "ஆட்சியர்", "மாவட்ட ஆட்சியர்", "கவர்னர்", "ஆளுநர்", "தொகுதி", "நகராட்சி", "மாநகராட்சி",
    "சிபிசிஐடி", "சிபிஐ", "அமலாக்கத்துறை", "லஞ்ச ஒழிப்பு", "ஊழல்", "குற்றச்சாட்டு", "வேட்பாளர்",
    "காவல்துறை பதிலளிக்க", "உத்தரவு", "செயலகம்",
  ],
  finance: [
    "தங்கம் விலை", "வெள்ளி விலை", "பங்கு சந்தை", "சென்செக்ஸ்", "நிஃப்டி", "ரிசர்வ் வங்கி",
    "வட்டி விகிதம்", "பணவீக்கம்", "ரூபாய்", "வரி", "வருமான வரி", "ஜிஎஸ்டி", "ஜி.எஸ்.டி",
    "பட்ஜெட்", "நிதிநிலை அறிக்கை", "பெட்ரோல் விலை", "டீசல் விலை", "எரிபொருள் விலை", "மோசடி",
    "முதலீட்டு மோசடி", "பங்கு", "வங்கி", "கச்சா எண்ணெய்", "ஐடி சோதனை", "வருமான வரித்துறை",
  ],
  sports: [
    "கிரிக்கெட்", "போட்டி", "ஆட்டம்", "வெற்றி", "தோல்வி", "தொடர்", "டெஸ்ட்", "ஒருநாள்",
    "டி20", "ஐபிஎல்", "உலகக் கோப்பை", "சாம்பியன்", "செஸ்", "கால்பந்து", "கபடி", "ஒலிம்பிக்",
    "பதக்கம்", "வீரர்", "விளையாட்டு", "திறன் போட்டி",
  ],
  "other-relevant": [],
  entertainment: [
    "திரைப்படம்", "படம்", "ஃபர்ஸ்ட் லுக்", "டீசர்", "டிரெய்லர்", "வெளியீட்டு தேதி", "இயக்குனர்",
    "நடிகர் நடிப்பில்", "ஓடிடி", "இசை வெளியீடு", "பட வெளியீடு",
  ],
  celebrity: [
    "காதல் வதந்தி", "விவாகரத்து", "திருமணம்", "ரசிகர்கள்", "இன்ஸ்டாகிராம்", "வைரல் போஸ்ட்",
    "ஏர்போர்ட் லுக்", "பிறந்தநாள் விழா",
  ],
};

// ── the "government actor takes a governance action" high-signal pattern ──
const GOVT_ACTOR = /\b(cm|chief minister|dy cm|deputy cm|minister|state government|tamil nadu government|governor|secretariat|collector|assembly|cabinet|corporation|municipal(?:ity)?|civic body|panchayat|centre|union government|speaker|pm modi|prime minister|president|forest department|revenue department|health department|police department|dmk|aiadmk|bjp|congress|tvk|vck|pmk|opposition)\b/i;
const GOVT_ACTION = /\b(announce[sd]?|propose[sd]?|launch(?:e[sd])?|introduce[sd]?|table[sd]?|clear[sd]?|pass(?:e[sd])?|approve[sd]?|inaugurat\w+|unveil\w+|declare[sd]?|order[sd]?|sanction\w*|allocat\w+|formulate[sd]?|withdraw[sd]?|suspend[sd]?|dismiss(?:e[sd])?|transfer(?:red)?|slam[s]?|criticis\w+|accus\w+|allege[sd]?|demand[sd]?|assure[sd]?|reject[sd]?|gifts?|to set up|to form|tighten\w*|comes into effect)\b/i;
const GOVT_ACTOR_TA = /அரசு|முதல்வர்|அமைச்சர்|சட்டசபை|பேரவை|ஆட்சியர்|கவர்னர்|ஆளுநர்|செயலகம்|மாநகராட்சி|நகராட்சி|திமுக|அதிமுக|பாஜக|காங்கிரஸ்|தவெக|எதிர்க்கட்சி/;
const GOVT_ACTION_TA = /அறிவித்த|அறிவிப்பு|தொடங்கி|தொடங்க|திறந்து வைத்|அறிமுக|நிறைவேற்ற|ஒப்புதல்|உத்தரவிட்ட|ஒதுக்கீடு|வலியுறுத்த|குற்றம்சாட்ட|கண்டித்|வாபஸ்|திட்டம்/;

function hasWord(hay: string, term: string): boolean {
  if (/[a-z0-9]/.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(hay);
  }
  return hay.includes(term);
}

/**
 * Single-word keywords that are too generic to categorise on their own — they
 * need a second signal. Multi-word phrases ("heavy rain", "forest fire", "repo
 * rate") are always treated as distinctive.
 */
const GENERIC_TERMS = new Set([
  "rain", "rains", "warning", "alert", "alerts", "order", "ordered", "scheme", "policy",
  "case", "cases", "government", "govt", "minister", "assembly", "parliament", "bank",
  "banks", "match", "competition", "tax", "court", "bill", "outbreak", "clashes", "flood",
  "cyclone", "election", "campaign", "budget", "clash", "riot", "curfew", "protest",
  "chess", "grandmaster", "cricket", "football", "hockey", "tennis", "athletics",
  "olympics", "medal", "backs", "front", "ward", "rally", "alliance",
]);

/** Is a keyword term distinctive enough that ONE headline hit can promote a primary? */
function isDistinctive(term: string): boolean {
  if (term.includes(" ")) return true;
  return !GENERIC_TERMS.has(term.toLowerCase());
}

const SCORE = {
  crisisType: 8,
  keywordHeadline: 2.2,
  keywordExcerpt: 1.1,
  keywordGloss: 1.0,
  tamilKeyword: 2.2,
  entity: 3.0,
  conceptStrong: 1.8,
  conceptWeak: 0.7,
  action: 1.3,
  financeInstrument: 3.0,
  sportsEntity: 3.0,
  govtActorAction: 3.2,
} as const;

/** Minimum primary score, and the crisis-precedence rule. */
const PRIMARY_MIN = 2.0;
/** crisis takes primary if it is within this fraction of the top score. */
const CRISIS_PRECEDENCE = 0.72;

const EMPTY_SCORES = (): Record<CategoryId, number> =>
  Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<CategoryId, number>;

/**
 * The v2 multi-signal classifier. Deterministic and explainable.
 */
export function classifyEvent(input: ClassifyInput): CategoryResultV2 {
  const isTamil = input.language === "ta" || /[஀-௿]/.test(input.title);
  const headline = input.title.toLowerCase();
  const excerpt = (input.excerpt ?? "").toLowerCase();
  const gloss = isTamil ? dictionaryGloss(`${input.title}. ${input.excerpt ?? ""}`).toLowerCase() : "";
  const rawFull = `${input.title} ${input.excerpt ?? ""}`;

  const scores = EMPTY_SCORES();
  const signals: Record<CategoryId, string[]> = Object.fromEntries(
    CATEGORY_ORDER.map((c) => [c, [] as string[]]),
  ) as Record<CategoryId, string[]>;
  /** Distinctive (not-background) signals per category — needed to promote a primary. */
  const strongHits = EMPTY_SCORES();
  const keywordHits = EMPTY_SCORES();
  const subByCat: Partial<Record<CategoryId, Map<string, number>>> = {};
  /**
   * Categories a cross-domain pattern flagged as a legitimate SECONDARY angle.
   * Deliberately does NOT feed `strongHits` — a secondary angle must never
   * promote itself to primary or trip crisis-precedence.
   */
  const secondaryEligible = new Set<CategoryId>();

  const add = (
    cat: CategoryId,
    pts: number,
    why: string,
    opts?: { sub?: string; strong?: boolean; keyword?: boolean; secondary?: boolean },
  ) => {
    scores[cat] += pts;
    signals[cat].push(why);
    if (opts?.strong) strongHits[cat] += 1;
    if (opts?.keyword) keywordHits[cat] += 1;
    if (opts?.secondary) secondaryEligible.add(cat);
    if (opts?.sub) {
      const m = (subByCat[cat] ??= new Map());
      m.set(opts.sub, (m.get(opts.sub) ?? 0) + pts);
    }
  };

  // 1. crisisType forces crisis (still the hard override)
  if (input.crisisType) {
    add("crisis", SCORE.crisisType, `disaster classifier: ${input.crisisType}`, { sub: input.crisisType, strong: true });
  }

  // 2. keyword matchers over headline / excerpt / gloss
  for (const m of CATEGORY_MATCHERS.ALL) {
    for (const term of m.any) {
      const distinctive = isDistinctive(term);
      if (hasWord(` ${headline} `, term)) {
        add(m.category, SCORE.keywordHeadline, `“${term}” in headline`, { sub: m.subCategory, keyword: true, strong: distinctive });
      } else if (excerpt && hasWord(` ${excerpt} `, term)) {
        add(m.category, SCORE.keywordExcerpt, `“${term}” in excerpt`, { sub: m.subCategory, keyword: true });
      } else if (gloss && hasWord(` ${gloss} `, term)) {
        add(m.category, SCORE.keywordGloss, `“${term}” (Tamil gloss)`, { sub: m.subCategory, keyword: true, strong: distinctive });
      }
    }
  }

  // 3. entertainment / celebrity keyword scan (multi-word phrases are distinctive)
  for (const term of CATEGORY_MATCHERS.ENTERTAINMENT) {
    if (hasWord(` ${headline} ${excerpt} ${gloss} `, term)) add("entertainment", SCORE.keywordHeadline, `“${term}”`, { keyword: true, strong: term.includes(" ") });
  }
  for (const term of CATEGORY_MATCHERS.CELEBRITY) {
    if (hasWord(` ${headline} ${excerpt} ${gloss} `, term)) add("celebrity", SCORE.keywordHeadline, `“${term}”`, { keyword: true, strong: term.includes(" ") });
  }

  // 3b. casualty counts are an unambiguous crisis signal
  if (/\b\d[\d,]*\s+(?:killed|dead|injured|missing|feared dead|evacuated|drowned|hurt|trapped)\b/i.test(rawFull + " " + gloss)) {
    add("crisis", SCORE.entity, "a casualty / evacuation count", { strong: true });
  }

  // 4. Tamil keyword tables (curated + specific → distinctive)
  if (isTamil || /[஀-௿]/.test(rawFull)) {
    for (const cat of CATEGORY_ORDER) {
      for (const term of TAMIL_KEYWORDS[cat]) {
        if (rawFull.includes(term)) add(cat, SCORE.tamilKeyword, `“${term}” (Tamil)`, { keyword: true, strong: term.length >= 4 });
      }
    }
  }

  // 5. extracted entities (distinctive)
  for (const e of input.entities ?? []) {
    const cat = ENTITY_CATEGORY[e];
    if (cat) add(cat, SCORE.entity, `entity: ${e}`, { strong: true });
  }

  // 6. semantic concepts (strong = specific; weak = background)
  for (const c of input.concepts ?? []) {
    if (CONCEPT_CATEGORY_STRONG[c]) add(CONCEPT_CATEGORY_STRONG[c], SCORE.conceptStrong, `concept: ${c}`, { strong: true });
    else if (CONCEPT_CATEGORY_WEAK[c]) add(CONCEPT_CATEGORY_WEAK[c], SCORE.conceptWeak, `context: ${c}`);
  }

  // 7. action families
  for (const a of input.actions ?? []) {
    const cat = ACTION_CATEGORY[a];
    if (cat) add(cat, SCORE.action, `action: ${a}`);
  }

  // 8. finance instruments / sports entities (strong, specific)
  const instruments = detectFinanceInstruments(rawFull + " " + gloss);
  for (const inst of instruments) add("finance", SCORE.financeInstrument, `instrument: ${inst}`, { strong: true });
  const comp = detectCompetition(rawFull + " " + gloss);
  if (comp) add("sports", SCORE.sportsEntity, `competition: ${comp.canonical}`, { strong: true });
  // teams alone ("India", "Australia") are also country names — require a
  // sporting context (a competition, or a match/result verb).
  const teams = detectTeams(rawFull + " " + gloss);
  const sportVerb = /\b(beat|beats|defeat\w*|thrash\w*|clinch\w*|won by|win by|lost by|drew|draw with|innings|wicket|over the line|run chase|series \d|-\d series|century|half-century|hat-trick|penalty|final|semi-final|quarter-final|knock out|test|odi|t20|match|fixture|scored|score of|not out|all out|declared)\b/i;
  if (teams.length >= 2 && (comp || sportVerb.test(rawFull + " " + gloss))) {
    add("sports", SCORE.sportsEntity, `teams: ${teams.join(" v ")}`, { strong: true });
  }

  // 9. the "government actor + governance action" pattern (the biggest v0.7 miss)
  const govActor = GOVT_ACTOR.test(rawFull) || GOVT_ACTOR_TA.test(rawFull) || GOVT_ACTOR.test(gloss);
  const govAction = GOVT_ACTION.test(rawFull) || GOVT_ACTION_TA.test(rawFull) || GOVT_ACTION.test(gloss);
  // 9a. a fiscal / monetary body taking a fiscal action is a FINANCE decision,
  //     not a political one — the generic pattern above would misfile it.
  const fiscalBody =
    /\b(gst council|rbi|reserve bank|sebi|monetary policy committee|mpc|finance ministry|ministry of finance|cbdt|cbic|fifteenth finance commission|finance commission|trai|cci|competition commission)\b/i.test(
      rawFull + " " + gloss,
    );
  const fiscalAction =
    /\b(cuts?|slashes?|hikes?|raises?|lowers?|revises?|holds?|retains?|trims?|eases?|tightens?)\b.*\b(rate|rates|repo|crr|slr|duty|cess|tax|levy|tariff|liquidity|stance)\b|\b(rate cut|rate hike|repo rate|policy rate|rate (?:unchanged|on hold)|imposes? (?:a )?(?:duty|levy|penalty)|penalis\w+|bars? .* from the (?:market|securities))\b/i.test(
      rawFull + " " + gloss,
    );
  if (fiscalBody && fiscalAction) {
    add("finance", SCORE.entity, "a fiscal / monetary authority taking a fiscal action", { strong: true });
    // "GST Council" also matches a politics/centre-state keyword — discount it
    // when the story is plainly the rate action, not an inter-governmental row.
    if (!/\b(state[s]?|centre|opposition|congress|bjp|dispute|row|protest|walk(?:s|ed)? out|demand)\b/i.test(rawFull)) {
      scores.politics = Math.max(0, scores.politics - 2.2);
      keywordHits.politics = Math.max(0, keywordHits.politics - 1);
    }
  }
  if (govActor && govAction && !(fiscalBody && fiscalAction)) {
    add("politics", SCORE.govtActorAction, "a government actor taking a governance action", { strong: true });
  } else if (govActor && govAction) {
    // still a governance dimension, just not the lead
    add("politics", SCORE.conceptWeak, "a government actor involved", { secondary: true });
  }

  // 10. metaphor guard — "red alert" / "எச்சரிக்கை" about revenue / GST / a
  //     politician's report is NOT a weather alert. Suppress the crisis signal
  //     when there is a political actor + an economic topic and NO hazard word.
  const hazardCtx = /\b(rain|flood|cyclone|storm|imd|weather|coast|sea|wind|heat|quake|fire|landslide|tsunami)\b/i.test(rawFull + " " + gloss) || /மழை|வெள்ளம்|புயல்|வானிலை|கடல்/.test(rawFull);
  const econPolCtx =
    (govActor || /\b(revenue|gst|tax collection|fiscal|deficit|report|budget)\b/i.test(rawFull + " " + gloss) || /வருவாய்|வருமானம்|ஜிஎஸ்டி|நிதி|ரிப்போர்ட்|அறிக்கை/.test(rawFull));
  if (!hazardCtx && econPolCtx && scores.crisis > 0) {
    const removed = Math.min(scores.crisis, 4.0);
    scores.crisis -= removed;
    strongHits.crisis = Math.max(0, strongHits.crisis - 1);
    keywordHits.crisis = Math.max(0, keywordHits.crisis - 1);
    signals.crisis.push(`(suppressed: "alert"/"warning" reads as a political/economic metaphor, no hazard context)`);
    add("politics", 2.4, "an alert/warning used as a political-economic metaphor", { strong: true });
  }

  // 11. a named report / statement by a politician is a political statement
  if (/\b(shock report|shock rept|report by|statement by|hits back|shoots back)\b/i.test(rawFull) || /ஷாக் ரிப்போர்ட்|ரிப்போர்ட்|கூறினார்|தெரிவித்தார்|பேசினார்/.test(rawFull)) {
    if (GOVT_ACTOR.test(rawFull) || GOVT_ACTOR_TA.test(rawFull) || /ராஜா|அமைச்சர்|எம்எல்ஏ|எம்பி/.test(rawFull)) {
      add("politics", SCORE.conceptStrong, "a named report / statement by a politician");
    }
  }

  // 12. explicit CROSS-DOMAIN patterns (v0.9 Phase B) — a real second-domain
  //     angle of the LEAD story, not a loose keyword and not a signal borrowed
  //     from an unrelated merged cluster member. The pipeline passes every
  //     member headline joined by "  ·  "; the cross-domain check runs on the
  //     lead headline (+ the excerpt blob), so a minority member cannot inject
  //     a spurious secondary.
  const leadTitle = input.title.split(/\s+·\s+/)[0] ?? input.title;
  const hay = ` ${`${leadTitle} ${input.excerpt ?? ""}`.toLowerCase()} ${gloss} `;
  const has = (re: RegExp) => re.test(hay);
  /** flags a legitimate second-domain angle without letting it become primary. */
  const SEC = { secondary: true } as const;
  // finance decision / economic topic argued in the political arena
  if (
    (has(/\b(gst|repo rate|rbi|budget|fiscal|tax(?:ation)?|disinvestment|tariff|import duty|gdp|economy|economic (?:growth|policy|data)|growth rate|inflation|unemployment|revenue (?:shortfall|collection|loss)|compensation cess)\b/) ||
      has(/வேலைவாய்ப்பின்மை|வேலையின்மை|பணவீக்கம்|விலைவாசி|ஜிஎஸ்டி|வருவாய்|பொருளாதார|நிதிநிலை/)) &&
    (has(/\b(opposition|parliament|assembly|minister|cm |chief minister|centre|state government|congress|bjp|dmk|aiadmk|criticis|slams?|hits? out|jibe|welcomes?|demand|row over|vs )\b/) ||
      has(/எச்சரிக்கை|எதிர்க்கட்சி|மத்திய அரச|மாநில அரச|திமுக|அதிமுக|பாஜக|காங்கிரஸ்|அமைச்சர்|விமர்சன|கண்டன/) ||
      has(/[–—]\s+[\p{Lu}஀-௿]/u))
  ) {
    add("politics", SCORE.conceptStrong, "an economic topic argued in the political arena", SEC);
    add("finance", SCORE.conceptStrong, "an economic / fiscal topic", SEC);
  }
  // an attack / assault on a person alongside a governance / labour story
  if (has(/\b(assault(?:ed)?(?: on| of| by)?|attack(?:ed)? on|thrashed|manhandled|attacked (?:the|a) (?:supervisor|official|teacher|doctor|staff))\b/)) {
    add("crisis", SCORE.conceptStrong, "an assault on a person", SEC);
  }
  // a demolition / eviction drive (governance) that displaces people (crisis angle)
  if (has(/\b(demolish\w*|encroachment removal|eviction drive|raze[sd]?|razing|bulldoz\w+|clears? (?:the )?(?:huts|encroachments|hutments))\b/) && has(/\b(residents|families|homes|huts|shops|displaced|ahead of (?:the )?(?:northeast |southwest )?monsoon|slum|hutment|riverbank|rehab)\b/)) {
    add("crisis", SCORE.conceptStrong, "displacement from a demolition drive", SEC);
  }
  // political figure + financial wrongdoing
  if (
    has(/\b(minister|mla|mp |cm |chief minister|politician|leader|former minister|ex-minister|dmk|aiadmk|bjp|congress)\b/) &&
    (has(/\b(bank fraud|financial fraud|money laundering|disproportionate assets|investment scam|chit fund|ponzi|hawala|shell (?:company|firm)|tax evasion|benami|it raid|income tax raid|sand[- ]mining (?:case|scam)?|mining (?:lease|scam)|land scam|kickbacks?|graft|slush fund|proceeds of crime|attachment of (?:assets|property)|short[- ]seller|hindenburg|stock (?:rout|manipulation)|shares? (?:slide|slump|tank|crash|plunge)|₹[\d,]+[ -]?crore (?:case|scam|kickback))\b/) ||
      has(/வரி ஏய்ப்பு|ஐடி சோதனை/))
  ) {
    add("politics", SCORE.conceptStrong, "a political figure and alleged financial wrongdoing", SEC);
    add("finance", SCORE.conceptStrong, "alleged financial wrongdoing", SEC);
  }
  // crisis disrupting a sporting event — sport is the arena, crisis the cause
  if (
    has(/\b(cyclone|flood|heavy rain|storm|earthquake|heatwave|smog|air quality)\b/) &&
    has(/\b(ipl|match|tournament|fixture|test|odi|t20|stadium|world cup|isl|ranji)\b/) &&
    has(/\b(cancel\w*|postpon\w*|abandon\w*|call(?:ed)? off|delay\w*|reschedul\w*|move[sd]?|shift\w*)\b/)
  ) {
    add("crisis", SCORE.conceptStrong, "weather disrupting a sporting event", SEC);
    add("sports", SCORE.sportsEntity, "a sporting event affected", { strong: true });
  }
  // a court ruling on a financial / market matter — the market matter leads
  if (
    has(/\b(high court|supreme court|tribunal|nclt|nclat|sat |securities appellate|bench)\b/) &&
    has(/\b(sebi|insider trading|ipo|merger|bankruptcy|insolvency|delisting|debenture|shareholder|market regulator|brokerage|stock (?:exchange|manipulation)|front[- ]running)\b/)
  ) {
    // the court is procedural here — discount raw "high court" politics keywords
    scores.politics = Math.max(0, scores.politics - 3.0);
    keywordHits.politics = Math.max(0, keywordHits.politics - 2);
    add("finance", SCORE.entity, "a securities / market legal matter", { strong: true });
    add("finance", SCORE.conceptStrong, "a market-regulation dispute", { strong: true });
    add("politics", SCORE.conceptWeak, "adjudicated by a court", SEC);
  }
  // a court / tribunal pulling up the government (governance / accountability leads)
  if (
    has(/\b(high court|supreme court|madras high court|madurai bench|tribunal|bench|ngt|national green tribunal)\b/) &&
    has(/\b(pulls? up|raps?|slams?|directs? the (?:state|government)|orders? the (?:state|government)|comes? down on|questions? the (?:state|government)|seeks? (?:a )?(?:reply|response|report) from the (?:state|government)|contempt|unpaid|failure to)\b/)
  ) {
    // the accountability angle is the story — keep the disaster as context only
    const isDisasterCtx = has(/\b(flood|relief|compensation|drought|cyclone|disaster|rehabilitation|evacuat\w+|death toll)\b/);
    if (isDisasterCtx) {
      scores.crisis = Math.max(0, scores.crisis - 2.4);
      keywordHits.crisis = Math.max(0, keywordHits.crisis - 1);
    }
    add("politics", SCORE.govtActorAction, "a court holding the government to account", { strong: true });
    if (isDisasterCtx) add("crisis", SCORE.conceptStrong, "a disaster-aftermath grievance", SEC);
  }
  // government scheme with a stated cost, or an investment-promotion body
  if (
    (has(/\b(scheme|programme|project|yojana)\b/) &&
      has(/(₹|rs\.?)\s?[\d,]+\s?(?:crore|lakh)|\b(?:allocat|sanction|budget of|outlay|costing|worth|(?:security|logistics|operational|recurring|administrative|implementation) costs?|financial (?:burden|implication)|cost overrun|funding (?:dispute|row|gap|shortfall)|stalled over)\b/)) ||
    has(/\binvestment promotion (?:commission|board|agency)|fast-track clearances|ease of doing business|single[- ]window clearance|industrial (?:policy|corridor)\b/)
  ) {
    add("politics", SCORE.govtActorAction, "a government economic scheme / body", { strong: true });
    add("finance", SCORE.conceptStrong, "an economic-development measure with a fiscal dimension", SEC);
  }
  // a sports body / event entangled with government or political interference
  if (
    has(/\b(cricket board|football federation|olympic (?:association|committee)|sports (?:body|federation|ministry)|hockey india|bcci|aiff|ioa|icc|fifa|selection committee|team management|champions trophy|world cup|asia cup|world championship|premier league)\b/) &&
    has(/\b(government interference|political interference|ministry (?:steps? in|intervenes?)|court-appointed|coa |sports code|de-?recognis\w+|ban(?:s|ned)? by (?:fifa|icc)|election dispute|hosting rights|minister|parliament|government)\b/)
  ) {
    add("sports", SCORE.sportsEntity, "a sports-governance matter", { strong: true });
    add("politics", SCORE.conceptStrong, "government / political interference in sport", SEC);
  }
  // government tightens rules in response to a crime / safety incident
  if (
    has(/\b(tighter?|tighten\w*|new (?:safety )?(?:rules?|norms?)|norms? after|guidelines? after|orders? (?:a )?safety audit|makes? .* mandatory)\b/) &&
    has(/\b(gangrape|rape|murder|accident|mishap|assault|fire|blast|explosion|collapse|death|deaths|killed|attack|stampede|drowning)\b/)
  ) {
    add("politics", SCORE.govtActorAction, "a regulatory / policy response", { strong: true });
    add("crisis", SCORE.conceptStrong, "prompted by a safety / crime incident", SEC);
  }
  // a labour strike / protest with a triggering grievance
  if (has(/\b(strike|go(?:es|ing)? on strike|walk(?:s|ed)? out|walkout|work boycott|boycott(?:s|ed)? work|downs? tools|stir|dharna|gherao|indefinite fast|hunger strike|road roko|rail roko)\b/)) {
    add("politics", SCORE.govtActorAction, "a labour / protest action", { strong: true });
    if (has(/\b(assault\w*|attack\w*|beaten|thrashed|death|died|killed|electrocut\w+|water crisis|drought|power cut|shortage|contamination|famine|unsafe)\b/)) {
      add("crisis", SCORE.conceptStrong, "a triggering safety / service grievance", SEC);
    }
  }

  // ── decide ──
  // A category whose ONLY evidence is a cross-domain "secondary angle" flag
  // (no distinctive signal, no keyword) must not out-score a real primary —
  // clamp it so it can rank as a secondary but rarely lead.
  for (const c of secondaryEligible) {
    if (strongHits[c] === 0 && keywordHits[c] === 0) scores[c] = Math.min(scores[c], 2.6);
  }

  const ranked = CATEGORY_ORDER
    .filter((c) => c !== "other-relevant")
    .map((c) => ({ category: c, score: Math.round(scores[c] * 100) / 100 }))
    .sort((a, b) => b.score - a.score || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  const top = ranked[0];
  const crisisEntry = ranked.find((r) => r.category === "crisis")!;
  /** A category may be primary if it has a distinctive signal OR enough weak signals. */
  const promotable = (c: CategoryId) =>
    strongHits[c] >= 1 || keywordHits[c] >= 2 || scores[c] >= 3.6;

  let primary: CategoryId;
  if (input.crisisType) {
    primary = "crisis";
  } else if (top.score < PRIMARY_MIN || !promotable(top.category)) {
    // maybe another ranked category is promotable even if lower-scoring
    const alt = ranked.find((r) => r.score >= PRIMARY_MIN && promotable(r.category));
    primary = alt ? alt.category : "other-relevant";
  } else if (
    // crisis precedence: a close-behind crisis wins (public-safety first) — but
    // only when crisis has its OWN distinctive signal and the top category is
    // not itself strongly evidenced.
    top.category !== "crisis" &&
    crisisEntry.score >= PRIMARY_MIN &&
    strongHits.crisis >= 1 &&
    strongHits[top.category] < 2 &&
    crisisEntry.score >= CRISIS_PRECEDENCE * top.score
  ) {
    primary = "crisis";
  } else {
    primary = top.category;
  }

  const maxScore = primary === "other-relevant" ? 0 : scores[primary];
  const runnerUp = ranked.find((r) => r.category !== primary)?.score ?? 0;

  let confidenceClass: ConfidenceClass;
  if (primary === "other-relevant") confidenceClass = "UNKNOWN";
  else if ((strongHits[primary] >= 2 || (strongHits[primary] >= 1 && keywordHits[primary] >= 1)) && maxScore - runnerUp >= 1.5) confidenceClass = "STRONG";
  else if (strongHits[primary] >= 1 || keywordHits[primary] >= 2 || maxScore >= 4.5) confidenceClass = "MODERATE";
  else confidenceClass = "WEAK";

  // secondary: a real second-domain angle — either a cross-domain pattern
  // flagged it (secondaryEligible), OR it has a distinctive signal / solid
  // keyword presence and at least ~1/5 of the primary's score.
  const secondaryCategories =
    primary === "other-relevant"
      ? []
      : ranked
          .filter((r) => {
            if (r.category === primary) return false;
            // a cross-domain pattern explicitly vouched for this angle — it just
            // needs a real (non-trivial) score, not a fixed ratio of the primary.
            if (secondaryEligible.has(r.category) && r.score >= 1.4) return true;
            const evidenced =
              (strongHits[r.category] >= 1 && r.score >= 2.0) ||
              (keywordHits[r.category] >= 2 && r.score >= 2.6);
            return evidenced && r.score >= 0.18 * maxScore;
          })
          .map((r) => r.category)
          .slice(0, 2);

  // sub-category = the highest-scoring sub within the primary
  const subMap = subByCat[primary];
  const subCategory = subMap
    ? [...subMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    : undefined;

  const matchedSignals =
    primary === "other-relevant"
      ? ["no crisis / politics / finance / sports signal above threshold"]
      : signals[primary].slice(0, 8);

  const categoryEvidence: CategoryEvidence[] =
    primary === "other-relevant"
      ? []
      : [primary, ...secondaryCategories].map((c) => ({
          category: c,
          role: c === primary ? ("primary" as const) : ("secondary" as const),
          score: Math.round(scores[c] * 100) / 100,
          distinctiveSignals: strongHits[c],
          keywordHits: keywordHits[c],
          signals: signals[c].slice(0, 6),
        }));

  const reason =
    primary === "other-relevant"
      ? `General / regional news — no ${CATEGORY_ORDER.slice(0, 4).map((c) => CATEGORY_LABEL[c].toLowerCase()).join(" / ")} signal reached the threshold (top: ${top.category} ${top.score}).`
      : `${CATEGORY_LABEL[primary]} (${confidenceClass.toLowerCase()}, score ${maxScore.toFixed(1)}): ${matchedSignals.slice(0, 3).join("; ")}.`;

  return {
    // CategoryClassification (back-compat)
    category: primary,
    subCategory,
    matchedTerms: matchedSignals.slice(0, 6),
    reason,
    confidence: confidenceClass === "STRONG" ? "high" : confidenceClass === "MODERATE" ? "medium" : "low",
    // v2
    primaryCategory: primary,
    secondaryCategories,
    categoryEvidence,
    confidenceClass,
    matchedSignals,
    competingCategories: ranked.slice(0, 3),
    scores,
  };
}
