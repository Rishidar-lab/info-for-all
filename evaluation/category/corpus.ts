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
  /**
   * The FULL expected secondary set (may be empty). When present, the eval
   * scores secondary precision *and* recall strictly against this list — used
   * by the dedicated multi-domain section. `secondary` alone is recall-only.
   */
  secondaries?: CategoryId[];
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
  { title: "Wild elephant electrocuted in Chittoor district; Pawan Kalyan orders inquiry", primary: "politics" },
  { title: "Krishna Jayanthi | ஹைகோர்ட் அதிரடி - கிருஷ்ணரை சமுதாய ரீதியாக பார்க்கக் கூடாது", language: "ta", primary: "politics", note: "High Court order" },
  { title: "சிந்து நதி நீர் ஒப்பந்தம்: பாகிஸ்தானுக்கு ஆதரவாக நடுவர் நீதிமன்றம் தீர்ப்பு", language: "ta", primary: "politics", note: "Indus Waters Treaty arbitration — foreign policy" },
  { title: "'Can remove Pak from world picture': Pakistan PMO crops Modi out of SCO pic, gets warned", primary: "politics" },

  // ── FINANCE ──────────────────────────────────────────────────────────
  { title: "RBI keeps repo rate unchanged at 6.5% in monetary policy review", primary: "finance" },
  { title: "Why stock market is down today: Fresh US strikes, inflation fears", primary: "finance" },
  { title: "Gold Rate Down | நாளுக்கு நாள் Surprise கொடுக்கும் தங்கம் விலை", language: "ta", primary: "finance" },
  { title: "வரி ஏய்ப்பு புகார்.. சென்னை, மதுரை தனியார் கருத்தரிப்பு மையங்களில் ஐடி சோதனை!", language: "ta", primary: "finance", note: "income-tax raids on private clinics — enforcement, no political actor" },
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

  // ── HELD-OUT batch 2 (labelled from a fresh snapshot slice, then the
  //    classifier was tuned only where it was clearly wrong) ──
  { title: "IMD Update: September is here, but south-west monsoon isn't over yet", primary: "other-relevant", note: "routine seasonal note, no warning" },
  { title: "Parkinson's Law, Butterfly Effect, and the beautiful chaos of deadline day", primary: "other-relevant", note: "an opinion column" },
  { title: "No curtains, black films: Delhi tightens bus safety rules after Greater Noida gangrape", primary: "politics", secondary: "crisis", note: "the news hook is the new rule" },
  { title: "Himachal under monsoon fury: 259 dead, 150 roads cut off, losses cross Rs 1,200 crore in 64 days", primary: "crisis" },
  { title: "Dilapidated Jaipur school, where CJP workers were attacked, demolished; new building soon", primary: "other-relevant" },
  { title: "CB-CID registers case over deepfake video of Tamil Nadu CM Vijay offering financial help", primary: "politics" },
  { title: "TVK MLA claims Rahul Gandhi will help Tamil Nadu CM Vijay become Prime Minister in 2029", primary: "politics" },
  { title: "Tamil Nadu Assembly: State government to launch health insurance for the elderly", primary: "politics" },
  { title: "Ambasamudram former MLA Esakki Subaya says he has written to Speaker withdrawing resignation", primary: "politics" },
  { title: "Goa Assembly passes Bill to drop 'leprosy' references from child law to curb stigma", primary: "politics" },
  { title: "BREAKING | மேகதாது அணை - கர்நாடகா கொடுத்த அறிக்கை.. | Karnataka | Mekedatu Dam", language: "ta", primary: "politics", note: "Cauvery / Mekedatu inter-state dispute" },
  { title: "Indian engineering exporters flag fresh tariff risk from US-Russia sanctions bill", primary: "finance", note: "trade / exports" },
  { title: "Reserve Bank of India — processing of applications received under the Citizen's Charter, status as on August 31", primary: "finance", note: "an RBI operational status note — borderline other-relevant, filed under the issuing domain" },
  { title: "Treasury Bills: full auction result", primary: "finance", note: "a market operation" },
  { title: "Key accused in Somangalam ATM burglary nabbed in Jaipur", primary: "crisis", note: "law and order — 'ATM' is not finance here" },
  { title: "'19th Century Views': Kerala Chief Minister rejects Grand Mufti's remarks on women", primary: "politics" },
  { title: "India A to play three four-dayers in New Zealand before the WTC Test series", primary: "sports" },
  { title: "PM Modi gifts Sindarov's World Cup-winning scoresheet to the Uzbekistan President", primary: "politics", note: "diplomacy, not a sports result" },
  { title: "Sri Lanka lose Women's Champions Trophy hosting rights over government interference in the board", primary: "sports", secondary: "politics" },
  { title: "TVS Motor Company extends its partnership with Angkor Tiger Football Club", primary: "other-relevant", note: "a corporate sponsorship, not a match" },
  { title: "Thailand bowl; India hand a T20I debut to Pratika Rawal", primary: "sports" },
  { title: "Smartphone ban at 52 Tamil Nadu temples with a ₹5-rule and an exception", primary: "politics", note: "a government order" },
  { title: "Conservancy workers boycott work over assault on supervisor in Erode", primary: "politics", secondary: "crisis", note: "a labour protest" },
  { title: "NHAI restores two-way traffic movement around Green Circle in Vellore town", primary: "other-relevant" },
  { title: "Chennai Port to push for more non-containerised cargo in a bid to boost trade", primary: "other-relevant" },
  { title: "Historic Shivappa Nayaka Palace in Shivamogga renovated, needs staff for maintenance", primary: "other-relevant" },
  { title: "A spicy dish from Burma naturalised in Madras", primary: "other-relevant" },
  { title: "RBI cuts CRR by 50 bps in a phased manner to ease liquidity", primary: "finance" },
  { title: "Chennai corporation demolishes 40 encroachments along the Cooum ahead of monsoon", primary: "politics", secondary: "crisis" },
  { title: "Two-wheeler sales fall 8% in August as rural demand stays weak", primary: "finance" },

  // ── MULTI-DOMAIN (v0.9 Phase B) — full secondary set declared; scored for
  //    strict precision + recall. Includes single-domain controls (secondaries: [])
  //    so an over-eager cross-domain rule shows up as a false positive.
  { title: "DMK, Congress corner Centre in Lok Sabha over falling GDP growth and rising unemployment", primary: "politics", secondaries: ["finance"], note: "economic data as the substance of a parliamentary clash" },
  { title: "Nirmala Sitharaman defends GST rate cuts as Opposition alleges revenue loss to states", primary: "finance", secondaries: ["politics"], note: "filed by subject (the GST cut); the political row is the secondary frame" },
  { title: "GST Council slashes rates on 33 items; FMCG and cement stocks rally", primary: "finance", secondaries: [], note: "policy → market reaction, both finance" },
  { title: "Tamil Nadu finance minister says Centre owes state ₹18,000 crore in GST compensation", primary: "finance", secondaries: ["politics"] },
  { title: "வேலைவாய்ப்பின்மை உயர்வு: மத்திய அரசை எதிர்க்கட்சிகள் கடும் விமர்சனம்", language: "ta", primary: "politics", secondaries: ["finance"], note: "unemployment rise, opposition criticises Centre" },
  { title: "Adani group shares slide 6% after new short-seller allegations; Congress demands JPC probe", primary: "politics", secondaries: ["finance"], note: "the news hook is the JPC demand; the share move is context" },
  { title: "RBI holds repo rate at 6.25% for a fourth straight review", primary: "finance", secondaries: [], note: "pure monetary policy, no political angle" },
  { title: "Sensex closes 400 points lower on weak global cues", primary: "finance", secondaries: [], note: "market move only" },
  { title: "Madras High Court stays SEBI order against a Chennai brokerage in an insider-trading case", primary: "finance", secondaries: ["politics"], note: "a court ruling on a market matter" },
  { title: "Enforcement Directorate raids premises of a former DMK minister in a ₹200-crore sand-mining case", primary: "politics", secondaries: ["finance"], note: "political figure + alleged financial wrongdoing" },
  { title: "Cabinet clears ₹6,300-crore Parandur airport project; land acquisition to begin next month", primary: "politics", secondaries: ["finance"] },
  { title: "Bill to set up a Tamil Nadu Investment Promotion Agency with single-window clearance tabled in Assembly", primary: "politics", secondaries: ["finance"] },
  { title: "CM inaugurates a new bus terminus in Kilambakkam", primary: "politics", secondaries: [], note: "routine launch, no fiscal or crisis angle stated" },
  { title: "Opposition walks out of Assembly over the government's handling of the Chennai water crisis", primary: "politics", secondaries: ["crisis"] },
  { title: "State government orders a safety audit of all school buildings after the Villupuram classroom-roof collapse", primary: "politics", secondaries: ["crisis"] },
  { title: "Madurai bench pulls up the state over unpaid flood-relief compensation from 2023", primary: "politics", secondaries: ["crisis"], note: "court + flood relief" },
  { title: "Greater Chennai Corporation razes 120 riverbank huts ahead of the northeast monsoon; residents allege no rehab", primary: "politics", secondaries: ["crisis"] },
  { title: "Sanitation workers strike in Coimbatore after a supervisor is assaulted by a contractor's men", primary: "politics", secondaries: ["crisis"], note: "labour protest triggered by an assault" },
  { title: "Home Minister announces tighter fireworks rules after the Sivakasi factory blast that killed 8", primary: "politics", secondaries: ["crisis"] },
  { title: "Assembly passes a bill to regulate app-based cab aggregators", primary: "politics", secondaries: [], note: "legislation, no crisis/finance substance" },
  { title: "Wild elephant electrocuted on a farm fence in Hosur; Forest Department suspends two staff", primary: "politics", secondaries: [], note: "a departmental administrative action — consistent with the Chittoor elephant case above" },
  { title: "Chess Olympiad: India's men hold USA to stay in medal contention", primary: "sports", secondaries: [], note: "pure result" },
  { title: "IOA suspends the state cricket association after a government-appointed panel takes over its finances", primary: "sports", secondaries: ["politics"] },
  { title: "India's Asian Games football fixture against China postponed as smog blankets the venue city", primary: "sports", secondaries: ["crisis"] },
  { title: "IPL play-off in Bengaluru moved to Hyderabad after heavy rain floods the outfield", primary: "sports", secondaries: ["crisis"] },
  { title: "Sports Ministry derecognises the wrestling federation, cites unresolved governance dispute", primary: "sports", secondaries: ["politics"] },
  { title: "Vaibhav Suryavanshi hits a 35-ball ton on Ranji debut for Bihar", primary: "sports", secondaries: [], note: "control — 'ton'/'debut' but no cross-domain angle" },
  { title: "Tamil Nadu Premier League final dras a record 38,000 crowd to Coimbatore", primary: "sports", secondaries: [], note: "control — attendance, not governance" },
  { title: "Doctors' association flags the recurring cost of the state's newborn gold-coin scheme to the Health Secretary", primary: "politics", secondaries: ["finance"] },
  { title: "Coimbatore civic body's ₹900-crore underground drainage project stalled over a funding dispute with the Centre", primary: "politics", secondaries: ["finance"] },
];

export const CATEGORY_CORPUS_META = {
  size: CATEGORY_CORPUS.length,
  capturedFrom: "live snapshot 2026-09-02",
};
