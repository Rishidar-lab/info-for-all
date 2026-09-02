/**
 * Translation abstraction (v0.5, Phase 15).
 *
 * Translation is OPTIONAL — one signal among several, never the sole basis for a
 * cross-language merge (see the cross-language safety gate in
 * `src/lib/event-identity/`). The original text is never overwritten.
 *
 * Providers:
 *  - `DictionaryTranslationProvider` (default): deterministic, offline. Produces
 *    a rough English gloss from the Tamil concept / place / org tables. Good
 *    enough to contribute a lexical-overlap signal; not a real translation.
 *  - a model provider can be registered via `IFA_TRANSLATION_PROVIDER`; none is
 *    configured for the deployed build.
 *
 * Results are cached by (text, from, to).
 */
import { tamilConceptTokens, tamilDigitsToArabic } from "./tamil";

export interface TranslationResult {
  text: string;
  method: "dictionary" | "model" | "passthrough";
  confidence: number;
  /** true when nothing could be translated. */
  degraded: boolean;
}

export interface TranslationProvider {
  readonly name: string;
  available(): boolean;
  translate(text: string, from: "ta" | "en", to: "ta" | "en"): Promise<TranslationResult>;
}

export class DictionaryTranslationProvider implements TranslationProvider {
  readonly name = "dictionary (offline)";
  available(): boolean {
    return true;
  }
  async translate(text: string, from: "ta" | "en", to: "ta" | "en"): Promise<TranslationResult> {
    if (from === to || from !== "ta" || to !== "en") {
      return { text, method: "passthrough", confidence: 1, degraded: false };
    }
    const { concepts, places, orgs } = tamilConceptTokens(text);
    const digits = tamilDigitsToArabic(text).match(/\b\d[\d,]*\b/g) ?? [];
    const parts = [
      ...places,
      ...orgs,
      ...[...concepts].map((c) => c.replace(/-/g, " ")),
      ...digits,
    ];
    if (parts.length === 0) {
      return { text: "", method: "dictionary", confidence: 0, degraded: true };
    }
    // rough gloss — a bag of the recognised concepts, NOT a sentence
    const gloss = parts.join(" ");
    const coverage = parts.length / Math.max(4, text.split(/\s+/).length);
    return {
      text: gloss,
      method: "dictionary",
      confidence: Math.min(0.6, 0.2 + coverage),
      degraded: false,
    };
  }
}

export class NullTranslationProvider implements TranslationProvider {
  readonly name = "null";
  available(): boolean {
    return false;
  }
  async translate(text: string): Promise<TranslationResult> {
    return { text, method: "passthrough", confidence: 0, degraded: true };
  }
}

const REGISTRY = new Map<string, () => TranslationProvider>();
export function registerTranslationProvider(id: string, make: () => TranslationProvider): void {
  REGISTRY.set(id, make);
}

const CACHE = new Map<string, TranslationResult>();

export function getTranslationProvider(): TranslationProvider {
  const id = process.env.IFA_TRANSLATION_PROVIDER;
  if (id && REGISTRY.has(id)) {
    const p = REGISTRY.get(id)!();
    if (p.available()) return p;
  }
  return new DictionaryTranslationProvider();
}

export async function translateCached(
  text: string,
  from: "ta" | "en",
  to: "ta" | "en",
  provider: TranslationProvider = getTranslationProvider(),
): Promise<TranslationResult> {
  const key = `${provider.name}|${from}>${to}|${text}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const res = await provider.translate(text, from, to);
  CACHE.set(key, res);
  return res;
}

/** Synchronous dictionary gloss — used by the identity engine's sync path. */
export function dictionaryGloss(text: string): string {
  const { concepts, places, orgs } = tamilConceptTokens(text);
  return [...places, ...orgs, ...[...concepts].map((c) => c.replace(/-/g, " "))].join(" ");
}
