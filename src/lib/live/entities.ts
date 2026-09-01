/**
 * Lightweight, deterministic named-entity + figure extraction from a headline.
 *
 * No ML. Used only to raise or lower confidence that two headlines are about
 * the SAME event when deciding whether to cluster them.
 */

/**
 * People — a shared person name alone is NOT enough to link two headlines
 * ("Vijay", "Rahul Gandhi" and "BJP" appear across huge numbers of unrelated
 * stories). The clustering scorer requires a shared non-person specific.
 */
export const PERSON_ENTITIES = new Set<string>([
  "vijay", "cm vijay", "stalin", "mk stalin", "m.k. stalin", "udhayanidhi", "palaniswami",
  "eps", "edappadi palaniswami", "annamalai", "seeman", "vaiko", "thirumavalavan",
  "vanathi srinivasan", "rahul gandhi", "narendra modi", "modi", "amit shah", "nadda",
  "mamata banerjee", "pinarayi vijayan", "kejriwal", "yogi", "yogi adityanath",
  "esakki subaya", "premalatha vijayakanth", "manickam tagore", "aadhav arjuna",
]);

/** Places / institutions / events / water bodies — these carry linking signal. */
const GAZETTEER_KEY: string[] = [
  "tamil nadu assembly", "tamil nadu government", "dmk", "aiadmk", "bjp", "tvk", "tasmac",
  "madras high court", "supreme court", "cwma", "cauvery water management authority",
  "election commission", "raj bhavan",
  "imd", "india meteorological department", "ndrf", "sdrf", "ndma", "incois",
  "central water commission", "cwc", "isro", "rbi", "reserve bank of india",
  "southern railway", "indian railways",
  "greater chennai corporation", "cmda", "tangedco", "metrowater", "chennai metro",
  "cauvery", "kaveri", "mettur dam", "mettur", "mullaperiyar", "vaigai", "tamiraparani",
  "bhavani", "amaravathi dam", "krishnagiri dam", "sathanur", "chembarambakkam",
  "poondi", "red hills", "cholavaram", "veeranam", "bay of bengal", "freedom park",
  "ganga", "yamuna", "kosi", "bagmati", "brahmaputra", "godavari", "krishna", "birbhum",
  "vinayaka chaturthi", "ganesh chaturthi", "neet", "cauvery water release",
  "katchatheevu", "sterlite", "koodankulam", "kudankulam", "semiconductor park",
];

const GAZETTEER: string[] = [...PERSON_ENTITIES, ...GAZETTEER_KEY];

const STOP_CAPS = new Set([
  "The", "A", "An", "In", "On", "At", "Of", "For", "To", "And", "But", "Or", "As", "By",
  "With", "From", "After", "Before", "Over", "Under", "Into", "New", "Watch", "Video",
  "Explained", "Live", "Update", "Updates", "Breaking", "Big", "Top", "How", "Why", "What",
  "When", "Where", "Who", "Amid", "Says", "Said", "India", "Indian", "Tamil", "Nadu",
]);

const TEMPLATE_PREFIXES =
  /^(?:sollathigaram|breaking(?:\s*news)?|today\s*headlines?(?:\s*-\s*[\d.\/]+)?|watch|video|live|exclusive|opinion|editorial|explained|big\s*story|top\s*(?:news|headlines)|news\s*\d+|[஀-௿\s]+?headlines?)\s*[|:\-–]\s*/i;

/**
 * Strip a leading TV-segment / label prefix ("BREAKING | …", "Today Headlines - 01.09.2026 | …",
 * "Sollathigaram | …") so clustering compares the actual story, not the show name.
 */
export function stripHeadlinePrefix(title: string): string {
  let t = title.trim();
  for (let i = 0; i < 3; i++) {
    const next = t.replace(TEMPLATE_PREFIXES, "");
    if (next === t) break;
    t = next.trim();
  }
  // Also drop a trailing " | News18Tamilnadu"-style channel signature.
  t = t.replace(/\s*[|]\s*(?:news18\s*tamil(?:nadu)?|puthiyathalaimurai|bbc\s*tamil|vikatan)\s*$/i, "").trim();
  return t || title.trim();
}

const DIGEST_PATTERNS: RegExp[] = [
  /\btoday'?s?\s*headlines?\b/i,
  /\bnight\s*headlines?\b/i,
  /\bsollathigaram\b/i,
  /\b(top|main|key|prime\s*time|evening|morning|noon)\s+(news|headlines|stories|bulletin)\b/i,
  /\bheadlines?\s*[-–|:]\s*\d{1,2}[.\/]\d/i,
  /\bnews\s*(?:@|at)\s*\d/i,
  /\b\d{1,2}\s*மணி\b.*தலைப்பு/i,
  /முக்கிய\s*தலைப்பு/i,
  /தலைப்புச்?\s*செய்திகள்/i,
  /\bweekly\s+(?:wrap|roundup|recap)\b/i,
  /\bin\s+\d+\s+(?:points|charts)\b/i,
];

/**
 * True for multi-topic digests / talk-show segments ("Today Headlines - …",
 * "Sollathigaram | …", "8 மணி தலைப்புச் செய்திகள்"). These legitimately mention
 * many unrelated entities, so they must never seed or join a cluster — they
 * remain standalone single reports.
 */
export function isDigestHeadline(rawTitle: string): boolean {
  const t = rawTitle.trim();
  if (DIGEST_PATTERNS.some((re) => re.test(t))) return true;
  // Four or more segment separators = a list, not one story.
  const seps = (t.match(/\s[|•·–]\s/g) || []).length;
  return seps >= 4;
}

/** Capitalised multi-word phrases (proper nouns), plus gazetteer hits. */
export function extractEntities(rawTitle: string): Set<string> {
  const title = stripHeadlinePrefix(rawTitle);
  const out = new Set<string>();
  const lower = " " + title.toLowerCase() + " ";

  for (const g of GAZETTEER) {
    const re = new RegExp(`(^|[^a-z])${g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
    if (re.test(lower)) out.add(g.replace(/\./g, "").replace(/\s+/g, " "));
  }

  // Capitalised runs: "Madras High Court", "Chennai Corporation", "Mamata Banerjee"
  const words = title.replace(/[^\p{L}\p{N}\s.]/gu, " ").split(/\s+/);
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 1) {
      const phrase = run.join(" ").replace(/\.$/, "").trim();
      if (phrase.length > 3 && !STOP_CAPS.has(phrase)) out.add(phrase.toLowerCase());
    }
    run = [];
  };
  for (const w of words) {
    const bare = w.replace(/[^\p{L}\p{N}]/gu, "");
    if (bare.length > 1 && /^[A-Z]/.test(bare) && !STOP_CAPS.has(bare)) {
      run.push(bare);
    } else {
      flush();
    }
  }
  flush();

  return out;
}

/** Numeric facts: "₹600 crore", "3 dead", "17.604 tmcft", "12,000 cusecs". */
export function extractFigures(title: string): Set<string> {
  const out = new Set<string>();
  const t = title.toLowerCase();
  const re = /(?:₹|rs\.?\s?)?[\d,]+(?:\.\d+)?\s?(crore|lakh|tmcft|cusec|cusecs|mm|cm|km|dead|killed|injured|missing|feet|ft|%|per cent|percent)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) out.add(m[0].replace(/\s+/g, " ").trim());
  return out;
}

export function jaccardSet(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}
