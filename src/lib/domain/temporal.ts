/**
 * Temporal intelligence (v0.9, Phase F).
 *
 * A news timestamp is not the same as *when the thing happened*. This module
 * reads a headline + excerpt and separates:
 *
 *   publishedAt       — when the report was published (from the feed)
 *   eventOccurredAt   — when the reported event actually took place
 *   scheduledFor      — when a future / announced event is due
 *   effectiveFrom     — when a rule / order / scheme starts applying
 *   effectiveUntil    — when it stops
 *
 * Deterministic, English + Tamil, no model. Every field keeps the ORIGINAL
 * phrase alongside any resolved ISO date — an unresolvable phrase is still
 * reported, never dropped.
 */
import { resolveTamilDate, tamilDigitsToArabic } from "@/lib/language/tamil";

export type DateCertainty = "explicit" | "relative" | "inferred";

export interface ResolvedInstant {
  /** the exact words that carried the date */
  phrase: string;
  /** ISO date (YYYY-MM-DD) when resolvable */
  iso?: string;
  certainty: DateCertainty;
}

export interface TemporalResolution {
  publishedAt: string;
  updatedAt?: string;
  eventOccurredAt?: ResolvedInstant;
  scheduledFor?: ResolvedInstant;
  effectiveFrom?: ResolvedInstant;
  effectiveUntil?: ResolvedInstant;
  /** overall tense of the report */
  tense: "past" | "present" | "future" | "mixed";
  notes: string[];
}

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11,
};
const TAMIL_MONTHS: Record<string, number> = {
  ஜனவரி: 0, பிப்ரவரி: 1, மார்ச்: 2, ஏப்ரல்: 3, மே: 4, ஜூன்: 5, ஜூலை: 6,
  ஆகஸ்ட்: 7, செப்டம்பர்: 8, அக்டோபர்: 9, நவம்பர்: 10, டிசம்பர்: 11,
};
const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/** Resolve "September 15" / "15 September" / "Sept 15, 2026" against the pub date. */
function resolveAbsoluteEn(text: string, pub: Date): ResolvedInstant | undefined {
  const monthNames = Object.keys(MONTHS).join("|");
  const re = new RegExp(
    `\\b(?:(\\d{1,2})\\s+(${monthNames})|(${monthNames})\\s+(\\d{1,2}))(?:,?\\s+(\\d{4}))?\\b`,
    "i",
  );
  const m = re.exec(text);
  if (!m) return undefined;
  const day = Number(m[1] ?? m[4]);
  const mon = MONTHS[(m[2] ?? m[3]).toLowerCase()];
  if (!day || day > 31 || mon == null) return undefined;
  let year = m[5] ? Number(m[5]) : pub.getUTCFullYear();
  // no explicit year: pick whichever of {pub year, pub year ±1} is closest to pub
  if (!m[5]) {
    const cand = [year - 1, year, year + 1].map((y) => ({ y, d: new Date(Date.UTC(y, mon, day)) }));
    cand.sort((a, b) => Math.abs(+a.d - +pub) - Math.abs(+b.d - +pub));
    year = cand[0].y;
  }
  const d = new Date(Date.UTC(year, mon, day));
  if (Number.isNaN(+d)) return undefined;
  return { phrase: m[0].trim(), iso: isoOf(d), certainty: "explicit" };
}

function resolveAbsoluteTa(text: string, pub: Date): ResolvedInstant | undefined {
  const t = tamilDigitsToArabic(text).normalize("NFC");
  for (const [ta, mon] of Object.entries(TAMIL_MONTHS)) {
    // "செப்டம்பர் 15" or "15 செப்டம்பர்"
    const re = new RegExp(`(\\d{1,2})\\s*${ta}|${ta}\\s*(\\d{1,2})`);
    const m = re.exec(t);
    if (m) {
      const day = Number(m[1] ?? m[2]);
      if (!day || day > 31) continue;
      const cand = [pub.getUTCFullYear() - 1, pub.getUTCFullYear(), pub.getUTCFullYear() + 1]
        .map((y) => ({ y, d: new Date(Date.UTC(y, mon, day)) }));
      cand.sort((a, b) => Math.abs(+a.d - +pub) - Math.abs(+b.d - +pub));
      return { phrase: m[0].trim(), iso: isoOf(cand[0].d), certainty: "explicit" };
    }
  }
  return undefined;
}

/** "on Monday" / "last Friday" → the nearest past weekday before the pub date. */
function resolvePastWeekday(text: string, pub: Date): ResolvedInstant | undefined {
  const m = /\b(?:on|last)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.exec(text);
  if (!m) return undefined;
  const target = WEEKDAYS[m[1].toLowerCase()];
  let delta = (pub.getUTCDay() - target + 7) % 7;
  if (delta === 0) delta = 7;
  return { phrase: m[0], iso: isoOf(addDays(pub, -delta)), certainty: "relative" };
}

const REL_EN: [RegExp, number][] = [
  [/\bday before yesterday\b/i, -2],
  [/\byesterday\b/i, -1],
  [/\b(?:earlier )?today\b/i, 0],
  [/\btomorrow\b/i, 1],
  [/\bday after tomorrow\b/i, 2],
];

const PAST_MARKERS =
  /\b(said|says?|announced?|announces?|die[sd]|died|kill(?:s|ed)?|arrest(?:s|ed)?|resign(?:s|ed)?|quits?|inaugurat(?:es|ed)|launch(?:es|ed)|passed away|was held|took place|report(?:s|ed)?|confirm(?:s|ed)?|collaps(?:es|ed)|erupt(?:s|ed)|clash(?:es|ed)|wins?|won|los(?:es|t)|scored?|acquit(?:s|ted)|convict(?:s|ed)|sentenc(?:es|ed)|rul(?:es|ed)|strikes? down|struck down|meets?|met|visit(?:s|ed)|held|dead|injured|hurt|nabbed|detained|booked|suspend(?:s|ed))\b/i;
const FUTURE_MARKERS =
  /\b(will|to be held|scheduled|slated|set to|is expected to|expected on|likely to|plans to|to reconvene|to (?:take up|meet|begin|resume|hold|conduct|launch|inaugurate|visit)|from (?:next|this)|starting|begins? (?:on|next)|to begin|ahead of|upcoming|by 20\d\d|deadline|nominations? close|last date|to be (?:completed|inaugurated|held))\b/i;
const FUTURE_TA = /நடைபெறும்|நடத்தப்படும்|தொடங்கும்|திறக்கப்படும்|அறிவிக்கப்படும்|வரவிருக்கும்|எதிர்வரும்/;

/** Resolve the temporal structure of one headline (+ excerpt). */
export function resolveTemporal(input: {
  title: string;
  excerpt?: string;
  publishedAt: string;
  updatedAt?: string;
}): TemporalResolution {
  const text = `${input.title} ${input.excerpt ?? ""}`.trim();
  const low = text.toLowerCase();
  const pub = new Date(input.publishedAt);
  const validPub = !Number.isNaN(+pub);
  const notes: string[] = [];

  const res: TemporalResolution = {
    publishedAt: input.publishedAt,
    updatedAt: input.updatedAt,
    tense: "present",
    notes,
  };
  if (!validPub) {
    notes.push("publication date unparseable — relative phrases left unresolved");
  }

  // ── effective-from / until (rules, orders, schemes) ──
  const efm =
    /\b(?:with effect from|w\.e\.f\.?|effective (?:from|on)|comes? into (?:force|effect) (?:on|from)|applicable (?:from|with effect from)|kicks? in (?:on|from)|to take effect (?:on|from))\s+([^.,;]+)/i.exec(text) ||
    (/முதல்\s*(?:அமல்|நடைமுறை)/.test(text) ? [null, text] as unknown as RegExpExecArray : null);
  if (efm) {
    const frag = efm[1] ?? text;
    res.effectiveFrom =
      (validPub && (resolveAbsoluteEn(frag, pub) || resolveAbsoluteTa(frag, pub))) || {
        phrase: (efm[0] || "முதல்").trim(),
        certainty: "inferred",
      };
  }
  const monthNames = Object.keys(MONTHS).join("|");
  const unt =
    /\buntil further notice\b/i.exec(text) ||
    /\bfor (?:the next )?(\d{1,3})\s+days?\b/i.exec(text) ||
    new RegExp(
      `\\b(?:until|till|up ?to|valid (?:until|till|up ?to)|extended (?:until|till|to))\\s+((?:\\d{1,2}\\s+)?(?:${monthNames})(?:\\s+\\d{1,2})?(?:,?\\s+\\d{4})?|tomorrow|next \\w+|further orders)`,
      "i",
    ).exec(text);
  if (unt) {
    if (/further notice/i.test(unt[0])) {
      res.effectiveUntil = { phrase: "until further notice", certainty: "inferred" };
    } else if (/further orders/i.test(unt[0])) {
      res.effectiveUntil = { phrase: unt[0].trim(), certainty: "inferred" };
    } else if (/^for /i.test(unt[0]) && unt[1] && validPub) {
      res.effectiveUntil = {
        phrase: unt[0].trim(),
        iso: isoOf(addDays(res.effectiveFrom?.iso ? new Date(res.effectiveFrom.iso) : pub, Number(unt[1]))),
        certainty: "relative",
      };
    } else if (unt[1] && validPub) {
      res.effectiveUntil = resolveAbsoluteEn(unt[1], pub) || { phrase: unt[0].trim(), certainty: "inferred" };
    }
  }

  const looksFuture = FUTURE_MARKERS.test(low) || FUTURE_TA.test(text);
  const absolute = validPub ? resolveAbsoluteEn(text, pub) || resolveAbsoluteTa(text, pub) : undefined;
  const absIsFuture = !!absolute?.iso && Date.parse(absolute.iso) > +pub + 86_400_000;

  // ── scheduled-for (a future / announced event) ──
  if (validPub && (looksFuture || absIsFuture)) {
    let sched: ResolvedInstant | undefined;
    for (const [re, off] of REL_EN) {
      if (off > 0 && re.test(low)) {
        sched = { phrase: off === 1 ? "tomorrow" : "day after tomorrow", iso: isoOf(addDays(pub, off)), certainty: "relative" };
        break;
      }
    }
    if (!sched && /\bnext week\b/i.test(low)) sched = { phrase: "next week", iso: isoOf(addDays(pub, 7)), certainty: "relative" };
    if (!sched && /\bnext month\b/i.test(low)) sched = { phrase: "next month", iso: isoOf(addDays(pub, 30)), certainty: "inferred" };
    if (!sched && absolute && (absIsFuture || !absolute.iso || Date.parse(absolute.iso) >= +pub - 43_200_000)) sched = absolute;
    if (!sched && looksFuture) sched = { phrase: "(announced as forthcoming)", certainty: "inferred" };
    if (sched) res.scheduledFor = sched;
  }

  // ── event-occurred-at (a past event) ──
  if (validPub) {
    let occ: ResolvedInstant | undefined;
    for (const [re, off] of REL_EN) {
      if (off <= 0 && re.test(low)) {
        occ = { phrase: off === 0 ? "today" : off === -1 ? "yesterday" : "day before yesterday", iso: isoOf(addDays(pub, off)), certainty: "relative" };
        break;
      }
    }
    occ = occ || resolvePastWeekday(text, pub);
    const ta = resolveTamilDate(text, input.publishedAt);
    if (!occ && ta) occ = { phrase: ta.phrase, iso: ta.iso, certainty: "relative" };
    if (!occ && absolute && !absIsFuture && !res.scheduledFor) occ = absolute;
    // a bare past/headline-present report with no date word: event ≈ the pub day
    if (!occ && PAST_MARKERS.test(low) && !res.scheduledFor && !looksFuture) {
      occ = { phrase: "(reported as having happened)", iso: isoOf(pub), certainty: "inferred" };
    }
    if (occ) res.eventOccurredAt = occ;
  }

  // ── overall tense ──
  const past = !!res.eventOccurredAt || (PAST_MARKERS.test(low) && !res.scheduledFor);
  const future = looksFuture || !!res.scheduledFor || !!res.effectiveFrom;
  res.tense = past && future ? "mixed" : future ? "future" : past ? "past" : "present";

  if (res.eventOccurredAt?.iso && validPub) {
    const lagDays = Math.round((+pub - Date.parse(res.eventOccurredAt.iso)) / 86_400_000);
    if (lagDays >= 2) notes.push(`reported ${lagDays} day(s) after it happened`);
  }
  return res;
}
