import type { EntityType } from "../domain/types";
import { normalizeWhitespace } from "../text";

/**
 * Lightweight, heuristic entity recognition. Capitalized token sequences plus a
 * keyword-based type guess. Clearly not a real NER model — see docs/METHODOLOGY.md.
 */

const GOV_HINT = /\b(ministry|department|parliament|congress|senate|commission|agency|authority|court|council|bureau|office of)\b/i;
const ORG_HINT = /\b(inc|corp|corporation|company|ltd|llc|plc|group|institute|foundation|university|association|union|party)\b/i;
const LAW_HINT = /\b(act|bill|regulation|directive|treaty|amendment|code|law)\b/i;
const STOP_LEADING = new Set(["The", "A", "An", "This", "That", "These", "Those", "It", "He", "She", "They", "We", "But", "And"]);

export interface RecognizedEntity {
  name: string;
  type: EntityType;
}

export function recognizeEntities(text: string, known: string[] = []): RecognizedEntity[] {
  const out = new Map<string, EntityType>();

  for (const name of known) {
    if (name && new RegExp(`\\b${escapeRegExp(name)}\\b`).test(text)) out.set(name, guessType(name));
  }

  const matches = text.match(/\b[A-Z][A-Za-z0-9.'’-]+(?:\s+(?:of|the|and|for|de|van)?\s?[A-Z][A-Za-z0-9.'’-]+){0,4}\b/g) ?? [];
  for (const raw of matches) {
    const tokens = raw.split(/\s+/);
    let candidate = raw;
    if (STOP_LEADING.has(tokens[0]) && tokens.length > 1) candidate = tokens.slice(1).join(" ");
    candidate = normalizeWhitespace(candidate).replace(/[.,;:'’]+$/, "");
    if (candidate.length < 3) continue;
    if (candidate.split(/\s+/).length === 1 && candidate.length < 5) continue;
    out.set(candidate, guessType(candidate));
  }

  return [...out.entries()].slice(0, 12).map(([name, type]) => ({ name, type }));
}

function guessType(name: string): EntityType {
  if (GOV_HINT.test(name)) return "government_body";
  if (LAW_HINT.test(name)) return "law";
  if (ORG_HINT.test(name)) return "organization";
  const tokens = name.split(/\s+/);
  if (tokens.length === 2 && tokens.every((t) => /^[A-Z][a-z’'-]+$/.test(t))) return "person";
  return "organization";
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
