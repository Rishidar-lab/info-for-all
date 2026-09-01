import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { ClaimType } from "./types";
import { clean, detectLanguage } from "@/lib/live/text";
import { stripHeadlinePrefix } from "@/lib/live/entities";

/**
 * A raw claim candidate drawn from ONE article. Candidates with the same
 * `matchKey` are later normalised into one Claim.
 */
export interface ClaimCandidate {
  /** Deterministic key used to group candidates into the same claim. */
  matchKey: string;
  type: ClaimType;
  canonicalText: string;
  subjects: string[];
  predicates: string[];
  objects: string[];
  /** Set when the source attributes the statement to someone — status stays "attributed". */
  attribution?: string;
  /** For numeric-conflict detection. */
  figure?: { kind: string; value: number; raw: string };
  sourceText: string;
  sourceTextOriginal?: string;
  language: "ta" | "en" | "unknown";
  articleId: string;
  publisherId: string;
  sourceUrl: string;
  extractionConfidence: number;
}

/** Verbs that mark a statement as ATTRIBUTED — never promote these to bare fact. */
const ATTRIBUTION_VERBS =
  /\b(said|says|stated|announced|claimed|claims|alleged|alleges|asserted|expects?|expected|believes?|feared?|warns?|warned|told|according to|per the|estimated|estimates|projected|projects|promised|denied|denies|confirmed|reiterated|added)\b/i;

const SPEECH_VERB =
  "said|says|stated|announced|announces|claimed|claims|alleged|alleges|asserted|asserts|warned|warns|told|confirmed|confirms|denied|denies|added|adds|reiterated|reiterates|promised|promises|believes?|expects?|expected|fears?|feared|estimated|estimates|projected|projects|noted|notes";

const INSTITUTION =
  "police|officials?|authorities|the government|government|opposition|the minister|minister|chief minister|cm|collector|district administration|revenue officials?|imd|india meteorological department|ndrf|sdrf|ndma|the court|high court|supreme court|hospital|doctors?|experts?|sources?|the fire department|fire department|railways?|corporation";

/** Speaker patterns: "<Speaker> said …", "… said <Speaker>", "According to <Speaker>", "…, <role> says". */
function detectAttribution(text: string): string | undefined {
  const t = clean(text, 300);
  let m = t.match(new RegExp(`^([A-Z][\\w.'-]*(?:\\s+[A-Z][\\w.'-]*){0,4})\\s+(?:${SPEECH_VERB})\\b`));
  if (m) return m[1]!.trim();
  m = t.match(/\baccording to\s+(?:the\s+)?([a-z][\w.'-]*(?:\s+[\w.'-]*){0,4})/i);
  if (m) return m[1]!.replace(/[,.:;].*$/, "").trim();
  m = t.match(new RegExp(`\\b(?:said|says|told|per|according to)\\s+([A-Z][\\w.'-]*(?:\\s+[A-Z][\\w.'-]*){0,3})\\b`));
  if (m) return m[1]!.trim();
  // Generic institutional speakers, "the" optional, verb before or after.
  m = t.match(new RegExp(`\\b(?:the\\s+)?(${INSTITUTION})\\b[,\\s]+(?:${SPEECH_VERB})`, "i"));
  if (m) return m[1]!.replace(/^the\s+/i, "").trim();
  m = t.match(new RegExp(`\\b(?:${SPEECH_VERB})\\s+(?:the\\s+)?(${INSTITUTION})\\b`, "i"));
  if (m) return m[1]!.replace(/^the\s+/i, "").trim();
  return undefined;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Numeric facts with clear semantics. Returns kind + value + raw. */
function parseFigures(text: string): { kind: string; value: number; raw: string }[] {
  const t = text.toLowerCase();
  const out: { kind: string; value: number; raw: string }[] = [];
  const push = (kind: string, re: RegExp) => {
    let m: RegExpExecArray | null;
    const g = new RegExp(re, "g");
    while ((m = g.exec(t))) {
      const n = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(n)) out.push({ kind, value: n, raw: m[0].trim() });
    }
  };
  push("deaths", /\b([\d,]+)\s+(?:people\s+)?(?:killed|dead|died|deaths|lost their lives)\b/);
  push("injuries", /\b([\d,]+)\s+(?:people\s+)?(?:injured|hurt|wounded)\b/);
  push("missing", /\b([\d,]+)\s+(?:people\s+)?(?:missing|unaccounted)\b/);
  push("rescued", /\b([\d,]+)\s+(?:people\s+)?(?:rescued|evacuated|shifted|moved to (?:relief|safety))\b/);
  push("rainfall_mm", /\b([\d,]+(?:\.\d+)?)\s*mm\s+(?:of\s+)?rain/);
  push("amount_crore", /(?:₹|rs\.?\s?)([\d,]+(?:\.\d+)?)\s*crore/);
  return out;
}

/** Normalised token key of a phrase, for matching claims across wordings. */
function keyOf(text: string): string {
  const SYN: Record<string, string> = {
    shut: "close", closed: "close", shutdown: "close", closure: "close",
    ordered: "order", declared: "declare", announced: "announce",
    holiday: "close", suspended: "suspend", halted: "suspend", cancelled: "cancel",
    warned: "warn", warning: "warn", alert: "warn",
    killed: "die", dead: "die", died: "die", deaths: "die",
    injured: "injure", hurt: "injure", wounded: "injure",
    rescued: "rescue", evacuated: "evacuate", shifted: "evacuate",
    rainfall: "rain", downpour: "rain", showers: "rain",
    released: "release", opened: "open",
  };
  return clean(stripHeadlinePrefix(text), 400)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => SYN[w] ?? w)
    .filter((w) => w.length > 2 && !KEY_STOP.has(w))
    .sort()
    .join(" ");
}

const KEY_STOP = new Set([
  "the", "and", "for", "are", "was", "will", "has", "have", "had", "with", "from", "that", "this",
  "amid", "over", "into", "after", "news", "today", "latest", "report", "reports", "watch", "video",
  "tamil", "nadu", "india", "state", "says", "said", "new", "big", "top",
]);

interface Rule {
  id: string;
  type: ClaimType;
  /** Returns the object clause + a stable predicate when matched, else null. */
  match: (text: string) => { predicate: string; object: string; subject?: string } | null;
  baseConfidence: number;
}

const RULES: Rule[] = [
  {
    id: "school-closure",
    type: "official-statement",
    baseConfidence: 0.8,
    match: (t) => {
      const m = t.match(/\b(schools?|colleges?|educational institutions?)\b.{0,40}?\b(closed|shut|holiday|suspended)\b/i);
      if (!m) return null;
      const when = t.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|sept?\s*\d{1,2}|\d{1,2}\s*sept?)\b/i);
      return { subject: m[1].toLowerCase(), predicate: "closed", object: `on ${when ? when[1] : "the stated day"}` };
    },
  },
  {
    id: "holiday-declared",
    type: "official-statement",
    baseConfidence: 0.78,
    match: (t) => {
      const m = t.match(/\b(collector|district administration|government)\b.{0,30}?\bdeclared?\b.{0,20}?\bholiday\b/i);
      return m ? { subject: m[1].toLowerCase(), predicate: "declared", object: "a public holiday" } : null;
    },
  },
  {
    id: "weather-warning",
    type: "official-statement",
    baseConfidence: 0.82,
    match: (t) => {
      const m = t.match(/\b(red|orange|yellow)\s+alert\b/i) || t.match(/\b(heavy|very heavy|extremely heavy)\s+rain(?:fall)?\s+(?:warning|alert|likely|forecast)/i);
      if (!m) return null;
      return { subject: "IMD / weather authority", predicate: "issued", object: `a ${m[1].toLowerCase()} rainfall warning` };
    },
  },
  {
    id: "dam-water-release",
    type: "event",
    baseConfidence: 0.72,
    match: (t) => {
      const m = t.match(/\b(mettur|bhavani|amaravathi|sathanur|krishnagiri|vaigai)\s+dam\b.{0,40}?\b(open|opened|release|released|water)/i);
      return m ? { subject: `${m[1]} dam`, predicate: "opened", object: "for water release" } : null;
    },
  },
  {
    id: "road-rail-disruption",
    type: "event",
    baseConfidence: 0.7,
    match: (t) => {
      const m = t.match(/\b(train|trains|flights?|bus services?|traffic|road|highway|metro)\b.{0,30}?\b(cancelled|suspended|disrupted|diverted|blocked|halted|curbs?)\b/i);
      if (!m) return null;
      return { subject: m[1].toLowerCase(), predicate: "disrupted", object: "" };
    },
  },
  {
    id: "evacuation-order",
    type: "official-statement",
    baseConfidence: 0.8,
    match: (t) => {
      const m = t.match(/\b(evacuat\w+)\b/i);
      if (!m) return null;
      const negated = /\bnot\s+(?:ordered|been)\s+evacuat/i.test(t) || /\bno\s+evacuation\b/i.test(t);
      return { subject: "authorities", predicate: negated ? "did not order" : "ordered", object: "an evacuation" };
    },
  },
  {
    id: "section-144",
    type: "official-statement",
    baseConfidence: 0.85,
    match: (t) => {
      const m = t.match(/\bsection\s*144\b|\bprohibitory orders?\b/i);
      return m ? { subject: "district authorities", predicate: "imposed", object: "prohibitory orders (Section 144)" } : null;
    },
  },
  {
    id: "govt-announcement",
    type: "official-statement",
    baseConfidence: 0.6,
    match: (t) => {
      const m = t.match(/\b(government|minister|cm|chief minister|assembly|collector)\b.{0,20}?\b(announced?|approved?|sanctioned?|cleared?|launched?)\b\s+(.{4,60})/i);
      if (!m) return null;
      return { subject: m[1].toLowerCase(), predicate: "announced", object: clean(m[3], 60) };
    },
  },
];

/** Extract claim candidates from every article of a verified cluster. */
export function extractCandidates(cluster: LiveCluster, articles: LiveArticle[]): ClaimCandidate[] {
  const out: ClaimCandidate[] = [];
  const eventId = cluster.id;

  for (const a of articles) {
    // Split into candidate sentences (headline + excerpt clauses).
    const sentences = [
      stripHeadlinePrefix(a.title),
      ...(a.excerpt ? a.excerpt.split(/(?<=[.!?])\s+|\s+[—–]\s+/) : []),
    ]
      .map((s) => clean(s, 300))
      .filter((s) => s.length > 12);

    const seenKeys = new Set<string>();

    for (const s of sentences) {
      // Language is detected per sentence so a Tamil headline preserves its
      // original text even when the article's excerpt is English boilerplate.
      const lang = detectLanguage(s);
      const attribution = ATTRIBUTION_VERBS.test(s) ? detectAttribution(s) : undefined;

      // ── numeric statistic claims ─────────────────────────────────
      // The value is part of the match key: "8 killed" and "3 killed" are
      // DIFFERENT claims, so a genuine numeric conflict can be detected rather
      // than silently merged.
      for (const fig of parseFigures(s)) {
        const canonical = attribution
          ? `${cap(attribution)} said ${figurePhrase(fig)}.`
          : `${cap(figurePhrase(fig))}.`;
        const mk = `stat:${fig.kind}:${fig.value}`;
        if (seenKeys.has(mk)) continue;
        seenKeys.add(mk);
        out.push({
          matchKey: `${eventId}:${mk}`,
          type: attribution ? "attribution" : "statistic",
          canonicalText: canonical,
          subjects: attribution ? [attribution] : [fig.kind],
          predicates: [fig.kind],
          objects: [String(fig.value)],
          attribution,
          figure: fig,
          sourceText: s,
          sourceTextOriginal: lang === "ta" ? s : undefined,
          language: lang,
          articleId: a.id,
          publisherId: a.publisher,
          sourceUrl: a.url,
          extractionConfidence: attribution ? 0.7 : 0.55,
        });
      }

      // ── rule-based semantic claims ───────────────────────────────
      for (const rule of RULES) {
        const r = rule.match(s);
        if (!r) continue;
        const subj = r.subject ?? "the event";
        const mk = `rule:${rule.id}`;
        if (seenKeys.has(mk)) continue;
        seenKeys.add(mk);
        const base = `${cap(subj)} ${r.predicate}${r.object ? ` ${r.object}` : ""}`.replace(/\s+/g, " ").trim();
        const canonical = attribution && rule.type !== "event"
          ? `${cap(attribution)} said ${lower(base)}.`
          : `${base}.`;
        out.push({
          matchKey: `${eventId}:${mk}`,
          type: attribution && rule.type === "official-statement" ? "attribution" : rule.type,
          canonicalText: canonical,
          subjects: [subj],
          predicates: [r.predicate],
          objects: [r.object],
          attribution,
          sourceText: s,
          sourceTextOriginal: lang === "ta" ? s : undefined,
          language: lang,
          articleId: a.id,
          publisherId: a.publisher,
          sourceUrl: a.url,
          extractionConfidence: rule.baseConfidence * (attribution ? 0.9 : 1),
        });
      }
    }

    // ── one "the event happened" claim per cluster ──────────────────
    // Every article in the cluster contributes to the SAME claim (matchKey
    // `${eventId}:head`), so N publishers reporting the event corroborate it,
    // rather than producing N separate single-source "claims". Each article
    // offers its own headline as the candidate wording; normalisation picks the
    // cleanest one as canonical.
    const headLang = detectLanguage(a.title);
    const headText = clean(stripHeadlinePrefix(a.title), 200);
    out.push({
      matchKey: `${eventId}:head`,
      type: "event",
      canonicalText: headText,
      subjects: [],
      predicates: [],
      objects: [],
      sourceText: headText,
      sourceTextOriginal: headLang === "ta" ? clean(a.title, 200) : undefined,
      language: headLang,
      articleId: a.id,
      publisherId: a.publisher,
      sourceUrl: a.url,
      extractionConfidence: 0.45,
    });
  }
  return out;
}

function figurePhrase(f: { kind: string; value: number }): string {
  const n = f.value.toLocaleString("en-IN");
  const person = f.value === 1 ? "person" : "people";
  switch (f.kind) {
    case "deaths": return `${n} ${person} were reported killed`;
    case "injuries": return `${n} ${person} were reported injured`;
    case "missing": return `${n} ${person} reported missing`;
    case "rescued": return `${n} ${person} reported rescued or evacuated`;
    case "rainfall_mm": return `${n} mm of rainfall was recorded`;
    case "amount_crore": return `₹${n} crore was allocated`;
    default: return `${n} ${f.kind}`;
  }
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export { keyOf, parseFigures, detectAttribution, MONTHS };
