/**
 * IFA claim gold corpus — v0.5 expansion.
 *
 * Adds the cases v0.4 was thin on: Tamil ↔ Tamil at the EVENT level, Tamil ↔
 * English cross-language (positive AND negative), same-broad-region-different-
 * event negatives, and more paraphrase positives / geographic near-misses.
 *
 * The original 148 (`corpus.ts`) are NOT modified, so the v0.4-vs-v0.5 A/B runs
 * on a frozen set. NOW is the same instant as `corpus.ts`.
 */
import type { ClaimEvalCase } from "./schema";
import { EVAL_NOW } from "./corpus";

const h = (hoursAgo: number): string => new Date(EVAL_NOW - hoursAgo * 3_600_000).toISOString();

const HINDU = "The Hindu";
const TOI = "The Times of India";
const HT = "Hindustan Times";
const NIE = "The New Indian Express";
const NDTV = "NDTV";
const DINAMALAR = "Dinamalar";
const DINAMANI = "Dinamani";
const N18TA = "News18 Tamil";
const PTHALAI = "Puthiya Thalaimurai";
const MAALAI = "Maalaimalar";

const en = (text: string): { text: string; language: "en" } => ({ text, language: "en" });
const ta = (text: string): { text: string; language: "ta" } => ({ text, language: "ta" });

export const CORPUS_V05: ClaimEvalCase[] = [
  // ═══════════════════════════════════════════════════════════════════
  // P — TAMIL ↔ TAMIL, EVENT LEVEL (positives)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "P01", category: "K-tamil-tamil",
    inputA: { ...ta("கோயம்புத்தூரில் கனமழை; பள்ளிகளுக்கு விடுமுறை"), source: N18TA, timestamp: h(4) },
    inputB: { ...ta("கோவை மாவட்ட பள்ளிகளுக்கு இன்று விடுமுறை அறிவிப்பு"), source: PTHALAI, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "event", notes: "கோயம்புத்தூர் = கோவை (Coimbatore)." },
  },
  {
    id: "P02", category: "K-tamil-tamil",
    inputA: { ...ta("சேலம் மாவட்டத்தில் நாளை பொது விடுமுறை"), source: N18TA, timestamp: h(6) },
    inputB: { ...ta("சேலத்தில் நாளை அரசு அலுவலகங்களுக்கும் பள்ளிகளுக்கும் விடுமுறை"), source: DINAMANI, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P03", category: "K-tamil-tamil",
    inputA: { ...ta("திருச்சியில் காவிரி வெள்ளப்பெருக்கு; தாழ்வான பகுதி மக்கள் வெளியேற்றம்"), source: N18TA, timestamp: h(5) },
    inputB: { ...ta("திருச்சி: காவிரி கரையோர மக்கள் பாதுகாப்பான இடங்களுக்கு அனுப்பப்பட்டனர்"), source: PTHALAI, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P04", category: "K-tamil-tamil",
    inputA: { ...ta("நாகப்பட்டினம் மீனவர்கள் கடலுக்கு செல்ல வேண்டாம் என எச்சரிக்கை"), source: N18TA, timestamp: h(7) },
    inputB: { ...ta("நாகை கடலோரத்தில் மீன்பிடிக்க தடை; வானிலை மோசம்"), source: DINAMALAR, timestamp: h(6) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P05", category: "K-tamil-tamil",
    inputA: { ...ta("மதுரையில் மின் தடை; பராமரிப்பு பணி காரணமாக"), source: N18TA, timestamp: h(5) },
    inputB: { ...ta("மதுரை: சில பகுதிகளில் மின்சாரம் நிறுத்தம்"), source: MAALAI, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P06", category: "K-tamil-tamil",
    inputA: { ...ta("தஞ்சாவூரில் 5,000 பேர் நிவாரண முகாம்களுக்கு மாற்றம்"), source: N18TA, timestamp: h(4) },
    inputB: { ...ta("தஞ்சை: வெள்ளத்தால் பாதிக்கப்பட்ட 5,000 பேர் முகாம்களில் தங்க வைப்பு"), source: PTHALAI, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P07", category: "K-tamil-tamil",
    inputA: { ...ta("சென்னையில் இரவு முழுவதும் கனமழை; பல பகுதிகளில் தண்ணீர் தேங்கியது"), source: N18TA, timestamp: h(5) },
    inputB: { ...ta("சென்னை: இரவு பெய்த மழையில் தாழ்வான பகுதிகள் நீரில் மூழ்கின"), source: DINAMANI, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P08", category: "K-tamil-tamil",
    inputA: { ...ta("ஈரோட்டில் பவானி அணை நிரம்பியது; உபரி நீர் திறப்பு"), source: N18TA, timestamp: h(6) },
    inputB: { ...ta("பவானிசாகர் அணையில் இருந்து நீர் வெளியேற்றம் தொடங்கியது"), source: PTHALAI, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P09", category: "K-tamil-tamil",
    inputA: { ...ta("கடலூரில் புயல் எச்சரிக்கை; மீட்பு குழுக்கள் நிலைநிறுத்தம்"), source: N18TA, timestamp: h(8) },
    inputB: { ...ta("கடலூர்: புயலை எதிர்கொள்ள ஏற்பாடுகள்; NDRF குழுக்கள் வரவழைப்பு"), source: DINAMALAR, timestamp: h(7) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P10", category: "K-tamil-tamil",
    inputA: { ...ta("திருநெல்வேலியில் தாமிரபரணி ஆற்றில் வெள்ளம்; பாலம் மூடல்"), source: N18TA, timestamp: h(5) },
    inputB: { ...ta("நெல்லை: தாமிரபரணி வெள்ளப்பெருக்கால் போக்குவரத்து பாதிப்பு"), source: PTHALAI, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P11", category: "K-tamil-tamil",
    inputA: { ...ta("மேட்டூர் அணை நீர்மட்டம் 118 அடியாக உயர்வு"), source: N18TA, timestamp: h(6) },
    inputB: { ...ta("மேட்டூர் அணையில் நீர் வரத்து அதிகரிப்பு; நீர்மட்டம் 118 அடி"), source: DINAMANI, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P12", category: "K-tamil-tamil",
    inputA: { ...ta("விழுப்புரத்தில் சாலை சரிவு; வாகன போக்குவரத்து மாற்றம்"), source: N18TA, timestamp: h(4) },
    inputB: { ...ta("விழுப்புரம்: மழையால் சாலை பாதிப்பு; வழித்தடம் மாற்றம்"), source: MAALAI, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P13", category: "K-tamil-tamil",
    inputA: { ...ta("தமிழ்நாட்டில் 16 மாவட்டங்களுக்கு மழை எச்சரிக்கை"), source: N18TA, timestamp: h(5) },
    inputB: { ...ta("16 மாவட்டங்களில் இன்று கனமழை; வானிலை மையம் எச்சரிக்கை"), source: PTHALAI, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P14", category: "K-tamil-tamil",
    inputA: { ...ta("கன்னியாகுமரியில் கடல் கொந்தளிப்பு; படகுகள் கரைக்கு"), source: N18TA, timestamp: h(6) },
    inputB: { ...ta("குமரி மாவட்டத்தில் கடல் அலைகள் அதிகரிப்பு; மீனவர்கள் வெளியேறல்"), source: DINAMALAR, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "P15", category: "K-tamil-tamil",
    inputA: { ...ta("வேலூரில் நள்ளிரவில் பள்ளி மாணவி மீட்பு"), source: N18TA, timestamp: h(4) },
    inputB: { ...ta("வேலூர்: வெள்ளத்தில் சிக்கிய மாணவி காப்பாற்றப்பட்டார்"), source: PTHALAI, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "event" },
  },
  // Tamil ↔ Tamil NEGATIVES
  {
    id: "P16", category: "K-tamil-tamil",
    inputA: { ...ta("சென்னையில் மெட்ரோ ரயில் புதிய பாதை திறப்பு"), source: N18TA, timestamp: h(5) },
    inputB: { ...ta("சென்னையில் குடிநீர் திட்டத்திற்கு நிதி ஒதுக்கீடு"), source: PTHALAI, timestamp: h(4) },
    expected: { relation: "different", notes: "Same city, unrelated civic stories." },
  },
  {
    id: "P17", category: "O-neighbouring-districts",
    inputA: { ...ta("கடலூரில் வெள்ளம்; பள்ளிகள் மூடல்"), source: N18TA, timestamp: h(4) },
    inputB: { ...ta("விழுப்புரத்தில் வெள்ளம்; பள்ளிகள் மூடல்"), source: PTHALAI, timestamp: h(4) },
    expected: { relation: "different", notes: "Adjacent districts, two local floods." },
  },
  {
    id: "P18", category: "K-tamil-tamil",
    inputA: { ...ta("மதுரையில் அமைச்சர் வெள்ள நிவாரண பணிகளை ஆய்வு"), source: N18TA, timestamp: h(5) },
    inputB: { ...ta("மதுரையில் அமைச்சர் புதிய பேருந்து நிலையம் திறந்து வைத்தார்"), source: PTHALAI, timestamp: h(9) },
    expected: { relation: "different", notes: "Same minister, same city, different events." },
  },
  {
    id: "P19", category: "N-same-location-different-date",
    inputA: { ...ta("சேலத்தில் பிரிவு 144 அமல்; திருவிழா பாதுகாப்பு"), source: N18TA, timestamp: h(170) },
    inputB: { ...ta("சேலத்தில் பிரிவு 144 அமல்; சாலை விபத்து பதற்றம்"), source: PTHALAI, timestamp: h(3) },
    expected: { relation: "different", notes: "A week apart, different triggers." },
  },
  {
    id: "P20", category: "K-tamil-tamil",
    inputA: { ...ta("திண்டுக்கல்லில் மழை; பள்ளிகள் மூடல்"), source: N18TA, timestamp: h(4) },
    inputB: { ...ta("தேனி மாவட்டத்தில் கனமழை; பள்ளிகள் மூடல்"), source: PTHALAI, timestamp: h(4) },
    expected: { relation: "different", notes: "Dindigul vs Theni — different districts." },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Q — TAMIL ↔ ENGLISH (cross-language) — POSITIVES
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "Q01", category: "L-tamil-english",
    inputA: { ...ta("சென்னையில் நாளை பள்ளிகளுக்கு விடுமுறை அறிவிப்பு"), source: N18TA, timestamp: h(4) },
    inputB: { ...en("Chennai schools to remain closed tomorrow amid heavy rain"), source: HINDU, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "event", notes: "Same city, same closure, same day." },
  },
  {
    id: "Q02", category: "L-tamil-english",
    inputA: { ...ta("மேட்டூர் அணை திறப்பு; காவிரி ஆற்றில் தண்ணீர்"), source: N18TA, timestamp: h(6) },
    inputB: { ...en("Mettur dam opened, Cauvery water released for irrigation"), source: HINDU, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q03", category: "L-tamil-english",
    inputA: { ...ta("நீலகிரிக்கு சிவப்பு அலர்ட்; கனமழை எச்சரிக்கை"), source: N18TA, timestamp: h(5) },
    inputB: { ...en("IMD issues red alert for the Nilgiris as heavy rain lashes hills"), source: TOI, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q04", category: "L-tamil-english",
    inputA: { ...ta("கடலூரில் வெள்ளத்தில் சிக்கிய மக்கள் மீட்பு"), source: N18TA, timestamp: h(4) },
    inputB: { ...en("Rescue operations under way in flood-hit Cuddalore"), source: NDTV, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q05", category: "L-tamil-english",
    inputA: { ...ta("மதுரையில் பிரிவு 144 அமல்; திருவிழா பாதுகாப்பு"), source: N18TA, timestamp: h(7) },
    inputB: { ...en("Section 144 clamped in Madurai ahead of the temple festival"), source: HINDU, timestamp: h(6) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q06", category: "L-tamil-english",
    inputA: { ...ta("ஈரோட்டில் காவிரி கரையோர மக்கள் வெளியேற்றம்"), source: N18TA, timestamp: h(6) },
    inputB: { ...en("Erode: residents on the Cauvery banks moved to safety as river swells"), source: NIE, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q07", category: "L-tamil-english",
    inputA: { ...ta("கோயம்புத்தூரில் மின் தடை; மழை பாதுகாப்பு நடவடிக்கை"), source: N18TA, timestamp: h(5) },
    inputB: { ...en("Power supply cut in parts of Coimbatore as a rain precaution"), source: HINDU, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q08", category: "L-tamil-english",
    inputA: { ...ta("நாகப்பட்டினத்தில் மீனவர்களுக்கு கடலுக்கு செல்ல தடை"), source: N18TA, timestamp: h(7) },
    inputB: { ...en("Fishing banned off Nagapattinam coast over rough sea warning"), source: HINDU, timestamp: h(6) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q09", category: "L-tamil-english",
    inputA: { ...ta("தஞ்சாவூரில் NDRF குழுக்கள் நிலைநிறுத்தம்; வெள்ள மீட்பு"), source: N18TA, timestamp: h(6) },
    inputB: { ...en("NDRF teams deployed in Thanjavur for flood rescue"), source: NDTV, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q10", category: "L-tamil-english",
    inputA: { ...ta("சென்னை மாநகராட்சி நிவாரண முகாம்கள் திறப்பு"), source: N18TA, timestamp: h(4) },
    inputB: { ...en("Greater Chennai Corporation opens flood relief camps across the city"), source: TOI, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q11", category: "L-tamil-english",
    inputA: { ...ta("புயல் திட்வா நாகப்பட்டினம் அருகே கரையை கடக்கும் என எதிர்பார்ப்பு"), source: N18TA, timestamp: h(9) },
    inputB: { ...en("Cyclone Ditwah likely to cross coast near Nagapattinam on Thursday"), source: HINDU, timestamp: h(8) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q12", category: "L-tamil-english",
    inputA: { ...ta("திருவள்ளூரில் பள்ளிகள் மூடல்; கனமழை தொடர்கிறது"), source: N18TA, timestamp: h(5) },
    inputB: { ...en("Tiruvallur schools shut as heavy rain continues"), source: TOI, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q13", category: "L-tamil-english",
    inputA: { ...ta("வேலூரில் வெப்ப அலை எச்சரிக்கை"), source: N18TA, timestamp: h(8) },
    inputB: { ...en("Heatwave warning issued for Vellore and neighbouring districts"), source: HINDU, timestamp: h(7) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "Q14", category: "L-tamil-english",
    inputA: { ...ta("சேலத்தில் மேட்டூர் அணை திறப்பையொட்டி விவசாயிகள் மகிழ்ச்சி"), source: N18TA, timestamp: h(5) },
    inputB: { ...en("Farmers in Salem welcome the Cauvery water release from Mettur dam"), source: NIE, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event", notes: "Same reaction story, both languages." },
  },
  {
    id: "Q15", category: "L-tamil-english",
    inputA: { ...ta("சென்னை விமான நிலையத்தில் மழையால் விமானங்கள் தாமதம்"), source: N18TA, timestamp: h(4) },
    inputB: { ...en("Rain hits Chennai airport; several flights delayed"), source: HT, timestamp: h(3) },
    expected: { relation: "same", matchLevel: "event" },
  },
  // cross-language NEGATIVES
  {
    id: "Q16", category: "L-tamil-english",
    inputA: { ...ta("சென்னையில் கனமழை"), source: N18TA, timestamp: h(4) },
    inputB: { ...en("Section 144 imposed in Madurai ahead of festival"), source: HINDU, timestamp: h(4) },
    expected: { relation: "different", notes: "Different city, different event." },
  },
  {
    id: "Q17", category: "L-tamil-english",
    inputA: { ...ta("மேட்டூர் அணை திறப்பு"), source: N18TA, timestamp: h(6) },
    inputB: { ...en("Karnataka tells Supreme Court on Cauvery water sharing"), source: HINDU, timestamp: h(5) },
    expected: { relation: "different", notes: "Cauvery mentioned in both, but a Karnataka legal story is not the Mettur opening." },
  },
  {
    id: "Q18", category: "L-tamil-english",
    inputA: { ...ta("தமிழ்நாட்டில் இன்று 16 மாவட்டங்களில் மழை"), source: N18TA, timestamp: h(4) },
    inputB: { ...en("Tamil Nadu Assembly passes resolution on NEET exemption"), source: HINDU, timestamp: h(4) },
    expected: { relation: "different", notes: "Both 'Tamil Nadu' — weather vs assembly, unrelated." },
  },
  {
    id: "Q19", category: "L-tamil-english",
    inputA: { ...ta("சென்னையில் முதலமைச்சர் விஜய் மேட்டூர் அணை திறந்து வைத்தார்"), source: N18TA, timestamp: h(5) },
    inputB: { ...en("Tamil Nadu CM Vijay announces semiconductor park at Kancheepuram"), source: HINDU, timestamp: h(9) },
    expected: { relation: "different", notes: "Same CM, different announcements." },
  },
  {
    id: "Q20", category: "L-tamil-english",
    inputA: { ...ta("கோவையில் தீ விபத்து; 3 பேர் காயம்"), source: N18TA, timestamp: h(4) },
    inputB: { ...en("Coimbatore building collapse leaves 3 injured"), source: TOI, timestamp: h(4) },
    expected: { relation: "different", notes: "Same city, same injury count, but a fire and a collapse are different incidents." },
  },
  {
    id: "Q21", category: "L-tamil-english",
    inputA: { ...ta("தஞ்சாவூரில் விவசாயிகள் போராட்டம்"), source: N18TA, timestamp: h(6) },
    inputB: { ...en("Thanjavur farmers welcome the Mettur water release"), source: HINDU, timestamp: h(5) },
    expected: { relation: "different", notes: "Protest vs welcome — opposite reactions." },
  },
  {
    id: "Q22", category: "L-tamil-english",
    inputA: { ...ta("நீலகிரியில் கனமழை"), source: N18TA, timestamp: h(5) },
    inputB: { ...en("Landslide blocks Coonoor-Ooty road in the Nilgiris"), source: TOI, timestamp: h(4) },
    expected: { relation: "different", notes: "Same district — the weather vs a specific incident." },
  },
  {
    id: "Q23", category: "L-tamil-english",
    inputA: { ...ta("சென்னையில் நாளை பள்ளிகளுக்கு விடுமுறை"), source: N18TA, timestamp: h(5) },
    inputB: { ...en("Chennai Corporation deploys 200 pumps to clear waterlogging"), source: HINDU, timestamp: h(4) },
    expected: { relation: "different", notes: "Same city, both rain-related, different claims." },
  },
  {
    id: "Q24", category: "L-tamil-english",
    inputA: { ...ta("மதுரையில் மழை"), source: N18TA, timestamp: h(4) },
    inputB: { ...en("Heavy rain in Coimbatore floods low-lying areas"), source: TOI, timestamp: h(4) },
    expected: { relation: "different", notes: "Different districts." },
  },
  {
    id: "Q25", category: "L-tamil-english",
    inputA: { ...ta("மேட்டூர் அணை திறப்பு"), source: N18TA, timestamp: h(200) },
    inputB: { ...en("Mettur dam opened for Cauvery water release near Salem"), source: HINDU, timestamp: h(4) },
    expected: { relation: "different", notes: "Same event type, 8 days apart — different openings." },
  },

  // ═══════════════════════════════════════════════════════════════════
  // R — SAME BROAD REGION, DIFFERENT EVENT (English negatives)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "R01", category: "M-same-people-different-story",
    inputA: { ...en("Tamil Nadu weather: 16 districts to get heavy rain today"), source: HINDU, timestamp: h(4) },
    inputB: { ...en("Tamil Nadu Assembly clears 10% wage hike for handloom weavers"), source: HINDU, timestamp: h(4) },
    expected: { relation: "different", notes: "Both state-level, weather vs assembly." },
  },
  {
    id: "R02", category: "M-same-people-different-story",
    inputA: { ...en("Tamil Nadu CM Vijay opens Mettur dam for Cauvery water release"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Tamil Nadu CM Vijay announces new semiconductor park at Kancheepuram"), source: TOI, timestamp: h(9) },
    expected: { relation: "different", notes: "Same CM, different announcements." },
  },
  {
    id: "R03", category: "M-same-people-different-story",
    inputA: { ...en("From Uttarakhand to Assam, rain fury leaves 11 dead across India"), source: NDTV, timestamp: h(4) },
    inputB: { ...en("On vulture safety in India: the threat of electrocution"), source: HINDU, timestamp: h(20) },
    expected: { relation: "different", notes: "'India' + 'deaths' in both — completely different stories." },
  },
  {
    id: "R04", category: "M-same-people-different-story",
    inputA: { ...en("Heavy rain across Tamil Nadu disrupts road and rail traffic"), source: HINDU, timestamp: h(4) },
    inputB: { ...en("Tamil Nadu government hikes DA for state employees by 3%"), source: TOI, timestamp: h(6) },
    expected: { relation: "different" },
  },
  {
    id: "R05", category: "M-same-people-different-story",
    inputA: { ...en("IMD forecasts heavy rain for Tamil Nadu over the next three days"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("IMD upgrades its supercomputing capacity for monsoon modelling"), source: TOI, timestamp: h(30) },
    expected: { relation: "different", notes: "Shared entity IMD, unrelated stories." },
  },
  {
    id: "R06", category: "M-same-people-different-story",
    inputA: { ...en("Cyclone alert for the Tamil Nadu coast as system intensifies"), source: HINDU, timestamp: h(6) },
    inputB: { ...en("Tamil Nadu coast to get two new fishing harbours, says minister"), source: NIE, timestamp: h(12) },
    expected: { relation: "different", notes: "Same region 'coast', different topics." },
  },
  {
    id: "R07", category: "M-same-people-different-story",
    inputA: { ...en("Schools closed across Tamil Nadu as heavy rain continues"), source: HINDU, timestamp: h(4) },
    inputB: { ...en("Tamil Nadu to recruit 10,000 school teachers this year"), source: TOI, timestamp: h(8) },
    expected: { relation: "different", notes: "Both about schools + TN, different claims." },
  },
  {
    id: "R08", category: "M-same-people-different-story",
    inputA: { ...en("Delhi records its wettest September day in a decade"), source: HT, timestamp: h(5) },
    inputB: { ...en("Delhi's air quality slips to 'poor' as winter approaches"), source: NDTV, timestamp: h(10) },
    expected: { relation: "different" },
  },
  {
    id: "R09", category: "M-same-people-different-story",
    inputA: { ...en("Mettur dam opened; Cauvery delta farmers to get irrigation water"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Cauvery Water Management Authority meeting ends without consensus"), source: TOI, timestamp: h(7) },
    expected: { relation: "different", notes: "Cauvery in both; a dam opening is not a CWMA meeting." },
  },
  {
    id: "R10", category: "M-same-people-different-story",
    inputA: { ...en("Rain-related deaths in Tamil Nadu rise to 9"), source: HINDU, timestamp: h(4) },
    inputB: { ...en("Road accident deaths in Tamil Nadu fell 6% last year, data shows"), source: TOI, timestamp: h(28) },
    expected: { relation: "different", notes: "'TN' + 'deaths' — rain toll vs road-safety data." },
  },

  // ═══════════════════════════════════════════════════════════════════
  // S — MORE ENGLISH PARAPHRASE POSITIVES
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "S01", category: "A-same-fact-different-wording",
    inputA: { ...en("Cabinet clears Rs 1,000 crore flood relief for Tamil Nadu"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Tamil Nadu government approves Rs 1,000 crore package for flood-hit districts"), source: TOI, timestamp: h(4) },
    expected: { relation: "same", claimType: ["official-statement", "statistic"], matchLevel: "specific", notes: "clears = approves." },
  },
  {
    id: "S02", category: "A-same-fact-different-wording",
    inputA: { ...en("Government sanctions two more NDRF battalions for Tamil Nadu"), source: HINDU, timestamp: h(6) },
    inputB: { ...en("Centre gives the nod for two additional NDRF units in Tamil Nadu"), source: NDTV, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "S03", category: "B-related-but-different",
    inputA: { ...en("Cabinet approves the Chennai-Salem highway proposal"), source: HINDU, timestamp: h(6) },
    inputB: { ...en("Cabinet discusses the Chennai-Salem highway proposal"), source: TOI, timestamp: h(6) },
    expected: { relation: "different", notes: "approve != discuss — MUST stay separate." },
  },
  {
    id: "S04", category: "A-same-fact-different-wording",
    inputA: { ...en("Chennai Metro extension to Kilambakkam gets state approval"), source: HINDU, timestamp: h(7) },
    inputB: { ...en("State clears the Chennai Metro line to Kilambakkam"), source: TOI, timestamp: h(6) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "S05", category: "A-same-fact-different-wording",
    inputA: { ...en("Holiday declared for Chengalpattu district schools on Wednesday"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Chengalpattu: educational institutions to stay closed Wednesday"), source: NIE, timestamp: h(4) },
    expected: { relation: "same", claimType: "official-statement", matchLevel: "specific" },
  },
  {
    id: "S06", category: "A-same-fact-different-wording",
    inputA: { ...en("Ranipet: gas leak at chemical unit forces evacuation of nearby homes"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Homes near Ranipet chemical factory cleared after gas leak"), source: TOI, timestamp: h(4) },
    expected: { relation: "same", matchLevel: "event" },
  },
  {
    id: "S07", category: "A-same-fact-different-wording",
    inputA: { ...en("Trichy airport diverts four flights due to poor visibility"), source: HINDU, timestamp: h(4) },
    inputB: { ...en("Poor visibility at Tiruchirappalli airport; four flights diverted"), source: TOI, timestamp: h(3) },
    expected: { relation: "same", claimType: ["statistic", "event"], matchLevel: "specific", notes: "Trichy = Tiruchirappalli." },
  },
  {
    id: "S08", category: "A-same-fact-different-wording",
    inputA: { ...en("Tuticorin port suspends operations as cyclone nears"), source: HINDU, timestamp: h(6) },
    inputB: { ...en("Operations halted at Thoothukudi port ahead of the cyclone"), source: NIE, timestamp: h(5) },
    expected: { relation: "same", matchLevel: "event", notes: "Tuticorin = Thoothukudi." },
  },
  {
    id: "S09", category: "A-same-fact-different-wording",
    inputA: { ...en("Villupuram collector declares Thursday a local holiday"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Local holiday announced for Viluppuram on Thursday"), source: TOI, timestamp: h(4) },
    expected: { relation: "same", claimType: "official-statement", matchLevel: "specific" },
  },
  {
    id: "S10", category: "A-same-fact-different-wording",
    inputA: { ...en("Two fishermen from Rameswaram go missing after boat capsizes"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Rameshwaram boat mishap: search on for two missing fishermen"), source: NDTV, timestamp: h(4) },
    expected: { relation: "same", claimType: "statistic", matchLevel: "specific" },
  },

  // ═══════════════════════════════════════════════════════════════════
  // T — MORE GEOGRAPHIC NEAR-MISSES + SYNDICATION
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "T01", category: "O-neighbouring-districts",
    inputA: { ...en("Cauvery in spate near Erode; banks overflow"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Cauvery in spate near Karur; low-lying fields submerged"), source: NIE, timestamp: h(5) },
    expected: { relation: "different", notes: "Same river, adjacent districts — two local situations." },
  },
  {
    id: "T02", category: "O-neighbouring-districts",
    inputA: { ...en("Power outage hits parts of Tirunelveli"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Power outage hits parts of Tenkasi"), source: NIE, timestamp: h(5) },
    expected: { relation: "different" },
  },
  {
    id: "T03", category: "N-same-location-different-date",
    inputA: { ...en("Red alert for Coimbatore as heavy rain lashes the district"), source: HINDU, timestamp: h(170) },
    inputB: { ...en("Red alert for Coimbatore as heavy rain lashes the district"), source: HT, timestamp: h(3) },
    expected: { relation: "different", notes: "Identical text, a week apart." },
  },
  {
    id: "T04", category: "O-neighbouring-districts",
    inputA: { ...en("Boat capsizes off Nagapattinam, two missing"), source: HINDU, timestamp: h(5) },
    inputB: { ...en("Boat capsizes off Karaikal, two missing"), source: NIE, timestamp: h(5) },
    expected: { relation: "different", notes: "Nagapattinam vs Karaikal (Puducherry) — different incidents." },
  },
  {
    id: "T05", category: "J-syndication",
    inputA: { ...en("Tamil Nadu shuts schools in eight districts as heavy rain pounds the state"), source: HT, wire: "PTI", timestamp: h(5) },
    inputB: { ...en("Tamil Nadu shuts schools in eight districts as heavy rain pounds the state"), source: NIE, wire: "PTI", timestamp: h(5) },
    expected: { relation: "same", independent: false, matchLevel: "event", notes: "Identical PTI copy." },
  },
  {
    id: "T06", category: "J-syndication",
    inputA: { ...en("IMD issues cyclone warning for Tamil Nadu, Puducherry coasts"), source: TOI, wire: "ANI", timestamp: h(6) },
    inputB: { ...en("IMD issues cyclone warning for Tamil Nadu, Puducherry coasts"), source: NDTV, wire: "ANI", timestamp: h(6) },
    expected: { relation: "same", independent: false, matchLevel: "event" },
  },
  {
    id: "T07", category: "J-syndication",
    inputA: { ...en("Mettur dam opened as inflow rises; Cauvery delta on alert"), source: HINDU, timestamp: h(6) },
    inputB: { ...en("With inflow rising, Mettur dam opened and the delta put on alert"), source: TOI, timestamp: h(5) },
    expected: { relation: "same", independent: true, matchLevel: "event", notes: "Genuinely reworded — independent." },
  },
  {
    id: "T08", category: "O-neighbouring-districts",
    inputA: { ...en("Cyclone Ditwah crosses near Nagapattinam; Cuddalore, Mayiladuthurai also hit"), source: HINDU, timestamp: h(6) },
    inputB: { ...en("Ditwah makes landfall near Nagapattinam, delta districts battered"), source: TOI, timestamp: h(6) },
    expected: { relation: "same", matchLevel: "event", notes: "One cyclone explicitly spanning the districts — SAME event." },
  },
  {
    id: "T09", category: "E-temporal-update",
    inputA: { ...en("Cuddalore wall collapse: three injured"), source: HINDU, timestamp: h(8) },
    inputB: { ...en("Cuddalore wall collapse: injured count rises to nine"), source: TOI, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic" },
  },
  {
    id: "T10", category: "E-temporal-update",
    inputA: { ...en("Nilgiris landslide: 20 houses damaged"), source: HINDU, timestamp: h(9) },
    inputB: { ...en("Nilgiris landslide damage climbs to 55 houses"), source: NDTV, timestamp: h(1) },
    expected: { relation: "supersedes", claimType: "statistic" },
  },
];
