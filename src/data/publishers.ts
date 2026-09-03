/**
 * Publisher registry — ownership, funding, family, and (when integrated) external
 * ratings, for every publisher IFFA ingests.
 *
 * RULES (docs/METHODOLOGY.md):
 *   - Ownership is metadata. It NEVER determines alignment or reliability.
 *   - Every ownership assertion carries provenance. `UNKNOWN` is valid and is
 *     used wherever IFFA cannot verify the fact — nothing here is inferred.
 *   - External ratings are only ever populated from a real, attributed provider.
 *     None are integrated yet, so every `externalRatings` array is empty and the
 *     UI shows "no external rating on record" — it never shows a guess.
 *   - `name` MUST match the `publisher` string used in src/data/feeds.ts and on
 *     every LiveArticle, or the registry will not resolve.
 */
import type {
  OwnershipCategory,
  FundingType,
  OwnershipProvenance,
  ExternalBiasRating,
} from "@/lib/media-landscape/types";

export interface PublisherRegistryEntry {
  id: string;
  name: string;
  domain: string;
  languages: ("ta" | "en" | "mixed")[];
  regions: ("tamil-nadu" | "india" | "kerala" | "global")[];
  locality?: string;
  ownership: {
    category: OwnershipCategory;
    owner?: string;
    parent?: string;
    ultimateParent?: string;
    fundingType: FundingType;
    provenance: OwnershipProvenance;
  };
  /** Corporate family key — publishers sharing a key are one source family. */
  familyKey: string;
  externalRatings: ExternalBiasRating[];
}

const CHECKED = "2026-09-03";
/** Standard provenance for facts drawn from public disclosures + widely-reported records. */
const publicRecord = (source: string, url: string, confidence: OwnershipProvenance["confidence"], note?: string): OwnershipProvenance => ({
  source,
  url,
  verifiedAt: CHECKED,
  confidence,
  note,
});

export const PUBLISHERS: PublisherRegistryEntry[] = [
  // ── The Hindu Group (Kasturi & Sons Ltd) ──────────────────────────────────
  {
    id: "the-hindu",
    name: "The Hindu",
    domain: "thehindu.com",
    languages: ["en"],
    regions: ["tamil-nadu", "india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "The Hindu Group",
      parent: "Kasturi & Sons Ltd",
      ultimateParent: "Kasturi & Sons Ltd (Kasturi Ranga / Ram family)",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "Publisher masthead / About page; Kasturi & Sons Ltd corporate disclosures; widely-reported Indian media-ownership records",
        "https://www.thehindu.com/aboutus/",
        "high",
      ),
    },
    familyKey: "kasturi-and-sons",
    externalRatings: [],
  },
  {
    id: "the-hindu-businessline",
    name: "The Hindu BusinessLine",
    domain: "thehindubusinessline.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "The Hindu Group",
      parent: "Kasturi & Sons Ltd",
      ultimateParent: "Kasturi & Sons Ltd",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "Publisher About page; The Hindu Group / Kasturi & Sons Ltd disclosures",
        "https://www.thehindubusinessline.com/aboutus/",
        "high",
      ),
    },
    familyKey: "kasturi-and-sons",
    externalRatings: [],
  },
  {
    id: "sportstar",
    name: "Sportstar",
    domain: "sportstar.thehindu.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "The Hindu Group",
      parent: "Kasturi & Sons Ltd",
      ultimateParent: "Kasturi & Sons Ltd",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "Sportstar is a The Hindu Group publication (masthead); Kasturi & Sons Ltd",
        "https://sportstar.thehindu.com/",
        "high",
      ),
    },
    familyKey: "kasturi-and-sons",
    externalRatings: [],
  },

  // ── The Times Group (Bennett, Coleman & Co. Ltd) ──────────────────────────
  {
    id: "times-of-india",
    name: "The Times of India",
    domain: "timesofindia.indiatimes.com",
    languages: ["en"],
    regions: ["tamil-nadu", "india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "Bennett, Coleman & Co. Ltd (BCCL) — The Times Group",
      parent: "Bennett, Coleman & Co. Ltd",
      ultimateParent: "Sahu Jain family",
      fundingType: "advertising",
      provenance: publicRecord(
        "BCCL / The Times Group corporate information; widely-reported Indian media-ownership records",
        "https://www.timesgroup.com/",
        "high",
      ),
    },
    familyKey: "bccl-times-group",
    externalRatings: [],
  },

  // ── HT Media Ltd (K. K. Birla group) ─────────────────────────────────────
  {
    id: "hindustan-times",
    name: "Hindustan Times",
    domain: "hindustantimes.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "HT Media Ltd",
      parent: "HT Media Ltd",
      ultimateParent: "K. K. Birla group (Bhartia family — Shobhana Bhartia)",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "HT Media Ltd (listed company) annual disclosures; publisher About page",
        "https://www.htmedia.in/",
        "high",
      ),
    },
    familyKey: "ht-media",
    externalRatings: [],
  },
  {
    id: "mint",
    name: "Mint",
    domain: "livemint.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "HT Media Ltd",
      parent: "HT Media Ltd",
      ultimateParent: "K. K. Birla group (Bhartia family)",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "Mint is an HT Media Ltd publication (masthead); HT Media Ltd disclosures",
        "https://www.livemint.com/aboutus",
        "high",
      ),
    },
    familyKey: "ht-media",
    externalRatings: [],
  },

  // ── Network18 (Reliance Industries) ──────────────────────────────────────
  {
    id: "news18-tamil",
    name: "News18 Tamil",
    domain: "tamil.news18.com",
    languages: ["ta"],
    regions: ["tamil-nadu", "india"],
    ownership: {
      category: "CORPORATION",
      owner: "Network18 Media & Investments Ltd",
      parent: "Network18 Media & Investments Ltd",
      ultimateParent: "Reliance Industries Ltd (via Independent Media Trust)",
      fundingType: "advertising",
      provenance: publicRecord(
        "Network18 (listed) disclosures; Reliance Industries' control of Network18 via the Independent Media Trust is on the public record",
        "https://www.network18online.com/",
        "high",
      ),
    },
    familyKey: "network18-reliance",
    externalRatings: [],
  },

  // ── NDTV (Adani Group) ──────────────────────────────────────────────────
  {
    id: "ndtv",
    name: "NDTV",
    domain: "ndtv.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "CORPORATION",
      owner: "New Delhi Television Ltd (NDTV)",
      parent: "AMG Media Networks Ltd",
      ultimateParent: "Adani Enterprises Ltd (Adani Group)",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "NDTV (listed) disclosures; Adani group's majority control of NDTV via AMG Media Networks (2022–23) is on the public record",
        "https://www.ndtv.com/",
        "high",
      ),
    },
    familyKey: "ndtv-adani",
    externalRatings: [],
  },
  {
    id: "ndtv-profit",
    name: "NDTV Profit",
    domain: "ndtvprofit.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "CORPORATION",
      owner: "New Delhi Television Ltd (NDTV)",
      parent: "AMG Media Networks Ltd",
      ultimateParent: "Adani Enterprises Ltd (Adani Group)",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "NDTV Profit is an NDTV publication; NDTV / AMG Media Networks / Adani group disclosures",
        "https://www.ndtvprofit.com/",
        "high",
      ),
    },
    familyKey: "ndtv-adani",
    externalRatings: [],
  },

  // ── India Today Group (Living Media / Purie family) ─────────────────────
  {
    id: "india-today",
    name: "India Today",
    domain: "indiatoday.in",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "Living Media India Ltd / TV Today Network Ltd — India Today Group",
      parent: "Living Media India Ltd",
      ultimateParent: "Purie family (Aroon Purie)",
      fundingType: "advertising",
      provenance: publicRecord(
        "TV Today Network (listed) / Living Media India Ltd disclosures; India Today Group corporate information",
        "https://www.indiatoday.in/aboutus",
        "high",
      ),
    },
    familyKey: "india-today-group",
    externalRatings: [],
  },

  // ── BBC (UK public broadcaster) ────────────────────────────────────────
  {
    id: "bbc-tamil",
    name: "BBC Tamil",
    domain: "bbc.com/tamil",
    languages: ["ta"],
    regions: ["india", "global"],
    ownership: {
      category: "PUBLIC_BROADCASTER",
      owner: "British Broadcasting Corporation (BBC)",
      parent: "BBC",
      ultimateParent: "BBC (UK public corporation, established by Royal Charter)",
      fundingType: "public-funding",
      provenance: publicRecord(
        "BBC is a UK statutory public broadcaster funded principally by the licence fee; BBC World Service / BBC Tamil operations are publicly documented",
        "https://www.bbc.com/tamil",
        "high",
      ),
    },
    familyKey: "bbc",
    externalRatings: [],
  },

  // ── ESPNcricinfo (ESPN / Disney) ──────────────────────────────────────
  {
    id: "espncricinfo",
    name: "ESPNcricinfo",
    domain: "espncricinfo.com",
    languages: ["en"],
    regions: ["india", "global"],
    ownership: {
      category: "CORPORATION",
      owner: "ESPN Inc.",
      parent: "ESPN Inc.",
      ultimateParent: "The Walt Disney Company (majority) / Hearst Communications (minority)",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "ESPNcricinfo is owned by ESPN Inc.; ESPN Inc. ownership (Disney majority, Hearst minority) is on the public record",
        "https://www.espncricinfo.com/",
        "moderate",
      ),
    },
    familyKey: "espn-disney",
    externalRatings: [],
  },

  // ── Mongabay (non-profit) ─────────────────────────────────────────────
  {
    id: "mongabay-india",
    name: "Mongabay India",
    domain: "india.mongabay.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "TRUST_FOUNDATION",
      owner: "Mongabay (non-profit environmental news organisation)",
      parent: "Mongabay.org",
      fundingType: "grant-philanthropy",
      provenance: publicRecord(
        "Mongabay is a US-based non-profit; Mongabay-India operates as a non-profit environmental news service, funded by grants and donations (disclosed on its funding page)",
        "https://india.mongabay.com/about/",
        "high",
      ),
    },
    familyKey: "mongabay",
    externalRatings: [],
  },

  // ── Puthiyathalaimurai (ownership not independently verified) ──────────
  {
    id: "puthiyathalaimurai",
    name: "Puthiyathalaimurai",
    domain: "puthiyathalaimurai.com",
    languages: ["ta"],
    regions: ["tamil-nadu"],
    ownership: {
      category: "UNKNOWN",
      owner: "New Generation Media Corporation Pvt Ltd (operator of Puthiya Thalaimurai TV)",
      fundingType: "unknown",
      provenance: publicRecord(
        "Operator is publicly identified as New Generation Media Corporation Pvt Ltd; ultimate beneficial ownership and funding are NOT independently verified for this registry and have been reported inconsistently over time",
        "https://www.puthiyathalaimurai.com/",
        "low",
        "Category left UNKNOWN deliberately — IFFA does not infer ownership.",
      ),
    },
    familyKey: "puthiyathalaimurai",
    externalRatings: [],
  },

  // ── v0.10 Phase 8 additions ──────────────────────────────────────────
  {
    id: "the-indian-express",
    name: "The Indian Express",
    domain: "indianexpress.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "The Indian Express Group",
      parent: "Express Publications (Madurai) Ltd / The Indian Express (P) Ltd",
      ultimateParent: "Goenka family (Viveck Goenka)",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "The Indian Express Group corporate information; the Goenka family's control is on the public record",
        "https://indianexpress.com/about-us/",
        "high",
      ),
    },
    familyKey: "indian-express-group",
    externalRatings: [],
  },
  {
    id: "frontline",
    name: "Frontline",
    domain: "frontline.thehindu.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "The Hindu Group",
      parent: "Kasturi & Sons Ltd",
      ultimateParent: "Kasturi & Sons Ltd",
      fundingType: "mixed-commercial",
      provenance: publicRecord("Frontline is a The Hindu Group publication (masthead)", "https://frontline.thehindu.com/", "high"),
    },
    familyKey: "kasturi-and-sons",
    externalRatings: [],
  },
  {
    id: "business-standard",
    name: "Business Standard",
    domain: "business-standard.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "CORPORATION",
      owner: "Business Standard Private Limited",
      parent: "Business Standard Private Limited",
      ultimateParent: "Kotak family (majority stake acquired 2019)",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "Widely-reported acquisition of a majority stake in Business Standard Pvt Ltd by Uday Kotak / the Kotak family (2019)",
        "https://www.business-standard.com/about-us",
        "moderate",
      ),
    },
    familyKey: "business-standard",
    externalRatings: [],
  },
  {
    id: "moneycontrol",
    name: "Moneycontrol",
    domain: "moneycontrol.com",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "CORPORATION",
      owner: "Network18 Media & Investments Ltd (E-Eighteen.com Ltd)",
      parent: "Network18 Media & Investments Ltd",
      ultimateParent: "Reliance Industries Ltd (via Independent Media Trust)",
      fundingType: "advertising",
      provenance: publicRecord(
        "Moneycontrol is operated by Network18; Reliance Industries' control of Network18 is on the public record",
        "https://www.moneycontrol.com/",
        "high",
      ),
    },
    familyKey: "network18-reliance",
    externalRatings: [],
  },
  {
    id: "alt-news",
    name: "Alt News",
    domain: "altnews.in",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "TRUST_FOUNDATION",
      owner: "Pravda Media Foundation",
      parent: "Pravda Media Foundation (Section 8 non-profit)",
      fundingType: "grant-philanthropy",
      provenance: publicRecord(
        "Alt News is run by the Pravda Media Foundation, a registered non-profit funded by public donations; an IFCN signatory",
        "https://www.altnews.in/about-us/",
        "high",
        "A fact-checking organisation — its output is verdicts on claims, not primary reporting.",
      ),
    },
    familyKey: "pravda-media-foundation",
    externalRatings: [],
  },
  {
    id: "factly",
    name: "Factly",
    domain: "factly.in",
    languages: ["en", "mixed"],
    regions: ["india"],
    ownership: {
      category: "INDEPENDENT",
      owner: "Factly Media & Research",
      parent: "Factly Media & Research",
      fundingType: "grant-philanthropy",
      provenance: publicRecord(
        "Factly Media & Research, a Hyderabad-based independent data-journalism and fact-checking organisation; an IFCN signatory",
        "https://factly.in/about-us/",
        "moderate",
        "A fact-checking / open-data organisation.",
      ),
    },
    familyKey: "factly-media",
    externalRatings: [],
  },

  // ── v0.11 Phase A/B — Tamil-native + regional ────────────────────────
  {
    id: "the-hindu-tamil",
    name: "The Hindu Tamil",
    domain: "hindutamil.in",
    languages: ["ta"],
    regions: ["tamil-nadu"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "The Hindu Group",
      parent: "Kasturi & Sons Ltd",
      ultimateParent: "Kasturi & Sons Ltd",
      fundingType: "mixed-commercial",
      provenance: publicRecord("இந்து தமிழ் திசை is the Tamil daily of The Hindu Group (masthead)", "https://www.hindutamil.in/", "high"),
    },
    familyKey: "kasturi-and-sons",
    externalRatings: [],
  },
  {
    id: "abp-tamil",
    name: "ABP Tamil",
    domain: "tamil.abplive.com",
    languages: ["ta"],
    regions: ["tamil-nadu", "india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "ABP Network Pvt Ltd",
      parent: "ABP Group",
      ultimateParent: "ABP Group (Sarkar family)",
      fundingType: "advertising",
      provenance: publicRecord(
        "ABP Tamil is part of ABP Network / ABP Group; the Sarkar family's control of ABP is on the public record",
        "https://tamil.abplive.com/about-us",
        "moderate",
      ),
    },
    familyKey: "abp-group",
    externalRatings: [],
  },
  {
    id: "nakkheeran",
    name: "Nakkheeran",
    domain: "nakkheeran.in",
    languages: ["ta"],
    regions: ["tamil-nadu"],
    ownership: {
      category: "INDIVIDUAL",
      owner: "Nakkheeran Publications (RR Gopal / 'Nakkheeran' Gopal)",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "Nakkheeran is a Tamil news publication long associated with its founder-editor R. R. Gopal ('Nakkheeran' Gopal)",
        "https://www.nakkheeran.in/",
        "moderate",
      ),
    },
    familyKey: "nakkheeran",
    externalRatings: [],
  },
  {
    id: "the-free-press-journal",
    name: "The Free Press Journal",
    domain: "freepressjournal.in",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "MEDIA_CONGLOMERATE",
      owner: "Free Press Journal (Free Press House)",
      parent: "The Free Press Journal group",
      ultimateParent: "Karanjia / Abhyankar family",
      fundingType: "mixed-commercial",
      provenance: publicRecord(
        "One of India's oldest English dailies (est. 1928), Mumbai; long-run family ownership",
        "https://www.freepressjournal.in/about-us",
        "moderate",
      ),
    },
    familyKey: "free-press-journal",
    externalRatings: [],
  },

  // ── Official / government / intergovernmental ─────────────────────────
  {
    id: "reserve-bank-of-india",
    name: "Reserve Bank of India",
    domain: "rbi.org.in",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "GOVERNMENT",
      owner: "Reserve Bank of India",
      ultimateParent: "Government of India (statutory central bank under the RBI Act, 1934)",
      fundingType: "government-budget",
      provenance: publicRecord("RBI is India's statutory central bank", "https://www.rbi.org.in/", "high"),
    },
    familyKey: "govt-india-rbi",
    externalRatings: [],
  },
  {
    id: "ndma-sachet",
    name: "NDMA SACHET",
    domain: "sachet.ndma.gov.in",
    languages: ["mixed"],
    regions: ["india"],
    ownership: {
      category: "GOVERNMENT",
      owner: "National Disaster Management Authority (NDMA)",
      ultimateParent: "Government of India (Ministry of Home Affairs)",
      fundingType: "government-budget",
      provenance: publicRecord("SACHET is the NDMA's Common Alerting Protocol platform", "https://sachet.ndma.gov.in/", "high"),
    },
    familyKey: "govt-india-ndma",
    externalRatings: [],
  },
  {
    id: "reliefweb-un-ocha",
    name: "ReliefWeb (UN OCHA)",
    domain: "reliefweb.int",
    languages: ["en"],
    regions: ["india", "global"],
    ownership: {
      category: "OTHER",
      owner: "UN Office for the Coordination of Humanitarian Affairs (OCHA)",
      ultimateParent: "United Nations",
      fundingType: "public-funding",
      provenance: publicRecord("ReliefWeb is a humanitarian information service run by UN OCHA", "https://reliefweb.int/about", "high"),
    },
    familyKey: "un-ocha",
    externalRatings: [],
  },
  {
    id: "india-meteorological-department",
    name: "India Meteorological Department",
    domain: "mausam.imd.gov.in",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "GOVERNMENT",
      owner: "India Meteorological Department (IMD)",
      ultimateParent: "Government of India (Ministry of Earth Sciences)",
      fundingType: "government-budget",
      provenance: publicRecord("IMD is the national meteorological agency", "https://mausam.imd.gov.in/", "high"),
    },
    familyKey: "govt-india-imd",
    externalRatings: [],
  },
  {
    id: "press-information-bureau",
    name: "Press Information Bureau",
    domain: "pib.gov.in",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "GOVERNMENT",
      owner: "Press Information Bureau (PIB)",
      ultimateParent: "Government of India (Ministry of Information and Broadcasting)",
      fundingType: "government-budget",
      provenance: publicRecord(
        "PIB is the Government of India's nodal agency for communicating government policy and information",
        "https://pib.gov.in/",
        "high",
        "Government communications — evidence of what the government stated, not independent verification.",
      ),
    },
    familyKey: "govt-india-pib",
    externalRatings: [],
  },
  {
    id: "prasar-bharati-newsonair",
    name: "Prasar Bharati (NewsOnAir)",
    domain: "newsonair.gov.in",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "PUBLIC_BROADCASTER",
      owner: "Prasar Bharati",
      ultimateParent: "Prasar Bharati (statutory autonomous public broadcaster under the Prasar Bharati Act, 1990)",
      fundingType: "government-budget",
      provenance: publicRecord("Prasar Bharati is India's statutory public service broadcaster (All India Radio / Doordarshan)", "https://prasarbharati.gov.in/", "high"),
    },
    familyKey: "prasar-bharati",
    externalRatings: [],
  },
  {
    id: "sebi",
    name: "SEBI",
    domain: "sebi.gov.in",
    languages: ["en"],
    regions: ["india"],
    ownership: {
      category: "GOVERNMENT",
      owner: "Securities and Exchange Board of India (SEBI)",
      ultimateParent: "Government of India (statutory regulator under the SEBI Act, 1992)",
      fundingType: "government-budget",
      provenance: publicRecord("SEBI is the statutory securities-market regulator", "https://www.sebi.gov.in/", "high"),
    },
    familyKey: "govt-india-sebi",
    externalRatings: [],
  },
];

const BY_NAME = new Map(PUBLISHERS.map((p) => [p.name, p]));
const BY_ID = new Map(PUBLISHERS.map((p) => [p.id, p]));

export function publisherByName(name: string): PublisherRegistryEntry | undefined {
  return BY_NAME.get(name);
}
export function publisherById(id: string): PublisherRegistryEntry | undefined {
  return BY_ID.get(id);
}

/** A stable slug for a publisher name, used in /source/[publisher] URLs. */
export function publisherSlug(name: string): string {
  const known = BY_NAME.get(name);
  if (known) return known.id;
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
