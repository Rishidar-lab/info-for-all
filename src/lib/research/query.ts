/**
 * §B.2.4 — deterministic ResearchQuery generation.
 *
 * Built from the claim's OWN extracted entities, numbers, dates and places.
 * Never from a paraphrase. Never from a model-written search string. Stored with
 * the result so every hit and miss is reproducible.
 */
import type { Claim } from "@/lib/claims/types";
import type { ResearchQuery } from "./types";

const AUTHORITY_RULES: [string, RegExp][] = [
  ["India Meteorological Department", /\b(imd|india meteorological|rmc chennai|meteorological (?:centre|department)|weather office)\b/i],
  ["NDMA / State Disaster Management Authority", /\b(ndma|sdma|disaster management authority|sachet)\b/i],
  ["Madras High Court", /\b(madras (?:high )?court|madurai bench)\b/i],
  ["Supreme Court of India", /\b(supreme court|apex court)\b/i],
  ["Government of Tamil Nadu", /\b(tamil nadu government|tn government|tn govt|state government|state cabinet|tamil nadu cm|tn cm|dipr)\b/i],
  ["Government of India", /\b(union government|the centre|central government|govt of india|government of india|union (?:cabinet|minister)|ministry of|pib)\b/i],
  ["Election Commission of India", /\b(election commission|eci|ceo tamil nadu|returning officer)\b/i],
  ["Reserve Bank of India", /\b(rbi|reserve bank)\b/i],
  ["Securities and Exchange Board of India", /\b(sebi|securities and exchange board)\b/i],
  ["Enforcement Directorate", /\b(enforcement directorate|\bed\b raids?|cbi)\b/i],
];

const CLAIM_TYPE_RULES: [string, RegExp][] = [
  ["weather_event", /\b(rain|rainfall|cyclone|flood|imd|alert|warning|thunderstorm|lightning|heatwave|monsoon|cusecs?|mm of rain)\b/i],
  ["court", /\b(court|bench|verdict|plea|petition|judg?ment|bail|tribunal|quash|acquit|convict|stay order)\b/i],
  ["scheme_allocation", /(₹|\brs\.?\s*\d|\bcrore\b|\blakh\b|allocat|sanction|outlay|package|disburse|grant)/i],
  ["casualty_count", /\b\d+\s+(?:dead|killed|died|injured|missing)|death toll|casualt/i],
  ["appointment", /\b(appoint|named as|takes charge|resign|new (?:chief|chair|head|director|trustee|dgp))\b/i],
  ["electoral", /\b(election|by-?election|poll|electoral roll|voter|nomination|constituency)\b/i],
  ["official_action", /\b(government|govt|cabinet|minister|announce|launch|inaugurat|order|notif|g\.?o\.?|sanction|resolution|approves?|clears?)\b/i],
  ["quantity", /\b\d[\d,.]*\s*(?:per cent|%|billion|bps|points|gdp|inflation|repo rate)\b/i],
];

function authorityOf(text: string): string | null {
  for (const [name, re] of AUTHORITY_RULES) if (re.test(text)) return name;
  return null;
}
function claimTypeOf(text: string): string {
  for (const [t, re] of CLAIM_TYPE_RULES) if (re.test(text)) return t;
  return "other";
}

const PLACES =
  /\b(Chennai|Coimbatore|Madurai|Trichy|Tiruchirappalli|Salem|Erode|Tirunelveli|Vellore|Thanjavur|Cuddalore|Nagapattinam|Kancheepuram|Chengalpattu|Villupuram|Dindigul|Karur|Namakkal|Dharmapuri|Krishnagiri|Tenkasi|Ranipet|Perambalur|Ariyalur|Sivaganga|Ramanathapuram|Virudhunagar|Thoothukudi|Pudukkottai|Nilgiris|Tiruppur|Tiruvallur|Tiruvannamalai|Kallakurichi|Mayiladuthurai|Tamil Nadu|Puducherry|Kerala|Keralam|Karnataka|Andhra Pradesh|Telangana|Maharashtra|Gujarat|Rajasthan|Madhya Pradesh|Uttar Pradesh|Bihar|West Bengal|Odisha|Assam|Punjab|Haryana|Delhi|Mumbai|Bengaluru|Kolkata|Hyderabad|Ahmedabad|Pune|Lucknow|Patna|Bhopal|Jaipur|Guwahati|Kochi|Thiruvananthapuram|Visakhapatnam|Nagpur)\b/g;

export function buildResearchQuery(claim: Claim, clusterTitle: string): ResearchQuery {
  const text = `${clusterTitle}. ${claim.canonicalText} ${claim.subjects.join(" ")} ${claim.objects.join(" ")} ${claim.provenance
    .map((p) => p.sourceText ?? "")
    .join(" ")}`.slice(0, 900);

  const entities = [
    ...new Set(
      [
        ...claim.subjects,
        ...claim.objects.filter((o) => !/^\d/.test(o)),
        ...(text.match(/\b[A-Z][a-z]{3,}(?:\s+[A-Z][a-z]{3,}){0,3}/g) ?? []),
      ]
        .map((e) => e.trim())
        .filter((e) => e.length > 3 && !/^(The|This|That|Tamil Nadu|India)$/i.test(e)),
    ),
  ].slice(0, 10);

  const numbers = [
    ...new Set(
      (text.match(/(?:₹|rs\.?\s*)?\d[\d,]*(?:\.\d+)?\s*(?:crore|lakh|per cent|%|mm|cusecs?|kmph|bps|points?)?/gi) ?? [])
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /\d/.test(s) && s.length > 1),
    ),
  ].slice(0, 8);

  const dates = [
    ...new Set(
      (text.match(/\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}|\d{4}-\d{2}-\d{2}\b/gi) ?? []).map((s) => s.toLowerCase()),
    ),
  ].slice(0, 6);

  const places = [...new Set(text.match(PLACES) ?? [])].slice(0, 6);

  return { claimId: claim.id, claimType: claimTypeOf(text), entities, numbers, dates, places, authority: authorityOf(text) };
}
