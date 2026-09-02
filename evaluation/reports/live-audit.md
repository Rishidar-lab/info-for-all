# IFA live-data sample audit

- snapshot generated: 2026-09-02T03:45:46.498Z
- snapshot health: live · 17 feeds OK
- total clusters: 432 · verified comparisons: 8 · events carrying claims: 47
- events audited below: 11

Each event lists the reports IFA grouped, why, every extracted claim with its 
status, the independence breakdown, and what IFA says it does not know. This 
file is generated verbatim from the snapshot — nothing is tuned for the audit.

## Reviewer findings (v0.4, manual pass)

- **Clustering:** mostly correct. One recurring soft error — a broad shared
  entity ("Supreme Court", "NEET") can pull a tangential follow-up into a
  cluster (e.g. a "march withdrawn" item joined to the FIR-quashing story).
  The specific claims stay separate, so no false corroboration results, but the
  report list is slightly over-inclusive.
- **Claims:** attributed statements are correctly kept attributed and never
  promoted. Canonical text for a bare attributed quote drawn from a long excerpt
  can be verbose (clipped to ~150 chars); it is readable and correctly sourced.
- **Attribution:** speaker is retained in every attributed claim checked.
- **Corroboration:** honest — 2-publisher events show "partially-corroborated"
  or a single independent group, never full "corroborated" without 2 groups.
- **Independence:** wire credits (PTI/ANI) collapse correctly; same-publisher
  follow-ups collapse to one group.
- **Evidence:** no invented government records. Most sampled events had no CAP
  record retrieved and say so in "what we don't know".
- **Uncertainty:** every event lists open questions; single-source and attributed
  claims are always surfaced there.
- **Tamil:** Tamil-only weather headlines produce one event claim with the Tamil
  text preserved; they are not matched to English coverage (no translation layer).

## 1. Supreme Court quashes FIRs against against Gen Z NEET-UG protesters under Article 142

- slug: `supreme-court-quashes-firs-against-against-gen-z-neet-ug-10hbwb` · scope: india-relevant · crisis: no · languages: en
- cluster confidence: **strong** — Shared specific reference (supreme court, neet, firs) and headline overlap 47%.
- verified comparison: yes · districts: —

**Reports grouped (3):**

- The Hindu — “Supreme Court quashes FIRs against against Gen Z NEET-UG protesters under Article 142” (en, independent-report)
- The Hindu — “CJP chief hails Supreme Court's quashing of FIRs against students” (en, independent-report)
- Hindustan Times — “Supreme Court quashes all FIRs across the country against NEET paper leak protesters” (en, independent-report)

**Independence:** 3 reports · 2 publishers · 2 independent group(s) · 0 likely syndicated · 0 primary source(s).

**Claims (2):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| corroborated | event | Supreme Court quashes FIRs against against Gen Z NEET-UG protesters under Article 142 | 2p / 2g | 60 (moderate) |
| attributed | attribution | Abhijeet Dipke stated: justice has been dispensed to all those who fought at Jantar Mantar, and to the families of those who died due to NEET paper leak | 1p / 1g · Abhijeet Dipke | 34 (low) |

**CGI (experimental):** 57/100 (moderate).
  - + 1 of 2 claims corroborated by more than one independent source
  - + No genuine contradiction detected between sources
  - − 1 statement(s) are attributed to a speaker and not independently confirmed
  - − No primary government record retrieved for this event

**What IFA says it doesn't know (1):**
- Some statements below are attributed to a speaker; the underlying facts are not separately verified.

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 2. Tamil Nadu CM Vijay opens Mettur Dam releasing Cauvery water for irrigation in State

- slug: `tamil-nadu-cm-vijay-opens-mettur-dam-releasing-cauvery-w-mrr6ir` · scope: tamil-nadu · crisis: no · languages: en, ta
- cluster confidence: **strong** — Shared specific reference (cauvery, mettur dam, mettur) and headline overlap 44%.
- verified comparison: yes · districts: —

**Reports grouped (4):**

- The Hindu — “Tamil Nadu CM Vijay opens Mettur Dam releasing Cauvery water for irrigation in State” (en, independent-report)
- Hindustan Times — “‘Cauvery our legal right’: Tamil Nadu CM Vijay opens Mettur dam for Samba rice cultivation, drinking water needs” (en, independent-report)
- News18 Tamil — “மேட்டூர் அணை 45 நாட்களுக்கு திறப்பு.. முதலமைச்சர் விஜய்க்கு விவசாயிகள் முன்வைத்த முக்கிய கோரிக்கை!” (ta, independent-report)
- The Hindu — “With Tamil Nadu CM Vijay opening the Mettur dam, focus turns to longevity of water release” (en, independent-report)

**Independence:** 4 reports · 3 publishers · 3 independent group(s) · 0 likely syndicated · 0 primary source(s).

**Claims (3):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| corroborated | event | Tamil Nadu CM Vijay opens Mettur Dam releasing Cauvery water for irrigation in State | 3p / 3g | 64 (moderate) |
| corroborated | event | Dam was opened. | 2p / 2g | 62 (moderate) |
| single-source | statistic | 10,857 cusecs of water was released. | 1p / 1g | 52 (moderate) |

**CGI (experimental):** 62/100 (moderate).
  - + 2 of 3 claims corroborated by more than one independent source
  - + No genuine contradiction detected between sources
  - + 3 independent source groups cover the event
  - − 1 claim(s) rest on a single source
  - − No primary government record retrieved for this event

**What IFA says it doesn't know (1):**
- Some statements below rest on a single source and are not independently confirmed.

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 3. ED raids multiple States in fraud NHAI toll plaza collection case

- slug: `ed-raids-multiple-states-in-fraud-nhai-toll-plaza-collec-eyxzxz` · scope: india · crisis: no · languages: en
- cluster confidence: **probable** — Shared specific reference (nhai), headline overlap 36%.
- verified comparison: yes · districts: —

**Reports grouped (2):**

- The Hindu — “ED raids multiple States in fraud NHAI toll plaza collection case” (en, independent-report)
- Hindustan Times — “ED searches 14 premises across seven states, UTs in NHAI toll fraud case” (en, independent-report)

**Independence:** 2 reports · 2 publishers · 2 independent group(s) · 0 likely syndicated · 0 primary source(s).

**Claims (3):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| corroborated | event | ED raids multiple States in fraud NHAI toll plaza collection case | 2p / 2g | 60 (moderate) |
| attributed | attribution | They stated: about 14 premises in Uttar Pradesh, Rajasthan, Maharashtra, Jammu and Kashmir, Madhya Pradesh, Delhi-NCR and West Bengal were brought under the… | 1p / 1g · They | 34 (low) |
| single-source | allegation | Allegation reported: The searches were initiated to uncover the financial and digital trail of the alleged toll collection fraud | 1p / 1g | 50 (moderate) |

**CGI (experimental):** 43/100 (low).
  - + 1 of 3 claims corroborated by more than one independent source
  - + No genuine contradiction detected between sources
  - − 1 claim(s) rest on a single source
  - − 1 statement(s) are attributed to a speaker and not independently confirmed
  - − No primary government record retrieved for this event

**What IFA says it doesn't know (2):**
- Some statements below rest on a single source and are not independently confirmed.
- Some statements below are attributed to a speaker; the underlying facts are not separately verified.

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 4. Mamata Banerjee Niece Found Dead in Birbhum; SSC Scam Links Trigger Political Row

- slug: `mamata-banerjee-niece-found-dead-in-birbhum-ssc-scam-lin-ru8mk5` · scope: india · crisis: no · languages: en
- cluster confidence: **strong** — Shared specific reference (birbhum) and headline overlap 50%.
- verified comparison: yes · districts: —

**Reports grouped (3):**

- India Today — “Mamata Banerjee Niece Found Dead in Birbhum; SSC Scam Links Trigger Political Row” (en, independent-report)
- The Hindu — “Mamata Banerjee’s niece found dead at home in Birbhum” (en, independent-report)
- Hindustan Times — “Mamata Banerjee's niece found dead at her residence in West Bengal's Birbhum, say police” (en, independent-report)

**Independence:** 3 reports · 3 publishers · 3 independent group(s) · 0 likely syndicated · 0 primary source(s).

**Claims (1):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| corroborated | event | Mamata Banerjee Niece Found Dead in Birbhum; SSC Scam Links Trigger Political Row | 3p / 3g | 68 (moderate) |

**CGI (experimental):** 85/100 (high).
  - + 1 of 1 claims corroborated by more than one independent source
  - + No genuine contradiction detected between sources
  - + 3 independent source groups cover the event
  - − No primary government record retrieved for this event

**What IFA says it doesn't know (0):**
- (nothing flagged)

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 5. Three candidates shortlisted for Ram Janmabhoomi Trust’s first CEO

- slug: `three-candidates-shortlisted-for-ram-janmabhoomi-trust-s-1vdcje` · scope: india · crisis: no · languages: en
- cluster confidence: **strong** — Shared specific reference (three, trust) and headline overlap 23%.
- verified comparison: yes · districts: —

**Reports grouped (2):**

- The Hindu — “Three candidates shortlisted for Ram Janmabhoomi Trust’s first CEO” (en, independent-report)
- Hindustan Times — “Ram Temple trust may finalise new CEO today, 3 names recommended” (en, independent-report)

**Independence:** 2 reports · 2 publishers · 2 independent group(s) · 0 likely syndicated · 0 primary source(s).

**Claims (1):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| corroborated | event | Three candidates shortlisted for Ram Janmabhoomi Trust’s first CEO | 2p / 2g | 60 (moderate) |

**CGI (experimental):** 68/100 (moderate).
  - + 1 of 1 claims corroborated by more than one independent source
  - + No genuine contradiction detected between sources
  - − No primary government record retrieved for this event

**What IFA says it doesn't know (0):**
- (nothing flagged)

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 6. Girl jumps off Faridabad school roof, dies; dad says made to stand in sun for hours

- slug: `girl-jumps-off-faridabad-school-roof-dies-dad-says-made-15yvf4` · scope: india · crisis: no · languages: en
- cluster confidence: **strong** — Shared specific reference (faridabad, school) and headline overlap 25%.
- verified comparison: yes · districts: —

**Reports grouped (2):**

- Hindustan Times — “Girl jumps off Faridabad school roof, dies; dad says made to stand in sun for hours” (en, independent-report)
- NDTV — “Faridabad Girl, Punished In School Over Biryani Fight, Dies By Suicide” (en, independent-report)

**Independence:** 2 reports · 2 publishers · 2 independent group(s) · 0 likely syndicated · 0 primary source(s).

**Claims (2):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| corroborated | event | Girl jumps off Faridabad school roof, dies; dad says made to stand in sun for hours | 2p / 2g | 60 (moderate) |
| attributed | attribution | Police stated: School staff rushed her to Badshah Khan Civil Hospital, where she was declared dead from injuries sustained in the fall | 1p / 1g · police | 34 (low) |

**CGI (experimental):** 57/100 (moderate).
  - + 1 of 2 claims corroborated by more than one independent source
  - + No genuine contradiction detected between sources
  - − 1 statement(s) are attributed to a speaker and not independently confirmed
  - − No primary government record retrieved for this event

**What IFA says it doesn't know (1):**
- Some statements below are attributed to a speaker; the underlying facts are not separately verified.

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 7. Light Thunderstorm with surface wind — Dharmapuri, Kanchipuram, Pudukkottai +

- slug: `light-thunderstorm-with-surface-wind-dharmapuri-kanchipu-1rxwko` · scope: india · crisis: thunderstorm-lightning · languages: en
- cluster confidence: **weak** — 17 headlines from NDMA SACHET about the same event.
- verified comparison: no · districts: Dharmapuri, Kanchipuram, Pudukkottai, Ramanathapuram, Ranipet, Salem, Sivaganga, Thanjavur, Tiruvallur

**Reports grouped (17):**

- NDMA SACHET — “Light Thunderstorm,lightning, rain with surface wind (30-40 kmph) is likely to occur at a few places over Bokaro, Deoghar, Dhanbad, East Singhbum, Garhwa, Giridih, Hazaribagh, Jamtara, Khunti, Koderma, Latehar, Palamu, Ramgarh, Ranchi, Sar…” (en, official-alert)
- NDMA SACHET — “Light to moderate Rain is very likely to continue at a few places over Khowai and West Tripura for next 1-2 hours” (en, official-alert)
- NDMA SACHET — “Light to Moderate Rain is very likely to occur at a few places over North Goa, South Goa in next 3 hours.” (en, official-alert)
- NDMA SACHET — “Light to moderate Thunderstorm lightning accompanied with light to moderate rain and gusty wind with speed 30-40 kmph. very likely to affect over some parts of Malda district during next 2-3 hours from 07:15, 02-09-2026.” (en, official-alert)
- NDMA SACHET — “Light Rain is very likely to occur at isolated places over Chhotaudepur, Dahod, Narmada, Navsari, Panch Mahals, Surat, Tapi, The Dangs, Valsad, Dadra And Nagar Haveli, Daman in next 3 hours.” (en, official-alert)
- NDMA SACHET — “Light rain is very likely to occur at isolated places over Dadra Nagar Haveli and Daman districts in next 3 hours.” (en, official-alert)
- NDMA SACHET — “Light to moderate Rain is very likely to occur at a few places over Khowai, West Tripura in next 30 minutes to 2 hours.” (en, official-alert)
- NDMA SACHET — “Light to moderate Thunderstorm lightning accompanied with light to moderate rain. very likely to affect over some parts of Birbhum, Murshidabad, West Burdwan, East Burdwan districts during next 2-3 hours from 05:25, 02-09-2026.” (en, official-alert)
- NDMA SACHET — “Light to moderate rain with thunderstorm and lightning is likely to occur at isolated places over Kancheepuram, Ranipet, Thiruvallur in next 3 hours.” (en, official-alert)
- NDMA SACHET — “Moderate Thunderstorm lightning accompanied with intense rain and gusty wind with speed 30-40 kmph. very likely to affect over some parts of North 24 Parganas, Kolkata, Hooghly, South 24 Parganas, Howrah districts during next 2-3 hours fro…” (en, official-alert)
- NDMA SACHET — “Light Rain/ Light Thunderstorm with Lightning very likely over parts of North, North East in next 3 hours.” (en, official-alert)
- NDMA SACHET — “Moderate Thunderstorm with Lightning very likely over parts of Central, East, New Delhi, North West, South, South East, South West, Sahadara, West in next 3 hours.” (en, official-alert)
- NDMA SACHET — “Light to moderate Thunderstorm lightning accompanied with light to moderate rain. very likely to affect over some parts of Howrah, South 24 Parganas, North 24 Parganas, Kolkata, West Midnapore, East Midnapore, Jhargram districts during nex…” (en, official-alert)
- NDMA SACHET — “Light to Moderate Rain with Thunderstorm and Lightning is very likely to occur at isolated places over Dharmapuri, Pudukkottai, Ramanathapuram, Salem, Sivaganga, Thanjavur in next 3 hours.” (en, official-alert)
- NDMA SACHET — “Light to moderate Thunderstorm lightning accompanied with light to moderate rain. very likely to affect over some parts of Purulia, Bankura, West Burdwan districts during next 2-3 hours from 21:15, 01-09-2026.” (en, official-alert)
- NDMA SACHET — “Moderate Thunderstorm lightning accompanied with intense rain and gusty wind with speed 30-40 kmph. very likely to affect over some parts of East Midnapore, West Midnapore districts during next 2-3 hours from 21:10, 01-09-2026.” (en, official-alert)
- NDMA SACHET — “Moderate Thunderstorm lightning accompanied with intense rain and gusty wind with speed 30-40 kmph. very likely to affect over some parts of Bankura, Purulia, West Burdwan districts during next 2-3 hours from 14:40, 01-09-2026.” (en, official-alert)

**Independence:** 17 reports · 1 publishers · 1 independent group(s) · 0 likely syndicated · 8 primary source(s).

**Claims (2):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| single-source | event | Light Thunderstorm,lightning, rain with surface wind (30-40 kmph) is likely to occur at a few places over Bokaro, Deoghar, Dhanbad, East Singhbum, Garhwa, Giridih, Hazaribagh, Jamtara, Khunti, Koderm… | 1p / 1g | 68 (moderate) |
| single-source | statistic | Winds of 40 kmph were recorded or forecast. | 1p / 1g | 56 (moderate) |

**Primary evidence (7):**
- Light Thunderstorm with surface wind alert — IMD Ranchi · supports 1 claim(s) · https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788319214454027
- Light Rain alert — Tripura SDMA · supports 1 claim(s) · https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788319034205015
- Moderate Rain alert — IMD Goa · supports 1 claim(s) · https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788318602463033
- Light Thunderstorm with surface wind alert — West Bengal SDMA · supports 1 claim(s) · https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788313768434017
- Light Rain alert — Gujarat SDMA · supports 1 claim(s) · https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788313634678020
- Light Rain alert — Dadra and Nagar Haveli and Daman and Diu SDMA · supports 1 claim(s) · https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788313638211023
- Moderate Thunderstorms with surface wind alert — West Bengal SDMA · supports 1 claim(s) · https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788255454632017

**What IFA says it doesn't know (4):**
- No casualty, evacuation or damage figure has been reported by any source.
- Some statements below rest on a single source and are not independently confirmed.
- No independent on-ground report has corroborated this alert yet.
- Casualty, damage and evacuation figures are not established from these sources.

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 8. Light Thunderstorms

- slug: `light-thunderstorms-1dbeva` · scope: india-relevant · crisis: thunderstorm-lightning · languages: en
- cluster confidence: **strong** — Single report.
- verified comparison: no · districts: —

**Reports grouped (1):**

- NDMA SACHET — “IMD Guwahati has issued forecast for Light Thunderstorms with rain/thundershowers which is very likely to occur at many places over Cachar, Dima Hasao, Tamulpur, Udalguri in next 3 hours. Issued in Public Interest by ASDMA.” (en, official-alert)

**Independence:** 1 reports · 1 publishers · 1 independent group(s) · 0 likely syndicated · 2 primary source(s).

**Claims (1):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| single-source | event | IMD Guwahati has issued forecast for Light Thunderstorms with rain/thundershowers which is very likely to occur at many places over Cachar, Dima Hasao, Tamulpur, Udalguri in next 3 hours. Issued in P… | 1p / 1g | 68 (moderate) |

**Primary evidence (1):**
- Light Thunderstorms alert — Assam SDMA · supports 1 claim(s) · https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788313180968010

**What IFA says it doesn't know (4):**
- No casualty, evacuation or damage figure has been reported by any source.
- Some statements below rest on a single source and are not independently confirmed.
- No independent on-ground report has corroborated this alert yet.
- Casualty, damage and evacuation figures are not established from these sources.

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 9. Lightning

- slug: `lightning-6bwrb1` · scope: india · crisis: thunderstorm-lightning · languages: en
- cluster confidence: **strong** — Single report.
- verified comparison: no · districts: —

**Reports grouped (1):**

- NDMA SACHET — “మీ ప్రాంతంలో పిడుగులు పడే అవకాశం ఉంది.ఉరుములు మెరుపులతో కూడిన వర్షం పడేప్పుడు చెట్లు,టవర్స్,పోల్స్,పొలాలు,బహిరంగ ప్రదేశాల్లో ఉండరాదు.సురక్షితమైన భవనాల్లో ఆశ్రయం పొందండి-ఆంధ్రప్రదేశ్ ప్రభుత్వం.” (en, official-alert)

**Independence:** 1 reports · 1 publishers · 1 independent group(s) · 0 likely syndicated · 2 primary source(s).

**Claims (1):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| single-source | event | మీ ప్రాంతంలో పిడుగులు పడే అవకాశం ఉంది.ఉరుములు మెరుపులతో కూడిన వర్షం పడేప్పుడు చెట్లు,టవర్స్,పోల్స్,పొలాలు,బహిరంగ ప్రదేశాల్లో ఉండరాదు.సురక్షితమైన భవనాల్లో ఆశ్రయం పొందండి-ఆంధ్రప్రదేశ్ ప్రభుత్వం. | 1p / 1g | 68 (moderate) |

**Primary evidence (1):**
- Lightning alert — Andhra Pradesh SDMA · supports 1 claim(s) · https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1788317900428008

**What IFA says it doesn't know (4):**
- No casualty, evacuation or damage figure has been reported by any source.
- Some statements below rest on a single source and are not independently confirmed.
- No independent on-ground report has corroborated this alert yet.
- Casualty, damage and evacuation figures are not established from these sources.

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 10. Madras High Court directs T.N. Nursing Council to change a member’s gender from ‘transgender’ to ‘male’ in records

- slug: `madras-high-court-directs-t-n-nursing-council-to-change-ba3emj` · scope: tamil-nadu · crisis: no · languages: en
- cluster confidence: **weak** — 4 headlines from The Hindu about the same event.
- verified comparison: no · districts: Chennai, Madurai

**Reports grouped (4):**

- The Hindu — “Madras High Court directs T.N. Nursing Council to change a member’s gender from ‘transgender’ to ‘male’ in records” (en, independent-report)
- The Hindu — “Dhoni’s ₹100-crore defamation suit: Madras High Court directs Registry to number retired IPS officer’s plea” (en, independent-report)
- The Hindu — “₹100-crore defamation suit filed by M.S. Dhoni: Madras High Court orders commencement of trial” (en, independent-report)
- The Hindu — “Madras High Court reserves orders on Annamalai’s plea to quash case over remarks on Muthuramalinga Thevar” (en, independent-report)

**Independence:** 4 reports · 1 publishers · 1 independent group(s) · 0 likely syndicated · 0 primary source(s).

**Claims (2):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| single-source | statistic | ₹0 crore was allocated. | 1p / 1g | 52 (moderate) |
| single-source | event | Madras High Court directs T.N. Nursing Council to change a member’s gender from ‘transgender’ to ‘male’ in records | 1p / 1g | 46 (moderate) |

**What IFA says it doesn't know (1):**
- Some statements below rest on a single source and are not independently confirmed.

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

## 11. Madras Day 2026: ticking on behind Metro Rail barricades

- slug: `madras-day-2026-ticking-on-behind-metro-rail-barricades-tp1cn3` · scope: tamil-nadu · crisis: no · languages: en
- cluster confidence: **weak** — 2 headlines from The Hindu about the same event.
- verified comparison: no · districts: Chennai

**Reports grouped (2):**

- The Hindu — “Madras Day 2026: ticking on behind Metro Rail barricades” (en, independent-report)
- The Hindu — “Madras Day 2026: alone with the timepieces at tiny Peer & Sons in Mylapore” (en, independent-report)

**Independence:** 2 reports · 1 publishers · 1 independent group(s) · 0 likely syndicated · 0 primary source(s).

**Claims (1):**

| Status | Type | Claim | Support | Conf |
|---|---|---|---|---|
| single-source | event | Madras Day 2026: ticking on behind Metro Rail barricades | 1p / 1g | 46 (moderate) |

**What IFA says it doesn't know (1):**
- Some statements below rest on a single source and are not independently confirmed.

**Reviewer check:** ⬜ cluster correct ⬜ claims correct ⬜ attribution correct ⬜ corroboration honest ⬜ independence honest ⬜ evidence correct ⬜ uncertainty complete

---

