/**
 * IFFA v0.8 category-classification gold corpus.
 *
 * Real cluster headlines from a live snapshot (2026-09-02), hand-labelled with
 * the PRIMARY category a Tamil Nadu / India news editor would file them under,
 * plus (optionally) a secondary. "other-relevant" = genuine general / regional
 * / human-interest news with no crisis / politics / finance / sports angle.
 *
 * The corpus is deliberately adversarial: political metaphors that use crisis
 * words ("red alert" about state revenue), culture pieces that name chess
 * players, digests, single incidents, minister statements about schemes.
 */
import type { CategoryId } from "@/lib/domain/categories";

export interface CategoryCase {
  title: string;
  /** Some real excerpt context, when it changes the call. */
  excerpt?: string;
  language?: "ta" | "en";
  primary: CategoryId;
  secondary?: CategoryId;
  /** true ⇒ a multi-topic digest / bulletin that should NOT be filed under a domain. */
  digest?: boolean;
  note?: string;
}

export const CATEGORY_CORPUS: CategoryCase[] = [
  // ── CRISIS ───────────────────────────────────────────────────────────
  { title: "Heavy Rain — Ariyalur, Chengalpattu, Cuddalore", primary: "crisis", note: "SACHET CAP alert" },
  { title: "Very Heavy Rainfall warning for Tamil Nadu coast; IMD orange alert", primary: "crisis" },
  { title: "Salem police crack mystery behind murder of woman whose chopped body parts were found in water tanks", primary: "crisis", note: "law and order" },
  { title: "Seven teams deployed to put out forest fire in Erode’s Kadambur Hills", primary: "crisis" },
  { title: "Rescuers search for 2 missing soldiers after Army boat capsizes in Yamuna at Hathnikund Barrage", primary: "crisis" },
  { title: "Locoshed of Darjeeling's iconic toy train collapses amid heavy rain, 4 injured", primary: "crisis" },
  { title: "9-Year-Old Girl Kidnapped By Uncle, Aunt In Assam, Rescued Hours Later", primary: "crisis" },
  { title: "Man With Criminal Record Found Dead In Hyderabad, Murder Case Filed", primary: "crisis" },
  { title: "Karnataka woman arrested after 4-month-old twin daughters found dead at home", primary: "crisis" },
  { title: "Sexual assault of nursery student: NCW seeks stringent action", primary: "crisis" },
  { title: "இன்ஸ்டாகிராம் ரீல்ஸால் வெடித்த கோஷ்டி மோதல்.. 15-க்கும் மேற்பட்ட சிறுவர்கள் மீது வழக்குப்பதிவு!", language: "ta", primary: "crisis", note: "group clash" },
  { title: "Just Now | பள்ளம் தோண்டியபோது தொழிலாளர் நவீன் மீது மண் சரிந்ததால் பரபரப்பு", language: "ta", primary: "crisis", note: "soil collapse on worker" },
  { title: "Cuddalore floods: 5 dead, 3,000 evacuated as rivers breach banks", primary: "crisis" },
  { title: "Gas leak at Ennore plant; residents of three neighbourhoods evacuated", primary: "crisis" },
  { title: "Bus falls into gorge in the Nilgiris; 9 killed, 20 injured", primary: "crisis" },
  { title: "Mettur dam nears full level; surplus water to be released downstream", primary: "crisis" },
  { title: "Power supply snapped in three Chennai zones after substation fire", primary: "crisis" },
  { title: "Leptospirosis cases surge in flood-hit Cuddalore; health advisory issued", primary: "crisis" },
  { title: "Section 144 imposed in parts of Madurai after two groups clash", primary: "crisis" },
  { title: "நேபாள வெள்ள மீட்பு பணிகள்.. மத்திய அரசு அறிக்கை தாக்கல் செய்ய உத்தரவு", language: "ta", primary: "politics", secondary: "crisis", note: "the news hook is a directive to the government to file a report" },

  // ── POLITICS ─────────────────────────────────────────────────────────
  { title: "Tamil Nadu Assembly: CM Vijay Announces Withdrawal Of Protest Cases Against Farmers & Teachers", primary: "politics" },
  { title: "Pitch for Vijay as PM Grows Louder in Tamil Nadu, Draws Opposition Flak and Congress Pushback", primary: "politics" },
  { title: "JUSTNOW | அரசுக்கு எதிராக போராட்டதில் குதித்த பழம்பெரும் நடிகை அம்பிகா", language: "ta", primary: "politics" },
  { title: "Bill to set up Tamil Nadu Investment Promotion Commission, fast-track clearances introduced in Assembly", primary: "politics", secondary: "finance" },
  { title: "Doctors’ body flags high security, logistics costs of Tamil Nadu newborn gold-ring scheme", primary: "politics", secondary: "finance" },
  { title: "‘Not democratically elected’: SC says Manan Kumar Mishra only ‘pro tem’ BCI chairman till fresh election", primary: "politics" },
  { title: "CMDA shelves new township project planned in Kancheepuram", primary: "politics" },
  { title: "BJP cries foul as Ramchander Rao stopped from visiting Nalgonda", primary: "politics" },
  { title: "AIMIM's Syed Asim Waqar joins Congress, says Owaisi-led party fights everyone who wants to remove BJP", primary: "politics" },
  { title: "NCPI may form coalition with BJP in upcoming Bengal municipal polls, say leaders", primary: "politics" },
  { title: "Kiren Rijiju vs Congress again. But now over India's GDP", primary: "politics", secondary: "finance" },
  { title: "Tamil Nadu moves Bill to do away with Collector’s concurrence for wetland development in non-planning areas", primary: "politics" },
  { title: "சட்டசபையில் 110 விதியின் கீழ் 8 முக்கிய அறிவிப்புகளை வெளியிட்ட முதலமைச்சர் விஜய்", language: "ta", primary: "politics" },
  { title: "Allegation of DMK govt. denying Marina burial site for Kamaraj untrue: Thangam Thennarasu in T.N. Assembly", primary: "politics" },
  { title: "Aided school HM from Madurai suspended over administrative inefficiency", primary: "politics", note: "administrative action" },
  { title: "Work with police to curb illicit liquor, Karnataka Minister for Labour appeals to residents", primary: "politics" },
  { title: "Kuki-Zo MLAs physically attend Manipur Assembly after three years", primary: "politics" },
  { title: "Keralam govt. tightens norms for contract renewal of NHM, NAM employees", primary: "politics" },
  { title: "DYFI takes out march to DGP office in Thiruvananthapuram", primary: "politics" },
  { title: "SIR voter roll deadline extended in Maharashtra, Karnataka, Delhi, Telangana", primary: "politics", note: "election commission" },
  { title: "TRB Rajaa | RED Alert காட்டும் தமிழ்நாட்டின் வருவாய்.. - டிஆர்பி ராஜா ஷாக் ரிப்போர்ட்", language: "ta", primary: "politics", note: "minister's report on state revenue — 'red alert' is a metaphor" },
  { title: "“தமிழ்நாட்டின் GST வசூல் சரிவு! இது சிவப்பு எச்சரிக்கை” – டி.ஆர்.பி. ராஜா", language: "ta", primary: "finance", secondary: "politics", note: "GST collection is the topic; a minister is the speaker" },
  { title: "Wild elephant electrocuted in Chittoor district; Pawan Kalyan orders inquiry", primary: "politics", secondary: "crisis" },
  { title: "Krishna Jayanthi | ஹைகோர்ட் அதிரடி - கிருஷ்ணரை சமுதாய ரீதியாக பார்க்கக் கூடாது", language: "ta", primary: "politics", note: "High Court order" },
  { title: "சிந்து நதி நீர் ஒப்பந்தம்: பாகிஸ்தானுக்கு ஆதரவாக நடுவர் நீதிமன்றம் தீர்ப்பு", language: "ta", primary: "politics", note: "Indus Waters Treaty arbitration — foreign policy" },
  { title: "'Can remove Pak from world picture': Pakistan PMO crops Modi out of SCO pic, gets warned", primary: "politics" },

  // ── FINANCE ──────────────────────────────────────────────────────────
  { title: "RBI keeps repo rate unchanged at 6.5% in monetary policy review", primary: "finance" },
  { title: "Why stock market is down today: Fresh US strikes, inflation fears", primary: "finance" },
  { title: "Gold Rate Down | நாளுக்கு நாள் Surprise கொடுக்கும் தங்கம் விலை", language: "ta", primary: "finance" },
  { title: "வரி ஏய்ப்பு புகார்.. சென்னை, மதுரை தனியார் கருத்தரிப்பு மையங்களில் ஐடி சோதனை!", language: "ta", primary: "finance", secondary: "politics", note: "income-tax raids" },
  { title: "Sensex ends 900 points lower as IT stocks drag; Nifty below 24,800", primary: "finance" },
  { title: "GST Council cuts rate on 30 items; states seek compensation extension", primary: "finance", secondary: "politics" },
  { title: "Petrol, diesel prices cut by Rs 2 a litre from midnight", primary: "finance" },
  { title: "Chennai advocate falls prey to ‘Quantum AI’ investment scam, loses Rs 40 lakh", primary: "finance" },
  { title: "Infosys Q2 net profit rises 12% to Rs 6,500 crore, beats estimates", primary: "finance" },
  { title: "Rupee slips to record low against the dollar amid FII outflows", primary: "finance" },

  // ── SPORTS ───────────────────────────────────────────────────────────
  { title: "CSK beat RCB by 6 wickets in IPL opener at Chepauk", primary: "sports" },
  { title: "Gukesh retains world chess title after tie-break against Nepomniachtchi", primary: "sports" },
  { title: "India beat Australia by 5 wickets to seal ODI series 2-1", primary: "sports" },
  { title: "Tamil Nadu win Ranji Trophy quarter-final on first-innings lead", primary: "sports" },
  { title: "Neeraj Chopra wins gold with 89.45m throw at the Diamond League final", primary: "sports" },
  { title: "ISL: Chennaiyin FC hold Bengaluru FC to a 1-1 draw", primary: "sports" },
  { title: "Vinesh Phogat cleared to compete; wrestling federation lifts suspension", primary: "sports" },

  // ── OTHER-RELEVANT (genuine general / regional / human-interest) ──────
  { title: "3.4 kg of hydroponic ganja seized at Chennai airport", primary: "other-relevant", note: "minor seizure, no wider signal" },
  { title: "மரப்பாச்சியில் மிளிரும் தெய்வங்கள்... IT வேலையை விட்ட மதுரை பெண்", language: "ta", primary: "other-relevant" },
  { title: "Madras Day 2026: ticking on behind Metro Rail barricades", primary: "other-relevant" },
  { title: "Consumer data validation for smart water metering to be finished by September-end in Chennai", primary: "other-relevant" },
  { title: "Vaishya Sammelan to be held in Belagavi", primary: "other-relevant" },
  { title: "Puligundu’s twin rock peaks near Chittoor to be developed for adventure, eco and temple tourism", primary: "other-relevant" },
  { title: "3 wheels, no shortcuts: Autorickshaw driver puts Karnataka on Ladakh map", primary: "other-relevant" },
  { title: "Train passenger gets back bag with valuables worth Rs 29L", primary: "other-relevant" },
  { title: "A world of bristles beneath the waves", primary: "other-relevant" },
  { title: "The Hindu Property Expo 2026 to be held on September 5, 6", primary: "other-relevant" },
  { title: "Sacred groves show that size isn’t everything when it comes to ecological benefits", primary: "other-relevant" },
  { title: "TCS hosts inter-school quiz contest InQuizitive 2026", primary: "other-relevant" },
  { title: "Chess grandmaster’s menu: What Chef Suresh Pillai cooked for Viswanathan Anand, Gukesh", primary: "other-relevant", note: "a food feature that merely mentions chess players" },
  { title: "Tracing the history of a bank in Chennai through photos and film", primary: "other-relevant", note: "a culture piece; 'bank' is not finance here" },
  { title: "Guitars in a Carnatic city: The rock ‘n’ roll story of 1960s Madras", primary: "other-relevant" },
  { title: "People are kinder in Chennai than anywhere else: Mohamed Rela", primary: "other-relevant" },
  { title: "Five weather stations to benefit small tea growers inaugurated in the Nilgiris", primary: "other-relevant" },
  { title: "கால்நடைகளுக்கு இலவச சிகிச்சையா.? - விழுப்புரத்தில் 234 சிறப்பு முகாம்கள்", language: "ta", primary: "other-relevant", note: "free veterinary camps — 'camp' is not a relief camp" },
  { title: "New species of frog documented in the Western Ghats", primary: "other-relevant" },
  { title: "Superstar's next film titled and dated; first look poster released", primary: "entertainment" },
  { title: "Actor spotted at airport; dating rumours go viral on Instagram after a cryptic post", primary: "celebrity" },
];

export const CATEGORY_CORPUS_META = {
  size: CATEGORY_CORPUS.length,
  capturedFrom: "live snapshot 2026-09-02",
};
