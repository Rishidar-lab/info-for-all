/**
 * Local-impact model (v0.9, Phase K/L).
 *
 * For a *Tamil Nadu* event, what on the ground is actually affected — which
 * districts and towns, which kinds of infrastructure or service, which named
 * institutions — and in what way (closure / disruption / damage / displacement /
 * restriction / relief / advisory).
 *
 * EXTRACTIVE and deterministic. It never invents an impact. The unit of
 * evidence is an *impact statement*: a sentence-like segment that names BOTH a
 * kind of impact (a verb) AND something it fell on (an infrastructure noun, a
 * service, or a named institution). A segment with only a noun ("the fishing
 * community", "the airport") or only a verb ("cancelled the meeting") does not
 * count — that is how personnel actions ("headmaster suspended") and routine
 * announcements ("sanctioned for road works") are kept out.
 *
 * `scale` is the geographic spread of the *demonstrated* impact, derived from
 * the count of districts named in impact statements — never asserted, and never
 * inflated from a forecast/warning polygon that lists many districts but reports
 * nothing as actually hit.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { resolveDistricts, SUBUNIT_TO_DISTRICT } from "./districts";

export type ImpactKind =
  | "closure"
  | "disruption"
  | "damage"
  | "displacement"
  | "restriction"
  | "relief"
  | "advisory";

export interface LocalImpactStatement {
  /** the sentence-like fragment the impact was read from */
  text: string;
  kinds: ImpactKind[];
  infrastructure: string[];
  districts: string[];
}

export interface LocalImpact {
  affectedDistricts: string[];
  affectedTowns: string[];
  /** kinds of infrastructure / service named as affected */
  affectedInfrastructure: string[];
  /** specific named institutions (a hospital, a university, a port) */
  affectedInstitutions: string[];
  impactKinds: ImpactKind[];
  scale: "none" | "localised" | "city-wide" | "multi-district" | "state-wide";
  /** the impact statements, each backed by a phrase in the reporting */
  statements: LocalImpactStatement[];
}

const EMPTY: LocalImpact = {
  affectedDistricts: [],
  affectedTowns: [],
  affectedInfrastructure: [],
  affectedInstitutions: [],
  impactKinds: [],
  scale: "none",
  statements: [],
};

const INFRA: [RegExp, string][] = [
  [/\b(schools?|colleges?|anganwadis?|board exams?|public exams?)\b/i, "schools / education"],
  [/\b(bus(?:es)?|bus services?|omni ?bus|mtc|setc|town bus)\b/i, "bus services"],
  [/\b(train services?|trains?|railways?|suburban services?|emu services?|express trains?)\b/i, "rail services"],
  [/\b(metro rail|metro services?|cmrl)\b/i, "metro"],
  [/\b(flights?|air services?|airport|air traffic|runway operations?)\b/i, "air travel"],
  [/\b(power (?:cut|supply|outage|shutdown)|electricity supply|feeder line|substation|tangedco supply)\b/i, "power supply"],
  [/\b(water supply|drinking water|piped water supply|cmwssb|metro ?water)\b/i, "water supply"],
  [/\b(hospitals?|primary health centres?|phcs?|govt\.? hospital|medical college hospital)\b/i, "health facilities"],
  [/\b(highways?|national highway|nh ?\d|state highway|arterial roads?|the roads?|link road|the bridge|culvert|subway)\b/i, "roads / bridges"],
  [/\b(fishing (?:ban|activity|operations?)|fish landing centre|country boats?|fishing boats?|the harbour)\b/i, "fisheries"],
  [/\b(dam|reservoir|barrage|the shutters|surplus water|check ?dam|the tank|irrigation tank)\b/i, "dams / reservoirs / tanks"],
  [/\b(port operations?|container terminal|cargo movement|kamarajar port|chidambaranar port)\b/i, "ports"],
  [/\b(standing crops?|paddy crop|farmland|ayacut|the crop|horticulture crops?)\b/i, "agriculture"],
  [/\b(mobile network|internet services?|telecom services?|broadband services?)\b/i, "telecom"],
];

/** verb → kind. Deliberately without bare "suspended"/"transferred" (personnel). */
const KINDS: [RegExp, ImpactKind][] = [
  [/\b(shut(?:\s+down)?|closed|closure|holiday (?:was )?declared|called off|not ply|downed shutters|kept shut)\b/i, "closure"],
  [/\b(cancell?ed|suspend(?:ed|s)?|curtailed|withdrawn)\b/i, "closure"],
  [/\b(disrupt\w+|delay\w+|hit services|badly affected|stranded|snapped|interrupt\w+|held up|diverted|came to a halt|slowed to)\b/i, "disruption"],
  [/\b(damaged?|destroyed|collapsed|washed away|inundated|submerged|breach(?:ed|es)?|uprooted|caved in|gutted)\b/i, "damage"],
  [/\b(evacuat\w+|displaced|shifted to (?:camps?|relief)|relief camps? (?:were )?(?:opened|set up)|rendered homeless|marooned)\b/i, "displacement"],
  [/\b(section 144|prohibitory orders?|imposed a ban|banned|curfew|clamped restrictions?|no-entry|barricaded)\b/i, "restriction"],
  [/\b(relief (?:was )?(?:distributed|provided)|compensation announced|ex-gratia|rescued|relief materials?|rations? (?:were )?distributed)\b/i, "relief"],
  [/\b(advisory (?:was )?issued|issued an advisory|alert (?:was )?sounded|warned residents|cautioned (?:the )?public|asked (?:people|residents) to (?:stay|avoid))\b/i, "advisory"],
];

/** e.g. "Rajiv Gandhi Government General Hospital", "Anna University", "Chennai Port". */
const INSTITUTION_RE =
  /\b([A-Z][A-Za-z.&]+(?:\s+[A-Z][A-Za-z.&]+){1,5}\s+(?:University|College|Hospital|Port|Airport|Corporation|Institute|Museum|Stadium|Dam|Reservoir|Railway Station|Bus Terminus|Secretariat|Collectorate))\b/g;

/** A personnel action ("headmaster suspended", "collector transferred") is not a closure. */
const PERSON_TITLE =
  /\b(headmaster|head ?master|hm|principal|teachers?|officers?|officials?|ministers?|mlas?|mps?|employees?|staff|doctors?|constables?|inspectors?|chairman|chairperson|directors?|secretary|collector|tahsildar|superintendent|warden|clerk)\b/i;
const PERSONNEL_VERB = /\b(suspend(?:ed|s)?|transferred?|dismissed?|removed?|reinstated?|placed under suspension)\b/i;

/** A ruling/order that *removes* a restriction is not itself a restriction. */
const RESTRICTION_LIFTED =
  /\b(withdr\w+|lift\w+|revok\w+|relax\w+|eas\w+|scrapp?\w+|struck down|set aside|quashed)\s+(?:the\s+|an?\s+)?(?:order|ban|restriction|prohibition|curfew|prohibitory)/i;

function splitSegments(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\s+[·—–|]\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
}

function titleCaseTown(sub: string): string {
  return sub.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function assessLocalImpact(cluster: LiveCluster, articles: LiveArticle[]): LocalImpact {
  const text = [cluster.title, ...articles.map((a) => `${a.title}. ${a.excerpt ?? ""}`)].join("  ·  ");
  const segments = splitSegments(text);

  const statements: LocalImpactStatement[] = [];
  const districts = new Set<string>();
  const towns = new Set<string>();
  const infraAll = new Set<string>();
  const kindsAll = new Set<ImpactKind>();

  for (const seg of segments) {
    const infra: string[] = [];
    for (const [re, label] of INFRA) if (re.test(seg)) infra.push(label);

    // "headmaster suspended", "collector transferred" — a personnel action, not
    // a service closure, unless the sentence also names a service being stopped.
    const personnelOnly =
      PERSON_TITLE.test(seg) &&
      PERSONNEL_VERB.test(seg) &&
      !/\b(services?|classes?|operations?|traffic|trains?|buses)\b/i.test(seg);
    const restrictionLifted = RESTRICTION_LIFTED.test(seg);

    const kinds: ImpactKind[] = [];
    for (const [re, kind] of KINDS) {
      if (!re.test(seg)) continue;
      if (kind === "closure" && personnelOnly) continue;
      if (kind === "restriction" && restrictionLifted) continue;
      kinds.push(kind);
    }

    // An impact statement needs a kind AND something it fell on. For the
    // ambiguous verbs (closure / disruption / restriction / advisory) that
    // "something" must be a named infrastructure or institution. The specific
    // verbs — damage, displacement, relief — describe a physical/human impact
    // that stands on its own ("a wall collapsed", "500 were evacuated").
    const institutionsHere = [...seg.matchAll(INSTITUTION_RE)].map((m) => m[1].trim());
    const hasObject = infra.length > 0 || institutionsHere.length > 0;
    const STANDALONE = new Set<ImpactKind>(["damage", "displacement", "relief"]);
    const keptKinds = hasObject ? kinds : kinds.filter((k) => STANDALONE.has(k));
    if (keptKinds.length === 0) continue;

    const segDistricts = new Set<string>();
    const low = seg.toLowerCase();
    for (const [sub, dist] of Object.entries(SUBUNIT_TO_DISTRICT)) {
      if (low.includes(sub)) {
        towns.add(titleCaseTown(sub));
        segDistricts.add(dist);
      }
    }
    for (const d of resolveDistricts(seg)) segDistricts.add(d.district);

    for (const d of segDistricts) districts.add(d);
    for (const i of infra) infraAll.add(i);
    for (const k of keptKinds) kindsAll.add(k);

    statements.push({
      text: seg.length > 180 ? `${seg.slice(0, 177)}…` : seg,
      kinds: keptKinds,
      infrastructure: infra,
      districts: [...segDistricts].sort(),
    });
  }

  if (statements.length === 0) return EMPTY;

  // districts from the cluster geo, only once an impact is demonstrated
  for (const d of cluster.districts) districts.add(d);

  const institutions = new Set<string>();
  for (const s of statements)
    for (const m of s.text.matchAll(INSTITUTION_RE))
      if (m[1].split(/\s+/).length >= 2) institutions.add(m[1].trim());

  const dCount = districts.size;
  const explicitStateWide =
    /\b(state-?wide|across (?:the )?state|all (?:38 )?districts of tamil nadu|throughout tamil nadu|entire state)\b/i.test(
      text,
    );
  const explicitCityWide = /\b(city-wide|citywide|across (?:the city|chennai)|entire city|all parts of chennai)\b/i.test(
    text,
  );

  const scale: LocalImpact["scale"] = explicitStateWide
    ? "state-wide"
    : dCount >= 5
      ? "state-wide"
      : dCount >= 3
        ? "multi-district"
        : dCount === 2
          ? "multi-district"
          : explicitCityWide
            ? "city-wide"
            : "localised";

  return {
    affectedDistricts: [...districts].sort(),
    affectedTowns: [...towns].sort(),
    affectedInfrastructure: [...infraAll].sort(),
    affectedInstitutions: [...institutions].slice(0, 6),
    impactKinds: [...kindsAll],
    scale,
    statements: statements.slice(0, 6),
  };
}
