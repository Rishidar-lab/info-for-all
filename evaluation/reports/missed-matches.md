# Missed matches — root-cause analysis (v0.5 Phase 8)

Frozen v0.4 corpus. 93 true-positive pairs examined; **10 false negatives**.

## By root cause (ranked)

| Cause | Count | Cases |
|---|---|---|
| Tamil inflection / morphology | 4 | P04, P12, P13, P14 |
| insufficient context (state-level, no district) | 3 | C05, J10, S10 |
| Tamil↔English (no cross-language layer) | 3 | Q06, Q11, Q14 |

## Detail

### Tamil inflection / morphology (4)

- **P04** — NOT clustered (event-identity gap)
  - A: நாகப்பட்டினம் மீனவர்கள் கடலுக்கு செல்ல வேண்டாம் என எச்சரிக்கை
  - B: நாகை கடலோரத்தில் மீன்பிடிக்க தடை; வானிலை மோசம்
- **P12** — NOT clustered (event-identity gap)
  - A: விழுப்புரத்தில் சாலை சரிவு; வாகன போக்குவரத்து மாற்றம்
  - B: விழுப்புரம்: மழையால் சாலை பாதிப்பு; வழித்தடம் மாற்றம்
- **P13** — NOT clustered (event-identity gap)
  - A: தமிழ்நாட்டில் 16 மாவட்டங்களுக்கு மழை எச்சரிக்கை
  - B: 16 மாவட்டங்களில் இன்று கனமழை; வானிலை மையம் எச்சரிக்கை
- **P14** — NOT clustered (event-identity gap)
  - A: கன்னியாகுமரியில் கடல் கொந்தளிப்பு; படகுகள் கரைக்கு
  - B: குமரி மாவட்டத்தில் கடல் அலைகள் அதிகரிப்பு; மீனவர்கள் வெளியேறல்

### insufficient context (state-level, no district) (3)

- **C05** — clustered; no shared SPECIFIC claim (claim-identity gap)
  - A: Mettur dam level at 118 feet against a full level of 120 feet
  - B: Mettur storage nears full: 118 ft of 120 ft
- **J10** — NOT clustered (event-identity gap)
  - A: Heavy rain disrupts flights and trains across Tamil Nadu
  - B: Tamil Nadu weather: air and rail traffic hit by downpour
- **S10** — NOT clustered (event-identity gap)
  - A: Two fishermen from Rameswaram go missing after boat capsizes
  - B: Rameshwaram boat mishap: search on for two missing fishermen

### Tamil↔English (no cross-language layer) (3)

- **Q06** — NOT clustered (event-identity gap)
  - A: ஈரோட்டில் காவிரி கரையோர மக்கள் வெளியேற்றம்
  - B: Erode: residents on the Cauvery banks moved to safety as river swells
- **Q11** — NOT clustered (event-identity gap)
  - A: புயல் திட்வா நாகப்பட்டினம் அருகே கரையை கடக்கும் என எதிர்பார்ப்பு
  - B: Cyclone Ditwah likely to cross coast near Nagapattinam on Thursday
- **Q14** — NOT clustered (event-identity gap)
  - A: சேலத்தில் மேட்டூர் அணை திறப்பையொட்டி விவசாயிகள் மகிழ்ச்சி
  - B: Farmers in Salem welcome the Cauvery water release from Mettur dam

## Priority order for v0.5

1. **Tamil inflection / morphology** — 4 case(s)
2. **insufficient context (state-level, no district)** — 3 case(s)
3. **Tamil↔English (no cross-language layer)** — 3 case(s)

