/**
 * IFFA v0.13 — candidate normalisation.
 *
 * Directive name for this module is `src/lib/discovery/normalize.ts`.
 * Canonicalisation + language/snippet normalisation run BEFORE the same-event
 * gate so that tracking-param variants, AMP/mobile URLs and case noise can
 * never inflate candidate or publisher counts.
 *
 * The URL canonicaliser itself lives in `dedupe.ts` (shared with the dedupe
 * stage); this module is the pipeline-facing normalisation entry point.
 */
import { canonicaliseUrl, isOpaqueRedirect } from "./dedupe";
import type { DiscoveryCandidate } from "./types";

export { canonicaliseUrl, isOpaqueRedirect };

export type NormalizedCandidate = DiscoveryCandidate;

/** Normalise one raw provider hit: canonical URL, trimmed title, language default. */
export function normalizeCandidate(raw: DiscoveryCandidate): NormalizedCandidate {
  return {
    ...raw,
    url: raw.url.trim(),
    canonicalUrl: canonicaliseUrl(raw.canonicalUrl || raw.url),
    title: raw.title.replace(/\s+/g, " ").trim(),
    source: (raw.source || raw.domain || raw.provider).trim(),
    language: raw.language ?? "unknown",
  };
}

/** Normalise a batch (pure, stable order preserved). */
export function normalizeCandidates(raw: DiscoveryCandidate[]): NormalizedCandidate[] {
  return raw.map(normalizeCandidate);
}
