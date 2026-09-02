/**
 * IFFA v0.7 adversarial mini-corpus (Phase L).
 *
 * Table-driven cases for category classification, geo-tier assignment and
 * district resolution — chosen to be tricky, not trivial paraphrases.
 */
import { describe, it, expect } from "vitest";
import { classifyCategory, type CategoryId } from "../../src/lib/domain/categories";
import { geoTierOf, type GeoTier } from "../../src/lib/domain/geo-tiers";
import { resolveDistricts } from "../../src/lib/domain/districts";
import type { GeographicScope } from "../../src/lib/live/types";

// ── category ────────────────────────────────────────────────────────────
const CATEGORY_CASES: [string, CategoryId][] = [
  ["Cyclone Ditwah intensifies over Bay of Bengal; TN coast on alert", "crisis"],
  ["Mettur dam nears full level; surplus water to be released downstream", "crisis"],
  ["Wall collapse at Coimbatore construction site kills two labourers", "crisis"],
  ["Section 144 imposed in parts of Madurai ahead of temple festival", "crisis"],
  ["Leptospirosis cases rise in flood-hit Cuddalore, health advisory issued", "crisis"],
  ["Power supply snapped in three Chennai zones after substation fire", "crisis"],
  ["Assembly clears bill to exempt Tamil Nadu from NEET", "politics"],
  ["Governor returns online gaming bill; state government to move Supreme Court", "politics"],
  ["ED summons DMK functionary in sand mining case", "politics"],
  ["AIADMK announces seat-sharing with smaller allies for by-election", "politics"],
  ["CM launches Rs 1,000 monthly cash transfer scheme for women", "politics"],
  ["Opposition alleges irregularities in state highways tender", "politics"],
  ["RBI holds repo rate at 6.5%, flags food inflation risk", "finance"],
  ["Sensex ends 900 points lower as IT stocks drag", "finance"],
  ["GST council cuts rate on 30 items; revenue impact under review", "finance"],
  ["Gold price hits fresh record ahead of festival buying", "finance"],
  ["Petrol, diesel prices cut by Rs 2 a litre from tomorrow", "finance"],
  ["Rupee slips to record low against the dollar amid FII outflows", "finance"],
  ["India beat Australia by 5 wickets to seal ODI series", "sports"],
  ["Gukesh retains world chess title after tie-break", "sports"],
  ["CSK release five players ahead of IPL auction", "sports"],
  ["TN wins Ranji Trophy quarter-final on first-innings lead", "sports"],
  ["Superstar's next film titled and dated; first look poster released", "entertainment"],
  ["Actor spotted at airport; fans mob him after cryptic Instagram post", "celebrity"],
  ["New butterfly species recorded in Anamalai Tiger Reserve", "other-relevant"],
  // tricky: politician NAMED but the story is a crisis
  ["CM reviews flood relief in Cuddalore, announces Rs 10,000 aid per family", "crisis"],
  // tricky: 'heat' as a political metaphor, not a heatwave
  ["Ruling and opposition parties clash in Assembly over language policy", "politics"],
  // tricky: 'crash' as a market word
  ["Market crash wipes out Rs 8 lakh crore in investor wealth", "finance"],
];

describe("IFFA category mini-corpus (Phase L)", () => {
  for (const [title, expected] of CATEGORY_CASES) {
    it(`[${expected}] ${title.slice(0, 60)}`, () => {
      expect(classifyCategory({ title }).category).toBe(expected);
    });
  }
});

// ── geo tier ────────────────────────────────────────────────────────────
const GEO_CASES: [GeographicScope, string, GeoTier][] = [
  ["tamil-nadu", "Chennai schools shut as rain floods roads", "P0"],
  ["india", "Parliament passes women's reservation bill", "P1"],
  ["india-relevant", "IMD forecasts above-normal monsoon for the south", "P1"],
  ["excluded", "Crude oil jumps 6% after OPEC+ announces output cut", "P2"],
  ["excluded", "Indian students stranded as visa rules change in the US", "P2"],
  ["excluded", "WHO declares a global health emergency over new outbreak", "P2"],
  ["excluded", "Small-town mayor re-elected in rural Germany", "out"],
  ["excluded", "Local football derby ends in a draw in a European league", "out"],
];

describe("IFFA geo-tier mini-corpus (Phase L)", () => {
  for (const [scope, title, expected] of GEO_CASES) {
    it(`[${expected}] ${title.slice(0, 55)}`, () => {
      expect(geoTierOf({ scope, title }).tier).toBe(expected);
    });
  }
});

// ── district resolution (English + Tamil) ───────────────────────────────
const DISTRICT_CASES: [string, string[]][] = [
  ["Heavy rain in Nagapattinam and Mayiladuthurai; delta on alert", ["Mayiladuthurai", "Nagapattinam"]],
  ["திருச்சியில் இன்று பள்ளிகளுக்கு விடுமுறை அறிவிப்பு", ["Tiruchirappalli"]],
  ["தூத்துக்குடி துறைமுகத்தில் சரக்கு போக்குவரத்து பாதிப்பு", ["Thoothukudi"]],
  ["Landslide warning for the Nilgiris; Ooty–Coonoor road closed", ["Nilgiris"]],
  ["கோவை மாவட்டத்தில் தொழிற்சாலை விபத்து", ["Coimbatore"]],
  ["Ranipet and Vellore report flash floods after cloudburst", ["Ranipet", "Vellore"]],
  ["No Tamil Nadu district here, only a Bengaluru dateline", []],
];

describe("IFFA district mini-corpus (Phase L)", () => {
  for (const [text, expected] of DISTRICT_CASES) {
    it(text.slice(0, 55), () => {
      expect(resolveDistricts(text).map((d) => d.district).sort()).toEqual(expected.sort());
    });
  }
});
