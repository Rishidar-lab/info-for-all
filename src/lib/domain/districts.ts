/**
 * First-class Tamil Nadu district recognition (v0.7, Phase C / H).
 *
 * Extends the geo dictionary (`src/lib/live/geo.ts`, English district aliases +
 * state terms) with a Tamil-script name for every one of the 38 districts, and a
 * single resolver used by both the geo classifier and the event-identity
 * signature. English aliases stay in `geo.ts` (one source of truth); this file
 * adds the Tamil half and the combined lookup.
 *
 * Tamil matching is substring-based (Tamil has no ASCII word breaks), so an
 * inflected form — சென்னையில், கடலூரில் — still contains the base name and
 * resolves correctly. The base forms below are therefore sufficient.
 */
import { TN_DISTRICTS } from "@/lib/live/geo";
import { normalizeTamilToken, tamilLooseEqual } from "@/lib/language/tamil";

export { TN_DISTRICTS };

/** Canonical English name → Tamil-script forms (base + widely used alternates). */
export const TN_DISTRICT_TAMIL: Record<string, string[]> = {
  Ariyalur: ["அரியலூர்"],
  Chengalpattu: ["செங்கல்பட்டு", "செங்கல்பட்டு மாவட்டம்"],
  Chennai: ["சென்னை", "மெட்ராஸ்"],
  Coimbatore: ["கோயம்புத்தூர்", "கோவை"],
  Cuddalore: ["கடலூர்"],
  Dharmapuri: ["தர்மபுரி"],
  Dindigul: ["திண்டுக்கல்"],
  Erode: ["ஈரோடு"],
  Kallakurichi: ["கள்ளக்குறிச்சி"],
  Kanchipuram: ["காஞ்சிபுரம்", "காஞ்சி"],
  Kanyakumari: ["கன்னியாகுமரி", "குமரி", "நாகர்கோவில்"],
  Karur: ["கரூர்"],
  Krishnagiri: ["கிருஷ்ணகிரி", "கிருட்டிணகிரி", "ஓசூர்"],
  Madurai: ["மதுரை"],
  Mayiladuthurai: ["மயிலாடுதுறை"],
  Nagapattinam: ["நாகப்பட்டினம்", "நாகை"],
  Namakkal: ["நாமக்கல்"],
  Nilgiris: ["நீலகிரி", "உதகமண்டலம்", "ஊட்டி", "குன்னூர்"],
  Perambalur: ["பெரம்பலூர்"],
  Pudukkottai: ["புதுக்கோட்டை"],
  Ramanathapuram: ["ராமநாதபுரம்", "இராமநாதபுரம்", "ராமநாதபுரம் மாவட்டம்"],
  Ranipet: ["ராணிப்பேட்டை"],
  Salem: ["சேலம்"],
  Sivaganga: ["சிவகங்கை", "சிவகங்கா"],
  Tenkasi: ["தென்காசி"],
  Thanjavur: ["தஞ்சாவூர்", "தஞ்சை"],
  Theni: ["தேனி"],
  Thoothukudi: ["தூத்துக்குடி", "தூத்துக்குடீ"],
  Tiruchirappalli: ["திருச்சிராப்பள்ளி", "திருச்சி", "திருச்சிராப்பள்ளீ"],
  Tirunelveli: ["திருநெல்வேலி", "நெல்லை"],
  Tirupathur: ["திருப்பத்தூர்"],
  Tiruppur: ["திருப்பூர்"],
  Tiruvallur: ["திருவள்ளூர்"],
  Tiruvannamalai: ["திருவண்ணாமலை", "அண்ணாமலை"],
  Tiruvarur: ["திருவாரூர்"],
  Vellore: ["வேலூர்"],
  Viluppuram: ["விழுப்புரம்", "விழுப்புரம் மாவட்டம்"],
  Virudhunagar: ["விருதுநகர்"],
};

export const ALL_TN_DISTRICTS: string[] = Object.keys(TN_DISTRICTS).sort();

export interface ResolvedDistrict {
  district: string;
  term: string;
  script: "en" | "ta";
}

function enWord(hay: string, term: string): boolean {
  const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
  return re.test(hay);
}

const TAMIL_CHAR = /[஀-௿]/;

/**
 * Resolve every Tamil Nadu district named in a string — English aliases (from
 * `geo.ts`) and Tamil-script forms. Order-stable, de-duplicated by district.
 *
 * Tamil matching tolerates the case/postposition suffixes that fuse onto the
 * last consonant (சென்னை → சென்னையில், கடலூர் → கடலூரில்) by normalising both
 * the text's tokens and the dictionary forms through the same suffix stripper,
 * then comparing with the loose equality the language layer already defines.
 */
export function resolveDistricts(text: string): ResolvedDistrict[] {
  const lowerEn = " " + text.toLowerCase() + " ";
  const out: ResolvedDistrict[] = [];
  const seen = new Set<string>();

  const tamilTokens = text
    .split(/[\s.,;:!?()[\]{}"'“”‘’…—–|/]+/)
    .filter((w) => TAMIL_CHAR.test(w))
    .map((w) => normalizeTamilToken(w));

  for (const [district, aliases] of Object.entries(TN_DISTRICTS)) {
    if (seen.has(district)) continue;
    const enHit = aliases.find((a) => enWord(lowerEn, a));
    if (enHit) {
      out.push({ district, term: enHit, script: "en" });
      seen.add(district);
      continue;
    }
    const forms = TN_DISTRICT_TAMIL[district] ?? [];
    let taHit: string | undefined;
    for (const form of forms) {
      if (text.includes(form)) {
        taHit = form;
        break;
      }
      const nform = normalizeTamilToken(form);
      if (nform.length >= 3 && tamilTokens.some((t) => tamilLooseEqual(t, nform))) {
        taHit = form;
        break;
      }
    }
    if (taHit) {
      out.push({ district, term: taHit, script: "ta" });
      seen.add(district);
    }
  }
  return out;
}

/**
 * Taluk / constituency / city → district. EXTRACTED only, never inferred. Small
 * on purpose; grows as real feed data shows which sub-units actually appear.
 */
export const SUBUNIT_TO_DISTRICT: Record<string, string> = {
  // taluks / towns not already in locations.ts CITIES
  srirangam: "Tiruchirappalli",
  lalgudi: "Tiruchirappalli",
  gudiyatham: "Vellore",
  arakkonam: "Ranipet",
  tindivanam: "Viluppuram",
  chidambaram: "Cuddalore",
  virudhachalam: "Cuddalore",
  aruppukottai: "Virudhunagar",
  sivakasi: "Virudhunagar",
  palani: "Dindigul",
  oddanchatram: "Dindigul",
  bhavani: "Erode",
  gobichettipalayam: "Erode",
  sankari: "Salem",
  mettur: "Salem",
  // assembly constituencies commonly named in political copy
  "dr radhakrishnan nagar": "Chennai",
  velachery: "Chennai",
  kolathur: "Chennai",
  "harbour constituency": "Chennai",
};
