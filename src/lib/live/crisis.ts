import type {
  AlertLifecycle,
  CapMeta,
  CrisisType,
  EvidenceRole,
  GeographicScope,
  VerificationStatus,
} from "./types";

/**
 * Deterministic crisis classification + ranking.
 *
 * No opaque AI score. Every number here is reproducible from the inputs, and
 * severity/urgency/certainty from CAP are preserved verbatim, never invented.
 */

interface CrisisMatcher {
  type: CrisisType;
  /** All must be word-matched (lowercased haystack). */
  any: string[];
  /** If present, at least one must also match (disambiguation). */
  requires?: string[];
  /** If any of these match, this is NOT treated as a crisis of this type. */
  excludes?: string[];
  baseWeight: number;
}

/** Contexts that make weather/water words routine news rather than a public-safety crisis. */
const ROUTINE_CONTEXT = [
  "for irrigation",
  "irrigation",
  "delta farmers",
  "rice belt",
  "samba cultivation",
  "kuruvai",
  "water source for",
  "longevity of water",
  "drinking water supply",
  "water-sharing",
  "water sharing",
  "cauvery water management authority direction",
  "for the delta",
  "opens mettur dam",
  "mettur dam for",
];

/** Foreign locations — a disaster there is not a Tamil Nadu / India public-safety alert. */
const FOREIGN_DISASTER_CONTEXT = [
  "nepal flood",
  "pakistan flood",
  "bangladesh flood",
  "china flood",
  "myanmar",
  "afghanistan",
  "japan earthquake",
  "turkey earthquake",
  "california wildfire",
  "europe heatwave",
  "us floods",
];

const MATCHERS: CrisisMatcher[] = [
  { type: "cyclone", any: ["cyclone", "cyclonic storm", "deep depression", "well marked low", "landfall"], excludes: ["cyclone relief fund appeal", "post-cyclone"], baseWeight: 34 },
  { type: "coastal-tsunami-warning", any: ["tsunami", "storm surge", "high wave warning", "swell surge", "kallakkadal", "incois warning"], baseWeight: 34 },
  { type: "earthquake", any: ["earthquake", "quake of magnitude", "seismic activity", "tremor felt", "richter"], baseWeight: 30 },
  { type: "flood", any: ["flood", "flooding", "inundation", "waterlogging", "deluge", "flash flood", "submerged"], excludes: [...FOREIGN_DISASTER_CONTEXT, "flood relief fund", "flood-hit families compensation", "post-flood", "2015 floods", "2023 floods"], baseWeight: 28 },
  { type: "dam-reservoir-warning", any: ["flood cushion", "shutters opened", "surplus water discharged", "spillway", "inflow rises", "reservoir near full", "dam danger level", "first warning", "second warning", "third warning", "flood alert for downstream"], requires: ["warn", "alert", "flood", "danger", "downstream", "evacuat", "caution"], excludes: ROUTINE_CONTEXT, baseWeight: 26 },
  { type: "extreme-rain", any: ["very heavy rain", "extremely heavy rain", "heavy to very heavy rain", "torrential rain", "red alert", "orange alert", "heavy rainfall warning", "heavy rain warning", "heavy downpour"], excludes: ["deficit rain", "rain deficit", "no rain", "scanty rain"], baseWeight: 24 },
  { type: "landslide", any: ["landslide", "landslip", "mudslide", "rockfall", "slope failure", "boulders fell"], baseWeight: 26 },
  { type: "thunderstorm-lightning", any: ["thunderstorm warning", "lightning warning", "lightning kills", "lightning strike", "squall", "gale warning", "thunderstorm with lightning"], baseWeight: 16 },
  { type: "heatwave", any: ["heatwave", "heat wave", "severe heat", "hot weather warning", "heat advisory"], excludes: ["election heat", "political heat"], baseWeight: 18 },
  { type: "wildfire", any: ["forest fire", "wildfire", "bushfire", "hill fire", "blaze in the forest"], baseWeight: 20 },
  { type: "industrial-accident", any: ["gas leak", "chemical leak", "factory blast", "boiler blast", "industrial accident", "ammonia leak", "explosion at", "plant fire", "cracker unit blast", "firecracker unit blast"], baseWeight: 26 },
  { type: "transport-accident", any: ["train derail", "derailment", "bus accident", "road accident", "pile-up", "boat capsized", "plane crash", "air crash", "bus falls", "van overturns"], requires: ["kill", "dead", "die", "injured", "trapped", "rescue", "casualt", "hurt", "toll"], excludes: ["near miss", "averted"], baseWeight: 22 },
  { type: "public-health-warning", any: ["disease outbreak", "epidemic", "dengue cases surge", "cholera outbreak", "leptospirosis", "h1n1", "nipah", "measles outbreak", "food poisoning", "contaminated water", "health advisory issued", "fever cases rise"], baseWeight: 22 },
  { type: "infrastructure-outage", any: ["power outage", "grid failure", "water supply disruption", "state-wide blackout", "major power cut", "telecom outage", "internet shutdown"], baseWeight: 14 },
  { type: "evacuation", any: ["evacuat", "shifted to relief camp", "moved to relief centre", "moved to safety", "shelter home opened", "people in relief camps"], baseWeight: 24 },
  { type: "district-emergency-notice", any: ["holiday declared for schools", "schools closed due to", "colleges closed due to", "collector declares holiday", "section 144 imposed", "prohibitory orders due to"], requires: ["rain", "flood", "cyclone", "storm", "safety", "emergency", "disaster", "weather"], baseWeight: 18 },
];

function hasWord(hay: string, term: string): boolean {
  if (/[a-z0-9]/.test(term)) {
    const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    return re.test(hay);
  }
  return hay.includes(term);
}

export interface CrisisInput {
  title: string;
  excerpt?: string;
  capEvent?: string;
  disasterType?: string;
}

export function detectCrisisType(input: CrisisInput): { type?: CrisisType; weight: number; matched: string[] } {
  const hay = " " + [input.title, input.excerpt, input.capEvent, input.disasterType].filter(Boolean).join(" . ").toLowerCase() + " ";
  // A CAP disaster_type from an official alert is authoritative — trust it directly.
  const officialType = input.disasterType ? mapDisasterType(input.disasterType) : undefined;
  let best: { type?: CrisisType; weight: number; matched: string[] } = { weight: 0, matched: [] };
  for (const m of MATCHERS) {
    const hits = m.any.filter((t) => hasWord(hay, t));
    if (hits.length === 0) continue;
    if (m.requires && !m.requires.some((t) => hasWord(hay, t))) continue;
    if (m.excludes && m.excludes.some((t) => hasWord(hay, t))) continue;
    const w = m.baseWeight + Math.min(hits.length - 1, 2) * 2;
    if (w > best.weight) best = { type: m.type, weight: w, matched: hits };
  }
  if (officialType && best.weight < 20) {
    return { type: officialType, weight: 22, matched: [input.disasterType!] };
  }
  return best;
}

/** SACHET CAP `disaster_type` strings -> our CrisisType. */
function mapDisasterType(dt: string): CrisisType | undefined {
  const s = dt.toLowerCase();
  if (s.includes("cyclone")) return "cyclone";
  if (s.includes("tsunami") || s.includes("high wave") || s.includes("swell") || s.includes("storm surge")) return "coastal-tsunami-warning";
  if (s.includes("earthquake")) return "earthquake";
  if (s.includes("flash flood")) return "flood";
  if (s.includes("flood") || s.includes("inundation")) return "flood";
  if (s.includes("landslide") || s.includes("landslip")) return "landslide";
  if (s.includes("heat")) return "heatwave";
  if (s.includes("thunderstorm") || s.includes("lightning") || s.includes("squall")) return "thunderstorm-lightning";
  if (s.includes("forest fire") || s.includes("wildfire")) return "wildfire";
  if (s.includes("heavy rain") || s.includes("rainfall")) return "extreme-rain";
  return undefined;
}

/** CAP severity/urgency/certainty -> additive weight. Values preserved as-is elsewhere. */
export function capWeight(cap?: CapMeta): number {
  if (!cap) return 0;
  const sev = (cap.severity || "").toLowerCase();
  const urg = (cap.urgency || "").toLowerCase();
  const cer = (cap.certainty || "").toLowerCase();
  let w = 0;
  if (sev.includes("extreme")) w += 20;
  else if (sev.includes("severe")) w += 14;
  else if (sev.includes("moderate") || sev === "alert") w += 8;
  else if (sev.includes("minor") || sev === "watch") w += 3;
  if (urg.includes("immediate")) w += 10;
  else if (urg.includes("expected")) w += 5;
  if (cer.includes("observed")) w += 6;
  else if (cer.includes("likely")) w += 3;
  return w;
}

export function lifecycleFromCap(cap: CapMeta | undefined, now = Date.now()): AlertLifecycle {
  if (!cap) return "developing";
  const start = cap.effectiveFrom ? Date.parse(cap.effectiveFrom) : NaN;
  const end = cap.effectiveUntil ? Date.parse(cap.effectiveUntil) : NaN;
  if (!Number.isNaN(end) && end < now) return "all-clear";
  if (!Number.isNaN(start) && start > now + 30 * 60 * 1000) return "developing";
  return "active";
}

export interface PriorityInput {
  isOfficialAlert: boolean;
  scope: GeographicScope;
  districtCount: number;
  publishedAt: string;
  crisisWeight: number;
  capWeight: number;
  corroboratingSources: number;
  hasPrimaryDoc: boolean;
  lifecycle: AlertLifecycle;
  now?: number;
}

/**
 * 0–100. Components:
 *   official alert            +18
 *   crisis-type weight        0–38  (from detectCrisisType)
 *   CAP severity/urgency      0–36  (from capWeight)
 *   Tamil Nadu scope          +16   (india-relevant +6)
 *   affected districts        +2 each, capped +12
 *   recency                   +14 (<3h) .. 0 (>48h)
 *   corroborating sources     +3 each, capped +9
 *   primary documentation     +4
 *   expired / all-clear       x0.15   (kept out of the active banner)
 *   archived                  x0.05
 */
export function crisisPriority(p: PriorityInput): number {
  const now = p.now ?? Date.now();
  let s = 0;
  if (p.isOfficialAlert) s += 18;
  s += Math.min(p.crisisWeight, 38);
  s += Math.min(p.capWeight, 36);
  if (p.scope === "tamil-nadu") s += 16;
  else if (p.scope === "india-relevant") s += 6;
  s += Math.min(p.districtCount * 2, 12);

  const ageH = (now - Date.parse(p.publishedAt || new Date(now).toISOString())) / 3_600_000;
  if (ageH <= 3) s += 14;
  else if (ageH <= 6) s += 11;
  else if (ageH <= 12) s += 8;
  else if (ageH <= 24) s += 4;
  else if (ageH <= 48) s += 1;

  s += Math.min(p.corroboratingSources * 3, 9);
  if (p.hasPrimaryDoc) s += 4;

  if (p.lifecycle === "all-clear") s *= 0.15;
  else if (p.lifecycle === "archived") s *= 0.05;

  return Math.max(0, Math.min(100, Math.round(s)));
}

/** Non-crisis stories still get a modest priority so India/TN sections can rank. */
export function editorialPriority(p: Omit<PriorityInput, "isOfficialAlert" | "capWeight" | "crisisWeight" | "lifecycle"> & { evidenceRole: EvidenceRole }): number {
  const now = p.now ?? Date.now();
  let s = 4;
  if (p.scope === "tamil-nadu") s += 10;
  else if (p.scope === "india-relevant") s += 6;
  else if (p.scope === "india") s += 3;
  s += Math.min(p.districtCount * 2, 8);
  if (p.evidenceRole === "government-statement" || p.evidenceRole === "primary-document") s += 4;
  const ageH = (now - Date.parse(p.publishedAt || new Date(now).toISOString())) / 3_600_000;
  if (ageH <= 6) s += 8;
  else if (ageH <= 24) s += 4;
  else if (ageH <= 72) s += 1;
  s += Math.min(p.corroboratingSources * 2, 6);
  return Math.max(0, Math.min(60, Math.round(s)));
}

export function verificationFor(
  evidenceRole: EvidenceRole,
  corroboratingSources: number,
  hasOfficial: boolean,
): VerificationStatus {
  if (evidenceRole === "official-alert" || evidenceRole === "primary-document") return "official";
  if (hasOfficial && corroboratingSources >= 1) return "corroborated";
  if (corroboratingSources >= 2) return "corroborated";
  if (corroboratingSources === 1) return "single-source";
  if (evidenceRole === "developing-unverified") return "developing";
  return "single-source";
}

export const CRISIS_TYPE_LABEL: Record<CrisisType, string> = {
  cyclone: "Cyclone",
  "extreme-rain": "Extreme rainfall",
  flood: "Flood",
  "dam-reservoir-warning": "Dam / reservoir warning",
  "coastal-tsunami-warning": "Coastal / tsunami warning",
  earthquake: "Earthquake",
  landslide: "Landslide",
  "thunderstorm-lightning": "Thunderstorm / lightning",
  heatwave: "Heatwave",
  wildfire: "Wildfire / forest fire",
  "industrial-accident": "Industrial accident",
  "transport-accident": "Major transport accident",
  "public-health-warning": "Public-health warning",
  "infrastructure-outage": "Infrastructure outage",
  evacuation: "Evacuation",
  "district-emergency-notice": "District emergency notice",
};
