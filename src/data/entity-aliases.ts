/**
 * Canonical entity registry (v0.5, Phase 9 / 12).
 *
 * Two entities are "the same" if they resolve to the same canonical name. This
 * exists so "Greater Chennai Corporation" and "GCC", or "தமிழ்நாடு அரசு" and
 * "Tamil Nadu government", stop being treated as distinct.
 *
 * CRITICAL: generic role words — "government", "police", "minister",
 * "officials", "the collector" — are marked `weak`. A weak entity match is NOT
 * evidence that two reports are about the same event. Only a specific named
 * body / person / place carries linking signal.
 *
 * Sources: the feed registry (`src/data/feeds.ts`), the geo dictionary, and the
 * Tamil place/org tables in `src/lib/language/tamil.ts`. No name is invented.
 */

export type EntityKind = "org" | "person" | "body" | "place" | "generic";

export interface CanonicalEntity {
  canonical: string;
  kind: EntityKind;
  aliases: string[];
  /** Tamil-script forms, when they occur in feeds. */
  tamil?: string[];
  /** true ⇒ too generic to identify an event on its own. */
  weak?: boolean;
}

export const ENTITIES: CanonicalEntity[] = [
  // ── weather / disaster bodies ──────────────────────────────────────
  {
    canonical: "IMD",
    kind: "org",
    aliases: [
      "imd", "india meteorological department", "meteorological department",
      "regional meteorological centre", "rmc chennai", "regional met centre",
      "weather office", "met department", "met office",
    ],
    tamil: ["வானிலை ஆய்வு மையம்", "இந்திய வானிலை ஆய்வு மையம்", "மண்டல வானிலை ஆய்வு மையம்"],
  },
  {
    canonical: "NDMA",
    kind: "org",
    aliases: ["ndma", "national disaster management authority", "sachet", "ndma sachet"],
    tamil: ["தேசிய பேரிடர் மேலாண்மை ஆணையம்"],
  },
  { canonical: "NDRF", kind: "org", aliases: ["ndrf", "national disaster response force"] },
  { canonical: "SDRF", kind: "org", aliases: ["sdrf", "state disaster response force"] },
  {
    canonical: "TNSDMA",
    kind: "org",
    aliases: ["tnsdma", "tn sdma", "state disaster management authority", "tamil nadu state disaster management", "tn sdrf"],
  },
  { canonical: "INCOIS", kind: "org", aliases: ["incois", "indian national centre for ocean information services"] },
  { canonical: "Central Water Commission", kind: "org", aliases: ["central water commission", "cwc"] },

  // ── civic bodies ──────────────────────────────────────────────────
  {
    canonical: "Greater Chennai Corporation",
    kind: "body",
    aliases: ["greater chennai corporation", "gcc", "chennai corporation", "chennai city corporation", "corporation of chennai"],
    tamil: ["பெருநகர சென்னை மாநகராட்சி", "சென்னை மாநகராட்சி"],
  },
  { canonical: "CMWSSB", kind: "body", aliases: ["cmwssb", "metrowater", "metro water", "chennai metrowater"] },
  { canonical: "TANGEDCO", kind: "body", aliases: ["tangedco", "tneb", "electricity board", "tamil nadu electricity board"] },
  { canonical: "CMDA", kind: "body", aliases: ["cmda", "chennai metropolitan development authority"] },
  { canonical: "Chennai Metro Rail", kind: "body", aliases: ["chennai metro rail", "cmrl", "chennai metro"] },
  { canonical: "Southern Railway", kind: "body", aliases: ["southern railway", "indian railways", "railways"] },

  // ── courts / institutions ─────────────────────────────────────────
  { canonical: "Madras High Court", kind: "body", aliases: ["madras high court", "madras hc", "high court of madras"] },
  { canonical: "Supreme Court", kind: "body", aliases: ["supreme court", "supreme court of india", "apex court"] },
  { canonical: "Tamil Nadu Assembly", kind: "body", aliases: ["tamil nadu assembly", "state assembly", "legislative assembly"] },
  { canonical: "CWMA", kind: "body", aliases: ["cwma", "cauvery water management authority"] },
  { canonical: "Anna University", kind: "org", aliases: ["anna university"] },

  // ── governments (specific, still not per-event on their own) ───────
  {
    canonical: "Tamil Nadu government",
    kind: "body",
    aliases: ["tamil nadu government", "government of tamil nadu", "state government", "tn government"],
    tamil: ["தமிழ்நாடு அரசு", "மாநில அரசு", "தமிழக அரசு"],
    weak: true,
  },
  {
    canonical: "Union government",
    kind: "body",
    aliases: ["union government", "central government", "government of india", "the centre", "modi government"],
    weak: true,
  },
  { canonical: "district administration", kind: "body", aliases: ["district administration", "district collectorate", "collectorate"], tamil: ["மாவட்ட நிர்வாகம்"], weak: true },

  // ── parties ───────────────────────────────────────────────────────
  { canonical: "DMK", kind: "org", aliases: ["dmk", "dravida munnetra kazhagam"] },
  { canonical: "AIADMK", kind: "org", aliases: ["aiadmk", "all india anna dravida munnetra kazhagam"] },
  { canonical: "BJP", kind: "org", aliases: ["bjp", "bharatiya janata party"] },
  { canonical: "Congress", kind: "org", aliases: ["congress", "inc", "indian national congress"] },
  { canonical: "TVK", kind: "org", aliases: ["tvk", "tamilaga vettri kazhagam"] },
  { canonical: "NTK", kind: "org", aliases: ["ntk", "naam tamilar katchi"] },
  { canonical: "VCK", kind: "org", aliases: ["vck", "viduthalai chiruthaigal katchi"] },
  { canonical: "PMK", kind: "org", aliases: ["pmk", "pattali makkal katchi"] },

  // ── generic role words — WEAK, never an event identifier alone ─────
  { canonical: "government", kind: "generic", aliases: ["government", "govt", "the state", "authorities"], weak: true },
  { canonical: "police", kind: "generic", aliases: ["police", "city police", "law and order"], tamil: ["காவல்துறை", "போலீஸ்"], weak: true },
  { canonical: "minister", kind: "generic", aliases: ["minister", "the minister", "state minister"], tamil: ["அமைச்சர்"], weak: true },
  { canonical: "chief minister", kind: "generic", aliases: ["chief minister", "cm", "the cm"], tamil: ["முதல்வர்", "முதலமைச்சர்"], weak: true },
  { canonical: "collector", kind: "generic", aliases: ["collector", "district collector", "the collector"], weak: true },
  { canonical: "officials", kind: "generic", aliases: ["officials", "officers", "senior officials"], weak: true },
  { canonical: "opposition", kind: "generic", aliases: ["opposition", "the opposition"], weak: true },
  { canonical: "fishermen", kind: "generic", aliases: ["fishermen", "fisherfolk", "fisher community"], tamil: ["மீனவர்கள்", "மீனவர்"], weak: true },
  { canonical: "farmers", kind: "generic", aliases: ["farmers", "agriculturists", "ryots"], tamil: ["விவசாயிகள்"], weak: true },
  { canonical: "residents", kind: "generic", aliases: ["residents", "locals", "the public"], weak: true },
];

// ── resolution ─────────────────────────────────────────────────────────

const BY_ALIAS = new Map<string, CanonicalEntity>();
for (const e of ENTITIES) {
  for (const a of e.aliases) BY_ALIAS.set(a.toLowerCase(), e);
}
const TAMIL_INDEX: [string, CanonicalEntity][] = [];
for (const e of ENTITIES) for (const t of e.tamil ?? []) TAMIL_INDEX.push([t.normalize("NFC"), e]);

function wordPresent(hay: string, alias: string): boolean {
  const re = new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
  return re.test(hay);
}

export interface ResolvedEntity {
  entity: CanonicalEntity;
  matchedAlias: string;
}

/** Canonical entities referenced in a piece of text (English + Tamil script). */
export function resolveEntities(text: string): ResolvedEntity[] {
  const hay = " " + text.toLowerCase().replace(/\s+/g, " ").trim() + " ";
  const flat = text.normalize("NFC");
  const seen = new Set<string>();
  const out: ResolvedEntity[] = [];
  for (const alias of [...BY_ALIAS.keys()].sort((a, b) => b.length - a.length)) {
    if (wordPresent(hay, alias)) {
      const e = BY_ALIAS.get(alias)!;
      if (!seen.has(e.canonical)) {
        seen.add(e.canonical);
        out.push({ entity: e, matchedAlias: alias });
      }
    }
  }
  for (const [ta, e] of TAMIL_INDEX) {
    if (flat.includes(ta) && !seen.has(e.canonical)) {
      seen.add(e.canonical);
      out.push({ entity: e, matchedAlias: ta });
    }
  }
  return out;
}

/** Strong (non-weak) canonical entity names in a text — the ones that identify an event. */
export function strongEntities(text: string): Set<string> {
  return new Set(resolveEntities(text).filter((r) => !r.entity.weak).map((r) => r.entity.canonical));
}
