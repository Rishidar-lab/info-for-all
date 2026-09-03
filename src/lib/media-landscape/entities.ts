/**
 * Political-entity registry for observed-coverage analysis (v0.10).
 *
 * These are the entities IFFA tracks per-publisher coverage of. The list is NOT
 * a left/right spectrum — Indian / Tamil Nadu politics is not reducible to that.
 * Each entity is just a named actor whose coverage IFFA observes. New entities
 * are added as they are actually encountered in the corpus.
 */
export type PoliticalEntityKind = "government" | "party" | "office-holder" | "institution" | "alliance";

export interface PoliticalEntity {
  id: string;
  name: string;
  kind: PoliticalEntityKind;
  /** Case-insensitive aliases/patterns that identify this entity in text. */
  aliases: string[];
  /** Which government this entity currently leads/controls, for stance-axis selection. */
  incumbentOf?: "tamil-nadu" | "union";
}

export const POLITICAL_ENTITIES: PoliticalEntity[] = [
  {
    id: "tn-government",
    name: "Tamil Nadu Government",
    kind: "government",
    aliases: ["tamil nadu government", "tn government", "state government", "tn govt", "state cabinet", "தமிழ்நாடு அரசு", "மாநில அரசு"],
    incumbentOf: "tamil-nadu",
  },
  {
    id: "union-government",
    name: "Union Government",
    kind: "government",
    aliases: ["union government", "centre", "central government", "govt of india", "government of india", "modi government", "the centre", "மத்திய அரசு", "ஒன்றிய அரசு"],
    incumbentOf: "union",
  },
  { id: "dmk", name: "DMK", kind: "party", aliases: ["dmk", "dravida munnetra kazhagam", "தி.மு.க", "திமுக"] },
  { id: "aiadmk", name: "AIADMK", kind: "party", aliases: ["aiadmk", "all india anna dravida munnetra kazhagam", "அ.தி.மு.க", "அதிமுக"] },
  { id: "bjp", name: "BJP", kind: "party", aliases: ["bjp", "bharatiya janata party", "பா.ஜ.க", "பாஜக"] },
  { id: "congress", name: "Congress", kind: "party", aliases: ["congress", "inc", "indian national congress", "காங்கிரஸ்"] },
  { id: "pmk", name: "PMK", kind: "party", aliases: ["pmk", "pattali makkal katchi", "பா.ம.க", "பாமக"] },
  { id: "vck", name: "VCK", kind: "party", aliases: ["vck", "viduthalai chiruthaigal katchi", "வி.சி.க", "விசிக"] },
  { id: "ntk", name: "NTK", kind: "party", aliases: ["ntk", "naam tamilar katchi", "நா.த.க", "நாம் தமிழர் கட்சி"] },
  { id: "tvk", name: "TVK", kind: "party", aliases: ["tvk", "tamilaga vettri kazhagam", "vijay's party", "த.வெ.க", "தமிழக வெற்றிக் கழகம்"] },
  { id: "cpi-m", name: "CPI(M)", kind: "party", aliases: ["cpi(m)", "cpm", "communist party of india (marxist)", "மார்க்சிஸ்ட்"] },
  { id: "cpi", name: "CPI", kind: "party", aliases: ["cpi", "communist party of india"] },
  { id: "mdmk", name: "MDMK", kind: "party", aliases: ["mdmk", "marumalarchi dravida munnetra kazhagam"] },
  { id: "dmdk", name: "DMDK", kind: "party", aliases: ["dmdk", "desiya murpokku dravida kazhagam"] },
  { id: "tn-cm", name: "Tamil Nadu Chief Minister", kind: "office-holder", aliases: ["chief minister", "tn cm", "cm stalin", "cm m k stalin", "cm mk stalin", "முதல்வர்", "முதலமைச்சர்"], incumbentOf: "tamil-nadu" },
  { id: "tn-governor", name: "Tamil Nadu Governor", kind: "office-holder", aliases: ["governor", "raj bhavan", "tamil nadu governor", "ஆளுநர்"] },
  { id: "tn-assembly", name: "Tamil Nadu Assembly", kind: "institution", aliases: ["tamil nadu assembly", "state assembly", "legislative assembly", "சட்டப்பேரவை"] },
  { id: "madras-hc", name: "Madras High Court", kind: "institution", aliases: ["madras high court", "madurai bench", "மெட்ராஸ் உயர் நீதிமன்றம்"] },
  { id: "supreme-court", name: "Supreme Court", kind: "institution", aliases: ["supreme court", "உச்ச நீதிமன்றம்"] },
  { id: "election-commission", name: "Election Commission", kind: "institution", aliases: ["election commission", "eci", "தேர்தல் ஆணையம்"] },
];

const ALIAS_INDEX: { re: RegExp; entity: PoliticalEntity }[] = POLITICAL_ENTITIES.flatMap((e) =>
  e.aliases.map((a) => ({
    re: new RegExp(`(^|[^\\p{L}])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu"),
    entity: e,
  })),
);

/** Entities named in a piece of text, most-specific first. */
export function entitiesIn(text: string): PoliticalEntity[] {
  const seen = new Map<string, PoliticalEntity>();
  for (const { re, entity } of ALIAS_INDEX) if (re.test(text)) seen.set(entity.id, entity);
  return [...seen.values()];
}

/** The dominant political entity of a story: most cluster-articles that name it. */
export function primaryEntity(headlines: string[]): PoliticalEntity | undefined {
  const count = new Map<string, { e: PoliticalEntity; n: number }>();
  for (const h of headlines) {
    for (const e of entitiesIn(h)) {
      const c = count.get(e.id) ?? { e, n: 0 };
      c.n++;
      count.set(e.id, c);
    }
  }
  const ranked = [...count.values()].sort((a, b) => b.n - a.n);
  return ranked[0]?.e;
}

export function entityById(id: string): PoliticalEntity | undefined {
  return POLITICAL_ENTITIES.find((e) => e.id === id);
}
