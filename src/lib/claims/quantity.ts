/**
 * Structured quantity handling for claim matching (v0.4, Phase 11).
 *
 * News quantities appear in many surface forms — "120 mm" and "12 cm" of rain,
 * "Rs 500 crore" and "Rs 5,00,00,00,000", "50,000" and "half a lakh". Two claims
 * that state the SAME magnitude in different units should match; two that state
 * genuinely different magnitudes should not.
 *
 * Conservative by design: a conversion is only applied inside a single
 * dimension (length↔length, currency↔currency, count↔count) where the meaning
 * is unambiguous. It never converts across dimensions and never guesses a unit.
 */

export type QuantityDimension =
  | "length"
  | "currency"
  | "count"
  | "district-count"
  | "speed"
  | "temperature"
  | "volume-rate"
  | "percent"
  | "unknown";

export interface Quantity {
  /** Value normalised to the dimension's base unit. */
  value: number;
  /** Base unit: mm (length), rupees (currency), 1 (count), kmph, celsius, cusecs, percent. */
  unit: string;
  dimension: QuantityDimension;
  /** The exact text this was parsed from. */
  raw: string;
}

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
  dozen: 12,
};

/** Parse a numeric token that may be digits ("12,000", "3.4") or a word ("three", "a dozen"). */
export function parseNumberToken(token: string): number | null {
  const t = token.trim().toLowerCase();
  if (/^[\d,]+(?:\.\d+)?$/.test(t)) {
    const n = Number(t.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (t in WORD_NUMBERS) return WORD_NUMBERS[t];
  if (t === "a dozen" || t === "a couple") return t === "a dozen" ? 12 : 2;
  // "half a lakh", "a dozen"
  if (/^(a|an)$/.test(t)) return 1;
  return null;
}

const LENGTH_TO_MM: Record<string, number> = { mm: 1, cm: 10, m: 1000, km: 1_000_000, ft: 304.8, feet: 304.8 };
const CURRENCY_MULT: Record<string, number> = { "": 1, thousand: 1e3, lakh: 1e5, crore: 1e7, million: 1e6, billion: 1e9 };
const COUNT_MULT: Record<string, number> = { "": 1, thousand: 1e3, lakh: 1e5, crore: 1e7, million: 1e6, billion: 1e9 };

/**
 * Extract normalised quantities from a piece of text. Order-independent; a
 * sentence may yield several.
 */
export function parseQuantities(text: string): Quantity[] {
  const t = text.toLowerCase();
  const out: Quantity[] = [];
  const seen = new Set<string>();
  const add = (q: Quantity) => {
    const k = `${q.dimension}:${q.value}:${q.unit}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(q);
    }
  };

  // ── length: rainfall / levels — "120 mm", "12 cm", "1.2 m", "118 ft" ──
  for (const m of t.matchAll(/\b([\d,]+(?:\.\d+)?)\s?(mm|cm|km|m|ft|feet)\b/g)) {
    const n = parseNumberToken(m[1]);
    const mult = LENGTH_TO_MM[m[2]];
    if (n != null && mult) add({ value: n * mult, unit: "mm", dimension: "length", raw: m[0].trim() });
  }

  // ── currency: "Rs 500 crore", "₹5,00,00,00,000", "rs. 4 lakh" ──
  for (const m of t.matchAll(/(?:₹|rs\.?\s?)\s?([\d,]+(?:\.\d+)?)\s?(crore|lakh|thousand|million|billion)?/g)) {
    const n = parseNumberToken(m[1]);
    const mult = CURRENCY_MULT[m[2] ?? ""];
    if (n != null && mult) add({ value: n * mult, unit: "rupees", dimension: "currency", raw: m[0].trim() });
  }

  // ── speed: "90 kmph", "90 km/h", "90 km per hour" ──
  for (const m of t.matchAll(/\b([\d,]+(?:\.\d+)?)\s?(?:kmph|km\/h|kph|km per hour|kilometres per hour)\b/g)) {
    const n = parseNumberToken(m[1]);
    if (n != null) add({ value: n, unit: "kmph", dimension: "speed", raw: m[0].trim() });
  }

  // ── temperature: "42 C", "42°C", "42 degrees celsius" ──
  for (const m of t.matchAll(/\b([\d,]+(?:\.\d+)?)\s?(?:°\s?c|deg\s?c|degrees celsius|celsius)\b/g)) {
    const n = parseNumberToken(m[1]);
    if (n != null) add({ value: n, unit: "celsius", dimension: "temperature", raw: m[0].trim() });
  }

  // ── volume-rate: "12,000 cusecs", "12000 cusec" ──
  for (const m of t.matchAll(/\b([\d,]+(?:\.\d+)?)\s?cusecs?\b/g)) {
    const n = parseNumberToken(m[1]);
    if (n != null) add({ value: n, unit: "cusecs", dimension: "volume-rate", raw: m[0].trim() });
  }

  // ── percent ──
  for (const m of t.matchAll(/\b([\d,]+(?:\.\d+)?)\s?(?:%|per cent|percent)\b/g)) {
    const n = parseNumberToken(m[1]);
    if (n != null) add({ value: n, unit: "percent", dimension: "percent", raw: m[0].trim() });
  }

  // ── counts with a magnitude word: "half a lakh", "2 lakh", "50,000" ──
  for (const m of t.matchAll(/\b(half\s+a|[\d,]+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s+(lakh|crore|thousand|million|billion)\b/g)) {
    const base = m[1] === "half a" ? 0.5 : parseNumberToken(m[1]);
    const mult = COUNT_MULT[m[2]];
    if (base != null && mult) add({ value: base * mult, unit: "1", dimension: "count", raw: m[0].trim() });
  }

  // ── "N districts" — a distinctive statewide-weather figure. The Tamil forms
  //    end in a Tamil letter, which is `\W` to a non-`u` regex, so a trailing
  //    `\b` would never match after them — use a non-letter/digit lookahead. ──
  for (const m of t.matchAll(
    /\b(\d{1,2})\s+(?:districts?|மாவட்டங்கள்|மாவட்டங்களுக்கு|மாவட்டங்களில்|மாவட்டங்களிலும்)(?![\p{L}\p{N}])/gu,
  )) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 2) add({ value: n, unit: "districts", dimension: "district-count", raw: m[0].trim() });
  }

  return out;
}

/** Do two texts state an equivalent magnitude in the same dimension? */
export function quantitiesEquivalent(a: string, b: string): boolean {
  const qa = parseQuantities(a);
  const qb = parseQuantities(b);
  for (const x of qa) {
    for (const y of qb) {
      if (x.dimension !== y.dimension || x.dimension === "unknown") continue;
      const hi = Math.max(Math.abs(x.value), Math.abs(y.value)) || 1;
      if (Math.abs(x.value - y.value) / hi <= 0.02) return true;
    }
  }
  return false;
}

/** A stable key for a quantity, used in claim match keys ("qty:length:1200"). */
export function quantityKey(q: Quantity): string {
  return `qty:${q.dimension}:${Math.round(q.value * 1000) / 1000}`;
}
