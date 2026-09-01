/**
 * String hygiene for externally sourced feed content.
 *
 * Every value that comes from a feed passes through here before it is stored or
 * rendered: strip markup, decode entities, collapse whitespace, clamp length.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
};

// C0/C1 control chars except tab (09) and newline (0A).
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const COMBINING_MARKS = /[\u0300-\u036F]/g;
const TAMIL_BLOCK = /[\u0B80-\u0BFF]/g;

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&[a-zA-Z]+;/g, (m) => ENTITIES[m] ?? m);
}

function safeCodePoint(cp: number): string {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return "";
  if ((cp < 0x20 && cp !== 0x09 && cp !== 0x0a) || (cp >= 0x7f && cp <= 0x9f)) return "";
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

export function stripTags(input: string): string {
  return input
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ");
}

/** Full clean: de-CDATA, strip tags, decode entities, drop control chars, collapse ws, clamp. */
export function clean(input: unknown, maxLen = 400): string {
  if (input == null) return "";
  let s = String(input);
  s = stripTags(s);
  s = decodeEntities(s);
  s = s.replace(CONTROL_CHARS, "");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen - 1).trimEnd() + "…";
  return s;
}

export function cleanTitle(input: unknown): string {
  return clean(input, 240);
}

export function cleanExcerpt(input: unknown): string {
  return clean(input, 360);
}

/** Validate + canonicalise a source URL. Returns null if not a safe http(s) URL. */
export function safeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname || !u.hostname.includes(".")) return null;
  const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "cmpid", "ncid"];
  for (const p of drop) u.searchParams.delete(p);
  u.hash = "";
  return u.toString();
}

/** RFC-822 / ISO / epoch / "Www Mmm dd HH:MM:SS IST yyyy" -> ISO string, or null. */
export function safeDate(input: unknown, now = Date.now()): string | null {
  if (input == null) return null;
  let ms: number;
  if (typeof input === "number") {
    ms = input < 1e12 ? input * 1000 : input;
  } else {
    const s = String(input).trim();
    if (!s) return null;
    ms = Date.parse(s);
    if (Number.isNaN(ms)) {
      const m = s.match(/^\w{3} (\w{3}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) IST (\d{4})$/);
      if (m) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mon = months.indexOf(m[1]);
        if (mon >= 0) {
          ms = Date.UTC(+m[6], mon, +m[2], +m[3] - 5, +m[4] - 30, +m[5] || 0);
        }
      }
    }
  }
  if (Number.isNaN(ms)) return null;
  const year = new Date(ms).getUTCFullYear();
  if (year < 2000) return null;
  if (ms > now + 2 * 24 * 3600 * 1000) return null;
  return new Date(ms).toISOString();
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had", "her", "was", "one", "our", "out",
  "day", "get", "has", "him", "his", "how", "its", "new", "now", "old", "see", "two", "who", "did", "she", "use",
  "way", "will", "with", "from", "this", "that", "have", "been", "over", "into", "after", "says", "said", "amid",
  "near", "more", "than", "also", "news", "update", "updates", "latest", "report", "reports", "today", "live",
  "video", "photos",
]);

/** Normalised content tokens of a headline, for dedup + clustering. */
export function titleTokens(title: string): string[] {
  return clean(title, 500)
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function normalisedTitleKey(title: string): string {
  return titleTokens(title).sort().join(" ");
}

export function detectLanguage(text: string): "ta" | "en" | "unknown" {
  const tamil = (text.match(TAMIL_BLOCK) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (tamil > 4 && tamil >= latin) return "ta";
  if (latin > 4) return "en";
  return "unknown";
}

/** Deterministic short id from stable inputs. */
export function stableId(...parts: string[]): string {
  const s = parts.join(" ");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  let h2 = 52711;
  for (let i = s.length - 1; i >= 0; i--) h2 = ((h2 << 5) + h2 + s.charCodeAt(i)) >>> 0;
  return (h.toString(36) + h2.toString(36)).slice(0, 12);
}

export function slugify(input: string, max = 70): string {
  const base = clean(input, 300)
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return base || "item";
}
