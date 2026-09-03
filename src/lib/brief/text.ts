/**
 * Shared text helpers for the brief subsystem.
 *
 * Deterministic. Used by both the synthesizer (to build sentences) and the
 * verifier (to check that every sentence traces back to its sources).
 */
import { clean } from "@/lib/live/text";
import { tamilDigitsToArabic } from "@/lib/language/tamil";

/** Words that stay Title-case (or ALL-CAPS) in a sentence-cased headline. */
const KEEP_CASE = new Set([
  "india", "indian", "tamil", "nadu", "chennai", "madras", "delhi", "mumbai", "bengaluru", "kolkata",
  "kerala", "keralam", "muscat", "doha", "assam", "bengal", "chief", "minister", "supreme", "court",
  "high", "assembly", "governor", "centre", "union", "government", "parliament", "cabinet",
  "september", "october", "november", "december", "january", "february", "march", "april",
  "june", "july", "august", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "formula", "olympic", "secretariat", "cauvery", "mettur", "mullaperiyar", "polavaram",
  "rs", "city", "cup", "trophy", "league", "test", "pradesh", "madhya", "sdma", "ndma", "imd",
]);
const LOWER_WORDS = new Set([
  "a", "an", "the", "of", "for", "and", "or", "to", "in", "on", "at", "as", "by", "with", "from",
  "amid", "amidst", "over", "after", "before", "into", "under", "against", "about", "says", "said",
  "that", "this", "is", "are", "was", "were", "be", "been", "no", "not", "up", "off", "out",
]);

/** True when most words are Title-case — a "Headline Written Like This". */
export function isTitleCaseHeavy(raw: string): boolean {
  const words = raw.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length < 4) return false;
  const title = words.filter((w) => /^[A-Z][a-z]/.test(w)).length;
  return title / words.length >= 0.6;
}

/**
 * Convert a Title-Case headline to sentence case, keeping proper nouns + acronyms.
 * No-op unless the text really is written Title-Case (so real sentences with
 * ordinary proper nouns are left alone).
 */
export function sentenceCaseHeadline(raw: string): string {
  if (!isTitleCaseHeavy(raw)) {
    // still fix an ALL-CAPS shout and a leading lowercase
    if (raw === raw.toUpperCase() && /[A-Z]{6,}/.test(raw)) {
      return raw.charAt(0) + raw.slice(1).toLowerCase();
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  const words = raw.split(/(\s+)/);
  let started = false;
  const out = words.map((w) => {
    if (/^\s+$/.test(w) || !w) return w;
    const bare = w.replace(/[^A-Za-z஀-௿]/g, "");
    if (!bare) return w;
    const isAcronym = bare.length <= 5 && bare === bare.toUpperCase() && /[A-Z]/.test(bare);
    const isTitle = /^[A-Z][a-z]+$/.test(bare);
    const low = bare.toLowerCase();
    let res = w;
    const startsWithLetter = /^[A-Za-z஀-௿]/.test(w);
    if (!started && startsWithLetter) {
      res = isAcronym ? w : w.replace(bare, bare.charAt(0).toUpperCase() + bare.slice(1).toLowerCase());
      started = true;
    } else if (!started) {
      // leading token has no leading letter (e.g. "₹1,200-crore") — lowercase its letters, don't "start"
      if (!isAcronym) res = w.replace(bare, low);
    } else if (isAcronym || KEEP_CASE.has(low)) {
      res = w;
    } else if (isTitle && !LOWER_WORDS.has(low)) {
      res = w.replace(bare, low);
    } else if (LOWER_WORDS.has(low)) {
      res = w.replace(bare, low);
    }
    return res;
  });
  return out.join("");
}

const HEADLINE_TAIL =
  /\s*[|•]\s*(video|watch|photos?|full video|exclusive|explained|analysis|opinion|live updates?)\s*$/i;
const SOURCE_TAIL =
  /\s+[-–—]\s+(the hindu|times of india|ndtv|india today|news18[\w ]*|hindustan times|the indian express|deccan herald|business standard)\s*$/i;

/** Strip TV-segment cruft, section prefixes, trailing bylines and a trailing ": <Speaker>". */
export function cleanHeadline(raw: string): string {
  let s = clean(raw, 240);
  s = s.replace(/^\s*(breaking(?:\s+news)?|watch|live|video|exclusive|big breaking|just in|update|explained)\b\s*[:|–—-]\s*/i, "");
  s = s.replace(/\bRs\.?\s*([\d,]+)/g, "₹$1");
  if (/\s[|•·]\s/.test(s)) {
    const parts = s.split(/\s[|•·]\s/).map((p) => p.trim()).filter(Boolean);
    parts.sort((a, b) => score(b) - score(a));
    s = parts[0] ?? s;
  }
  s = s.replace(HEADLINE_TAIL, "").replace(SOURCE_TAIL, "");
  // trailing attribution: "… on September 15: CM Vijay" / "…: Stalin"
  s = s.replace(/:\s*(?:cm\s+)?[A-Z][\w.'-]*(?:\s+[A-Z][\w.'-]*){0,2}\s*$/,"");
  // a trailing possessive tagline: "…: Vijay's Chennai makeover"
  s = s.replace(/:\s*[A-Z][\w'’-]+’?s?\s+[\w'’-]+(?:\s+[\w'’-]+){0,2}\s*$/, (m) =>
    /\b(makeover|vision|plan|push|dream|promise|pitch|move|gambit|era|way|model)\b/i.test(m) ? "" : m,
  );
  s = sentenceCaseHeadline(s.trim());
  return s.trim();

  function score(p: string): number {
    const words = p.split(/\s+/).length;
    let v = words >= 4 && words <= 24 ? 10 : 0;
    if (/[.:;]/.test(p)) v += 1;
    if (/^[A-Z஀-௿]/.test(p)) v += 1;
    if (/\b(said|says|announced|announces|to|after|as|rejects?|rules?|orders?)\b/i.test(p)) v += 2;
    if (/\b(gold (price|rate)|watch|video|full)\b/i.test(p)) v -= 5;
    return v;
  }
}

const JUNK_SPEAKER = /^(a statement from|as per|according to|sources?|the said|per the|report(?:s|ing)?)\b/i;

/** A readable single sentence from a claim's canonicalText. */
export function cleanClaimText(raw: string): string {
  const { text } = splitAttribution(raw);
  return text;
}

/**
 * Split "X stated: the rest" into a speaker + a clean assertion. When the leading
 * speaker is junk ("a statement from", "sources") it is dropped entirely.
 */
export function splitAttribution(raw: string): { text: string; speaker?: string } {
  let s = clean(raw, 320);
  s = s.replace(HEADLINE_TAIL, "");
  s = s.replace(/\bRs\.?\s*([\d,]+)/g, "₹$1");
  if (/\s[|•]\s/.test(s) && !/["“]/.test(s)) s = s.split(/\s[|•]\s/)[0].trim();
  s = s.replace(/^as per (?:a )?statement (?:from |by |issued by )?[^,]{0,44},\s*/i, "");

  let speaker: string | undefined;
  const m = s.match(/^(.{2,44}?)\s+(?:stated|said|forecast|announced|alleged|noted|added):\s*(.+)$/i);
  if (m) {
    const cand = m[1].trim().replace(/^the\s+/i, "");
    if (JUNK_SPEAKER.test(cand)) {
      s = m[2];
    } else {
      speaker = cand;
      s = m[2];
    }
  }
  // "X says, "…"" doubled attribution
  s = s.replace(/^\s*([A-Z][\w.'-]+(?:\s+[A-Z][\w.'-]+)?)\s+says,\s*["“]?/i, (_g, who) => {
    speaker ??= who;
    return "";
  });
  s = sentenceCaseHeadline(s.trim());
  s = s.replace(/\s+$/, "").replace(/[,;:]\s*$/, "").replace(/^["“]/, "").replace(/["”]$/, "");
  if (s && !/[.!?…]$/.test(s) && !/[஀-௿]$/.test(s)) s += ".";
  return { text: s, speaker };
}

/** Normalise a number token: strip commas, fold "crore"/"lakh"/"k"/"million"/"bn" → absolute. */
export function normaliseNumber(tok: string): number | null {
  const t = tok.toLowerCase().replace(/,/g, "").trim();
  const m = t.match(/^(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lakhs|million|mn|billion|bn|thousand|k)?/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  switch (m[2]) {
    case "crore":
    case "cr":
      n *= 1e7;
      break;
    case "lakh":
    case "lakhs":
      n *= 1e5;
      break;
    case "million":
    case "mn":
      n *= 1e6;
      break;
    case "billion":
    case "bn":
      n *= 1e9;
      break;
    case "thousand":
    case "k":
      n *= 1e3;
      break;
  }
  return n;
}

const NUMBER_RE = /(?:₹|rs\.?\s*)?\d[\d,]*(?:\.\d+)?\s*(?:crore|cr|lakh|lakhs|million|mn|billion|bn|thousand|%|per cent|percent|mm|cm|cusecs?|kmph|km\/h|bps|points?|runs?|wickets?|ft|feet|degrees?|°c)?/gi;

/** Every distinct numeric value mentioned in a piece of text (normalised). */
export function numbersIn(text: string): number[] {
  const src = tamilDigitsToArabic(text);
  const out = new Set<number>();
  for (const m of src.matchAll(NUMBER_RE)) {
    const raw = m[0].trim();
    if (!/\d/.test(raw)) continue;
    const n = normaliseNumber(raw);
    if (n != null) out.add(n);
    // also keep the bare integer reading ("1,200 crore" → 1200 and 12e9)
    const bare = parseFloat(raw.replace(/[^\d.]/g, ""));
    if (Number.isFinite(bare)) out.add(bare);
  }
  return [...out];
}

/** Explicit calendar/clock tokens in a sentence (for date-drift checks). */
export function datesIn(text: string): string[] {
  const out = new Set<string>();
  const re =
    /\b(\d{1,2}[:.]\d{2}\s*(?:am|pm|ist|hrs)?|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:today|tomorrow|yesterday|tonight))\b/gi;
  for (const m of text.matchAll(re)) out.add(m[0].toLowerCase().replace(/\s+/g, " ").trim());
  return [...out];
}

const UNIT_RE = /\b(\d[\d,.]*)\s*(crore|lakh|million|billion|mm|cm|cusecs?|kmph|km\/h|bps|per cent|percent|%|points?|runs?|wickets?|ft|feet)\b/gi;

/** number→unit pairs, for unit-drift checks. */
export function unitPairsIn(text: string): { n: number; unit: string }[] {
  const src = tamilDigitsToArabic(text).toLowerCase();
  const out: { n: number; unit: string }[] = [];
  for (const m of src.matchAll(UNIT_RE)) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (Number.isFinite(n)) out.push({ n, unit: normaliseUnit(m[2]) });
  }
  return out;
}

export function normaliseUnit(u: string): string {
  const s = u.toLowerCase();
  if (s === "per cent" || s === "percent" || s === "%") return "%";
  if (s === "km/h" || s === "kmph") return "kmph";
  if (s === "feet" || s === "ft") return "ft";
  if (s === "cusec" || s === "cusecs") return "cusecs";
  if (s === "point" || s === "points") return "points";
  if (s === "run" || s === "runs") return "runs";
  if (s === "wicket" || s === "wickets") return "wickets";
  return s;
}

/** Candidate proper-noun / entity phrases in a sentence (English + Tamil-aware). */
export function properNounsIn(text: string): string[] {
  const out = new Set<string>();
  // English: runs of Capitalised words (allowing internal lowercase connectors)
  for (const m of text.matchAll(/\b([A-Z][\w.'-]+(?:\s+(?:of|the|and|for|&)?\s*[A-Z][\w.'-]+){0,4})\b/g)) {
    const phrase = m[1].trim();
    if (phrase.length > 2 && !STOP_PROPER.has(phrase.toLowerCase())) out.add(phrase);
  }
  // Tamil: any maximal run of Tamil script + spaces
  for (const m of text.matchAll(/[஀-௿]+(?:\s+[஀-௿]+){0,4}/g)) {
    const phrase = m[0].trim();
    if (phrase.length > 2) out.add(phrase);
  }
  return [...out];
}

const STOP_PROPER = new Set([
  "the", "a", "an", "iffa", "india", "indian", "tamil nadu", "tamil", "nadu",
  "it", "this", "that", "these", "those", "there", "their", "they", "he", "she", "we", "his", "her",
  "on", "in", "at", "as", "after", "before", "but", "and", "amid", "amidst", "following", "during",
  "about", "around", "over", "under", "no", "not", "an earlier", "some", "one", "two", "three",
  "correction", "officials", "police", "sources", "authorities", "residents",
]);

/** Loose containment: does `needle` (a name/number-free phrase) appear in `hay`? */
export function looseContains(hay: string, needle: string): boolean {
  const h = fold(hay);
  const n = fold(needle);
  if (!n) return false;
  if (h.includes(n)) return true;
  // token-subset: every content token of the needle appears in the haystack
  const ht = new Set(h.split(/\s+/));
  const nt = n.split(/\s+/).filter((w) => w.length > 2);
  if (nt.length === 0) return false;
  return nt.every((w) => ht.has(w) || h.includes(w));
}

export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clip to a word budget without cutting mid-word. */
export function clipWords(s: string, maxWords: number): string {
  const w = s.split(/\s+/);
  if (w.length <= maxWords) return s;
  return w.slice(0, maxWords).join(" ").replace(/[,;:]$/, "") + "…";
}

/** IST clock stamp, e.g. "03 Sep, 12:13". */
export function fmtISTStamp(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** IST window phrase used in lead sentences: "03 Sep, 12:13 to 04 Sep, 08:30 IST". */
export function fmtISTWindow(from?: string, until?: string): string | undefined {
  const a = fmtISTStamp(from);
  const b = fmtISTStamp(until);
  if (a && b) return `${a} to ${b} IST`;
  if (b) return `until ${b} IST`;
  if (a) return `from ${a} IST`;
  return undefined;
}

const PARTY_ACRONYMS = new Set([
  "dmk", "aiadmk", "bjp", "tvk", "vck", "pmk", "ntk", "mdmk", "dmdk", "cpi", "cpi(m)", "cpm",
  "rbi", "sebi", "imd", "ndrf", "sdrf", "ndma", "nbems", "bci", "eci", "ncp", "aap", "inc",
]);

export function titleCaseAuthority(s: string): string {
  const t = s.trim();
  const low = t.toLowerCase();
  const map: Record<string, string> = {
    cm: "The Chief Minister",
    "chief minister": "The Chief Minister",
    "tn cm": "The Tamil Nadu Chief Minister",
    "cm vijay": "Tamil Nadu Chief Minister C. Joseph Vijay",
    "cm stalin": "Tamil Nadu Chief Minister M. K. Stalin",
    "joseph vijay": "C. Joseph Vijay",
    imd: "IMD",
    ndrf: "NDRF",
    sdrf: "SDRF",
    ndma: "NDMA",
    police: "Police",
    government: "The government",
    govt: "The government",
    "the government": "The government",
    "district administration": "The district administration",
    court: "The court",
    "high court": "The High Court",
    "madras high court": "The Madras High Court",
    "supreme court": "The Supreme Court",
    opposition: "The opposition",
  };
  if (map[low]) return map[low];
  if (PARTY_ACRONYMS.has(low)) return t.toUpperCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** A vague generic-action claim ("Flights were diverted.") — fine as a key fact, weak as a lead. */
export function isGenericActionStub(text: string): boolean {
  return /^(flights?|trains?|schools?|colleges?|bus(?:es)? services?|metro services?|power supply|classes|fishing|exams?|rail services?)\b.{0,20}\b(was|were)\s+(closed|suspended|cancelled|diverted|banned|restored|opened|imposed|postponed|declared)\.?$/i.test(
    text.trim(),
  );
}
