/**
 * Wire / news-agency credit detection.
 *
 * When two publications both carry a "(PTI)" or "Reuters" dateline, they are not
 * two independent confirmations — they are one upstream dispatch printed twice.
 *
 * IFA only ever asserts a wire credit that is ACTUALLY PRESENT in the retrieved
 * headline or excerpt. It never guesses "this looks like agency copy".
 */

/**
 * Recognised agencies. Bare acronyms are matched CASE-SENSITIVE (uppercase) —
 * that is how a wire credit actually appears ("(PTI)", "ANI:", "— IANS") — so a
 * lowercase "ap"/"ani" inside an ordinary word is never a false hit. The
 * spelled-out and parenthesised forms are case-insensitive.
 */
const WIRE_AGENCIES: { canonical: string; patterns: RegExp[] }[] = [
  { canonical: "PTI", patterns: [/\bpress trust of india\b/i, /\(\s*pti\s*\)/i, /\bPTI\b/] },
  { canonical: "ANI", patterns: [/\basian news international\b/i, /\(\s*ani\s*\)/i, /\bANI\b/] },
  { canonical: "IANS", patterns: [/\bindo-asian news service\b/i, /\(\s*ians\s*\)/i, /\bIANS\b/] },
  { canonical: "Reuters", patterns: [/\breuters\b/i] },
  { canonical: "AFP", patterns: [/\bagence france-presse\b/i, /\(\s*afp\s*\)/i, /\bAFP\b/] },
  { canonical: "AP", patterns: [/\bassociated press\b/i, /\(\s*ap\s*\)/i] },
  { canonical: "Bloomberg", patterns: [/\bbloomberg\b/i] },
];

/**
 * Return the canonical agency name credited in the text, or undefined.
 *
 * The bare-acronym patterns (`\bpti\b`) are deliberately case-sensitive-ish via
 * the caller passing headline + excerpt only; "Piti" or "capital" never match
 * because of the word boundaries, and a lone lowercase "ap" is required to be in
 * parentheses to count.
 */
export function detectWireCredit(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  for (const agency of WIRE_AGENCIES) {
    for (const re of agency.patterns) {
      if (re.test(text)) return agency.canonical;
    }
  }
  return undefined;
}

/** All wire credits present across a set of texts (headline + excerpt per article). */
export function wireCreditsIn(texts: (string | undefined | null)[]): Set<string> {
  const out = new Set<string>();
  for (const t of texts) {
    const w = detectWireCredit(t);
    if (w) out.add(w);
  }
  return out;
}
