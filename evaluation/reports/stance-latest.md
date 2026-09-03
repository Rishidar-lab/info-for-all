# IFFA stance-classifier evaluation (v0.11)

- corpus: 64 first-pass examples (**humanVerified: 0 / 64**)
- **accuracy 54.7% · macro-F1 53.8%**
- INDICATIVE ONLY — labels are not human-verified; not a v1.0 gate.

| Label | Support | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| SUPPORTIVE | 4 | 50% | 25% | 33% |
| CRITICAL | 7 | 100% | 71% | 83% |
| NEUTRAL_DESCRIPTIVE | 45 | 89% | 53% | 67% |
| MIXED | 4 | 100% | 50% | 67% |
| UNCLEAR | 4 | 11% | 75% | 19% |

## Confusion (rows = gold, cols = predicted)

| gold \ pred | SUPPORTIVE | CRITICAL | NEUTRAL_DESCRIPTIVE | MIXED | UNCLEAR |
|---|---:|---:|---:|---:|---:|
| SUPPORTIVE | 1 | 0 | 2 | 0 | 1 |
| CRITICAL | 0 | 5 | 0 | 0 | 2 |
| NEUTRAL_DESCRIPTIVE | 0 | 0 | 24 | 0 | 21 |
| MIXED | 1 | 0 | 0 | 2 | 1 |
| UNCLEAR | 0 | 0 | 1 | 0 | 3 |

## Misses

  s004 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — Rahul Gandhi will help Tamil Nadu CM Vijay become Prime Minist
  s005 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — Tamil Nadu government to withdraw cases filed against farmers,
  s013 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — Bill to set up Tamil Nadu Investment Promotion Commission, fas
  s015 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — Is Tamil Nadu Finance Minister the King of England to avoid co
  s018 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — AI fraud in the Chief Minister’s name: scammers share a WhatsA
  s020 [en] want SUPPORTIVE, got NEUTRAL_DESCRIPTIVE — Tamil Nadu hailed for record welfare rollout as officials cred
  s024 [en] want SUPPORTIVE, got NEUTRAL_DESCRIPTIVE — Modi government's Swadeshi push draws praise from industry lea
  s028 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — Residents block key stretch near Ambur demanding resumption of
  s030 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — GST collections rise 14.8% to ₹1.99 trillion in August; refund
  s034 [en] want MIXED, got UNCLEAR — BJP’s Tamil Nadu unit gains ground in the delta, but internal 
  s035 [en] want MIXED, got SUPPORTIVE — Sovereign rating upgrade vindicates the Centre's fiscal path, 
  s039 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — Supreme Court asks Prashant Bhushan to approach Delhi High Cou
  s041 [ta] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — சென்னையில் உலகத்தரம் வாய்ந்த தமிழ்நாடு ஒலிம்பிக் நகரம் அமைக்கப
  s042 [ta] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — திமுக தலைவர் மு.க.ஸ்டாலின் தொடர்ந்த தேர்தல் வழக்கு தள்ளுபடி
  s043 [ta] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — “இந்த ஆட்சி, பெண்களுக்கு மிகப்பெரிய டிராஜடியாக மாறிவிட்டது” - 
  s044 [ta] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — ராகுல் காந்திக்கு எதிராக வழக்கு; காங்கிரஸ் கண்டன ஆர்ப்பாட்டம்!
  s045 [ta] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — பாஸ்போர்ட் அலுவலகத்திற்கு வந்த விஜய்; அண்ணா சாலையில் திரண்ட மக
  s046 [ta] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — ரேஷன்கடைகளில் வெங்காயம் விற்பனை தொடக்கம்
  s047 [ta] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — மெட்டூர் அணை செலவை விட, முதல்வர் வருகைக்கான செலவு அதிகம் என பா
  s048 [ta] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — கையில் பேப்பரோடு CM விஜய் சொன்ன வார்த்தை - பேரவையில் செம சீன்.
  s049 [ta] want SUPPORTIVE, got UNCLEAR — முதல்வரின் அறிவிப்புகள் மக்களுக்கு நன்மை பயக்கும் என பாராட்டப்
  s050 [ta] want CRITICAL, got UNCLEAR — திமுக ஆட்சியின் தோல்வி: கட்சி தொண்டர்களிடையே அதிருப்தி
  s051 [ta] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — நீர் விநியோகம் தொடர்பாக அரசு விளக்கம் விடுத்தது
  s052 [ta] want CRITICAL, got UNCLEAR — அதிமுக கூட்டணி குழப்பம்: மூத்த தலைமையில் விரிசல்
  s058 [en] want UNCLEAR, got NEUTRAL_DESCRIPTIVE — Cabinet meets today
  s060 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — 'Bar Council has no power to act against law students': Suprem
  s061 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — Centre slashes sugar dealers' stock limit to 2,000 quintals fr
  s062 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — Singai G. Ramachandran appointed Chairperson of Tamil Nadu Sta
  s064 [en] want NEUTRAL_DESCRIPTIVE, got UNCLEAR — Katchatheevu row resurfaces in Assembly; TVK Ministers accuse 