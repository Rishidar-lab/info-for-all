/**
 * Dependency-free text utilities shared by clustering, search, claim extraction
 * and independence scoring. Deterministic and side-effect free so they are easy
 * to unit test and reason about.
 */

export const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "as", "at", "by",
  "for", "from", "in", "into", "of", "on", "onto", "to", "with", "without",
  "is", "are", "was", "were", "be", "been", "being", "has", "have", "had",
  "do", "does", "did", "will", "would", "shall", "should", "can", "could",
  "may", "might", "must", "not", "no", "yes", "it", "its", "this", "that",
  "these", "those", "he", "she", "they", "them", "his", "her", "their", "we",
  "our", "you", "your", "i", "me", "my", "over", "after", "before", "about",
  "up", "down", "out", "off", "again", "further", "here", "there", "when",
  "where", "who", "whom", "which", "what", "how", "all", "any", "both", "each",
  "few", "more", "most", "other", "some", "such", "only", "own", "same", "so",
  "very", "s", "t", "just", "also", "new", "said", "says", "according",
]);

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function tokenize(input: string): string[] {
  return normalizeWhitespace(input.toLowerCase())
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter(Boolean);
}

/** Content tokens: tokenized, stopword-stripped, light suffix folding. */
export function contentTokens(input: string): string[] {
  return tokenize(input)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem);
}

/** Extremely small suffix stemmer — enough to fold plurals / verb tenses. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  for (const suffix of ["'s", "ing", "edly", "ed", "es", "s", "ly"]) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w;
}

export function jaccard<T>(a: Iterable<T>, b: Iterable<T>): number {
  const setA = a instanceof Set ? a : new Set(a);
  const setB = b instanceof Set ? b : new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) if (setB.has(item)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function cosineBag(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [k, va] of a) {
    normA += va * va;
    const vb = b.get(k);
    if (vb) dot += va * vb;
  }
  for (const vb of b.values()) normB += vb * vb;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
  return tf;
}

/** Character n-gram shingles for near-duplicate detection. */
export function shingles(input: string, size = 5): Set<string> {
  const normalized = normalizeWhitespace(input.toLowerCase()).replace(/[^a-z0-9 ]/g, "");
  const out = new Set<string>();
  if (normalized.length < size) {
    if (normalized) out.add(normalized);
    return out;
  }
  for (let i = 0; i + size <= normalized.length; i += 1) {
    out.add(normalized.slice(i, i + size));
  }
  return out;
}

export function textSimilarity(a: string, b: string): number {
  return jaccard(shingles(a), shingles(b));
}

const ABBREVIATIONS = /\b(?:mr|mrs|ms|dr|prof|sen|rep|gov|st|inc|ltd|co|vs|no|u\.s|u\.k|e\.g|i\.e)\.$/i;

/** Split prose into sentences, keeping quotation marks and trailing punctuation. */
export function splitSentences(input: string): string[] {
  const text = normalizeWhitespace(input);
  if (!text) return [];
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i += 1) {
    current += text[i];
    if (/[.!?]/.test(text[i])) {
      const next = text[i + 1] ?? "";
      const nextNext = text[i + 2] ?? "";
      const endsQuote = next === '"' || next === "”" || next === "'";
      const boundary = endsQuote ? nextNext : next;
      if ((boundary === "" || boundary === " ") && !ABBREVIATIONS.test(current.trim())) {
        if (endsQuote) current += next;
        parts.push(current.trim());
        current = "";
      }
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter((s) => s.length > 1);
}

export function toParagraphs(input: string): string[] {
  return input
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => normalizeWhitespace(p))
    .filter(Boolean);
}

/**
 * Strip HTML to text with a conservative allowlist mindset: no tags survive.
 * Entities are decoded for a small common set. Used on ingested article metadata.
 */
export function stripHtml(input: string): string {
  const withoutTags = input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return normalizeWhitespace(
    withoutTags
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))),
  );
}

export function truncate(input: string, max = 280): string {
  const clean = normalizeWhitespace(input);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
