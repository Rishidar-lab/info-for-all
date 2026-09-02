/**
 * IFFA geographic priority tiers (v0.7, Phase C).
 *
 *   P0  Tamil Nadu
 *   P1  India national
 *   P2  outside India, but materially affects Tamil Nadu / India / Indian
 *       citizens / the Indian economy or markets / Indian foreign policy, or is
 *       a major global crisis
 *   out everything else — kept in the dataset, weighted to zero, off default surfaces
 *
 * Derived from the existing `GeographicScope` (src/lib/live/geo.ts) plus an
 * explicit "does a foreign story reach India" check. Never invents a location.
 */
import type { GeographicScope } from "@/lib/live/types";

export type GeoTier = "P0" | "P1" | "P2" | "out";

export const GEO_TIER_LABEL: Record<GeoTier, string> = {
  P0: "Tamil Nadu",
  P1: "India",
  P2: "Abroad · India-relevant",
  out: "Out of scope",
};

/** Ranking weight for the trend engine. */
export const GEO_WEIGHT: Record<GeoTier, number> = {
  P0: 1.0,
  P1: 0.66,
  P2: 0.4,
  out: 0,
};

/**
 * Reasons a story ABROAD still matters to an India / Tamil Nadu reader. A match
 * here promotes an otherwise out-of-scope item to P2 — nothing more.
 */
const INDIA_RELEVANCE_ABROAD = [
  "indian nationals", "indian students", "indian workers", "indian diaspora", "indians stranded",
  "indian embassy", "evacuation of indians", "indian crew", "indian fishermen",
  "tamil nadu fishermen", "sri lankan navy", "katchatheevu", "palk strait",
  "crude oil price", "brent crude", "opec", "us fed", "federal reserve", "us tariff",
  "h-1b", "h1b visa", "us visa", "wto ruling", "imf", "world bank",
  "indian ocean", "bay of bengal", "chabahar", "adani", "indian pharma exports",
  "rupee vs dollar", "fii outflow", "global recession", "oil supply",
  "sri lanka crisis", "maldives", "bangladesh unrest", "nepal", "myanmar border",
  "monsoon forecast", "el nino", "la nina",
];

const GLOBAL_CRISIS = [
  "pandemic", "who declares", "global outbreak", "nuclear", "world war", "major earthquake kills",
  "climate summit", "cop30", "cop31", "un security council",
];

export interface GeoTierInput {
  scope: GeographicScope;
  title: string;
  excerpt?: string;
}

export function geoTierOf(input: GeoTierInput): { tier: GeoTier; reason: string } {
  const hay = " " + [input.title, input.excerpt].filter(Boolean).join(" . ").toLowerCase() + " ";

  if (input.scope === "tamil-nadu") return { tier: "P0", reason: "Tamil Nadu scope." };
  if (input.scope === "india-relevant") return { tier: "P1", reason: "India-wide, materially relevant to Tamil Nadu." };
  if (input.scope === "india") return { tier: "P1", reason: "India national scope." };

  // scope === "excluded" — only promote to P2 on an explicit India-relevance cue
  const rel = INDIA_RELEVANCE_ABROAD.filter((t) => hay.includes(t));
  const glob = GLOBAL_CRISIS.filter((t) => hay.includes(t));
  if (rel.length > 0) return { tier: "P2", reason: `Abroad, but affects India: ${rel.slice(0, 3).join(", ")}.` };
  if (glob.length > 0) return { tier: "P2", reason: `Major global crisis: ${glob.slice(0, 2).join(", ")}.` };
  return { tier: "out", reason: "Outside India with no stated India / Tamil Nadu consequence." };
}
