/**
 * Structured EVENT SIGNATURE (v0.5, Phase 2).
 *
 * Text overlap alone is too weak for paraphrases and useless across scripts.
 * A signature reduces a headline (+ excerpt) to structured, language-neutral
 * features so "Schools shut in Chennai amid heavy rain" and "Educational
 * institutions in Chennai to remain closed Tuesday" can be recognised as the
 * same event even though their tokens barely overlap.
 */
import { strongEntities } from "@/data/entity-aliases";
import { resolvePlaces, districtsOf, type ResolvedPlace } from "@/lib/language/locations";
import { englishConceptTokens } from "@/lib/semantic/concepts";
import { detectActions, type ActionFamily } from "@/lib/semantic/actions";
import { tamilConceptTokens, resolveTamilDate } from "@/lib/language/tamil";
import { dictionaryGloss } from "@/lib/language/translation";
import { hashEmbed } from "@/lib/semantic/embeddings";
import { parseQuantities, type Quantity } from "@/lib/claims/quantity";
import { titleTokens } from "@/lib/live/text";

export interface SignatureInput {
  title: string;
  excerpt?: string;
  publishedAt: string;
  language: "ta" | "en" | "unknown";
  /** From geo classification, when available (cluster.ts passes it). */
  districts?: string[];
  crisisType?: string;
}

export interface EventSignature {
  language: "ta" | "en" | "unknown";
  headline: string;
  publishedAt: string;
  /** Strong (non-generic) canonical entities. */
  entities: Set<string>;
  places: ResolvedPlace[];
  districts: Set<string>;
  /** Language-neutral concept tokens (shared vocab with the Tamil lexicon). */
  concepts: Set<string>;
  actions: Set<ActionFamily>;
  crisisType?: string;
  quantities: Quantity[];
  /** Resolved calendar date the event is about, if the text states one. */
  eventDate?: string;
  /** Stemmed content tokens for the lexical signal. */
  lexicalTerms: Set<string>;
  embedding: number[];
  /** For Tamil inputs: the rough English gloss used to widen concept/action detection. */
  gloss?: string;
  /** The headline is primarily a REACTION to an event (welcome / oppose / protest), not the event. */
  isReaction: boolean;
  /** Rough incident sub-type when the story is an accident/disaster ("fire", "collapse", "capsize"). */
  incidentType?: string;
}

const REACTION_RE =
  /\b(welcome[sd]?|hail[sed]*|laud[sed]*|oppos\w+|protest\w*|slam\w*|criticis\w+|criticiz\w+|condemn\w+|demand[sed]*|urge[sd]?|appeal[sed]*|flay\w*|decr(?:y|ies|ied)|jibe[sd]?|takes? a dig|hits? out)\b/i;
const TAMIL_REACTION_RE = /வரவேற்|மகிழ்ச்சி|மகிழ்ந்|கண்டன|எதிர்ப்பு தெரிவி|போராட்ட|கண்டித்|வலியுறுத்த|குற்றம்சாட்ட/;

const INCIDENT_RE: [string, RegExp][] = [
  ["fire", /\b(fire|blaze|gutted|caught fire)\b|தீ விபத்|தீ பரவ/i],
  ["collapse", /\b(collapse[sd]?|caved in|came down|razed)\b|இடிந்து|சரிந்து விழ/i],
  ["capsize", /\b(capsiz\w+|sank|drowned|boat mishap)\b|படகு கவிழ|மூழ்க/i],
  ["blast", /\b(blast|explosion|exploded|detonat\w+)\b|வெடி விபத்|வெடித்/i],
  ["stampede", /\b(stampede|crush)\b|நெரிசல்/i],
  ["road-accident", /\b(road accident|car crash|lorry|bus overturn\w*|vehicle collision)\b|சாலை விபத்|வாகன விபத்/i],
];

const WEEKDAY_RE = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const REL_DAY_RE = /\b(today|tonight|tomorrow|yesterday)\b/i;

function resolveEnglishDate(text: string, publishedAt: string): string | undefined {
  const base = new Date(publishedAt);
  if (Number.isNaN(base.getTime())) return undefined;
  const rel = REL_DAY_RE.exec(text.toLowerCase())?.[1];
  if (rel) {
    const off = rel === "yesterday" ? -1 : rel === "tomorrow" ? 1 : 0;
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + off);
    return d.toISOString().slice(0, 10);
  }
  const wd = WEEKDAY_RE.exec(text.toLowerCase())?.[1];
  if (wd) {
    const target = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(wd);
    // nearest occurrence within ±3 days of publication
    for (let delta = 0; delta <= 3; delta++) {
      for (const s of [delta, -delta]) {
        const d = new Date(base);
        d.setUTCDate(d.getUTCDate() + s);
        if (d.getUTCDay() === target) return d.toISOString().slice(0, 10);
      }
    }
  }
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return undefined;
}

const CRISIS_EVENT_TYPE: Record<string, string> = {
  "extreme-rain": "rain",
  flood: "flood",
  "dam-reservoir-warning": "dam",
  cyclone: "cyclone",
  "coastal-tsunami-warning": "coastal",
  earthquake: "earthquake",
  landslide: "landslide",
  "thunderstorm-lightning": "thunderstorm",
  heatwave: "heatwave",
  "industrial-accident": "industrial-accident",
  "transport-accident": "transport-accident",
};

export function buildSignature(input: SignatureInput): EventSignature {
  const full = `${input.title}. ${input.excerpt ?? ""}`.trim();
  const isTamil = input.language === "ta";

  let concepts: Set<string>;
  let places: ResolvedPlace[];
  const districts = new Set<string>(input.districts ?? []);
  let actions: Set<ActionFamily>;
  let eventDate: string | undefined;
  let gloss: string | undefined;

  if (isTamil) {
    const ta = tamilConceptTokens(full);
    gloss = dictionaryGloss(full);
    concepts = new Set([...ta.concepts, ...englishConceptTokens(gloss)]);
    // Tamil places → resolve their English canonical through the location layer
    places = resolvePlaces([...ta.places, ...ta.orgs].join(". ") + ". " + gloss);
    for (const d of districtsOf(places)) districts.add(d);
    actions = new Set([...detectActions(gloss), ...detectActions(conceptGlossForActions(ta.concepts))]);
    const td = resolveTamilDate(full, input.publishedAt);
    eventDate = td?.iso;
  } else {
    concepts = englishConceptTokens(full);
    places = resolvePlaces(full);
    for (const d of districtsOf(places)) districts.add(d);
    actions = detectActions(full);
    eventDate = resolveEnglishDate(full, input.publishedAt);
  }

  const crisisType = input.crisisType;
  if (crisisType && CRISIS_EVENT_TYPE[crisisType]) concepts.add(CRISIS_EVENT_TYPE[crisisType]);

  const lexicalTerms = new Set(titleTokens(input.title));
  const embedding = hashEmbed(`${input.title} ${[...concepts].join(" ")} ${[...places.map((p) => p.place.canonical)].join(" ")}`);
  // A headline is a REACTION only when it carries a reaction cue AND does not
  // also describe a concrete action (a closure, a release, an order). "Farmers
  // welcome the release" is a reaction; "Dam opened; farmers welcome it" is the
  // event.
  const CONCRETE: ActionFamily[] = [
    "close", "reopen", "approve", "announce", "evacuate", "release-water", "warn",
    "impose-order", "lift-order", "suspend", "resume", "rescue", "deploy", "arrest",
  ];
  const hasConcrete = [...actions].some((f) => CONCRETE.includes(f));
  const reactionCue = REACTION_RE.test(input.title.split(/[;:—-]/)[0] ?? input.title) || (isTamil && TAMIL_REACTION_RE.test(full));
  const isReaction = reactionCue && !hasConcrete;
  const incidentType = INCIDENT_RE.find(([, re]) => re.test(full))?.[0];

  return {
    language: input.language,
    headline: input.title,
    publishedAt: input.publishedAt,
    entities: isTamil ? strongEntities(full + " " + (gloss ?? "")) : strongEntities(full),
    places,
    districts,
    concepts,
    actions,
    crisisType,
    quantities: parseQuantities(full),
    eventDate,
    lexicalTerms,
    embedding,
    gloss,
    isReaction,
    incidentType,
  };
}

/** Concept tokens → words a detector can match ("closure" → "closed"). */
function conceptGlossForActions(concepts: Set<string>): string {
  const m: Record<string, string> = {
    closure: "closed", holiday: "declared a holiday", evacuation: "evacuation ordered",
    rescue: "rescued", release: "water released", warning: "warning issued", alert: "alert issued",
    red: "red alert issued", orange: "orange alert issued", death: "killed", injury: "injured",
    "section-144": "section 144 imposed", announcement: "announced", order: "ordered",
    "power-cut": "power cut", ban: "banned", "power": "power cut", cyclone: "cyclone warning",
    flood: "flooded", rain: "heavy rain", "heavy-rain": "heavy rain warning", camp: "relief camp",
    "traffic": "traffic disrupted", rail: "trains suspended", flight: "flights suspended",
    disruption: "services suspended", "ndrf-teams": "ndrf teams deployed", landslide: "landslide",
    festival: "festival", fire: "fire broke out",
  };
  return [...concepts].map((c) => m[c] ?? "").filter(Boolean).join(". ");
}
