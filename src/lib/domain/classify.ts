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

export interface CategoryResultV2 extends CategoryClassification {
  primaryCategory: CategoryId;
  secondaryCategories: CategoryId[];
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
const GOVT_ACTOR = /\b(cm|chief minister|dy cm|deputy cm|minister|state government|tamil nadu government|governor|secretariat|collector|assembly|cabinet|corporation|panchayat|centre|union government|speaker|pm modi|prime minister|president|dmk|aiadmk|bjp|congress|tvk|vck|pmk|opposition)\b/i;
const GOVT_ACTION = /\b(announce[sd]?|propose[sd]?|launch(?:e[sd])?|introduce[sd]?|table[sd]?|clear[sd]?|pass(?:e[sd])?|approve[sd]?|inaugurat\w+|unveil\w+|declare[sd]?|order[sd]?|sanction\w*|allocat\w+|formulate[sd]?|withdraw[sd]?|slam[s]?|criticis\w+|accus\w+|allege[sd]?|demand[sd]?|assure[sd]?|reject[sd]?|gifts?|to set up|to form|tighten\w*|comes into effect)\b/i;
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

  const add = (cat: CategoryId, pts: number, why: string, opts?: { sub?: string; strong?: boolean; keyword?: boolean }) => {
    scores[cat] += pts;
    signals[cat].push(why);
    if (opts?.strong) strongHits[cat] += 1;
    if (opts?.keyword) keywordHits[cat] += 1;
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
  if (govActor && govAction) {
    add("politics", SCORE.govtActorAction, "a government actor taking a governance action", { strong: true });
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

  // ── decide ──
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

  // secondary: a real second-domain angle — enough score AND a distinctive signal
  const secondaryCategories =
    primary === "other-relevant"
      ? []
      : ranked
          .filter(
            (r) =>
              r.category !== primary &&
              r.score >= 0.3 * maxScore &&
              (strongHits[r.category] >= 1 || keywordHits[r.category] >= 1) &&
              r.score >= 1.8,
          )
          .map((r) => r.category);

  // sub-category = the highest-scoring sub within the primary
  const subMap = subByCat[primary];
  const subCategory = subMap
    ? [...subMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    : undefined;

  const matchedSignals =
    primary === "other-relevant"
      ? ["no crisis / politics / finance / sports signal above threshold"]
      : signals[primary].slice(0, 8);

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
    confidenceClass,
    matchedSignals,
    competingCategories: ranked.slice(0, 3),
    scores,
  };
}
