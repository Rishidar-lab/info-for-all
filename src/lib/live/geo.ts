import type { GeoClassification } from "./types";

/**
 * Tamil Nadu geography dictionary + an explainable classifier.
 *
 * Design goals:
 *  - conservative: a national story is not "Tamil Nadu" just because the word
 *    "India" or "Chennai" appears once;
 *  - maintainable: districts / cities / abbreviations live in plain arrays;
 *  - explainable: every classification carries the terms that matched and why.
 */

/** All 38 Tamil Nadu districts (current), English + common alternates. */
export const TN_DISTRICTS: Record<string, string[]> = {
  Ariyalur: ["ariyalur"],
  Chengalpattu: ["chengalpattu", "chengalpet", "chingleput"],
  Chennai: ["chennai", "madras"],
  Coimbatore: ["coimbatore", "kovai"],
  Cuddalore: ["cuddalore", "cdl"],
  Dharmapuri: ["dharmapuri", "drm"],
  Dindigul: ["dindigul"],
  Erode: ["erode"],
  Kallakurichi: ["kallakurichi"],
  Kanchipuram: ["kanchipuram", "kancheepuram", "kanchpuram", "kanchi"],
  Kanyakumari: ["kanyakumari", "kanniyakumari", "nagercoil"],
  Karur: ["karur"],
  Krishnagiri: ["krishnagiri", "hosur"],
  Madurai: ["madurai", "mdr"],
  Mayiladuthurai: ["mayiladuthurai", "mayiladthurai"],
  Nagapattinam: ["nagapattinam", "nagai"],
  Namakkal: ["namakkal"],
  Nilgiris: ["nilgiris", "ooty", "udhagamandalam", "coonoor"],
  Perambalur: ["perambalur"],
  Pudukkottai: ["pudukkottai", "pudukottai", "pdkt"],
  Ramanathapuram: ["ramanathapuram", "ramnad"],
  Ranipet: ["ranipet"],
  Salem: ["salem", "slm"],
  Sivaganga: ["sivaganga", "sivagangai", "sivagnga"],
  Tenkasi: ["tenkasi"],
  Thanjavur: ["thanjavur", "tanjore", "tanjavur"],
  Theni: ["theni"],
  Thoothukudi: ["thoothukudi", "tuticorin", "tuticorn"],
  Tiruchirappalli: ["tiruchirappalli", "trichy", "tiruchi", "trp"],
  Tirunelveli: ["tirunelveli", "nellai"],
  Tirupathur: ["tirupathur", "tirupattur"],
  Tiruppur: ["tiruppur", "tirupur", "trp-tiruppur"],
  Tiruvallur: ["tiruvallur", "thiruvallur", "thiruvlr"],
  Tiruvannamalai: ["tiruvannamalai", "thiruvannamalai", "tiruvanmlai"],
  Tiruvarur: ["tiruvarur", "thiruvarur"],
  Vellore: ["vellore", "vlr"],
  Viluppuram: ["viluppuram", "villupuram", "vlp"],
  Virudhunagar: ["virudhunagar", "virudunagar"],
};

/** State-level terms — a match here is a strong Tamil Nadu signal. */
export const TN_STATE_TERMS = [
  "tamil nadu",
  "tamilnadu",
  "தமிழ்நாடு",
  "tamil-nadu",
  "tn government",
  "state of tamil nadu",
  "tamil nadu government",
  "government of tamil nadu",
  "tnsdma",
  "tamil nadu state disaster management",
  "chief minister of tamil nadu",
  "regional meteorological centre, chennai",
  "rmc chennai",
  "greater chennai corporation",
];

/** Tamil-script tokens for major places (helps with Tamil-language items). */
export const TN_TERMS_TAMIL = [
  "சென்னை",
  "கோயம்புத்தூர்",
  "மதுரை",
  "திருச்சி",
  "சேலம்",
  "திருநெல்வேலி",
  "கடலூர்",
  "நாகப்பட்டினம்",
  "தஞ்சாவூர்",
  "நீலகிரி",
  "வேலூர்",
];

/** Other India state names — used only to lower TN confidence, never to include. */
const OTHER_INDIA_STATES = [
  "kerala",
  "karnataka",
  "andhra pradesh",
  "telangana",
  "maharashtra",
  "gujarat",
  "rajasthan",
  "punjab",
  "haryana",
  "uttar pradesh",
  "uttarakhand",
  "bihar",
  "west bengal",
  "odisha",
  "assam",
  "madhya pradesh",
  "chhattisgarh",
  "jharkhand",
  "himachal pradesh",
  "goa",
  "delhi",
  "jammu",
  "kashmir",
  "ladakh",
  "manipur",
  "meghalaya",
  "nagaland",
  "tripura",
  "mizoram",
  "sikkim",
  "arunachal",
  "puducherry",
  "pondicherry",
  "andaman",
];

const INDIA_TERMS = [
  "india",
  "indian",
  "இந்தியா",
  "new delhi",
  "centre",
  "union government",
  "government of india",
  "parliament",
  "lok sabha",
  "rajya sabha",
  "supreme court of india",
  "rbi",
  "reserve bank of india",
  "imd",
  "india meteorological department",
  "ndma",
  "central water commission",
  "incois",
  "national centre for seismology",
  "indian railways",
  "southern railway",
];

function norm(s: string): string {
  return " " + s.toLowerCase().replace(/\s+/g, " ").trim() + " ";
}

/** Whole-word-ish containment for latin terms; substring for scripts w/o word breaks. */
function contains(haystack: string, term: string): boolean {
  const t = term.toLowerCase();
  if (/[a-z0-9]/.test(t)) {
    const re = new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    return re.test(haystack);
  }
  return haystack.includes(t);
}

export interface GeoInput {
  title: string;
  excerpt?: string;
  areaDescription?: string;
  /** From the feed registry — a TN-focused feed is a supporting signal, not proof. */
  feedFocus?: "tamil-nadu" | "india" | "india-disaster";
}

/**
 * Classify a story's geographic scope. Returns an explainable result.
 *
 * Rules:
 *  - state term OR ≥1 district OR Tamil place token ⇒ tamil-nadu
 *    (high confidence with a state term or ≥2 districts; medium otherwise);
 *  - only "Chennai"/"Madras" alone with a competing non-TN state ⇒ india (not TN);
 *  - India term without any TN signal ⇒ india;
 *  - nothing recognisably India/TN ⇒ excluded.
 */
const FOREIGN_CONTEXT = [
  "nepal", "pakistan", "bangladesh", "sri lanka", "china", "myanmar", "afghanistan", "bhutan",
  "maldives", "gaza", "israel", "ukraine", "russia", "united states", "u.s.", "canada", "mexico",
  "brazil", "colombia", "venezuela", "peru", "chile", "argentina", "ecuador", "haiti",
  "united kingdom", "uk ", "france", "germany", "italy", "spain", "greece", "turkey", "turkiye",
  "iran", "iraq", "syria", "yemen", "sudan", "somalia", "ethiopia", "kenya", "nigeria", "congo",
  "egypt", "libya", "morocco", "philippines", "indonesia", "malaysia", "thailand", "vietnam",
  "japan", "south korea", "north korea", "taiwan", "australia", "new zealand", "fiji", "vanuatu",
  "papua new guinea", "europe", "africa", "latin america", "caribbean", "middle east", "sahel",
];

export function classifyGeo(input: GeoInput): GeoClassification {
  const hay = norm([input.title, input.excerpt, input.areaDescription].filter(Boolean).join(" . "));

  // A story primarily about a foreign country is not a Tamil Nadu / India public-safety item,
  // even if an Indian person, court or city is mentioned incidentally.
  const foreignHits = FOREIGN_CONTEXT.filter((t) => contains(hay, t));
  const titleHay = norm(input.title);
  const foreignInTitle = FOREIGN_CONTEXT.some((t) => contains(titleHay, t));

  const matchedStateTerms = TN_STATE_TERMS.filter((t) => contains(hay, t));
  const matchedTamil = TN_TERMS_TAMIL.filter((t) => hay.includes(t.toLowerCase()));
  const districts: string[] = [];
  const districtTerms: string[] = [];
  for (const [district, aliases] of Object.entries(TN_DISTRICTS)) {
    const hit = aliases.find((a) => contains(hay, a));
    if (hit) {
      districts.push(district);
      districtTerms.push(hit);
    }
  }
  const otherStates = OTHER_INDIA_STATES.filter((s) => contains(hay, s));
  const indiaTerms = INDIA_TERMS.filter((t) => contains(hay, t));

  const tnTermCount = matchedStateTerms.length + districts.length + matchedTamil.length;
  const onlyChennai =
    districts.length === 1 && districts[0] === "Chennai" && matchedStateTerms.length === 0 && matchedTamil.length === 0;

  const matchedTerms = [...matchedStateTerms, ...districtTerms, ...matchedTamil];

  // Story is primarily about a foreign country: an incidental district / "Chennai" /
  // "Madras" mention does not make it a Tamil Nadu item. Needs an explicit state-level
  // term (e.g. "Tamil Nadu government sends aid") to still count as TN.
  if (foreignInTitle && matchedStateTerms.length === 0) {
    return {
      scope: foreignHits.length > 1 || indiaTerms.length === 0 ? "excluded" : "india",
      districts: [],
      matchedTerms: foreignHits,
      confidence: "medium",
      reason: `Headline is about ${foreignHits.join(", ")}; Indian place references appear incidental. Not classified as Tamil Nadu.`,
    };
  }

  // Strong TN signal
  if (matchedStateTerms.length > 0 || districts.length >= 2 || matchedTamil.length >= 1) {
    return {
      scope: "tamil-nadu",
      state: "Tamil Nadu",
      districts,
      matchedTerms,
      confidence: matchedStateTerms.length > 0 || districts.length >= 2 ? "high" : "medium",
      reason:
        matchedStateTerms.length > 0
          ? `State-level match: ${matchedStateTerms.join(", ")}${districts.length ? `; districts: ${districts.join(", ")}` : ""}.`
          : districts.length >= 2
            ? `Multiple Tamil Nadu districts named: ${districts.join(", ")}.`
            : `Tamil-language place reference: ${matchedTamil.join(", ")}.`,
    };
  }

  // A single district (not just Chennai), or a TN-focused feed with 1 district
  if (districts.length === 1 && !onlyChennai) {
    return {
      scope: "tamil-nadu",
      state: "Tamil Nadu",
      districts,
      matchedTerms,
      confidence: "medium",
      reason: `Single Tamil Nadu district named: ${districts[0]} (${districtTerms[0]}).`,
    };
  }

  // "Chennai" alone: only Tamil Nadu if no competing state and the feed is TN-focused
  if (onlyChennai) {
    if (otherStates.length === 0 && input.feedFocus === "tamil-nadu") {
      return {
        scope: "tamil-nadu",
        state: "Tamil Nadu",
        districts: ["Chennai"],
        matchedTerms,
        confidence: "medium",
        reason: `Chennai referenced with no competing state, from a Tamil Nadu source feed.`,
      };
    }
    return {
      scope: "india",
      districts: [],
      matchedTerms,
      confidence: "low",
      reason: `"Chennai" mentioned but no supporting Tamil Nadu signal${otherStates.length ? ` and other states present (${otherStates.join(", ")})` : ""} — treated as India-scope, not Tamil Nadu.`,
    };
  }

  // No TN signal at all
  if (tnTermCount === 0) {
    // A foreign country referenced anywhere with no India signal -> excluded.
    if (foreignHits.length > 0 && indiaTerms.length === 0 && otherStates.length === 0) {
      return {
        scope: "excluded",
        districts: [],
        matchedTerms: foreignHits,
        confidence: "medium",
        reason: `References ${foreignHits.slice(0, 3).join(", ")} and no India / Tamil Nadu term. Excluded from the India feed.`,
      };
    }
    if (indiaTerms.length > 0 || otherStates.length > 0 || (input.feedFocus !== undefined && foreignHits.length === 0)) {
      return {
        scope: "india",
        districts: [],
        matchedTerms: [...indiaTerms, ...otherStates],
        confidence: indiaTerms.length + otherStates.length > 0 ? "medium" : "low",
        reason:
          indiaTerms.length + otherStates.length > 0
            ? `India-scope terms: ${[...indiaTerms, ...otherStates].slice(0, 4).join(", ")}.`
            : `From an India-focused source feed; no state-level detail.`,
      };
    }
    return {
      scope: "excluded",
      districts: [],
      matchedTerms: [],
      confidence: "low",
      reason: "No recognisable India or Tamil Nadu reference.",
    };
  }

  return {
    scope: "india",
    districts,
    matchedTerms,
    confidence: "low",
    reason: "Weak / ambiguous geographic signal; defaulting to India scope.",
  };
}

/** For India-scope stories: does this materially affect Tamil Nadu / carry national weight? */
export function isIndiaRelevantToTN(input: GeoInput): boolean {
  const hay = norm([input.title, input.excerpt].filter(Boolean).join(" . "));
  const nationalWeight = [
    "cyclone",
    "imd",
    "monsoon",
    "supreme court",
    "rbi",
    "railway",
    "national highway",
    "gst",
    "union budget",
    "parliament",
    "neet",
    "cauvery",
    "kaveri",
    "mekedatu",
    "fishermen",
    "katchatheevu",
    "sri lanka",
    "bay of bengal",
    "koodankulam",
    "kudankulam",
  ];
  return nationalWeight.some((t) => contains(hay, t));
}
