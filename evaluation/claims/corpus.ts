/**
 * IFA claim gold corpus — labelled benchmark cases.
 *
 * Hand-authored, human-auditable. Every timestamp is pre-resolved against a
 * fixed reference instant so the corpus is fully deterministic.
 *
 *   NOW = 2026-09-02T06:00:00Z  (11:30 IST)
 *
 * Categories (see schema.ts): A same-fact/wording · B related-but-different ·
 * C numeric-agreement · D numeric-contradiction · E temporal-update ·
 * F attributed · G allegation · H prediction · I primary-evidence ·
 * J syndication · K Tamil↔Tamil · L Tamil↔English · M same-people/diff-story ·
 * N same-place/diff-date · O neighbouring-districts.
 */
import type { ClaimEvalCase } from "./schema";

export const EVAL_NOW = Date.parse("2026-09-02T06:00:00Z");
const h = (hoursAgo: number): string => new Date(EVAL_NOW - hoursAgo * 3_600_000).toISOString();

const HINDU = "The Hindu";
const TOI = "The Times of India";
const HT = "Hindustan Times";
const NIE = "The New Indian Express";
const NDTV = "NDTV";
const DINAMANI = "Dinamani";
const N18TA = "News18 Tamil";
const PTHALAI = "Puthiya Thalaimurai";

export const CORPUS: ClaimEvalCase[] = [
  // ─────────────────────────────────────────────────────────────────────
  // A — SAME FACT, DIFFERENT WORDING  → should MATCH
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "A01",
    category: "A-same-fact-different-wording",
    inputA: { text: "Schools in Chennai will remain closed on Wednesday due to heavy rain", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Chennai district schools declared a holiday for Wednesday amid heavy rain", language: "en", source: TOI, timestamp: h(3) },
    expected: { relation: "same", claimType: "official-statement", matchLevel: "specific", notes: "Closure = holiday; same city, same day." },
  },
  {
    id: "A02",
    category: "A-same-fact-different-wording",
    inputA: { text: "Mettur dam opened, Cauvery water released towards Salem and Erode", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "Water release from Mettur dam into the Cauvery begins near Salem", language: "en", source: NIE, timestamp: h(5) },
    expected: { relation: "same", claimType: "event", matchLevel: "specific", notes: "Same dam action." },
  },
  {
    id: "A03",
    category: "A-same-fact-different-wording",
    inputA: { text: "IMD issues red alert for heavy rainfall in Nilgiris and Coimbatore", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Red alert sounded for Coimbatore and the Nilgiris as rain intensifies", language: "en", source: HT, timestamp: h(4) },
    expected: { relation: "same", claimType: "official-statement", matchLevel: "specific", notes: "Same alert level, same districts." },
  },
  {
    id: "A04",
    category: "A-same-fact-different-wording",
    inputA: { text: "Section 144 imposed in Madurai ahead of the temple car festival", language: "en", source: TOI, timestamp: h(7) },
    inputB: { text: "Madurai police clamp prohibitory orders before Chithirai festival procession", language: "en", source: HINDU, timestamp: h(6) },
    expected: { relation: "same", claimType: "official-statement", matchLevel: "specific", notes: "Section 144 = prohibitory orders." },
  },
  {
    id: "A05",
    category: "A-same-fact-different-wording",
    inputA: { text: "Nagapattinam fishermen advised not to venture into sea for 48 hours", language: "en", source: NIE, timestamp: h(8) },
    inputB: { text: "Fishing banned off Nagapattinam coast for two days over rough sea warning", language: "en", source: HINDU, timestamp: h(7) },
    expected: { relation: "same", claimType: ["official-statement", "event"], matchLevel: "specific" },
  },
  {
    id: "A06",
    category: "A-same-fact-different-wording",
    inputA: { text: "12 people rescued from flooded homes in Cuddalore", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Rescue teams pull out 12 residents trapped by Cuddalore floodwater", language: "en", source: NDTV, timestamp: h(3) },
    expected: { relation: "same", claimType: "statistic", matchLevel: "specific", notes: "Same figure, same place." },
  },
  {
    id: "A07",
    category: "A-same-fact-different-wording",
    inputA: { text: "Suburban train services between Chennai Beach and Tambaram suspended after waterlogging", language: "en", source: TOI, timestamp: h(5) },
    inputB: { text: "Waterlogging halts Chennai Beach–Tambaram suburban trains", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "same", claimType: "event", matchLevel: "specific" },
  },
  {
    id: "A08",
    category: "A-same-fact-different-wording",
    inputA: { text: "Tamil Nadu government declares public holiday for Tiruvallur on Wednesday", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "Tiruvallur district administration declares Wednesday a local holiday", language: "en", source: TOI, timestamp: h(5) },
    expected: { relation: "same", claimType: "official-statement", matchLevel: "specific" },
  },
  {
    id: "A09",
    category: "A-same-fact-different-wording",
    inputA: { text: "Cyclone Ditwah to cross Tamil Nadu coast near Nagapattinam on Thursday", language: "en", source: HINDU, timestamp: h(9) },
    inputB: { text: "Ditwah likely to make landfall close to Nagapattinam on Thursday", language: "en", source: HT, timestamp: h(8) },
    expected: { relation: "same", claimType: ["event", "prediction"], matchLevel: "specific" },
  },
  {
    id: "A10",
    category: "A-same-fact-different-wording",
    inputA: { text: "Chennai Corporation opens 120 relief centres as rain continues", language: "en", source: TOI, timestamp: h(4) },
    inputB: { text: "Greater Chennai Corporation sets up 120 flood relief camps", language: "en", source: NIE, timestamp: h(3) },
    expected: { relation: "same", claimType: "statistic", matchLevel: "specific" },
  },
  {
    id: "A11",
    category: "A-same-fact-different-wording",
    inputA: { text: "Power supply cut in parts of Coimbatore as a precaution against rain damage", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Tangedco suspends power in low-lying Coimbatore areas over rain risk", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "same", claimType: ["event", "official-statement"], matchLevel: "specific" },
  },
  {
    id: "A12",
    category: "A-same-fact-different-wording",
    inputA: { text: "Bhavani dam nears full capacity, surplus water to be released", language: "en", source: NIE, timestamp: h(7) },
    inputB: { text: "Officials to open Bhavani dam shutters as reservoir approaches full level", language: "en", source: HINDU, timestamp: h(6) },
    expected: { relation: "same", claimType: "event", matchLevel: "specific" },
  },
  {
    id: "A13",
    category: "A-same-fact-different-wording",
    inputA: { text: "Colleges in Tirunelveli to stay shut on Wednesday", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Tirunelveli: holiday declared for colleges and schools on Wednesday", language: "en", source: DINAMANI, timestamp: h(4) },
    expected: { relation: "same", claimType: "official-statement", matchLevel: "specific" },
  },
  {
    id: "A14",
    category: "A-same-fact-different-wording",
    inputA: { text: "NDRF deploys three teams in Thanjavur for flood rescue", language: "en", source: NDTV, timestamp: h(6) },
    inputB: { text: "Three NDRF teams stationed in Thanjavur as floods worsen", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "same", claimType: ["statistic", "event"], matchLevel: "specific" },
  },
  {
    id: "A15",
    category: "A-same-fact-different-wording",
    inputA: { text: "Chennai airport sees 18 flight delays due to poor visibility", language: "en", source: TOI, timestamp: h(4) },
    inputB: { text: "Rain hits Chennai airport operations; 18 flights delayed", language: "en", source: HT, timestamp: h(3) },
    expected: { relation: "same", claimType: ["statistic", "event"], matchLevel: "specific" },
  },
  {
    id: "A16",
    category: "A-same-fact-different-wording",
    inputA: { text: "Anna University postpones semester exams scheduled for Wednesday", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Wednesday's Anna University exams put off due to rain", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "same", claimType: ["event", "official-statement"], matchLevel: "specific" },
  },
  {
    id: "A17",
    category: "A-same-fact-different-wording",
    inputA: { text: "Evacuation ordered for riverside colonies in Erode as Cauvery swells", language: "en", source: NIE, timestamp: h(6) },
    inputB: { text: "Erode authorities move residents out of low-lying Cauvery banks", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "same", claimType: "official-statement", matchLevel: "specific" },
  },
  {
    id: "A18",
    category: "A-same-fact-different-wording",
    inputA: { text: "State reports 6 rain-related deaths across Tamil Nadu in 24 hours", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Tamil Nadu rain toll rises to 6 in a day", language: "en", source: NDTV, timestamp: h(3) },
    expected: { relation: "same", claimType: "statistic", matchLevel: "specific" },
  },

  // ─────────────────────────────────────────────────────────────────────
  // B — RELATED BUT DIFFERENT FACT  → should NOT match (same event, different claim)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "B01",
    category: "B-related-but-different",
    inputA: { text: "Schools closed in Cuddalore because of flooding", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Train services suspended in Cuddalore because of flooding", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "different", notes: "Same cause, different consequence — two claims, not one." },
  },
  {
    id: "B02",
    category: "B-related-but-different",
    inputA: { text: "Mettur dam opened for Cauvery water release near Salem", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "Farmers in Salem welcome the Cauvery water release from Mettur dam", language: "en", source: NIE, timestamp: h(5) },
    expected: { relation: "different", notes: "Event vs reaction to the event." },
  },
  {
    id: "B03",
    category: "B-related-but-different",
    inputA: { text: "Red alert issued for Nilgiris district", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Landslide blocks the Coonoor–Ooty road in the Nilgiris", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "different", notes: "Warning vs a specific incident." },
  },
  {
    id: "B04",
    category: "B-related-but-different",
    inputA: { text: "12 rescued from Cuddalore floods", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "3 missing after a boat capsized off Cuddalore", language: "en", source: NDTV, timestamp: h(4) },
    expected: { relation: "different", notes: "Different figures about different sub-events." },
  },
  {
    id: "B05",
    category: "B-related-but-different",
    inputA: { text: "Section 144 imposed in Madurai ahead of the festival", language: "en", source: TOI, timestamp: h(7) },
    inputB: { text: "Special buses arranged in Madurai for festival pilgrims", language: "en", source: HINDU, timestamp: h(6) },
    expected: { relation: "different" },
  },
  {
    id: "B06",
    category: "B-related-but-different",
    inputA: { text: "Heavy rain lashes Tiruvallur through the night", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Tiruvallur schools shut as heavy rain continues", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "different", notes: "Weather fact vs the closure decision — not a contradiction, not the same claim." },
  },
  {
    id: "B07",
    category: "B-related-but-different",
    inputA: { text: "Chennai records 14 cm of rain overnight", language: "en", source: TOI, timestamp: h(4) },
    inputB: { text: "Chennai Corporation deploys 200 motor pumps to clear waterlogging", language: "en", source: HINDU, timestamp: h(3) },
    expected: { relation: "different" },
  },
  {
    id: "B08",
    category: "B-related-but-different",
    inputA: { text: "Cyclone Ditwah to cross near Nagapattinam on Thursday", language: "en", source: HINDU, timestamp: h(9) },
    inputB: { text: "Ports in Nagapattinam and Karaikal hoist warning signal number 3", language: "en", source: HT, timestamp: h(8) },
    expected: { relation: "different", notes: "Forecast track vs a port action." },
  },
  {
    id: "B09",
    category: "B-related-but-different",
    inputA: { text: "Power cut in parts of Coimbatore as a precaution", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Coimbatore hospitals switch to generator backup amid outages", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "different" },
  },
  {
    id: "B10",
    category: "B-related-but-different",
    inputA: { text: "6 rain-related deaths reported across Tamil Nadu", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "State announces Rs 4 lakh compensation for families of the deceased", language: "en", source: NDTV, timestamp: h(3) },
    expected: { relation: "different", notes: "Toll vs compensation announcement." },
  },
  {
    id: "B11",
    category: "B-related-but-different",
    inputA: { text: "Evacuation ordered for riverside colonies in Erode", language: "en", source: NIE, timestamp: h(6) },
    inputB: { text: "Erode collector inspects relief camps set up in schools", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "different" },
  },
  {
    id: "B12",
    category: "B-related-but-different",
    inputA: { text: "Bhavani dam shutters opened as reservoir fills", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "Bhavani river bathing ghats closed to the public", language: "en", source: TOI, timestamp: h(5) },
    expected: { relation: "different" },
  },

  // ─────────────────────────────────────────────────────────────────────
  // C — NUMERIC AGREEMENT (unit normalisation)  → MATCH after normalisation
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "C01",
    category: "C-numeric-agreement",
    inputA: { text: "Chennai received 120 mm of rain in the Nungambakkam gauge", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Chennai recorded 12 cm of rainfall overnight", language: "en", source: TOI, timestamp: h(3) },
    expected: { relation: "same", claimType: "statistic", quantityEquivalent: true, matchLevel: "specific", notes: "120 mm = 12 cm." },
  },
  {
    id: "C02",
    category: "C-numeric-agreement",
    inputA: { text: "Cuddalore logged 200 mm of rainfall in 24 hours", language: "en", source: NIE, timestamp: h(5) },
    inputB: { text: "Cuddalore sees 20 cm of rain in a day", language: "en", source: HINDU, timestamp: h(4) },
    expected: { relation: "same", claimType: "statistic", quantityEquivalent: true, matchLevel: "specific" },
  },
  {
    id: "C03",
    category: "C-numeric-agreement",
    inputA: { text: "Relief package of Rs 500 crore announced for flood-hit Cuddalore", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "Government sanctions Rs 5 billion for flood relief in Cuddalore", language: "en", source: TOI, timestamp: h(5) },
    expected: { relation: "same", claimType: ["statistic", "official-statement"], quantityEquivalent: true, matchLevel: "specific", notes: "Rs 500 crore = Rs 5 billion." },
  },
  {
    id: "C04",
    category: "C-numeric-agreement",
    inputA: { text: "50,000 people moved to relief camps across Tamil Nadu", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Half a lakh shifted to relief camps in Tamil Nadu", language: "en", source: NDTV, timestamp: h(3) },
    expected: { relation: "same", claimType: "statistic", quantityEquivalent: true, matchLevel: "specific", notes: "50,000 = 0.5 lakh." },
  },
  {
    id: "C05",
    category: "C-numeric-agreement",
    inputA: { text: "Mettur dam level at 118 feet against a full level of 120 feet", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "Mettur storage nears full: 118 ft of 120 ft", language: "en", source: NIE, timestamp: h(5) },
    expected: { relation: "same", claimType: "statistic", quantityEquivalent: true, matchLevel: "specific" },
  },
  {
    id: "C06",
    category: "C-numeric-agreement",
    inputA: { text: "Wind speeds of 90 kmph expected along the coast", language: "en", source: HT, timestamp: h(7) },
    inputB: { text: "Gusts up to 90 km/h forecast for the coastline", language: "en", source: HINDU, timestamp: h(6) },
    expected: { relation: "same", claimType: ["statistic", "prediction"], quantityEquivalent: true, matchLevel: "specific" },
  },
  {
    id: "C07",
    category: "C-numeric-agreement",
    inputA: { text: "12,000 cusecs released from Mettur dam", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Mettur discharge raised to 12000 cusecs", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "same", claimType: "statistic", quantityEquivalent: true, matchLevel: "specific" },
  },
  {
    id: "C08",
    category: "C-numeric-agreement",
    inputA: { text: "Rainfall of 1 cm recorded at Meenambakkam", language: "en", source: TOI, timestamp: h(4) },
    inputB: { text: "Meenambakkam logs 10 mm of rain", language: "en", source: HINDU, timestamp: h(3) },
    expected: { relation: "same", claimType: "statistic", quantityEquivalent: true, matchLevel: "specific" },
  },

  // ─────────────────────────────────────────────────────────────────────
  // D — NUMERIC CONTRADICTION (no chronology)  → CONTRADICTS
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "D01",
    category: "D-numeric-contradiction",
    inputA: { text: "8 killed in the Pallavaram wall collapse in Chennai", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Pallavaram wall collapse: 3 dead in Chennai", language: "en", source: HT, timestamp: h(4) },
    expected: { relation: "contradicts", claimType: "statistic", notes: "Same event, same time, incompatible death tolls." },
  },
  {
    id: "D02",
    category: "D-numeric-contradiction",
    inputA: { text: "Three people injured in the Ukkadam building collapse in Coimbatore", language: "en", source: HINDU, timestamp: h(3) },
    inputB: { text: "Five injured as building comes down in Ukkadam, Coimbatore", language: "en", source: TOI, timestamp: h(3) },
    expected: { relation: "contradicts", claimType: "statistic" },
  },
  {
    id: "D03",
    category: "D-numeric-contradiction",
    inputA: { text: "15 rescued from the flooded Cuddalore colony", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Cuddalore colony flooding: 40 pulled to safety", language: "en", source: NDTV, timestamp: h(4) },
    expected: { relation: "contradicts", claimType: "statistic" },
  },
  {
    id: "D04",
    category: "D-numeric-contradiction",
    inputA: { text: "Chennai gauge shows 65 mm of rain overnight", language: "en", source: TOI, timestamp: h(4) },
    inputB: { text: "Chennai got 140 mm of rain overnight, says weather office", language: "en", source: HT, timestamp: h(4) },
    expected: { relation: "contradicts", claimType: "statistic", notes: "Not a unit issue — genuinely different magnitudes." },
  },
  {
    id: "D05",
    category: "D-numeric-contradiction",
    inputA: { text: "2 missing after the Marina fishing boat accident", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Marina boat accident leaves 7 unaccounted for", language: "en", source: NIE, timestamp: h(5) },
    expected: { relation: "contradicts", claimType: "statistic" },
  },
  {
    id: "D06",
    category: "D-numeric-contradiction",
    inputA: { text: "Relief camps house 4,000 people in Thanjavur", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Thanjavur relief camps shelter 12,000", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "contradicts", claimType: "statistic" },
  },
  {
    id: "D07",
    category: "D-numeric-contradiction",
    inputA: { text: "9 dead in Chennai rains, says revenue department", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Chennai rain deaths at 4, official bulletin says", language: "en", source: HT, timestamp: h(4) },
    expected: { relation: "contradicts", claimType: "statistic" },
  },
  {
    id: "D08",
    category: "D-numeric-contradiction",
    inputA: { text: "Mettur discharge at 25,000 cusecs", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Mettur releasing 50,000 cusecs into the Cauvery", language: "en", source: TOI, timestamp: h(5) },
    expected: { relation: "contradicts", claimType: "statistic" },
  },
  {
    id: "D09",
    category: "D-numeric-contradiction",
    inputA: { text: "30 huts damaged in the Rameswaram coastal surge", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "Rameswaram surge damages 150 huts", language: "en", source: NDTV, timestamp: h(6) },
    expected: { relation: "contradicts", claimType: "statistic" },
  },
  {
    id: "D10",
    category: "D-numeric-contradiction",
    inputA: { text: "12 injured in the Tambaram bus-shelter collapse", language: "en", source: TOI, timestamp: h(4) },
    inputB: { text: "Tambaram bus-shelter collapse injures 2", language: "en", source: HINDU, timestamp: h(4) },
    expected: { relation: "contradicts", claimType: "statistic" },
  },

  // ─────────────────────────────────────────────────────────────────────
  // E — TEMPORAL UPDATE  → SUPERSEDES (not a contradiction)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "E01",
    category: "E-temporal-update",
    inputA: { text: "2 killed as a building collapses in Ukkadam, Coimbatore", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "Ukkadam building collapse: 6 dead in Coimbatore", language: "en", source: HT, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic", notes: "Toll rose over 5 hours — an update." },
  },
  {
    id: "E02",
    category: "E-temporal-update",
    inputA: { text: "Cuddalore floods: 8 rescued so far", language: "en", source: HINDU, timestamp: h(7) },
    inputB: { text: "Cuddalore flood rescue count reaches 25", language: "en", source: NDTV, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic" },
  },
  {
    id: "E03",
    category: "E-temporal-update",
    inputA: { text: "3 missing after the boat capsize off Nagapattinam", language: "en", source: HINDU, timestamp: h(8) },
    inputB: { text: "Nagapattinam boat capsize: 1 missing after 2 swim ashore", language: "en", source: NIE, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic", notes: "Missing count fell as people were found — still an update." },
  },
  {
    id: "E04",
    category: "E-temporal-update",
    inputA: { text: "Chennai rain toll at 4", language: "en", source: HINDU, timestamp: h(10) },
    inputB: { text: "Chennai rain toll climbs to 11", language: "en", source: TOI, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic" },
  },
  {
    id: "E05",
    category: "E-temporal-update",
    inputA: { text: "Chennai has recorded 60 mm of rain since morning", language: "en", source: TOI, timestamp: h(9) },
    inputB: { text: "Chennai rainfall total rises to 150 mm by evening", language: "en", source: HINDU, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic", notes: "Cumulative total for the day rising." },
  },
  {
    id: "E06",
    category: "E-temporal-update",
    inputA: { text: "1,000 people evacuated in Thanjavur", language: "en", source: HINDU, timestamp: h(8) },
    inputB: { text: "Thanjavur evacuations cross 5,000", language: "en", source: NDTV, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic" },
  },
  {
    id: "E07",
    category: "E-temporal-update",
    inputA: { text: "Mettur discharge at 10,000 cusecs", language: "en", source: HINDU, timestamp: h(9) },
    inputB: { text: "Mettur discharge raised to 30,000 cusecs", language: "en", source: TOI, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic", notes: "Release stepped up as inflow rose." },
  },
  {
    id: "E08",
    category: "E-temporal-update",
    inputA: { text: "5 hurt in the Perambur LPG blaze", language: "en", source: HINDU, timestamp: h(7) },
    inputB: { text: "Perambur LPG fire: injured count rises to 12", language: "en", source: TOI, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic" },
  },
  {
    id: "E09",
    category: "E-temporal-update",
    inputA: { text: "Relief camps hold 4,000 people in Villupuram", language: "en", source: HINDU, timestamp: h(8) },
    inputB: { text: "Villupuram relief camp population now 9,500", language: "en", source: NIE, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic" },
  },
  {
    id: "E10",
    category: "E-temporal-update",
    inputA: { text: "20 houses damaged in the Kanyakumari landslip", language: "en", source: HINDU, timestamp: h(9) },
    inputB: { text: "Kanyakumari landslip damage rises to 60 houses", language: "en", source: NDTV, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic" },
  },

  // ─────────────────────────────────────────────────────────────────────
  // F — ATTRIBUTED STATEMENT  → stays ATTRIBUTED, speaker retained
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "F01",
    category: "F-attributed-statement",
    inputA: { text: "More than 10,000 people have received flood assistance, the Revenue Minister said", language: "en", source: HINDU, timestamp: h(4) },
    expected: { relation: "attributed", claimType: "attribution", attributionRequired: true, attributionSpeaker: "minister", notes: "Do not promote 10,000 to a bare fact." },
  },
  {
    id: "F02",
    category: "F-attributed-statement",
    inputA: { text: "Police believe the Perambur fire started in a store room", language: "en", source: TOI, timestamp: h(5) },
    expected: { relation: "attributed", claimType: "attribution", attributionRequired: true, attributionSpeaker: "police" },
  },
  {
    id: "F03",
    category: "F-attributed-statement",
    inputA: { text: "According to the IMD, rainfall will intensify over the next 24 hours", language: "en", source: HINDU, timestamp: h(6) },
    expected: { relation: "attributed", claimType: ["attribution", "prediction"], attributionRequired: true, attributionSpeaker: "imd" },
  },
  {
    id: "F04",
    category: "F-attributed-statement",
    inputA: { text: "The Chief Minister said 2 lakh families would get relief by Friday", language: "en", source: NDTV, timestamp: h(4) },
    expected: { relation: "attributed", claimType: "attribution", attributionRequired: true, attributionSpeaker: "chief minister" },
  },
  {
    id: "F05",
    category: "F-attributed-statement",
    inputA: { text: "Officials expect the Cauvery to breach the danger mark by midnight", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "attributed", claimType: ["attribution", "prediction"], attributionRequired: true, attributionSpeaker: "official" },
  },
  {
    id: "F06",
    category: "F-attributed-statement",
    inputA: { text: "The Collector said no evacuation had been ordered for the town so far", language: "en", source: TOI, timestamp: h(6) },
    expected: { relation: "attributed", claimType: "attribution", attributionRequired: true, attributionSpeaker: "collector" },
  },
  {
    id: "F07",
    category: "F-attributed-statement",
    inputA: { text: "Railways said 14 trains were cancelled and 6 diverted", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "attributed", claimType: "attribution", attributionRequired: true, attributionSpeaker: "railways" },
  },
  {
    id: "F08",
    category: "F-attributed-statement",
    inputA: { text: "Doctors at the government hospital said all the injured were stable", language: "en", source: NIE, timestamp: h(4) },
    expected: { relation: "attributed", claimType: "attribution", attributionRequired: true, attributionSpeaker: "doctors" },
  },
  {
    id: "F09",
    category: "F-attributed-statement",
    inputA: { text: "The minister announced that 12,000 people had been moved to safety", language: "en", source: HT, timestamp: h(4) },
    expected: { relation: "attributed", claimType: "attribution", attributionRequired: true, attributionSpeaker: "minister" },
  },
  {
    id: "F10",
    category: "F-attributed-statement",
    inputA: { text: "Per the district administration, 300 relief camps are operational", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "attributed", claimType: "attribution", attributionRequired: true, attributionSpeaker: "district administration" },
  },
  {
    id: "F11",
    category: "F-attributed-statement",
    inputA: { text: "A senior IMD scientist told reporters the system would weaken by Thursday", language: "en", source: TOI, timestamp: h(7) },
    expected: { relation: "attributed", claimType: ["attribution", "prediction"], attributionRequired: true, attributionSpeaker: "imd" },
  },
  {
    id: "F12",
    category: "F-attributed-statement",
    inputA: { text: "The fire department said the blaze was brought under control in two hours", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "attributed", claimType: "attribution", attributionRequired: true, attributionSpeaker: "fire department" },
  },
  {
    id: "F13",
    category: "F-attributed-statement",
    inputA: { text: "Sources said the toll could rise as more areas are searched", language: "en", source: NDTV, timestamp: h(6) },
    expected: { relation: "attributed", claimType: ["attribution", "prediction"], attributionRequired: true, attributionSpeaker: "source" },
  },
  {
    id: "F14",
    category: "F-attributed-statement",
    inputA: { text: "Schools were closed in Cuddalore on Tuesday", language: "en", source: HINDU, timestamp: h(4) },
    expected: { relation: "attributed", claimType: "official-statement", attributionRequired: false, notes: "NEGATIVE control — this is a direct fact, no speaker; must NOT be tagged attribution." },
  },

  // ─────────────────────────────────────────────────────────────────────
  // G — ALLEGATION  → allegation / attribution, never a bare fact
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "G01",
    category: "G-allegation",
    inputA: { text: "The opposition alleged corruption in flood relief procurement", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "attributed", claimType: ["allegation", "attribution"], attributionRequired: true, attributionSpeaker: "opposition" },
  },
  {
    id: "G02",
    category: "G-allegation",
    inputA: { text: "DMK alleged that BJP-ruled states diverted Cauvery water", language: "en", source: TOI, timestamp: h(6) },
    expected: { relation: "attributed", claimType: ["allegation", "attribution"], attributionRequired: true },
  },
  {
    id: "G03",
    category: "G-allegation",
    inputA: { text: "Residents alleged that the corporation ignored early warnings", language: "en", source: NIE, timestamp: h(5) },
    expected: { relation: "attributed", claimType: ["allegation", "attribution"], attributionRequired: true },
  },
  {
    id: "G04",
    category: "G-allegation",
    inputA: { text: "AIADMK accused the government of under-reporting the death toll", language: "en", source: HINDU, timestamp: h(4) },
    expected: { relation: "attributed", claimType: ["allegation", "attribution"], attributionRequired: true },
  },
  {
    id: "G05",
    category: "G-allegation",
    inputA: { text: "A petition alleged illegal sand mining worsened the Cuddalore flooding", language: "en", source: HT, timestamp: h(7) },
    expected: { relation: "attributed", claimType: ["allegation", "attribution"], attributionRequired: true },
  },
  {
    id: "G06",
    category: "G-allegation",
    inputA: { text: "The union claimed contractors were not paid for relief work", language: "en", source: HINDU, timestamp: h(6) },
    expected: { relation: "attributed", claimType: ["allegation", "attribution"], attributionRequired: true },
  },
  {
    id: "G07",
    category: "G-allegation",
    inputA: { text: "Farmers alleged that the Mettur release came too late for the samba crop", language: "en", source: NIE, timestamp: h(5) },
    expected: { relation: "attributed", claimType: ["allegation", "attribution"], attributionRequired: true },
  },
  {
    id: "G08",
    category: "G-allegation",
    inputA: { text: "An RTI activist alleged relief funds were parked in a suspense account", language: "en", source: TOI, timestamp: h(8) },
    expected: { relation: "attributed", claimType: ["allegation", "attribution"], attributionRequired: true },
  },

  // ─────────────────────────────────────────────────────────────────────
  // H — PREDICTION  → prediction, not a present fact
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "H01",
    category: "H-prediction",
    inputA: { text: "Officials expect heavy rainfall over the delta districts tomorrow", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "attributed", claimType: ["prediction", "attribution"], attributionRequired: true, notes: "Expectation, not observed rain." },
  },
  {
    id: "H02",
    category: "H-prediction",
    inputA: { text: "The Cauvery is likely to cross the danger mark by Wednesday", language: "en", source: TOI, timestamp: h(6) },
    expected: { relation: "attributed", claimType: "prediction", notes: "Modal 'likely' — a forecast." },
  },
  {
    id: "H03",
    category: "H-prediction",
    inputA: { text: "IMD forecasts thunderstorms for Chennai over the next three days", language: "en", source: HINDU, timestamp: h(7) },
    expected: { relation: "attributed", claimType: ["prediction", "attribution"], attributionRequired: true, attributionSpeaker: "imd" },
  },
  {
    id: "H04",
    category: "H-prediction",
    inputA: { text: "Water levels could rise further if the upstream release continues", language: "en", source: NIE, timestamp: h(5) },
    expected: { relation: "attributed", claimType: "prediction" },
  },
  {
    id: "H05",
    category: "H-prediction",
    inputA: { text: "The cyclone is expected to weaken into a deep depression by Friday", language: "en", source: HT, timestamp: h(8) },
    expected: { relation: "attributed", claimType: "prediction" },
  },
  {
    id: "H06",
    category: "H-prediction",
    inputA: { text: "Authorities warn that low-lying areas may be inundated overnight", language: "en", source: HINDU, timestamp: h(4) },
    expected: { relation: "attributed", claimType: ["prediction", "attribution"], attributionRequired: true },
  },
  {
    id: "H07",
    category: "H-prediction",
    inputA: { text: "Schools may be closed on Thursday if the rain persists, officials indicate", language: "en", source: TOI, timestamp: h(5) },
    expected: { relation: "attributed", claimType: ["prediction", "attribution"], attributionRequired: true, notes: "Conditional — not a confirmed closure." },
  },
  {
    id: "H08",
    category: "H-prediction",
    inputA: { text: "The reservoir is projected to reach full capacity within 48 hours", language: "en", source: HINDU, timestamp: h(6) },
    expected: { relation: "attributed", claimType: "prediction" },
  },

  // ─────────────────────────────────────────────────────────────────────
  // I — PRIMARY EVIDENCE  → CAP record SUPPORTS the article claim
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "I01",
    category: "I-primary-evidence",
    inputA: { text: "Red alert issued for Cuddalore as heavy rain continues", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(5), cap: { event: "Heavy Rain", severity: "Severe", area: "Cuddalore", identifier: "3001" } },
    expected: { relation: "supports", notes: "Alert directly matches the reported warning." },
  },
  {
    id: "I02",
    category: "I-primary-evidence",
    inputA: { text: "Flash flood warning for Nagapattinam district", language: "en", source: TOI, timestamp: h(4) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(5), cap: { event: "Flash Flood", severity: "Severe", area: "Nagapattinam", identifier: "3002" } },
    expected: { relation: "supports" },
  },
  {
    id: "I03",
    category: "I-primary-evidence",
    inputA: { text: "Cyclone warning for the Tamil Nadu coast", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(7), cap: { event: "Cyclone", severity: "Extreme", area: "Nagapattinam, Cuddalore", identifier: "3003" } },
    expected: { relation: "supports" },
  },
  {
    id: "I04",
    category: "I-primary-evidence",
    inputA: { text: "Thunderstorm and lightning alert for Coimbatore", language: "en", source: NDTV, timestamp: h(4) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(5), cap: { event: "Thunderstorm", severity: "Moderate", area: "Coimbatore", identifier: "3004" } },
    expected: { relation: "supports" },
  },
  {
    id: "I05",
    category: "I-primary-evidence",
    inputA: { text: "Heatwave warning issued for Vellore and Tirupattur", language: "en", source: HINDU, timestamp: h(8) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(9), cap: { event: "Heat Wave", severity: "Severe", area: "Vellore", identifier: "3005" } },
    expected: { relation: "supports" },
  },
  {
    id: "I06",
    category: "I-primary-evidence",
    inputA: { text: "Five houses collapsed in the Cuddalore floods", language: "en", source: HINDU, timestamp: h(3) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(6), cap: { event: "Heavy Rain", severity: "Severe", area: "Cuddalore", identifier: "3006" } },
    expected: { relation: "different", notes: "NEGATIVE — a rain alert does NOT establish that five houses collapsed." },
  },
  {
    id: "I07",
    category: "I-primary-evidence",
    inputA: { text: "Two fishermen drowned off the Rameswaram coast", language: "en", source: TOI, timestamp: h(4) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(7), cap: { event: "Rough Sea", severity: "Moderate", area: "Ramanathapuram", identifier: "3007" } },
    expected: { relation: "different", notes: "NEGATIVE — the rough-sea alert is context, not proof of the deaths." },
  },
  {
    id: "I08",
    category: "I-primary-evidence",
    inputA: { text: "Orange alert for very heavy rain in the Nilgiris", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(6), cap: { event: "Heavy Rain", severity: "Severe", area: "The Nilgiris", identifier: "3008" } },
    expected: { relation: "supports" },
  },
  {
    id: "I09",
    category: "I-primary-evidence",
    inputA: { text: "Dam overflow warning for the Vaigai reservoir", language: "en", source: NIE, timestamp: h(6) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(7), cap: { event: "Dam Reservoir Warning", severity: "Severe", area: "Madurai", identifier: "3009" } },
    expected: { relation: "supports" },
  },
  {
    id: "I10",
    category: "I-primary-evidence",
    inputA: { text: "Chief Minister announces Rs 1,000 crore flood package", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "CAP alert", language: "en", source: "NDMA SACHET", timestamp: h(8), cap: { event: "Heavy Rain", severity: "Severe", area: "Chennai", identifier: "3010" } },
    expected: { relation: "different", notes: "NEGATIVE — a weather alert says nothing about a funding announcement." },
  },

  // ─────────────────────────────────────────────────────────────────────
  // J — SYNDICATION  → publishers ≥2 but ONE upstream reporting group
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "J01",
    category: "J-syndication",
    inputA: { text: "Cyclone Ditwah to cross Tamil Nadu coast near Nagapattinam on Thursday", language: "en", source: TOI, wire: "PTI", timestamp: h(6) },
    inputB: { text: "Cyclone Ditwah to cross Tamil Nadu coast near Nagapattinam on Thursday", language: "en", source: NIE, wire: "PTI", timestamp: h(6) },
    expected: { relation: "same", independent: false, matchLevel: "event", notes: "Identical PTI copy in two papers — one confirmation." },
  },
  {
    id: "J02",
    category: "J-syndication",
    inputA: { text: "Tamil Nadu shuts schools in six districts as heavy rain pounds the state", language: "en", source: HT, wire: "PTI", timestamp: h(5) },
    inputB: { text: "Tamil Nadu shuts schools in six districts as heavy rain pounds the state", language: "en", source: NDTV, wire: "PTI", timestamp: h(5) },
    expected: { relation: "same", independent: false, matchLevel: "specific" },
  },
  {
    id: "J03",
    category: "J-syndication",
    inputA: { text: "IMD sounds red alert for four Tamil Nadu districts", language: "en", source: TOI, wire: "ANI", timestamp: h(4) },
    inputB: { text: "IMD sounds red alert for four Tamil Nadu districts", language: "en", source: HINDU, wire: "ANI", timestamp: h(4) },
    expected: { relation: "same", independent: false, matchLevel: "specific" },
  },
  {
    id: "J04",
    category: "J-syndication",
    inputA: { text: "Three dead as heavy rain triggers wall collapse in Chennai", language: "en", source: HT, wire: "PTI", timestamp: h(5) },
    inputB: { text: "Three dead as heavy rain triggers wall collapse in Chennai", language: "en", source: NIE, wire: "PTI", timestamp: h(5) },
    expected: { relation: "same", independent: false, matchLevel: "specific" },
  },
  {
    id: "J05",
    category: "J-syndication",
    inputA: { text: "Mettur dam opened as inflow rises, Cauvery delta on alert", language: "en", source: NDTV, wire: "IANS", timestamp: h(6) },
    inputB: { text: "Mettur dam opened as inflow rises, Cauvery delta on alert", language: "en", source: TOI, wire: "IANS", timestamp: h(6) },
    expected: { relation: "same", independent: false, matchLevel: "event" },
  },
  {
    id: "J06",
    category: "J-syndication",
    inputA: { text: "Chennai schools shut on Wednesday as the city reels under heavy rain", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Wednesday declared a holiday for Chennai schools after a night of downpour", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "same", independent: true, matchLevel: "specific", notes: "POSITIVE — genuinely different wording from two desks: independent." },
  },
  {
    id: "J07",
    category: "J-syndication",
    inputA: { text: "12 rescued from Cuddalore floods as NDRF joins the operation", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Cuddalore flood rescue: a dozen pulled from submerged homes", language: "en", source: NDTV, timestamp: h(3) },
    expected: { relation: "same", independent: true, matchLevel: "specific", notes: "POSITIVE — independent reporting of the same rescue." },
  },
  {
    id: "J08",
    category: "J-syndication",
    inputA: { text: "Reuters: Tamil Nadu braces for Cyclone Ditwah landfall", language: "en", source: TOI, wire: "Reuters", timestamp: h(7) },
    inputB: { text: "Reuters: Tamil Nadu braces for Cyclone Ditwah landfall", language: "en", source: HT, wire: "Reuters", timestamp: h(7) },
    expected: { relation: "same", independent: false, matchLevel: "event" },
  },
  {
    id: "J09",
    category: "J-syndication",
    inputA: { text: "PTI: Rain toll in Tamil Nadu rises to seven", language: "en", source: NIE, wire: "PTI", timestamp: h(5) },
    inputB: { text: "PTI: Rain toll in Tamil Nadu rises to seven", language: "en", source: NDTV, wire: "PTI", timestamp: h(5) },
    expected: { relation: "same", independent: false, matchLevel: "specific" },
  },
  {
    id: "J10",
    category: "J-syndication",
    inputA: { text: "Heavy rain disrupts flights and trains across Tamil Nadu", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Tamil Nadu weather: air and rail traffic hit by downpour", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "same", independent: true, matchLevel: "specific", notes: "POSITIVE — different phrasing, no shared wire credit." },
  },

  // ─────────────────────────────────────────────────────────────────────
  // K — TAMIL ↔ TAMIL  → MATCH
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "K01",
    category: "K-tamil-tamil",
    inputA: { text: "சென்னையில் நாளை பள்ளிகளுக்கு விடுமுறை அறிவிப்பு", language: "ta", source: N18TA, timestamp: h(4) },
    inputB: { text: "நாளை சென்னை பள்ளிகள் மூடல்: மாவட்ட நிர்வாகம் அறிவிப்பு", language: "ta", source: PTHALAI, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "specific", notes: "விடுமுறை (holiday) = மூடல் (closure), same city, same day." },
  },
  {
    id: "K02",
    category: "K-tamil-tamil",
    inputA: { text: "மேட்டூர் அணையில் இருந்து காவிரி ஆற்றில் தண்ணீர் திறப்பு", language: "ta", source: N18TA, timestamp: h(6) },
    inputB: { text: "மேட்டூர் அணை திறக்கப்பட்டது; சேலம் அருகே காவிரியில் நீர்", language: "ta", source: PTHALAI, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "specific" },
  },
  {
    id: "K03",
    category: "K-tamil-tamil",
    inputA: { text: "நீலகிரி மாவட்டத்தில் கனமழைக்கு சிவப்பு எச்சரிக்கை", language: "ta", source: N18TA, timestamp: h(5) },
    inputB: { text: "நீலகிரிக்கு சிவப்பு அலர்ட்: வானிலை ஆய்வு மையம்", language: "ta", source: PTHALAI, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "specific" },
  },
  {
    id: "K04",
    category: "K-tamil-tamil",
    inputA: { text: "கடலூரில் வெள்ளத்தில் சிக்கிய 12 பேர் மீட்பு", language: "ta", source: N18TA, timestamp: h(4) },
    inputB: { text: "கடலூர் வெள்ளம்: 12 பேர் பாதுகாப்பாக மீட்கப்பட்டனர்", language: "ta", source: PTHALAI, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "specific" },
  },
  {
    id: "K05",
    category: "K-tamil-tamil",
    inputA: { text: "மதுரையில் திருவிழாவையொட்டி தடை உத்தரவு பிரிவு 144 அமல்", language: "ta", source: N18TA, timestamp: h(7) },
    inputB: { text: "மதுரை: திருவிழாவுக்கு முன் 144 தடை உத்தரவு", language: "ta", source: PTHALAI, timestamp: h(6) },
    expected: { relation: "same", matchLevel: "specific" },
  },
  {
    id: "K06",
    category: "K-tamil-tamil",
    inputA: { text: "தமிழ்நாட்டில் மழை காரணமாக 24 மணி நேரத்தில் 6 பேர் உயிரிழப்பு", language: "ta", source: N18TA, timestamp: h(4) },
    inputB: { text: "தமிழ்நாடு மழை: ஒரே நாளில் 6 உயிரிழப்பு", language: "ta", source: PTHALAI, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "specific" },
  },
  {
    id: "K07",
    category: "K-tamil-tamil",
    inputA: { text: "ஈரோட்டில் காவிரி கரையோர குடியிருப்புகளுக்கு வெளியேற்ற உத்தரவு", language: "ta", source: N18TA, timestamp: h(6) },
    inputB: { text: "ஈரோடு: காவிரி கரை மக்கள் வெளியேற்றம்", language: "ta", source: PTHALAI, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "specific" },
  },
  {
    id: "K08",
    category: "K-tamil-tamil",
    inputA: { text: "கடலூரில் பள்ளிகள் மூடல், ரயில் சேவைகள் நிறுத்தம்", language: "ta", source: N18TA, timestamp: h(4) },
    inputB: { text: "கடலூரில் வெள்ளத்தால் ரயில் போக்குவரத்து பாதிப்பு", language: "ta", source: PTHALAI, timestamp: h(4) },
    expected: { relation: "different", notes: "Tamil B-category — schools-closed vs trains-hit are different claims." },
  },

  // ─────────────────────────────────────────────────────────────────────
  // L — TAMIL ↔ ENGLISH  → semantic MATCH when translation exists;
  //     without it, the honest answer is "uncertain" and Tamil provenance is kept.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "L01",
    category: "L-tamil-english",
    inputA: { text: "சென்னையில் நாளை பள்ளிகளுக்கு விடுமுறை", language: "ta", source: N18TA, timestamp: h(4) },
    inputB: { text: "Schools in Chennai will remain closed tomorrow", language: "en", source: HINDU, timestamp: h(3) },
    expected: { relation: "uncertain", matchLevel: "specific", notes: "Same fact; IFA has no translation layer yet, so it must not silently merge — but must keep the Tamil original." },
  },
  {
    id: "L02",
    category: "L-tamil-english",
    inputA: { text: "மேட்டூர் அணை திறப்பு; காவிரியில் தண்ணீர்", language: "ta", source: N18TA, timestamp: h(6) },
    inputB: { text: "Mettur dam opened, water released into the Cauvery", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "uncertain", matchLevel: "specific" },
  },
  {
    id: "L03",
    category: "L-tamil-english",
    inputA: { text: "நீலகிரிக்கு சிவப்பு எச்சரிக்கை", language: "ta", source: N18TA, timestamp: h(5) },
    inputB: { text: "Red alert issued for the Nilgiris", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "uncertain", matchLevel: "specific" },
  },
  {
    id: "L04",
    category: "L-tamil-english",
    inputA: { text: "கடலூரில் 12 பேர் மீட்பு", language: "ta", source: N18TA, timestamp: h(4) },
    inputB: { text: "12 rescued in Cuddalore floods", language: "en", source: HINDU, timestamp: h(3) },
    expected: { relation: "uncertain", matchLevel: "specific", notes: "Digits are language-neutral — a future normaliser could match on the figure." },
  },
  {
    id: "L05",
    category: "L-tamil-english",
    inputA: { text: "மதுரையில் பிரிவு 144 அமல்", language: "ta", source: N18TA, timestamp: h(7) },
    inputB: { text: "Section 144 imposed in Madurai", language: "en", source: HINDU, timestamp: h(6) },
    expected: { relation: "uncertain", matchLevel: "specific" },
  },
  {
    id: "L06",
    category: "L-tamil-english",
    inputA: { text: "ஈரோட்டில் வெளியேற்ற உத்தரவு", language: "ta", source: N18TA, timestamp: h(6) },
    inputB: { text: "Evacuation ordered in Erode", language: "en", source: TOI, timestamp: h(5) },
    expected: { relation: "uncertain", matchLevel: "specific" },
  },
  {
    id: "L07",
    category: "L-tamil-english",
    inputA: { text: "மேட்டூர் அணை திறப்பு", language: "ta", source: N18TA, timestamp: h(6) },
    inputB: { text: "Section 144 imposed in Madurai", language: "en", source: HINDU, timestamp: h(6) },
    expected: { relation: "different", notes: "NEGATIVE — genuinely different events across languages must stay different." },
  },
  {
    id: "L08",
    category: "L-tamil-english",
    inputA: { text: "சென்னையில் கனமழை", language: "ta", source: N18TA, timestamp: h(4) },
    inputB: { text: "Cyclone crosses near Nagapattinam", language: "en", source: HINDU, timestamp: h(5) },
    expected: { relation: "different", notes: "NEGATIVE — different place and event." },
  },

  // ─────────────────────────────────────────────────────────────────────
  // M — SAME PEOPLE, DIFFERENT STORY  → NOT match
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "M01",
    category: "M-same-people-different-story",
    inputA: { text: "CM Vijay announces a semiconductor park near Kancheepuram", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "CM Vijay announces a milk procurement price hike to Rs 44", language: "en", source: TOI, timestamp: h(5) },
    expected: { relation: "different" },
  },
  {
    id: "M02",
    category: "M-same-people-different-story",
    inputA: { text: "Stalin inaugurates a new flyover in Coimbatore", language: "en", source: HINDU, timestamp: h(7) },
    inputB: { text: "Stalin chairs a review meeting on the Chennai metro extension", language: "en", source: TOI, timestamp: h(6) },
    expected: { relation: "different" },
  },
  {
    id: "M03",
    category: "M-same-people-different-story",
    inputA: { text: "Annamalai addresses a party rally in Madurai", language: "en", source: HT, timestamp: h(8) },
    inputB: { text: "Annamalai files a defamation case in the Madras High Court", language: "en", source: NIE, timestamp: h(6) },
    expected: { relation: "different" },
  },
  {
    id: "M04",
    category: "M-same-people-different-story",
    inputA: { text: "Modi to visit Tamil Nadu for a port project launch", language: "en", source: HINDU, timestamp: h(10) },
    inputB: { text: "Modi condoles the loss of lives in the Coimbatore building collapse", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "different" },
  },
  {
    id: "M05",
    category: "M-same-people-different-story",
    inputA: { text: "Udhayanidhi reviews flood relief in Chengalpattu", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Udhayanidhi launches a sports scheme for government schools", language: "en", source: NDTV, timestamp: h(9) },
    expected: { relation: "different" },
  },
  {
    id: "M06",
    category: "M-same-people-different-story",
    inputA: { text: "Palaniswami demands a white paper on the state's finances", language: "en", source: TOI, timestamp: h(7) },
    inputB: { text: "Palaniswami visits families affected by the Cuddalore floods", language: "en", source: HINDU, timestamp: h(4) },
    expected: { relation: "different" },
  },
  {
    id: "M07",
    category: "M-same-people-different-story",
    inputA: { text: "Mamata Banerjee comments on the Cauvery water dispute", language: "en", source: HT, timestamp: h(9) },
    inputB: { text: "Mamata Banerjee's niece found dead in Kolkata", language: "en", source: NDTV, timestamp: h(6) },
    expected: { relation: "different" },
  },
  {
    id: "M08",
    category: "M-same-people-different-story",
    inputA: { text: "Seeman criticises the relief distribution in the delta", language: "en", source: NIE, timestamp: h(5) },
    inputB: { text: "Seeman announces NTK candidates for the local body polls", language: "en", source: TOI, timestamp: h(11) },
    expected: { relation: "different" },
  },

  // ─────────────────────────────────────────────────────────────────────
  // N — SAME LOCATION, DIFFERENT DATE  → NOT match
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "N01",
    category: "N-same-location-different-date",
    inputA: { text: "Section 144 imposed in Madurai ahead of the temple festival", language: "en", source: HINDU, timestamp: h(150) },
    inputB: { text: "Section 144 imposed in Madurai after clashes near the market", language: "en", source: TOI, timestamp: h(3) },
    expected: { relation: "different", notes: "Same order type, same city, six days apart — different events." },
  },
  {
    id: "N02",
    category: "N-same-location-different-date",
    inputA: { text: "Schools closed in Cuddalore due to heavy rain", language: "en", source: HINDU, timestamp: h(170) },
    inputB: { text: "Schools closed in Cuddalore due to heavy rain", language: "en", source: TOI, timestamp: h(2) },
    expected: { relation: "different", notes: "Identical text, a week apart — two separate closures." },
  },
  {
    id: "N03",
    category: "N-same-location-different-date",
    inputA: { text: "Mettur dam opened for Cauvery water release near Salem", language: "en", source: HINDU, timestamp: h(200) },
    inputB: { text: "Mettur dam opened for Cauvery water release near Salem", language: "en", source: NIE, timestamp: h(4) },
    expected: { relation: "different" },
  },
  {
    id: "N04",
    category: "N-same-location-different-date",
    inputA: { text: "Red alert for Coimbatore as heavy rain lashes the district", language: "en", source: HINDU, timestamp: h(160) },
    inputB: { text: "Red alert for Coimbatore as heavy rain lashes the district", language: "en", source: HT, timestamp: h(3) },
    expected: { relation: "different" },
  },
  {
    id: "N05",
    category: "N-same-location-different-date",
    inputA: { text: "Wall collapse in Chennai's Pallavaram kills two", language: "en", source: HINDU, timestamp: h(190) },
    inputB: { text: "Wall collapse in Chennai's Pallavaram kills three", language: "en", source: TOI, timestamp: h(2) },
    expected: { relation: "different", notes: "Different incidents a week apart — NOT a numeric contradiction." },
  },
  {
    id: "N06",
    category: "N-same-location-different-date",
    inputA: { text: "Fishing ban off Nagapattinam over rough seas", language: "en", source: HINDU, timestamp: h(180) },
    inputB: { text: "Fishing ban off Nagapattinam over rough seas", language: "en", source: NIE, timestamp: h(3) },
    expected: { relation: "different" },
  },
  {
    id: "N07",
    category: "N-same-location-different-date",
    inputA: { text: "Chennai Corporation opens flood relief camps", language: "en", source: HINDU, timestamp: h(220) },
    inputB: { text: "Chennai Corporation opens flood relief camps", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "different" },
  },
  {
    id: "N08",
    category: "N-same-location-different-date",
    inputA: { text: "Power shutdown in parts of Coimbatore for maintenance", language: "en", source: HINDU, timestamp: h(165) },
    inputB: { text: "Power shutdown in parts of Coimbatore as a rain precaution", language: "en", source: TOI, timestamp: h(3) },
    expected: { relation: "different" },
  },

  // ─────────────────────────────────────────────────────────────────────
  // O — NEIGHBOURING DISTRICTS  → NOT match (unless a shared event is stated)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "O01",
    category: "O-neighbouring-districts",
    inputA: { text: "Boat capsizes in Cuddalore, two fishermen missing", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Two-storey house collapses in Villupuram, none hurt", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "different" },
  },
  {
    id: "O02",
    category: "O-neighbouring-districts",
    inputA: { text: "Heavy rain floods low-lying areas of Cuddalore", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Heavy rain floods low-lying areas of Villupuram", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "different", notes: "Adjacent districts, same weather, but two separate local floods." },
  },
  {
    id: "O03",
    category: "O-neighbouring-districts",
    inputA: { text: "Schools closed in Thanjavur due to flooding", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Schools closed in Tiruvarur due to flooding", language: "en", source: NIE, timestamp: h(4) },
    expected: { relation: "different" },
  },
  {
    id: "O04",
    category: "O-neighbouring-districts",
    inputA: { text: "Landslide warning for the Nilgiris", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Landslide warning for Coimbatore's hilly belt", language: "en", source: TOI, timestamp: h(5) },
    expected: { relation: "different" },
  },
  {
    id: "O05",
    category: "O-neighbouring-districts",
    inputA: { text: "Cauvery in spate near Erode; banks overflow", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Cauvery in spate near Karur; banks overflow", language: "en", source: NIE, timestamp: h(5) },
    expected: { relation: "different" },
  },
  {
    id: "O06",
    category: "O-neighbouring-districts",
    inputA: { text: "Relief camps opened in Madurai", language: "en", source: HINDU, timestamp: h(4) },
    inputB: { text: "Relief camps opened in Dindigul", language: "en", source: TOI, timestamp: h(4) },
    expected: { relation: "different" },
  },
  {
    id: "O07",
    category: "O-neighbouring-districts",
    inputA: { text: "Power outage hits parts of Tirunelveli", language: "en", source: HINDU, timestamp: h(5) },
    inputB: { text: "Power outage hits parts of Thoothukudi", language: "en", source: NIE, timestamp: h(5) },
    expected: { relation: "different" },
  },
  {
    id: "O08",
    category: "O-neighbouring-districts",
    inputA: { text: "Cyclone Ditwah crosses near Nagapattinam, delta districts on alert", language: "en", source: HINDU, timestamp: h(6) },
    inputB: { text: "Cyclone Ditwah: Nagapattinam and Tiruvarur brace for landfall", language: "en", source: TOI, timestamp: h(6) },
    expected: { relation: "same", matchLevel: "event", notes: "POSITIVE — an explicitly shared event (one cyclone) DOES join adjacent districts." },
  },
];
