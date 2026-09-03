# Coverage Discovery — Phase 0 baseline

Snapshot `2026-09-03T07:59:03.528Z`. Every number computed from the live corpus.

## Corpus

| | |
|---|---|
| articles | 913 |
| clusters | 763 (routable 763) |
| distinct publishers | 24 |
| Tamil articles | 154 (17%) |
| English articles | 756 |
| Tamil Nadu clusters | 117 · India clusters 646 |

## By category

| category | clusters | articles | publishers | genuine-family mean | briefs delivered | TN |
|---|---|---|---|---|---|---|
| crisis | 74 | 115 | 17 | 0.76 | 25 | 8 |
| politics | 222 | 278 | 21 | 1.09 | 13 | 62 |
| finance | 43 | 57 | 13 | 1 | 6 | 2 |
| sports | 38 | 54 | 8 | 1.08 | 3 | 4 |
| other-relevant | 380 | 403 | 24 | 1.02 | 12 | 41 |
| entertainment | 4 | 4 | 3 | 1 | 0 | 0 |
| celebrity | 2 | 2 | 2 | 1 | 0 | 0 |

## Genuine independent-family distribution (all routable clusters)

| exactly 1 | 2 | 3–5 | 6–10 | 11+ |
|---|---|---|---|---|
| **735** | 20 | 7 | 1 | 0 |

> 96% of routable clusters have exactly one genuine independent newsroom. **This is the bottleneck B.3 targets.**

## Front door (top 20)

- categories: politics 14 · crisis 5 · finance 1
- native comprehension: **10/20**
- genuine-family mean: **1.6**
- single-family stories: **12/20**

| # | story | cat | TN | pubs | genuine | ta/en | brief |
|---|---|---|---|---|---|---|---|
| 1 | Rs 1,200-crore Secretariat, Olympic City, Formula 1 track: Vijay's Che | politics | ✓ | 5 | 5 | 1/6 | delivered |
| 2 | Flood | crisis |  | 1 | 0 | 0/1 | delivered |
| 3 | Supreme Court rules that BCI has no power to punish law students | politics |  | 2 | 2 | 0/2 | delivered |
| 4 | Setback for MK Stalin as High Court rejects plea against TVK's Kolathu | politics | ✓ | 4 | 4 | 0/10 | delivered |
| 5 | கிருஷ்ண ஜெயந்தி மற்றும் வாரக் கடைசி நாட்களை முன்னிட்டு 4,260 சிறப்பு ப | politics | ✓ | 2 | 2 | 2/0 | delivered |
| 6 | Udhayanidhi Stalin Speech | "ரீல்ஸ் அதிக ரீச் ஆனால் போதும்.." - பொங்கி | politics | ✓ | 2 | 2 | 2/0 | delivered |
| 7 | Tamil for Madras HC: CM Vijay to move resolution urging Centre's appro | politics | ✓ | 2 | 2 | 0/2 | delivered |
| 8 | Flood | crisis |  | 1 | 0 | 0/3 | delivered |
| 9 | "சென்னையில் 20 லட்சம் சதுர அடியில் புதிய சட்டப்பேரவை மற்றும் தலைமைச் ச | politics | ✓ | 3 | 3 | 6/0 | delivered |
| 10 | பெரம்பலூர் அருகே லாரி மீது ஆம்னி பேருந்து மோதி இருவர் உயிரிழப்பு | crisis | ✓ | 1 | 1 | 1/0 | withheld |
| 11 | PWD decides to tighten safety measures at construction sites in Kerala | politics |  | 1 | 1 | 0/1 | withheld |
| 12 | War Over 7.8% GDP Growth Data, Opposition Attacks Govt & NVIDIA CEO Je | finance |  | 1 | 1 | 0/1 | withheld |
| 13 | Assam: Two police personnel shot dead by colleague | crisis |  | 1 | 1 | 0/1 | withheld |
| 14 | 79% of Polavaram Left Main Canal works done in YSR’s tenure, Naidu cla | politics |  | 1 | 1 | 0/1 | withheld |
| 15 | ED raids residence of wanted ganja supplier in Cyberabad’s Nanakramgud | politics |  | 1 | 1 | 0/1 | withheld |
| 16 | அறிவிப்புக்கு மேல் அறிவிப்பு - அதிரடி காட்டிய CM விஜய் | CM Vijay Spee | politics | ✓ | 1 | 1 | 9/0 | withheld |
| 17 | Digital driving licences, vehicle registration certificates to be laun | politics | ✓ | 2 | 2 | 0/2 | delivered |
| 18 | TN Assembly adopts resolution urging Centre to recognise Tamil as High | politics | ✓ | 1 | 1 | 0/1 | withheld |
| 19 | Keralam seeks Mullaperiyar safety review as per 2025 ToR | crisis | ✓ | 1 | 1 | 0/1 | withheld |
| 20 | கோயில்களில் செல்போன்கள் தடையா, இல்லையா..? - அமைச்சர் அதிரடி பதில் | TV | politics | ✓ | 1 | 1 | 1/0 | withheld |

## Reading

- The corpus is **24 publishers across ~36 feeds.** The other newsrooms reporting these events are simply not ingested.
- A cross-cluster same-event re-search of the existing corpus with the frozen v0.6 identity engine finds **0** missed merges — the clustering is not the problem.
- Entertainment + celebrity are **6 clusters** and already excluded from every default surface. The B.2 profiler's "433 other" was its own coarse regex, not `cluster.trendData.category`.
- So B.3's job is **external coverage discovery**, budgeted crisis / politics / finance / sports first, Tamil Nadu first.
