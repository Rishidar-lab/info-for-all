/**
 * Conservative Tamil normalisation for the news domain (v0.5, Phase 11–13).
 *
 * This is NOT a Tamil NLP system. It does three narrow jobs so that
 * "சென்னையில்" and "சென்னை", or "பள்ளிகளுக்கு" and "பள்ளிகள்", stop defeating
 * token comparison:
 *
 *   1. strip the common case / postposition / plural / passive-verb suffixes
 *      seen in Tamil Nadu headlines (news morphology only);
 *   2. map a small set of recurring roots to a language-neutral concept token
 *      ("பள்ளி" → "school", "அணை" → "dam", "விடுமுறை" → "holiday");
 *   3. resolve Tamil relative-date words against a publication date.
 *
 * The ORIGINAL text is never mutated by callers — these functions return new
 * strings used only for matching.
 */

/** Longest-first. Each entry is a Tamil surface suffix to remove from a token. */
const TAMIL_SUFFIXES: string[] = [
  // ablative "from"
  "ிலிருந்து", "இலிருந்து", "ல்இருந்து", "லிருந்து",
  // passive / verbal-noun endings ("was opened", "were rescued")
  "க்கப்பட்டுள்ளது", "க்கப்பட்டது", "க்கப்பட்டனர்", "ப்பட்டுள்ளது", "ப்பட்டது", "ப்பட்டனர்",
  "க்கப்படுகிறது", "ப்படுகிறது", "கிறார்கள்", "கின்றனர்", "வதற்கு", "வதாக",
  // dative "to/for"
  "உக்குள்", "க்குள்", "உக்கான", "க்கான", "இற்கு", "ிற்கு", "உக்கு", "க்கு",
  // locative "in/at" — both independent-vowel and vowel-sign attached forms
  "களில்", "யில்", "வில்", "த்தில்", "ட்டில்", "ற்றில்", "இல்", "ில்", "னில்",
  "இடம்", "ிடம்", "இடமிருந்து", "ிடமிருந்து",
  // instrumental / sociative
  "யுடன்", "ுடன்", "உடன்", "ோடு", "ால்", "யால்", "வால்",
  // genitive
  "னுடைய", "உடைய", "இன்", "ின்", "அது", "து",
  // accusative
  "களை", "யை", "வை", "ஐ",
  // plural
  "கள்", "ர்கள்",
  // emphatic / interrogative
  "தான்", "கூட", "ா", "ஆ",
];

/** Unicode-normalise and trim punctuation from a Tamil token. */
function cleanTamil(w: string): string {
  return w.normalize("NFC").replace(/[.,;:!?"'“”‘’()[\]{}…—–-]/g, "").trim();
}

const TAMIL_CHAR = /[஀-௿]/;

/**
 * Strip one recurring suffix from a Tamil token, keeping the stem when it is
 * long enough to be meaningful (≥ 3 Tamil letters ≈ ≥ 4 code units).
 */
export function normalizeTamilToken(word: string): string {
  let w = cleanTamil(word);
  if (!TAMIL_CHAR.test(w)) return w.toLowerCase();
  for (const suf of TAMIL_SUFFIXES) {
    if (w.length > suf.length + 2 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      // euphonic clean-up: a trailing dangling sign left after the cut
      w = w.replace(/[்ய]$/, "");
      break;
    }
  }
  return w;
}

/**
 * Fuzzy equivalence for a suffix-stripped token vs. a dictionary key. Tolerates
 * the one difference that suffix-stripping leaves behind: a trailing pulli (்)
 * or a single trailing vowel sign that the case ending fused onto the last
 * consonant ("கடலூரி" from "கடலூர்" + "இல்"). Never used for display.
 */
export function tamilLooseEqual(a: string, b: string): boolean {
  const trim = (s: string) => s.normalize("NFC").replace(/[ா-்ௗ]$/u, "");
  const a0 = a.normalize("NFC");
  const b0 = b.normalize("NFC");
  if (a0 === b0) return true;
  const a1 = trim(a0);
  const b1 = trim(b0);
  if (a1 === b1 || a1 === b0 || a0 === b1) return true;
  // one is a prefix of the other within 1 letter (residual sandhi consonant)
  const [shortS, longS] = a1.length <= b1.length ? [a1, b1] : [b1, a1];
  return shortS.length >= 3 && longS.startsWith(shortS) && longS.length - shortS.length <= 1;
}

export function normalizeTamilPhrase(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeTamilToken)
    .filter((w) => w.length > 1);
}

/**
 * Recurring Tamil roots → a language-neutral concept token. Deliberately small:
 * only terms that appear in Tamil Nadu weather / civic / disaster headlines.
 * Keyed by the NORMALISED (suffix-stripped) root.
 */
const TAMIL_CONCEPTS: Record<string, string> = {
  "பள்ளி": "school",
  "கல்லூரி": "college",
  "கல்வி நிறுவன": "institution",
  "விடுமுறை": "holiday",
  "மூடல்": "closure",
  "மூடப்பட": "closure",
  "அணை": "dam",
  "நீர்த்தேக்க": "reservoir",
  "மழை": "rain",
  "கனமழை": "heavy-rain",
  "பெருமழை": "heavy-rain",
  "வெள்ள": "flood",
  "எச்சரிக்கை": "warning",
  "அலர்ட்": "alert",
  "சிவப்பு": "red",
  "ஆரஞ்சு": "orange",
  "மஞ்சள்": "yellow",
  "உத்தரவு": "order",
  "அறிவிப்பு": "announcement",
  "அறிவித்த": "announcement",
  "வெளியேற்ற": "evacuation",
  "வெளியேறல்": "evacuation",
  "அனுப்பப்பட்ட": "evacuation",
  "மாற்றப்பட்ட": "evacuation",
  "பாதுகாப்பான இடங்களுக்கு": "evacuation",
  "பாதுகாப்பான இடம்": "evacuation",
  "மீட்": "rescue",
  "காப்பாற்ற": "rescue",
  "பாதுகாப்பாக": "rescue",
  "காப்பாற்றப்பட்ட": "rescue",
  "தங்க வைப்பு": "camp",
  "தங்க வைக்க": "camp",
  "உயிரிழப்பு": "death",
  "பலி": "death",
  "இறப்பு": "death",
  "காயம": "injury",
  "திறப்பு": "release",
  "திறந்து": "release",
  "திறக்கப்பட்ட": "release",
  "வெளியேற்றப்பட்ட": "release",
  "தண்ணீர்": "water",
  "நீர்": "water",
  "மாவட்ட": "district",
  "நிர்வாக": "administration",
  "அரசு": "government",
  "வானிலை": "weather",
  "ஆய்வு மைய": "centre",
  "புயல்": "cyclone",
  "கடல்": "sea",
  "கடற்கரை": "coast",
  "கரையோர": "coast",
  "கடலோர": "coast",
  "மீனவர்": "fishermen",
  "மீன்பிடி": "fishermen",
  "கடலுக்கு செல்ல": "fishermen",
  "தடை உத்தரவு": "ban",
  "தடை": "ban",
  "பிரிவு 144": "section-144",
  "போக்குவரத்து": "traffic",
  "ரயில்": "rail",
  "விமான": "flight",
  "மின்சார": "power",
  "மின் தடை": "power-cut",
  "மின்வெட்டு": "power-cut",
  "மின்சாரம் நிறுத்த": "power-cut",
  "நிறுத்தம்": "disruption",
  "பாதிப்பு": "disruption",
  "நிவாரண": "relief",
  "முகாம்": "camp",
  "சாலை": "road",
  "காவல்துறை": "police",
  "அமைச்சர்": "minister",
  "முதல்வர்": "chief-minister",
  "திருவிழா": "festival",
  "கோவில்": "temple",
  "விமான நிலைய": "airport",
  "பேருந்து": "bus",
  "மெட்ரோ": "metro",
  "சாலை சரிவு": "landslide",
  "நிலச்சரிவு": "landslide",
  "வெப்ப அலை": "heatwave",
  "பாலம்": "bridge",
  "தீ விபத்": "fire",
  "விபத்": "accident",
  "போராட்ட": "protest",
  "மாநகராட்சி": "corporation",
  "NDRF": "ndrf-teams",
  "மீட்பு குழு": "ndrf-teams",
  "நீர்மட்ட": "water-level",
  "அடி": "feet",
};

/** Tamil-script place names → canonical English place. Verified transliterations. */
const TAMIL_PLACES: Record<string, string> = {
  "சென்னை": "Chennai",
  "கோயம்புத்தூர்": "Coimbatore",
  "கோவை": "Coimbatore",
  "மதுரை": "Madurai",
  "திருச்சி": "Tiruchirappalli",
  "திருச்சிராப்பள்ளி": "Tiruchirappalli",
  "சேலம்": "Salem",
  "சேலத்": "Salem",
  "திருநெல்வேலி": "Tirunelveli",
  "நெல்லை": "Tirunelveli",
  "கடலூர்": "Cuddalore",
  "நாகப்பட்டின": "Nagapattinam",
  "நாகை": "Nagapattinam",
  "தஞ்சாவூர்": "Thanjavur",
  "தஞ்சை": "Thanjavur",
  "நீலகிரி": "Nilgiris",
  "வேலூர்": "Vellore",
  "ஈரோடு": "Erode",
  "ஈரோட்": "Erode",
  "கரூர்": "Karur",
  "திண்டுக்கல்": "Dindigul",
  "தேனி": "Theni",
  "விழுப்புர": "Viluppuram",
  "கள்ளக்குறிச்சி": "Kallakurichi",
  "தூத்துக்குடி": "Thoothukudi",
  "ராமநாதபுர": "Ramanathapuram",
  "ராமேஸ்வர": "Rameswaram",
  "கன்னியாகுமரி": "Kanyakumari",
  "குமரி": "Kanyakumari",
  "திருவள்ளூர்": "Tiruvallur",
  "திருவண்ணாமலை": "Tiruvannamalai",
  "காஞ்சிபுர": "Kanchipuram",
  "செங்கல்பட்ட": "Chengalpattu",
  "தாம்பரம்": "Tambaram",
  "மேட்டூர்": "Mettur",
  "காவிரி": "Cauvery",
  "பவானி": "Bhavani",
  "பவானிசாகர்": "Bhavani Dam",
  "வைகை": "Vaigai",
  "தாமிரபரணி": "Tamiraparani",
  "பாலாறு": "Palar",
  "நொய்யல்": "Noyyal",
  "வங்கக்கடல்": "Bay of Bengal",
  "தமிழ்நாடு": "Tamil Nadu",
  "தமிழ்நாட்": "Tamil Nadu",
  "தமிழக": "Tamil Nadu",
  "கர்நாடக": "Karnataka",
  "கேரள": "Kerala",
  "ஆந்திர": "Andhra Pradesh",
  "புதுச்சேரி": "Puducherry",
};

/** Tamil organisation / body names → canonical (English). */
const TAMIL_ORGS: Record<string, string> = {
  "வானிலை ஆய்வு மைய": "IMD",
  "இந்திய வானிலை ஆய்வு மைய": "IMD",
  "மண்டல வானிலை ஆய்வு மைய": "IMD",
  "தேசிய பேரிடர் மேலாண்மை ஆணைய": "NDMA",
  "மாவட்ட நிர்வாக": "district administration",
  "மாநில அரச": "state government",
  "தமிழ்நாடு அரச": "Tamil Nadu government",
  "பெருநகர சென்னை மாநகராட்சி": "Greater Chennai Corporation",
};

/**
 * Language-neutral concept + place tokens for a Tamil headline / excerpt.
 * These are compared against another Tamil headline's tokens, and (v0.5) against
 * the concept tokens derived from an English headline.
 */
export function tamilConceptTokens(text: string): {
  concepts: Set<string>;
  places: Set<string>;
  orgs: Set<string>;
} {
  const concepts = new Set<string>();
  const places = new Set<string>();
  const orgs = new Set<string>();
  const flat = text.normalize("NFC");

  // A dictionary key matches if it appears verbatim, or with its trailing pulli
  // dropped (the case ending fuses onto the last consonant) — BUT the fused form
  // must be followed by a suffix vowel-sign/pulli/boundary, not by one of the
  // long vowel signs that would make it a different, longer word
  // ("கடல்"=sea must not match inside "கடலூர்"=Cuddalore).
  const NEW_SYLLABLE = /[ாூொோௌ]/;
  const present = (key: string): boolean => {
    const k = key.normalize("NFC");
    if (flat.includes(k)) return true;
    if (!k.endsWith("்")) return false;
    const stem = k.slice(0, -1);
    let idx = flat.indexOf(stem);
    while (idx !== -1) {
      const after = flat[idx + stem.length] ?? " ";
      if (!NEW_SYLLABLE.test(after)) return true;
      idx = flat.indexOf(stem, idx + 1);
    }
    return false;
  };

  for (const [ta, en] of Object.entries(TAMIL_ORGS)) if (present(ta)) orgs.add(en);
  for (const [ta, en] of Object.entries(TAMIL_PLACES)) if (present(ta)) places.add(en);
  for (const [ta, concept] of Object.entries(TAMIL_CONCEPTS)) if (present(ta)) concepts.add(concept);

  // "பிரிவு 144" / "144 தடை" → section-144
  if (/\b144\b/.test(flat) && /தடை|பிரிவு|உத்தரவு|section/i.test(flat)) concepts.add("section-144");
  return { concepts, places, orgs };
}

// ── relative dates ─────────────────────────────────────────────────────

const TAMIL_RELATIVE_DAYS: Record<string, number> = {
  இன்று: 0,
  இன்றைக்கு: 0,
  நேற்று: -1,
  நேற்றைக்கு: -1,
  நாளை: 1,
  நாளைக்கு: 1,
  நாளையதினம்: 1,
  மறுநாள்: 1,
  "இந்த வாரம்": 0,
};

export interface ResolvedDate {
  phrase: string;
  /** ISO date (YYYY-MM-DD) when resolvable, else undefined. */
  iso?: string;
  offsetDays?: number;
}

/**
 * Resolve a Tamil relative-date word against the publication date. The original
 * phrase is always returned alongside the resolved value — ambiguity is kept.
 */
export function resolveTamilDate(text: string, publishedIso: string): ResolvedDate | undefined {
  const t = text.normalize("NFC");
  for (const [phrase, offset] of Object.entries(TAMIL_RELATIVE_DAYS)) {
    if (t.includes(phrase)) {
      const base = new Date(publishedIso);
      if (Number.isNaN(base.getTime())) return { phrase, offsetDays: offset };
      base.setUTCDate(base.getUTCDate() + offset);
      return { phrase, iso: base.toISOString().slice(0, 10), offsetDays: offset };
    }
  }
  return undefined;
}

/** Convert Tamil digits (௦–௯) to Arabic. Rare in modern feeds but cheap to handle. */
export function tamilDigitsToArabic(text: string): string {
  const map: Record<string, string> = {
    "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4",
    "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9",
  };
  return text.replace(/[௦-௯]/g, (d) => map[d] ?? d);
}
