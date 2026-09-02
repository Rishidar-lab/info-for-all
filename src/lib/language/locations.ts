/**
 * Canonical India / Tamil Nadu location layer (v0.5, Phase 10).
 *
 * Extends the geo dictionary (`src/lib/live/geo.ts`, districts + state terms)
 * with cities, water bodies and landmarks mapped to their district, plus common
 * transliteration variants ("Trichy" → Tiruchirappalli, "Tuticorin" →
 * Thoothukudi). Used by the event-identity engine to decide whether two reports
 * are about compatible places.
 *
 * It NEVER silently collapses genuinely distinct places — neighbouring
 * districts stay distinct; a district and a city inside it are "nested", which
 * the identity engine treats as PART_OF, not SAME.
 */
import { TN_DISTRICTS } from "@/lib/live/geo";

export type PlaceType = "state" | "district" | "city" | "water-body" | "landmark" | "region";

export interface CanonicalPlace {
  canonical: string;
  type: PlaceType;
  state?: string;
  /** For a city / water body / landmark: the district it sits in (or spans). */
  district?: string;
  /** For a water body that spans several districts. */
  districts?: string[];
}

/** lowercase alias → canonical place. Built from geo.ts + the tables below. */
const ALIASES = new Map<string, CanonicalPlace>();
const add = (place: CanonicalPlace, aliases: string[]) => {
  for (const a of aliases) ALIASES.set(a.toLowerCase(), place);
};

// state
add({ canonical: "Tamil Nadu", type: "state", state: "Tamil Nadu" }, [
  "tamil nadu", "tamilnadu", "tn", "state of tamil nadu",
]);
add({ canonical: "India", type: "state" }, ["india"]);
// other Indian states — resolved ONLY so a genuine state conflict blocks a merge
for (const [name, forms] of Object.entries({
  Kerala: ["kerala"],
  Karnataka: ["karnataka"],
  "Andhra Pradesh": ["andhra pradesh", "andhra"],
  Telangana: ["telangana"],
  Maharashtra: ["maharashtra"],
  Gujarat: ["gujarat"],
  Rajasthan: ["rajasthan"],
  "Uttar Pradesh": ["uttar pradesh"],
  Uttarakhand: ["uttarakhand"],
  Bihar: ["bihar"],
  "West Bengal": ["west bengal"],
  Odisha: ["odisha", "orissa"],
  Assam: ["assam"],
  "Madhya Pradesh": ["madhya pradesh"],
  Delhi: ["delhi", "new delhi"],
  Puducherry: ["puducherry", "pondicherry"],
  Punjab: ["punjab"],
  Haryana: ["haryana"],
  Jharkhand: ["jharkhand"],
  Chhattisgarh: ["chhattisgarh"],
  "Himachal Pradesh": ["himachal pradesh"],
})) {
  add({ canonical: name, type: "state" }, forms);
}

// coarse regions — no district, but a shared specific reference
add({ canonical: "Tamil Nadu coast", type: "region", state: "Tamil Nadu" }, [
  "the coast", "coastline", "coastal areas", "tamil nadu coast", "coastal districts", "coastal belt", "along the coast",
]);
add({ canonical: "Cauvery delta", type: "region", state: "Tamil Nadu" }, [
  "cauvery delta", "delta districts", "delta region", "the delta",
]);
add({ canonical: "Western Ghats", type: "region", state: "Tamil Nadu" }, [
  "western ghats", "hill districts", "hilly areas", "ghat sections",
]);

// districts (from the geo dictionary — single source of truth)
for (const [district, forms] of Object.entries(TN_DISTRICTS)) {
  add({ canonical: district, type: "district", state: "Tamil Nadu" }, [district.toLowerCase(), ...forms]);
}

// cities / towns → their district
const CITIES: [string, string, string[]][] = [
  ["Ooty", "Nilgiris", ["ooty", "udhagamandalam", "udagamandalam"]],
  ["Coonoor", "Nilgiris", ["coonoor"]],
  ["Hosur", "Krishnagiri", ["hosur"]],
  ["Nagercoil", "Kanyakumari", ["nagercoil"]],
  ["Pollachi", "Coimbatore", ["pollachi"]],
  ["Mettupalayam", "Coimbatore", ["mettupalayam"]],
  ["Tambaram", "Chengalpattu", ["tambaram"]],
  ["Avadi", "Tiruvallur", ["avadi"]],
  ["Ambur", "Tirupathur", ["ambur"]],
  ["Karaikudi", "Sivaganga", ["karaikudi"]],
  ["Dindigul", "Dindigul", ["dindigul"]],
  ["Rameswaram", "Ramanathapuram", ["rameswaram", "rameshwaram"]],
  ["Chidambaram", "Cuddalore", ["chidambaram"]],
  ["Neyveli", "Cuddalore", ["neyveli"]],
  ["Kumbakonam", "Thanjavur", ["kumbakonam"]],
  ["Pallavaram", "Chengalpattu", ["pallavaram"]],
  ["Ukkadam", "Coimbatore", ["ukkadam"]],
  ["Perambur", "Chennai", ["perambur"]],
  ["Nungambakkam", "Chennai", ["nungambakkam"]],
  ["Meenambakkam", "Chennai", ["meenambakkam", "meenam bakkam"]],
  ["Karaikal", "Puducherry", ["karaikal"]],
  ["Cheyyar", "Tiruvannamalai", ["cheyyar"]],
];
for (const [city, district, forms] of CITIES) {
  add({ canonical: city, type: "city", state: "Tamil Nadu", district }, forms);
}

// water bodies → district(s) they most affect (for identity, a water body
// strongly implies its downstream district)
const WATER: [string, string[], string[]][] = [
  ["Mettur Dam", ["Salem"], ["mettur dam", "mettur", "stanley reservoir"]],
  ["Bhavani Dam", ["Erode"], ["bhavani dam", "bhavanisagar", "lower bhavani"]],
  ["Vaigai Dam", ["Madurai", "Theni"], ["vaigai dam", "vaigai reservoir", "vaigai"]],
  ["Amaravathi Dam", ["Tiruppur"], ["amaravathi dam", "amaravathi"]],
  ["Sathanur Dam", ["Tiruvannamalai"], ["sathanur dam", "sathanur"]],
  ["Krishnagiri Dam", ["Krishnagiri"], ["krishnagiri dam", "krishnagiri reservoir"]],
  ["Mullaperiyar Dam", ["Theni"], ["mullaperiyar", "mullai periyar"]],
  ["Cauvery", ["Salem", "Erode", "Karur", "Tiruchirappalli", "Thanjavur", "Tiruvarur", "Nagapattinam"], ["cauvery", "kaveri"]],
  ["Bhavani River", ["Erode", "Coimbatore"], ["bhavani river"]],
  ["Vaigai River", ["Madurai"], ["vaigai river"]],
  ["Tamiraparani", ["Tirunelveli", "Thoothukudi"], ["tamiraparani", "thamirabarani"]],
  ["Chembarambakkam", ["Chennai"], ["chembarambakkam"]],
  ["Poondi", ["Tiruvallur"], ["poondi"]],
  ["Red Hills", ["Chennai"], ["red hills lake", "puzhal"]],
];
for (const [name, districts, forms] of WATER) {
  add({ canonical: name, type: "water-body", state: "Tamil Nadu", districts, district: districts[0] }, forms);
}

const NORM = (s: string): string =>
  " " + s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim() + " ";

function present(hay: string, alias: string): boolean {
  if (/[a-z0-9]/.test(alias)) {
    const re = new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    return re.test(hay);
  }
  return hay.includes(alias);
}

export interface ResolvedPlace {
  place: CanonicalPlace;
  matchedAlias: string;
}

/** All canonical places referenced in a piece of English text. */
export function resolvePlaces(text: string): ResolvedPlace[] {
  const hay = NORM(text);
  const seen = new Set<string>();
  const out: ResolvedPlace[] = [];
  // longest aliases first so "mettur dam" wins over "mettur"
  for (const alias of [...ALIASES.keys()].sort((a, b) => b.length - a.length)) {
    if (present(hay, alias)) {
      const place = ALIASES.get(alias)!;
      const key = `${place.canonical}:${place.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ place, matchedAlias: alias });
      }
    }
  }
  return out;
}

/**
 * The districts a resolved place set touches (city/water body → its district).
 * A long river (Cauvery, Tamiraparani) that spans many districts is NOT expanded
 * here — it still links via its canonical name in `placeRelation`, but must not
 * flood the district index used for candidate blocking.
 */
export function districtsOf(places: ResolvedPlace[]): Set<string> {
  const out = new Set<string>();
  for (const { place } of places) {
    if (place.type === "district") out.add(place.canonical);
    else if (place.district && (place.districts?.length ?? 0) <= 3) out.add(place.district);
    if ((place.districts?.length ?? 0) <= 3) for (const d of place.districts ?? []) out.add(d);
  }
  return out;
}

export type PlaceRelation =
  | "same"
  | "same-region-only"
  | "nested"
  | "sibling"
  | "different"
  | "unknown";

const SPECIFIC = new Set<PlaceType>(["water-body", "landmark", "city"]);

/**
 * How the places in A relate to the places in B.
 *  - "same": they name the same DISTRICT (overlap) or the same SPECIFIC place
 *    (a dam / river / town) — a strong co-location signal;
 *  - "same-region-only": both name only the state / a broad region ("Tamil
 *    Nadu", "the delta") with no district — a WEAK signal, not enough to merge;
 *  - "nested": one is state/region-wide, the other a district inside it — PART_OF;
 *  - "sibling": both name districts, no overlap — different local events;
 *  - "different": an explicit conflict (different states);
 *  - "unknown": not enough place information.
 */
export function placeRelation(a: ResolvedPlace[], b: ResolvedPlace[]): PlaceRelation {
  if (a.length === 0 || b.length === 0) return "unknown";

  const statesA = new Set(a.filter((p) => p.place.type === "state").map((p) => p.place.canonical));
  const statesB = new Set(b.filter((p) => p.place.type === "state").map((p) => p.place.canonical));
  const namedStatesA = [...statesA].filter((s) => s !== "India");
  const namedStatesB = [...statesB].filter((s) => s !== "India");
  if (namedStatesA.length && namedStatesB.length && !namedStatesA.some((s) => statesB.has(s))) {
    return "different";
  }

  const dA = districtsOf(a);
  const dB = districtsOf(b);

  // exact same SPECIFIC place (a dam, a landmark, a named town). A long river
  // that spans many districts is NOT specific enough on its own.
  const isSpecific = (p: ResolvedPlace) =>
    SPECIFIC.has(p.place.type) && (p.place.districts?.length ?? 0) <= 3;
  const specA = new Set(a.filter(isSpecific).map((p) => p.place.canonical));
  for (const p of b) if (isSpecific(p) && specA.has(p.place.canonical)) return "same";

  if (dA.size && dB.size) {
    if ([...dA].some((d) => dB.has(d))) return "same";
    if ((statesA.size && !districtsExclusive(a)) || (statesB.size && !districtsExclusive(b))) return "nested";
    return "sibling";
  }
  if ((dA.size && namedStatesB.length) || (dB.size && namedStatesA.length)) return "nested";

  // regions (delta / coast / ghats) — a shared one is a specific-ish reference
  const regionA = new Set(a.filter((p) => p.place.type === "region").map((p) => p.place.canonical));
  const regionB = new Set(b.filter((p) => p.place.type === "region").map((p) => p.place.canonical));
  for (const r of regionA) if (regionB.has(r)) return "same-region-only";

  // both name only the state → weak
  if (namedStatesA.length && namedStatesB.length) return "same-region-only";
  return "unknown";
}

function districtsExclusive(places: ResolvedPlace[]): boolean {
  return places.some((p) => p.place.type === "district");
}
