/**
 * DEMO DATA for IFA.
 *
 * ── This is synthetic development data. ──────────────────────────────────────
 * Every publication, person, organisation, country and event below is FICTIONAL.
 * Nothing here describes a real news event. It exists to exercise clustering,
 * the claim graph, the evidence engine and the Common Ground Index. The UI
 * badges all of it as "DEMO DATA".
 *
 * Places use invented names (Republic of Ardenne, Federal Republic of Solenne,
 * the Kestrel Sea, …) so the content cannot be mistaken for real reporting.
 */

import { toParagraphs } from "../text";

export interface SeedSource {
  key: string;
  name: string;
  domain: string;
  country: string;
  language?: string;
  orgType: string;
  category: string;
  parentCompany?: string;
  ownershipGroup?: string;
  foundedYear?: number;
  websiteUrl?: string;
  publishesPrimarySources?: boolean;
}

export interface SeedArticle {
  key: string;
  sourceKey: string;
  title: string;
  description: string;
  body: string;
  author?: string;
  hoursAgo: number;
  wireService?: string;
  syndicatedFrom?: string;
  role: "origin" | "corroboration" | "reaction" | "primary_document";
}

export interface SeedClaim {
  key: string;
  articleKey: string;
  canonicalText: string;
  originalText: string;
  type: string;
  isKeyClaim?: boolean;
  extractionConfidence?: number;
  paragraph?: number;
  entityKeys?: string[];
  status?: string;
}

export interface SeedRelationship {
  from: string;
  to: string;
  type: "SUPPORTS" | "CONTRADICTS" | "REFINES" | "DUPLICATES";
  confidence: number;
  rationale: string;
}

export interface SeedEvidence {
  key: string;
  title: string;
  url: string;
  publisher: string;
  type: string;
  isPrimary: boolean;
  hoursAgo?: number;
  contentHash?: string;
  supports: string[];
  contradicts?: string[];
  note?: string;
}

export interface SeedTimeline {
  hoursAgo: number;
  headline: string;
  detail?: string;
  type: string;
  confidence: number;
  articleKey?: string;
}

export interface SeedCorrection {
  claimKey?: string;
  originalText: string;
  updatedText: string;
  reason: string;
  hoursAgo: number;
  sourceUrl?: string;
}

export interface SeedEntity {
  key: string;
  name: string;
  type: string;
  description?: string;
}

export interface SeedEvent {
  slug: string;
  title: string;
  summary: string;
  category: string;
  location: string;
  status: string;
  startedHoursAgo: number;
  latestUpdateHoursAgo: number;
  topics: string[];
  entities: { key: string; salience: number }[];
  articles: SeedArticle[];
  claims: SeedClaim[];
  relationships: SeedRelationship[];
  evidence: SeedEvidence[];
  timeline: SeedTimeline[];
  corrections?: SeedCorrection[];
}

export const SEED_TOPICS = [
  { slug: "ai-governance", name: "AI Governance", description: "Rules, oversight and enforcement for artificial-intelligence systems." },
  { slug: "monetary-policy", name: "Monetary Policy", description: "Central-bank rate decisions and guidance." },
  { slug: "fundamental-research", name: "Fundamental Research", description: "Claims emerging from laboratories and preprints." },
  { slug: "maritime-affairs", name: "Maritime Affairs", description: "Boundaries, navigation rights and law of the sea." },
  { slug: "product-safety", name: "Product Safety", description: "Recalls, regulators and consumer-hardware risk." },
  { slug: "technology-policy", name: "Technology Policy", description: "Government action on digital technology." },
];

export const SEED_SOURCES: SeedSource[] = [
  { key: "trn", name: "Transregional Newswire", domain: "trn-wire.example", country: "Republic of Ardenne", orgType: "wire_service", category: "wire_service", ownershipGroup: "Transregional Cooperative", foundedYear: 1948, websiteUrl: "https://trn-wire.example" },
  { key: "npm", name: "Northwind Public Media", domain: "northwind.example", country: "Republic of Ardenne", orgType: "public_broadcaster", category: "public_broadcaster", ownershipGroup: "Northwind Public Media", foundedYear: 1966, websiteUrl: "https://northwind.example" },
  { key: "meridian", name: "The Meridian Dispatch", domain: "meridiandispatch.example", country: "Republic of Ardenne", orgType: "private_news", category: "private_news", parentCompany: "Anchorline Media Group", ownershipGroup: "Anchorline Media Group", foundedYear: 1901, websiteUrl: "https://meridiandispatch.example" },
  { key: "vanguard", name: "Vanguard Daily", domain: "vanguarddaily.example", country: "Republic of Ardenne", orgType: "private_news", category: "private_news", parentCompany: "Anchorline Media Group", ownershipGroup: "Anchorline Media Group", foundedYear: 1994, websiteUrl: "https://vanguarddaily.example" },
  { key: "capitol", name: "Capitol Ledger", domain: "capitolledger.example", country: "Republic of Ardenne", orgType: "private_news", category: "private_news", parentCompany: "Keystone Publishing", ownershipGroup: "Keystone Publishing", foundedYear: 1978, websiteUrl: "https://capitolledger.example" },
  { key: "harbor", name: "The Harbor Post", domain: "harborpost.example", country: "Federal Republic of Solenne", orgType: "private_news", category: "private_news", parentCompany: "Keystone Publishing", ownershipGroup: "Keystone Publishing", foundedYear: 1955, websiteUrl: "https://harborpost.example" },
  { key: "signalpost", name: "Signalpost", domain: "signalpost.example", country: "Federal Republic of Solenne", orgType: "independent_outlet", category: "independent_outlet", ownershipGroup: "Signalpost Collective", foundedYear: 2016, websiteUrl: "https://signalpost.example" },
  { key: "longform", name: "The Longform Bureau", domain: "longformbureau.example", country: "Republic of Ardenne", orgType: "independent_outlet", category: "independent_outlet", ownershipGroup: "Longform Bureau", foundedYear: 2011, websiteUrl: "https://longformbureau.example" },
  { key: "ipm", name: "Institute for Policy Metrics", domain: "policymetrics.example", country: "Republic of Ardenne", orgType: "research_organization", category: "research_organization", ownershipGroup: "Institute for Policy Metrics", foundedYear: 1997, websiteUrl: "https://policymetrics.example", publishesPrimarySources: true },
  { key: "assembly", name: "National Assembly Press Office", domain: "assembly.gov.example", country: "Republic of Ardenne", orgType: "government", category: "government", ownershipGroup: "Government of Ardenne", websiteUrl: "https://assembly.gov.example", publishesPrimarySources: true },
  { key: "reservebank", name: "Reserve Bank Communications", domain: "reservebank.gov.example", country: "Republic of Ardenne", orgType: "government", category: "government", ownershipGroup: "Reserve Bank of Ardenne", websiteUrl: "https://reservebank.gov.example", publishesPrimarySources: true },
  { key: "safetyagency", name: "Consumer Safety Agency Bulletin", domain: "csa.gov.example", country: "Federal Republic of Solenne", orgType: "government", category: "government", ownershipGroup: "Government of Solenne", websiteUrl: "https://csa.gov.example", publishesPrimarySources: true },
  { key: "lumen", name: "Lumen Devices Newsroom", domain: "lumendevices.example", country: "Federal Republic of Solenne", orgType: "corporate_publication", category: "corporate_publication", ownershipGroup: "Lumen Devices", websiteUrl: "https://lumendevices.example" },
  { key: "civic", name: "The Civic Review", domain: "civicreview.example", country: "Federal Republic of Solenne", orgType: "private_news", category: "private_news", ownershipGroup: "Civic Review Trust", foundedYear: 1983, websiteUrl: "https://civicreview.example" },
  { key: "orbit", name: "Orbit Science Report", domain: "orbitscience.example", country: "Republic of Ardenne", orgType: "private_news", category: "private_news", ownershipGroup: "Orbit Media", foundedYear: 2004, websiteUrl: "https://orbitscience.example" },
  { key: "quanta", name: "Quanta Preprint Archive", domain: "quanta-archive.example", country: "Republic of Ardenne", orgType: "research_organization", category: "research_organization", ownershipGroup: "Quanta Archive", websiteUrl: "https://quanta-archive.example", publishesPrimarySources: true },
  { key: "foreignoffice", name: "Ministry of Foreign Affairs Briefing Room", domain: "mfa.gov.example", country: "Republic of Ardenne", orgType: "government", category: "government", ownershipGroup: "Government of Ardenne", websiteUrl: "https://mfa.gov.example", publishesPrimarySources: true },
];

export const SEED_ENTITIES: SeedEntity[] = [
  { key: "assembly", name: "National Assembly of Ardenne", type: "government_body" },
  { key: "digitalministry", name: "Ministry of Digital Affairs", type: "government_body" },
  { key: "aioversightbill", name: "AI Systems Oversight Bill", type: "law" },
  { key: "rapporteur", name: "Deputy Corin Vale", type: "person", description: "Bill rapporteur in the National Assembly (fictional)." },
  { key: "reservebank", name: "Reserve Bank of Ardenne", type: "government_body" },
  { key: "governor", name: "Governor Ilse Marchetti", type: "person", description: "Reserve Bank governor (fictional)." },
  { key: "solenne", name: "Federal Republic of Solenne", type: "location" },
  { key: "ardenne", name: "Republic of Ardenne", type: "location" },
  { key: "kestrelsea", name: "Kestrel Sea", type: "location" },
  { key: "maritimeaccord", name: "Kestrel Sea Boundary Accord", type: "law" },
  { key: "lumen", name: "Lumen Devices", type: "organization" },
  { key: "csa", name: "Consumer Safety Agency", type: "government_body" },
  { key: "auroralab", name: "Aurora Materials Laboratory", type: "organization", description: "Research lab reporting the superconductivity claim (fictional)." },
  { key: "leadauthor", name: "Dr. Nadia Frost", type: "person", description: "Lead author of the superconductivity preprint (fictional)." },
  { key: "pilotdevice", name: "Lumen Pulse Earbuds", type: "product" },
];

function body(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

/* Verify paragraph indices used by claims resolve to real paragraphs. */
export function paragraphCount(article: SeedArticle): number {
  return toParagraphs(article.body).length;
}

export const SEED_EVENTS: SeedEvent[] = [
  {
    slug: "ardenne-ai-oversight-bill-introduced",
    title: "National Assembly introduces draft AI oversight bill",
    summary:
      "The National Assembly of Ardenne formally introduced the AI Systems Oversight Bill on Monday. The published text creates a registration duty for certain AI systems and a new supervisory unit inside the Ministry of Digital Affairs. Sources agree on the introduction and the supervisor; they disagree on how broadly the enforcement powers reach.",
    category: "technology",
    location: "Republic of Ardenne",
    status: "active",
    startedHoursAgo: 54,
    latestUpdateHoursAgo: 5,
    topics: ["ai-governance", "technology-policy"],
    entities: [
      { key: "assembly", salience: 0.9 },
      { key: "aioversightbill", salience: 0.95 },
      { key: "digitalministry", salience: 0.8 },
      { key: "rapporteur", salience: 0.5 },
      { key: "ardenne", salience: 0.4 },
    ],
    articles: [
      {
        key: "ai-trn",
        sourceKey: "trn",
        title: "Ardenne lawmakers table AI oversight bill",
        description: "A wire report on the introduction of the AI Systems Oversight Bill in the National Assembly.",
        hoursAgo: 53,
        role: "origin",
        author: "Transregional Newswire staff",
        body: body([
          "The National Assembly of Ardenne introduced the AI Systems Oversight Bill on Monday, opening debate on the country's first dedicated legislation for artificial-intelligence systems.",
          "The published text requires operators of certain AI systems to register with authorities before deployment and to file annual risk assessments.",
          "A new supervisory unit would be established inside the Ministry of Digital Affairs, according to the bill text released by the Assembly Press Office.",
          "Deputy Corin Vale, the bill's rapporteur, said the government aimed to complete a first reading within six weeks.",
        ]),
      },
      {
        key: "ai-npm",
        sourceKey: "npm",
        title: "AI oversight bill enters the Assembly: what the text says",
        description: "Public broadcaster explainer on the introduced bill and its registration duty.",
        hoursAgo: 49,
        role: "corroboration",
        author: "Priya Alderton",
        body: body([
          "Lawmakers began considering the AI Systems Oversight Bill on Monday after the National Assembly introduced the measure and published its full text.",
          "The bill introduces a registration requirement for AI systems that the text designates as high-risk, and it creates a supervisory unit within the Ministry of Digital Affairs.",
          "Northwind Public Media has reviewed the 46-page document. It applies obligations to systems used in hiring, credit, education and essential public services.",
          "Deputy Corin Vale said enforcement would be phased in over two years.",
        ]),
      },
      {
        key: "ai-meridian",
        sourceKey: "meridian",
        title: "Government moves on AI rules with new supervisory unit",
        description: "The Meridian Dispatch reports on the bill's introduction and the proposed supervisor.",
        hoursAgo: 47,
        role: "corroboration",
        author: "H. Okonkwo",
        body: body([
          "The Ardenne government introduced legislation on Monday to regulate artificial-intelligence systems, confirming months of consultation.",
          "The AI Systems Oversight Bill would require registration for high-risk AI systems and establish a supervisory unit inside the Ministry of Digital Affairs.",
          "Industry groups welcomed the clarity but warned that the compliance timeline is tight.",
        ]),
      },
      {
        key: "ai-vanguard",
        sourceKey: "vanguard",
        title: "AI bill introduced; scope of powers draws early scrutiny",
        description: "Vanguard Daily notes questions about how far the enforcement authority extends.",
        hoursAgo: 33,
        role: "reaction",
        author: "L. Brand",
        body: body([
          "A day after the AI Systems Oversight Bill was introduced, attention turned to the powers of the proposed supervisory unit.",
          "One provision permits the supervisor to order any generative AI system withdrawn from the market pending review, language that several legal analysts called unusually broad.",
          "The Ministry of Digital Affairs said the power was limited to high-risk systems and would be subject to judicial appeal.",
        ]),
      },
      {
        key: "ai-signalpost",
        sourceKey: "signalpost",
        title: "Reading the AI bill: the enforcement clause everyone is arguing about",
        description: "Signalpost analysis of the contested Article 12 enforcement language.",
        hoursAgo: 20,
        role: "reaction",
        author: "M. Reyes",
        body: body([
          "The fight over Ardenne's AI Systems Oversight Bill has narrowed to a single clause.",
          "Article 12 lets the supervisory unit suspend an AI system if it presents a serious risk. Critics say the definition of serious risk is left to the supervisor and could reach all generative AI systems.",
          "Supporters, including Deputy Corin Vale, say Article 12 only applies to systems already inside the high-risk register and cannot be used as a general power.",
          "The Assembly's legal service has been asked for an opinion.",
        ]),
      },
      {
        key: "ai-capitol",
        sourceKey: "capitol",
        title: "AI oversight bill introduced in the Assembly",
        description: "Capitol Ledger brief on the bill's introduction.",
        hoursAgo: 50,
        role: "corroboration",
        body: body([
          "The National Assembly introduced the AI Systems Oversight Bill on Monday.",
          "The measure would create a registration duty and a supervisory unit in the Ministry of Digital Affairs.",
          "A first reading is expected within six weeks.",
        ]),
      },
      {
        key: "ai-harbor",
        sourceKey: "harbor",
        title: "Ardenne tables AI oversight legislation",
        description: "The Harbor Post carries the Transregional Newswire dispatch on the bill.",
        hoursAgo: 52,
        wireService: "Transregional Newswire",
        syndicatedFrom: "trn",
        role: "corroboration",
        body: body([
          "The National Assembly of Ardenne introduced the AI Systems Oversight Bill on Monday, opening debate on the country's first dedicated legislation for artificial-intelligence systems.",
          "The published text requires operators of certain AI systems to register with authorities before deployment and to file annual risk assessments.",
          "A new supervisory unit would be established inside the Ministry of Digital Affairs.",
        ]),
      },
      {
        key: "ai-ipm",
        sourceKey: "ipm",
        title: "Analysis: the AI Systems Oversight Bill compared with existing frameworks",
        description: "Institute for Policy Metrics working note comparing the bill to other regimes.",
        hoursAgo: 12,
        role: "reaction",
        author: "Institute for Policy Metrics",
        body: body([
          "The introduced AI Systems Oversight Bill follows a risk-tiered structure. Obligations attach to a defined register of high-risk uses rather than to all AI systems.",
          "Our reading of Article 12 is that suspension powers are bounded by the high-risk register, though the drafting could be tightened.",
          "The bill would make Ardenne the third jurisdiction in the region with a statutory AI supervisor.",
        ]),
      },
    ],
    claims: [
      {
        key: "ai-introduced",
        articleKey: "ai-trn",
        canonicalText: "The National Assembly of Ardenne introduced the AI Systems Oversight Bill on Monday.",
        originalText: "The National Assembly of Ardenne introduced the AI Systems Oversight Bill on Monday, opening debate on the country's first dedicated legislation for artificial-intelligence systems.",
        type: "observation",
        isKeyClaim: true,
        extractionConfidence: 0.92,
        paragraph: 0,
        entityKeys: ["assembly", "aioversightbill"],
      },
      {
        key: "ai-supervisor",
        articleKey: "ai-trn",
        canonicalText: "The bill would create a supervisory unit inside the Ministry of Digital Affairs.",
        originalText: "A new supervisory unit would be established inside the Ministry of Digital Affairs, according to the bill text released by the Assembly Press Office.",
        type: "observation",
        isKeyClaim: true,
        extractionConfidence: 0.88,
        paragraph: 2,
        entityKeys: ["digitalministry", "aioversightbill"],
      },
      {
        key: "ai-registration",
        articleKey: "ai-npm",
        canonicalText: "The bill introduces a registration requirement for AI systems designated high-risk.",
        originalText: "The bill introduces a registration requirement for AI systems that the text designates as high-risk, and it creates a supervisory unit within the Ministry of Digital Affairs.",
        type: "observation",
        isKeyClaim: true,
        extractionConfidence: 0.85,
        paragraph: 1,
        entityKeys: ["aioversightbill"],
      },
      {
        key: "ai-scope-broad",
        articleKey: "ai-vanguard",
        canonicalText: "The bill lets the supervisor order any generative AI system withdrawn from the market pending review.",
        originalText: "One provision permits the supervisor to order any generative AI system withdrawn from the market pending review, language that several legal analysts called unusually broad.",
        type: "attribution",
        isKeyClaim: true,
        extractionConfidence: 0.7,
        paragraph: 1,
        entityKeys: ["aioversightbill", "digitalministry"],
        status: "DISPUTED",
      },
      {
        key: "ai-scope-limited",
        articleKey: "ai-ipm",
        canonicalText: "Suspension powers under Article 12 are limited to systems already in the high-risk register.",
        originalText: "Our reading of Article 12 is that suspension powers are bounded by the high-risk register, though the drafting could be tightened.",
        type: "attribution",
        isKeyClaim: true,
        extractionConfidence: 0.68,
        paragraph: 1,
        entityKeys: ["aioversightbill"],
        status: "DISPUTED",
      },
      {
        key: "ai-firstreading",
        articleKey: "ai-trn",
        canonicalText: "The government aims to complete a first reading within six weeks.",
        originalText: "Deputy Corin Vale, the bill's rapporteur, said the government aimed to complete a first reading within six weeks.",
        type: "prediction",
        extractionConfidence: 0.6,
        paragraph: 3,
        entityKeys: ["rapporteur"],
      },
      {
        key: "ai-thirdjurisdiction",
        articleKey: "ai-ipm",
        canonicalText: "The bill would make Ardenne the third jurisdiction in the region with a statutory AI supervisor.",
        originalText: "The bill would make Ardenne the third jurisdiction in the region with a statutory AI supervisor.",
        type: "statistic",
        extractionConfidence: 0.55,
        paragraph: 2,
      },
    ],
    relationships: [
      { from: "ai-registration", to: "ai-supervisor", type: "SUPPORTS", confidence: 0.7, rationale: "Both describe provisions of the same introduced text." },
      { from: "ai-scope-broad", to: "ai-scope-limited", type: "CONTRADICTS", confidence: 0.82, rationale: "One reading applies suspension powers to all generative AI systems; the other limits them to the high-risk register." },
      { from: "ai-scope-limited", to: "ai-registration", type: "REFINES", confidence: 0.5, rationale: "Adds detail on how the register bounds enforcement." },
    ],
    evidence: [
      {
        key: "ai-billtext",
        title: "AI Systems Oversight Bill — introduced text (46 pp.)",
        url: "https://assembly.gov.example/bills/ai-systems-oversight/text",
        publisher: "National Assembly Press Office",
        type: "primary_document",
        isPrimary: true,
        hoursAgo: 53,
        contentHash: "sha256:6f1c2a…demo",
        supports: ["ai-introduced", "ai-supervisor", "ai-registration"],
        note: "Full introduced text as published by the Assembly.",
      },
      {
        key: "ai-legalservice",
        title: "Assembly Legal Service — request for opinion on Article 12",
        url: "https://assembly.gov.example/legal-service/requests/art12",
        publisher: "National Assembly Legal Service",
        type: "official_statement",
        isPrimary: true,
        hoursAgo: 15,
        supports: [],
        note: "An opinion has been requested but not yet published — the scope question is unresolved.",
      },
      {
        key: "ai-ipmnote",
        title: "IPM working note: AI Systems Oversight Bill in comparative context",
        url: "https://policymetrics.example/notes/ai-oversight-comparison",
        publisher: "Institute for Policy Metrics",
        type: "research_paper",
        isPrimary: true,
        hoursAgo: 12,
        supports: ["ai-scope-limited", "ai-thirdjurisdiction"],
      },
    ],
    timeline: [
      { hoursAgo: 53, headline: "Assembly Press Office publishes the bill text", type: "document_published", confidence: 0.95, articleKey: "ai-trn" },
      { hoursAgo: 53, headline: "Transregional Newswire reports the introduction", type: "report", confidence: 0.9, articleKey: "ai-trn" },
      { hoursAgo: 49, headline: "Northwind Public Media publishes a full-text explainer", type: "report", confidence: 0.85, articleKey: "ai-npm" },
      { hoursAgo: 33, headline: "Questions raised over the breadth of Article 12", type: "escalation", confidence: 0.6, articleKey: "ai-vanguard" },
      { hoursAgo: 30, headline: "Ministry of Digital Affairs says suspension power is limited to high-risk systems", type: "statement", confidence: 0.7 },
      { hoursAgo: 15, headline: "Assembly Legal Service asked for an opinion on Article 12", type: "document_published", confidence: 0.8 },
      { hoursAgo: 12, headline: "Institute for Policy Metrics publishes a comparative analysis", type: "report", confidence: 0.75, articleKey: "ai-ipm" },
    ],
  },

  {
    slug: "reserve-bank-ardenne-holds-rate",
    title: "Reserve Bank of Ardenne holds benchmark rate, signals data-dependent path",
    summary:
      "The Reserve Bank of Ardenne kept its benchmark rate unchanged at 3.75 percent and published the decision statement and a press-conference transcript. Sources agree on the hold and the vote; they read the forward guidance differently.",
    category: "economics",
    location: "Republic of Ardenne",
    status: "settled",
    startedHoursAgo: 30,
    latestUpdateHoursAgo: 8,
    topics: ["monetary-policy"],
    entities: [
      { key: "reservebank", salience: 0.95 },
      { key: "governor", salience: 0.7 },
      { key: "ardenne", salience: 0.3 },
    ],
    articles: [
      {
        key: "rate-reservebank",
        sourceKey: "reservebank",
        title: "Monetary Policy Committee decision: benchmark rate held at 3.75%",
        description: "The Reserve Bank of Ardenne's official decision statement.",
        hoursAgo: 29,
        role: "primary_document",
        body: body([
          "The Monetary Policy Committee decided to keep the benchmark rate at 3.75 percent.",
          "The decision was taken by a vote of seven members to two, with the two dissenting members preferring an increase of 25 basis points.",
          "The Committee said future decisions would depend on incoming data on inflation and wage growth, and it did not pre-commit to a direction.",
        ]),
      },
      {
        key: "rate-trn",
        sourceKey: "trn",
        title: "Ardenne central bank holds rate at 3.75%",
        description: "Wire coverage of the rate decision.",
        hoursAgo: 29,
        role: "origin",
        body: body([
          "The Reserve Bank of Ardenne held its benchmark interest rate at 3.75 percent on Thursday, pausing after three consecutive increases.",
          "The Monetary Policy Committee split seven to two, with two members preferring a hike.",
          "Governor Ilse Marchetti told reporters the Committee would be data-dependent and had not decided its next move.",
        ]),
      },
      {
        key: "rate-npm",
        sourceKey: "npm",
        title: "Central bank pauses; governor stresses data dependence",
        description: "Public broadcaster coverage of the decision and press conference.",
        hoursAgo: 27,
        role: "corroboration",
        body: body([
          "The Reserve Bank held rates steady at 3.75 percent, as most analysts had expected.",
          "Governor Ilse Marchetti said at a press conference that the bar for further tightening was high but not closed, and that cuts were not under discussion.",
          "The vote was seven to two in favour of holding.",
        ]),
      },
      {
        key: "rate-capitol",
        sourceKey: "capitol",
        title: "Rate held; markets read a longer pause",
        description: "Capitol Ledger market reaction piece.",
        hoursAgo: 20,
        role: "reaction",
        body: body([
          "The Reserve Bank's decision to hold at 3.75 percent was widely read by traders as the start of an extended pause.",
          "Bond yields fell after Governor Marchetti's remarks, with investors interpreting the statement as leaning toward eventual cuts.",
          "Not all analysts agreed; some read the same statement as keeping a further increase firmly on the table.",
        ]),
      },
      {
        key: "rate-meridian",
        sourceKey: "meridian",
        title: "Reserve Bank keeps rate at 3.75% in 7-2 vote",
        description: "The Meridian Dispatch report on the decision.",
        hoursAgo: 28,
        role: "corroboration",
        body: body([
          "The Reserve Bank of Ardenne kept its benchmark rate unchanged at 3.75 percent following a seven-to-two vote of the Monetary Policy Committee.",
          "The two dissenters wanted a quarter-point increase.",
          "The Bank published the decision statement and a transcript of the governor's press conference.",
        ]),
      },
      {
        key: "rate-signalpost",
        sourceKey: "signalpost",
        title: "What the Reserve Bank did and did not say",
        description: "Signalpost close reading of the statement's guidance.",
        hoursAgo: 8,
        role: "reaction",
        body: body([
          "The Reserve Bank held its rate at 3.75 percent and, crucially, removed a sentence from its previous statement that had signalled a tightening bias.",
          "Whether that omission signals an eventual cut is exactly the point on which coverage divides.",
          "The transcript shows the governor declined four times to characterise the next move.",
        ]),
      },
    ],
    claims: [
      {
        key: "rate-hold",
        articleKey: "rate-reservebank",
        canonicalText: "The Reserve Bank of Ardenne kept its benchmark rate unchanged at 3.75 percent.",
        originalText: "The Monetary Policy Committee decided to keep the benchmark rate at 3.75 percent.",
        type: "official_statement",
        isKeyClaim: true,
        extractionConfidence: 0.95,
        paragraph: 0,
        entityKeys: ["reservebank"],
      },
      {
        key: "rate-vote",
        articleKey: "rate-reservebank",
        canonicalText: "The decision was taken by a vote of seven members to two.",
        originalText: "The decision was taken by a vote of seven members to two, with the two dissenting members preferring an increase of 25 basis points.",
        type: "statistic",
        isKeyClaim: true,
        extractionConfidence: 0.9,
        paragraph: 1,
        entityKeys: ["reservebank"],
      },
      {
        key: "rate-datadependent",
        articleKey: "rate-trn",
        canonicalText: "The Committee said future decisions would depend on incoming data and it did not pre-commit to a direction.",
        originalText: "Governor Ilse Marchetti told reporters the Committee would be data-dependent and had not decided its next move.",
        type: "official_statement",
        isKeyClaim: true,
        extractionConfidence: 0.82,
        paragraph: 2,
        entityKeys: ["governor", "reservebank"],
      },
      {
        key: "rate-lean-cut",
        articleKey: "rate-capitol",
        canonicalText: "The statement leans toward eventual rate cuts.",
        originalText: "Bond yields fell after Governor Marchetti's remarks, with investors interpreting the statement as leaning toward eventual cuts.",
        type: "opinion",
        extractionConfidence: 0.5,
        paragraph: 1,
        status: "DISPUTED",
      },
      {
        key: "rate-lean-hike",
        articleKey: "rate-capitol",
        canonicalText: "The statement keeps a further rate increase firmly on the table.",
        originalText: "Some read the same statement as keeping a further increase firmly on the table.",
        type: "opinion",
        extractionConfidence: 0.48,
        paragraph: 2,
        status: "DISPUTED",
      },
    ],
    relationships: [
      { from: "rate-lean-cut", to: "rate-lean-hike", type: "CONTRADICTS", confidence: 0.75, rationale: "Opposite readings of the same guidance language." },
      { from: "rate-vote", to: "rate-hold", type: "SUPPORTS", confidence: 0.7, rationale: "The vote count is part of the same decision." },
    ],
    evidence: [
      {
        key: "rate-statement",
        title: "Monetary Policy Committee decision statement",
        url: "https://reservebank.gov.example/mpc/statements/latest",
        publisher: "Reserve Bank of Ardenne",
        type: "official_statement",
        isPrimary: true,
        hoursAgo: 29,
        contentHash: "sha256:a19b4c…demo",
        supports: ["rate-hold", "rate-vote", "rate-datadependent"],
      },
      {
        key: "rate-transcript",
        title: "Governor's press-conference transcript",
        url: "https://reservebank.gov.example/mpc/press/transcript",
        publisher: "Reserve Bank of Ardenne",
        type: "transcript",
        isPrimary: true,
        hoursAgo: 28,
        supports: ["rate-datadependent"],
        note: "Transcript shows the governor declining to characterise the next move.",
      },
    ],
    timeline: [
      { hoursAgo: 29, headline: "Reserve Bank publishes the decision statement", type: "document_published", confidence: 0.97, articleKey: "rate-reservebank" },
      { hoursAgo: 29, headline: "Wire services report the hold", type: "report", confidence: 0.92, articleKey: "rate-trn" },
      { hoursAgo: 28, headline: "Press-conference transcript published", type: "document_published", confidence: 0.9 },
      { hoursAgo: 20, headline: "Markets and analysts diverge on the guidance", type: "reaction", confidence: 0.6, articleKey: "rate-capitol" },
      { hoursAgo: 8, headline: "Signalpost notes a removed tightening-bias sentence", type: "report", confidence: 0.7, articleKey: "rate-signalpost" },
    ],
  },

  {
    slug: "aurora-lab-room-temperature-superconductivity-claim",
    title: "Aurora Materials Laboratory reports a room-temperature superconductivity claim",
    summary:
      "A team at the Aurora Materials Laboratory posted a preprint claiming zero electrical resistance in a new compound at room temperature and ambient pressure. The claim has not been independently replicated, the preprint is not peer-reviewed, and other groups have questioned the measurements.",
    category: "science",
    location: "Republic of Ardenne",
    status: "developing",
    startedHoursAgo: 40,
    latestUpdateHoursAgo: 6,
    topics: ["fundamental-research"],
    entities: [
      { key: "auroralab", salience: 0.9 },
      { key: "leadauthor", salience: 0.7 },
    ],
    articles: [
      {
        key: "sc-quanta",
        sourceKey: "quanta",
        title: "Preprint: ambient superconductivity in a nitrogen-doped lattice",
        description: "The preprint as posted to the Quanta Preprint Archive.",
        hoursAgo: 39,
        role: "primary_document",
        body: body([
          "The authors report electrical resistance consistent with zero in a nitrogen-doped compound at 293 kelvin and ambient pressure.",
          "The manuscript has been submitted for peer review and has not yet been evaluated.",
          "The authors state that a magnetic-susceptibility measurement supporting the claim was performed on a single sample.",
        ]),
      },
      {
        key: "sc-orbit",
        sourceKey: "orbit",
        title: "Lab claims room-temperature superconductor; experts urge caution",
        description: "Orbit Science Report on the preprint and the reaction from other physicists.",
        hoursAgo: 34,
        role: "origin",
        body: body([
          "A team at the Aurora Materials Laboratory says it has observed superconductivity at room temperature and ordinary pressure, a long-sought result.",
          "The claim, posted as a preprint, has not been peer-reviewed or reproduced by any other group.",
          "Several materials scientists said the reported resistance drop could also be explained by a measurement artefact, and called for the raw data to be released.",
          "Dr. Nadia Frost, the lead author, said the team would share samples with independent laboratories.",
        ]),
      },
      {
        key: "sc-npm",
        sourceKey: "npm",
        title: "Superconductivity claim: what would it take to confirm?",
        description: "Public broadcaster explainer on replication standards.",
        hoursAgo: 28,
        role: "reaction",
        body: body([
          "A preprint from the Aurora Materials Laboratory claims a room-temperature superconductor.",
          "Independent replication by at least two other groups is the usual bar for such a claim to be accepted, and that has not happened.",
          "Previous high-profile claims in this field have been withdrawn after scrutiny.",
        ]),
      },
      {
        key: "sc-longform",
        sourceKey: "longform",
        title: "Inside the superconductivity claim: the data that is missing",
        description: "The Longform Bureau examines what has and has not been released.",
        hoursAgo: 6,
        role: "reaction",
        body: body([
          "The Aurora Materials Laboratory's claim rests on measurements from what the preprint describes as a single sample.",
          "As of publication, the raw magnetic-susceptibility data has not been released, and no other laboratory has reported reproducing the effect.",
          "Two research groups told The Longform Bureau they had requested samples and were waiting.",
        ]),
      },
      {
        key: "sc-signalpost",
        sourceKey: "signalpost",
        title: "A superconductivity claim is not a discovery yet",
        description: "Signalpost on the difference between a claim and a confirmed result.",
        hoursAgo: 22,
        role: "reaction",
        body: body([
          "The Aurora Materials Laboratory has made a claim. It has not, at this stage, demonstrated a discovery.",
          "No peer review has taken place, no independent group has reproduced the measurement, and the supporting data is from one sample.",
        ]),
      },
    ],
    claims: [
      {
        key: "sc-claim",
        articleKey: "sc-orbit",
        canonicalText: "A team at the Aurora Materials Laboratory reports observing superconductivity at room temperature and ambient pressure.",
        originalText: "A team at the Aurora Materials Laboratory says it has observed superconductivity at room temperature and ordinary pressure, a long-sought result.",
        type: "attribution",
        isKeyClaim: true,
        extractionConfidence: 0.8,
        paragraph: 0,
        entityKeys: ["auroralab", "leadauthor"],
        status: "UNVERIFIED",
      },
      {
        key: "sc-notreplicated",
        articleKey: "sc-orbit",
        canonicalText: "The claim has not been peer-reviewed or reproduced by any other group.",
        originalText: "The claim, posted as a preprint, has not been peer-reviewed or reproduced by any other group.",
        type: "observation",
        isKeyClaim: true,
        extractionConfidence: 0.85,
        paragraph: 1,
        entityKeys: ["auroralab"],
      },
      {
        key: "sc-singlesample",
        articleKey: "sc-quanta",
        canonicalText: "The supporting magnetic-susceptibility measurement was performed on a single sample.",
        originalText: "The authors state that a magnetic-susceptibility measurement supporting the claim was performed on a single sample.",
        type: "observation",
        extractionConfidence: 0.78,
        paragraph: 2,
      },
      {
        key: "sc-artefact",
        articleKey: "sc-orbit",
        canonicalText: "The reported resistance drop could be explained by a measurement artefact.",
        originalText: "Several materials scientists said the reported resistance drop could also be explained by a measurement artefact, and called for the raw data to be released.",
        type: "attribution",
        extractionConfidence: 0.6,
        paragraph: 2,
      },
      {
        key: "sc-shareplan",
        articleKey: "sc-orbit",
        canonicalText: "The team says it will share samples with independent laboratories.",
        originalText: "Dr. Nadia Frost, the lead author, said the team would share samples with independent laboratories.",
        type: "prediction",
        extractionConfidence: 0.55,
        paragraph: 3,
        entityKeys: ["leadauthor"],
      },
    ],
    relationships: [
      { from: "sc-artefact", to: "sc-claim", type: "CONTRADICTS", confidence: 0.6, rationale: "An artefact explanation would negate the superconductivity claim." },
      { from: "sc-singlesample", to: "sc-notreplicated", type: "SUPPORTS", confidence: 0.55, rationale: "Both bear on the weakness of the current evidence base." },
    ],
    evidence: [
      {
        key: "sc-preprint",
        title: "Preprint: ambient-pressure superconductivity in N-doped lattice (not peer-reviewed)",
        url: "https://quanta-archive.example/abs/demo.2207",
        publisher: "Quanta Preprint Archive",
        type: "research_paper",
        isPrimary: true,
        hoursAgo: 39,
        supports: ["sc-claim", "sc-singlesample"],
        contradicts: [],
        note: "Primary document, but explicitly not peer-reviewed and based on a single sample.",
      },
    ],
    timeline: [
      { hoursAgo: 39, headline: "Preprint posted to the Quanta archive", type: "document_published", confidence: 0.9, articleKey: "sc-quanta" },
      { hoursAgo: 34, headline: "Science press reports the claim with caveats", type: "report", confidence: 0.7, articleKey: "sc-orbit" },
      { hoursAgo: 30, headline: "Other physicists ask for the raw data", type: "reaction", confidence: 0.6 },
      { hoursAgo: 22, headline: "Commentators stress the claim is unconfirmed", type: "reaction", confidence: 0.65, articleKey: "sc-signalpost" },
      { hoursAgo: 6, headline: "No independent replication reported; data still not released", type: "report", confidence: 0.7, articleKey: "sc-longform" },
    ],
  },

  {
    slug: "kestrel-sea-boundary-accord-signed",
    title: "Ardenne and Solenne sign Kestrel Sea boundary accord",
    summary:
      "Ardenne and the Federal Republic of Solenne signed the Kestrel Sea Boundary Accord after two years of talks, and both foreign ministries published the text. The agreement still requires ratification by both legislatures, and reporting disagrees on whether the northern fishing zone is inside the settled area.",
    category: "international",
    location: "Kestrel Sea",
    status: "active",
    startedHoursAgo: 60,
    latestUpdateHoursAgo: 14,
    topics: ["maritime-affairs"],
    entities: [
      { key: "maritimeaccord", salience: 0.95 },
      { key: "ardenne", salience: 0.6 },
      { key: "solenne", salience: 0.6 },
      { key: "kestrelsea", salience: 0.7 },
    ],
    articles: [
      {
        key: "mar-mfa",
        sourceKey: "foreignoffice",
        title: "Joint statement: Kestrel Sea Boundary Accord signed",
        description: "The joint statement and treaty text released by the Ministry of Foreign Affairs.",
        hoursAgo: 58,
        role: "primary_document",
        body: body([
          "The Republic of Ardenne and the Federal Republic of Solenne today signed the Kestrel Sea Boundary Accord.",
          "The Accord delimits the maritime boundary between the two states along a median line with two agreed deviations.",
          "The Accord enters into force upon the exchange of instruments of ratification by both parties.",
        ]),
      },
      {
        key: "mar-trn",
        sourceKey: "trn",
        title: "Ardenne, Solenne sign maritime boundary deal",
        description: "Wire report on the signing.",
        hoursAgo: 57,
        role: "origin",
        body: body([
          "Ardenne and the Federal Republic of Solenne signed an agreement on Wednesday settling their long-disputed maritime boundary in the Kestrel Sea.",
          "The deal follows two years of negotiations. Both governments published the text.",
          "Officials said ratification votes in both legislatures were expected within three months, though neither has been scheduled.",
        ]),
      },
      {
        key: "mar-harbor",
        sourceKey: "harbor",
        title: "Kestrel Sea accord signed; fishing communities seek clarity",
        description: "The Harbor Post reports from Solenne's coast.",
        hoursAgo: 40,
        role: "corroboration",
        body: body([
          "The Kestrel Sea Boundary Accord was signed this week after two years of talks.",
          "In the northern port towns, fishing cooperatives said it remained unclear whether the northern grounds fall on the Solenne side of the new line.",
          "A Solenne official, speaking on condition of anonymity, said the northern zone was addressed in a confidential annex.",
        ]),
      },
      {
        key: "mar-civic",
        sourceKey: "civic",
        title: "What the Kestrel Sea accord does and does not settle",
        description: "The Civic Review analyses the published text.",
        hoursAgo: 30,
        role: "reaction",
        body: body([
          "The published text of the Kestrel Sea Boundary Accord delimits the boundary by a median line with two deviations, both in the south.",
          "The northern fishing zone is not named in the public text. The government has not confirmed whether a separate annex exists.",
          "Ratification is required by both legislatures and has not been scheduled.",
        ]),
      },
      {
        key: "mar-meridian",
        sourceKey: "meridian",
        title: "Ardenne and Solenne settle Kestrel Sea boundary",
        description: "The Meridian Dispatch on the signing and next steps.",
        hoursAgo: 55,
        role: "corroboration",
        body: body([
          "Ardenne and Solenne signed the Kestrel Sea Boundary Accord on Wednesday, ending a dispute that dates back decades.",
          "The agreement uses a median line with two southern deviations and was published by both foreign ministries.",
          "It will take effect only after both parliaments ratify it.",
        ]),
      },
      {
        key: "mar-vanguard",
        sourceKey: "vanguard",
        title: "Boundary deal signed; northern grounds question lingers",
        description: "Vanguard Daily on the unresolved northern zone.",
        hoursAgo: 14,
        role: "reaction",
        body: body([
          "A week after signing, the status of the northern fishing grounds under the Kestrel Sea Boundary Accord is still contested.",
          "One report cites an anonymous official describing a confidential annex covering the zone; the Civic Review says the public text does not mention it and no annex has been confirmed.",
          "Both governments declined to comment on whether an annex exists.",
        ]),
      },
    ],
    claims: [
      {
        key: "mar-signed",
        articleKey: "mar-mfa",
        canonicalText: "Ardenne and the Federal Republic of Solenne signed the Kestrel Sea Boundary Accord.",
        originalText: "The Republic of Ardenne and the Federal Republic of Solenne today signed the Kestrel Sea Boundary Accord.",
        type: "official_statement",
        isKeyClaim: true,
        extractionConfidence: 0.93,
        paragraph: 0,
        entityKeys: ["maritimeaccord", "ardenne", "solenne"],
      },
      {
        key: "mar-medianline",
        articleKey: "mar-mfa",
        canonicalText: "The Accord delimits the boundary along a median line with two agreed deviations.",
        originalText: "The Accord delimits the maritime boundary between the two states along a median line with two agreed deviations.",
        type: "observation",
        isKeyClaim: true,
        extractionConfidence: 0.86,
        paragraph: 1,
        entityKeys: ["maritimeaccord"],
      },
      {
        key: "mar-ratification",
        articleKey: "mar-mfa",
        canonicalText: "The Accord enters into force only upon ratification by both legislatures.",
        originalText: "The Accord enters into force upon the exchange of instruments of ratification by both parties.",
        type: "observation",
        isKeyClaim: true,
        extractionConfidence: 0.84,
        paragraph: 2,
        entityKeys: ["maritimeaccord"],
      },
      {
        key: "mar-annex-yes",
        articleKey: "mar-harbor",
        canonicalText: "A confidential annex addresses the northern fishing zone.",
        originalText: "A Solenne official, speaking on condition of anonymity, said the northern zone was addressed in a confidential annex.",
        type: "attribution",
        isKeyClaim: true,
        extractionConfidence: 0.5,
        paragraph: 2,
        status: "DISPUTED",
      },
      {
        key: "mar-annex-no",
        articleKey: "mar-civic",
        canonicalText: "The northern fishing zone is not named in the public text and no annex has been confirmed.",
        originalText: "The northern fishing zone is not named in the public text. The government has not confirmed whether a separate annex exists.",
        type: "observation",
        isKeyClaim: true,
        extractionConfidence: 0.66,
        paragraph: 1,
        status: "DISPUTED",
      },
      {
        key: "mar-ratvote",
        articleKey: "mar-trn",
        canonicalText: "Ratification votes are expected within three months but none has been scheduled.",
        originalText: "Officials said ratification votes in both legislatures were expected within three months, though neither has been scheduled.",
        type: "prediction",
        extractionConfidence: 0.58,
        paragraph: 2,
      },
    ],
    relationships: [
      { from: "mar-annex-yes", to: "mar-annex-no", type: "CONTRADICTS", confidence: 0.7, rationale: "One account asserts a confidential annex; the other says none is confirmed and the public text omits the zone." },
      { from: "mar-ratvote", to: "mar-ratification", type: "REFINES", confidence: 0.5, rationale: "Adds a timeline to the ratification requirement." },
    ],
    evidence: [
      {
        key: "mar-treatytext",
        title: "Kestrel Sea Boundary Accord — signed text (public version)",
        url: "https://mfa.gov.example/treaties/kestrel-sea-accord",
        publisher: "Ministry of Foreign Affairs",
        type: "primary_document",
        isPrimary: true,
        hoursAgo: 58,
        contentHash: "sha256:c73e91…demo",
        supports: ["mar-signed", "mar-medianline", "mar-ratification", "mar-annex-no"],
        note: "Public version of the signed text. Any annex is not included.",
      },
      {
        key: "mar-jointstatement",
        title: "Joint statement of the two foreign ministries",
        url: "https://mfa.gov.example/press/kestrel-sea-joint-statement",
        publisher: "Ministry of Foreign Affairs",
        type: "official_statement",
        isPrimary: true,
        hoursAgo: 58,
        supports: ["mar-signed"],
      },
    ],
    timeline: [
      { hoursAgo: 58, headline: "Foreign ministries publish the signed text and a joint statement", type: "document_published", confidence: 0.95, articleKey: "mar-mfa" },
      { hoursAgo: 57, headline: "Wire services report the signing", type: "report", confidence: 0.9, articleKey: "mar-trn" },
      { hoursAgo: 40, headline: "Fishing communities question the northern-zone status", type: "reaction", confidence: 0.55, articleKey: "mar-harbor" },
      { hoursAgo: 30, headline: "Analysis notes the public text omits the northern zone", type: "report", confidence: 0.7, articleKey: "mar-civic" },
      { hoursAgo: 14, headline: "Both governments decline to confirm whether an annex exists", type: "statement", confidence: 0.6, articleKey: "mar-vanguard" },
    ],
  },

  {
    slug: "lumen-pulse-earbuds-recall",
    title: "Solenne safety regulator orders recall of a batch of Lumen Pulse earbuds",
    summary:
      "The Consumer Safety Agency of Solenne ordered a recall of a production batch of Lumen Pulse earbuds after reports of overheating during charging. The number of units affected has been revised, and the manufacturer and regulator initially gave different figures.",
    category: "public_policy",
    location: "Federal Republic of Solenne",
    status: "developing",
    startedHoursAgo: 26,
    latestUpdateHoursAgo: 3,
    topics: ["product-safety"],
    entities: [
      { key: "csa", salience: 0.9 },
      { key: "lumen", salience: 0.85 },
      { key: "pilotdevice", salience: 0.8 },
      { key: "solenne", salience: 0.3 },
    ],
    articles: [
      {
        key: "rec-csa",
        sourceKey: "safetyagency",
        title: "Recall notice: Lumen Pulse earbuds, batch LP-24C",
        description: "The Consumer Safety Agency's official recall notice.",
        hoursAgo: 25,
        role: "primary_document",
        body: body([
          "The Consumer Safety Agency has ordered the recall of Lumen Pulse earbuds from production batch LP-24C.",
          "The Agency has received 41 reports of the charging case overheating, including three reports of minor burns.",
          "Consumers should stop using the charging case and contact the manufacturer for a replacement.",
        ]),
      },
      {
        key: "rec-trn",
        sourceKey: "trn",
        title: "Regulator orders recall of Lumen earbuds over overheating",
        description: "Wire report on the recall order.",
        hoursAgo: 24,
        role: "origin",
        body: body([
          "Solenne's Consumer Safety Agency ordered a recall of one batch of Lumen Pulse earbuds on Tuesday after dozens of reports that the charging case overheats.",
          "The Agency said 41 incidents had been reported, including three minor burns.",
          "Lumen Devices said the affected batch covered about 12,000 units sold in Solenne.",
        ]),
      },
      {
        key: "rec-lumen",
        sourceKey: "lumen",
        title: "Voluntary replacement programme for batch LP-24C",
        description: "Lumen Devices' statement on the recall.",
        hoursAgo: 23,
        role: "reaction",
        body: body([
          "Lumen Devices is cooperating fully with the Consumer Safety Agency and will replace all charging cases from batch LP-24C.",
          "The company initially estimated that 9,000 units were affected; it has revised that figure to approximately 12,000 after reviewing distribution records.",
          "Lumen said it was aware of 41 reports and no serious injuries.",
        ]),
      },
      {
        key: "rec-harbor",
        sourceKey: "harbor",
        title: "Earbud recall widens as unit count is revised up",
        description: "The Harbor Post follows the changing figures.",
        hoursAgo: 10,
        role: "corroboration",
        body: body([
          "The recall of Lumen Pulse earbuds now covers about 12,000 units, up from an initial estimate of 9,000.",
          "Both the regulator and the company now cite the higher figure.",
          "The Consumer Safety Agency said the count could change again as retailers report stock.",
        ]),
      },
      {
        key: "rec-civic",
        sourceKey: "civic",
        title: "What to do if you own Lumen Pulse earbuds",
        description: "The Civic Review consumer guidance.",
        hoursAgo: 3,
        role: "corroboration",
        body: body([
          "If your Lumen Pulse earbuds are from batch LP-24C, stop using the charging case now.",
          "The Consumer Safety Agency has logged 41 overheating reports and three minor burns.",
          "Lumen Devices is offering free replacements and says about 12,000 units are affected.",
        ]),
      },
    ],
    claims: [
      {
        key: "rec-order",
        articleKey: "rec-csa",
        canonicalText: "The Consumer Safety Agency ordered a recall of Lumen Pulse earbuds from batch LP-24C.",
        originalText: "The Consumer Safety Agency has ordered the recall of Lumen Pulse earbuds from production batch LP-24C.",
        type: "official_statement",
        isKeyClaim: true,
        extractionConfidence: 0.93,
        paragraph: 0,
        entityKeys: ["csa", "pilotdevice", "lumen"],
      },
      {
        key: "rec-reports",
        articleKey: "rec-csa",
        canonicalText: "The Agency has received 41 reports of the charging case overheating, including three minor burns.",
        originalText: "The Agency has received 41 reports of the charging case overheating, including three reports of minor burns.",
        type: "statistic",
        isKeyClaim: true,
        extractionConfidence: 0.9,
        paragraph: 1,
        entityKeys: ["csa"],
      },
      {
        key: "rec-units-9k",
        articleKey: "rec-lumen",
        canonicalText: "About 9,000 units are affected by the recall.",
        originalText: "The company initially estimated that 9,000 units were affected; it has revised that figure to approximately 12,000 after reviewing distribution records.",
        type: "statistic",
        extractionConfidence: 0.55,
        paragraph: 1,
        status: "OUTDATED",
        entityKeys: ["lumen"],
      },
      {
        key: "rec-units-12k",
        articleKey: "rec-harbor",
        canonicalText: "About 12,000 units are affected by the recall.",
        originalText: "The recall of Lumen Pulse earbuds now covers about 12,000 units, up from an initial estimate of 9,000.",
        type: "statistic",
        isKeyClaim: true,
        extractionConfidence: 0.72,
        paragraph: 0,
        entityKeys: ["lumen"],
      },
      {
        key: "rec-noserious",
        articleKey: "rec-lumen",
        canonicalText: "There have been no serious injuries.",
        originalText: "Lumen said it was aware of 41 reports and no serious injuries.",
        type: "attribution",
        extractionConfidence: 0.6,
        paragraph: 2,
        entityKeys: ["lumen"],
      },
    ],
    relationships: [
      { from: "rec-units-12k", to: "rec-units-9k", type: "REFINES", confidence: 0.8, rationale: "The 12,000 figure supersedes the initial 9,000 estimate after a records review." },
      { from: "rec-reports", to: "rec-order", type: "SUPPORTS", confidence: 0.65, rationale: "The incident count is the stated basis for the recall order." },
    ],
    evidence: [
      {
        key: "rec-notice",
        title: "Consumer Safety Agency recall notice — batch LP-24C",
        url: "https://csa.gov.example/recalls/lp-24c",
        publisher: "Consumer Safety Agency",
        type: "primary_document",
        isPrimary: true,
        hoursAgo: 25,
        contentHash: "sha256:0b8d55…demo",
        supports: ["rec-order", "rec-reports"],
      },
      {
        key: "rec-statement",
        title: "Lumen Devices statement on batch LP-24C",
        url: "https://lumendevices.example/newsroom/lp-24c",
        publisher: "Lumen Devices",
        type: "official_statement",
        isPrimary: false,
        hoursAgo: 23,
        supports: ["rec-units-12k", "rec-noserious"],
        contradicts: ["rec-units-9k"],
      },
    ],
    timeline: [
      { hoursAgo: 25, headline: "Consumer Safety Agency publishes the recall notice", type: "document_published", confidence: 0.95, articleKey: "rec-csa" },
      { hoursAgo: 24, headline: "Wire services report the recall", type: "report", confidence: 0.9, articleKey: "rec-trn" },
      { hoursAgo: 23, headline: "Lumen Devices announces a replacement programme (9,000 units)", type: "statement", confidence: 0.7, articleKey: "rec-lumen" },
      { hoursAgo: 12, headline: "Affected-unit estimate revised to about 12,000", type: "correction", confidence: 0.8 },
      { hoursAgo: 3, headline: "Regulator and manufacturer now cite the same figure", type: "confirmation", confidence: 0.75, articleKey: "rec-harbor" },
    ],
    corrections: [
      {
        claimKey: "rec-units-12k",
        originalText: "Lumen Devices estimated that about 9,000 units were affected by the recall.",
        updatedText: "Lumen Devices revised the estimate to approximately 12,000 units after reviewing distribution records.",
        reason: "Manufacturer revised its figure upward after a records review; regulator adopted the revised number.",
        hoursAgo: 12,
        sourceUrl: "https://csa.gov.example/recalls/lp-24c",
      },
    ],
  },
];
