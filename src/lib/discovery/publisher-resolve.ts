/**
 * Resolve a discovered outlet (a name string + maybe a domain) to a canonical
 * publisher, a corporate family key, and a coarse type.
 *
 * Order: IFFA publisher registry (name, then domain) → the curated discovery
 * domain map below → a cleaned fallback with an UNKNOWN family.
 *
 * The domain map is METADATA ONLY. `familyKey` groups mastheads of one verified
 * corporate group so discovery cannot count them as independent confirmations.
 * It carries NO political attribute. Where a family is genuinely unclear the key
 * is the domain itself (its own family of one).
 */
import { PUBLISHERS, publisherByName } from "@/data/publishers";

export type DiscoveredOutletType =
  | "national-english"
  | "tamil-regional"
  | "regional-other"
  | "business"
  | "sports"
  | "digital-native"
  | "public-broadcaster"
  | "official"
  | "wire-agency"
  | "fact-checker"
  | "unknown";

interface DomainEntry {
  name: string;
  familyKey: string;
  type: DiscoveredOutletType;
  languages: ("ta" | "en" | "hi" | "ml" | "mixed")[];
  region: "tamil-nadu" | "india" | "kerala" | "global";
}

/**
 * Curated. Every family key that groups >1 masthead reflects a verified,
 * publicly-recorded corporate parent (see docs/source-registry.md).
 */
export const DISCOVERY_DOMAIN_MAP: Record<string, DomainEntry> = {
  // ── The Hindu Group / Kasturi & Sons ──
  "thehindu.com": { name: "The Hindu", familyKey: "kasturi-and-sons", type: "national-english", languages: ["en"], region: "india" },
  "thehindubusinessline.com": { name: "The Hindu BusinessLine", familyKey: "kasturi-and-sons", type: "business", languages: ["en"], region: "india" },
  "sportstar.thehindu.com": { name: "Sportstar", familyKey: "kasturi-and-sons", type: "sports", languages: ["en"], region: "india" },
  "frontline.thehindu.com": { name: "Frontline", familyKey: "kasturi-and-sons", type: "national-english", languages: ["en"], region: "india" },
  "hindutamil.in": { name: "The Hindu Tamil", familyKey: "kasturi-and-sons", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  // ── The Times Group / BCCL ──
  "timesofindia.indiatimes.com": { name: "The Times of India", familyKey: "bccl-times-group", type: "national-english", languages: ["en"], region: "india" },
  "indiatimes.com": { name: "The Times of India", familyKey: "bccl-times-group", type: "national-english", languages: ["en"], region: "india" },
  "economictimes.indiatimes.com": { name: "The Economic Times", familyKey: "bccl-times-group", type: "business", languages: ["en"], region: "india" },
  // ── HT Media ──
  "hindustantimes.com": { name: "Hindustan Times", familyKey: "ht-media", type: "national-english", languages: ["en"], region: "india" },
  "livemint.com": { name: "Mint", familyKey: "ht-media", type: "business", languages: ["en"], region: "india" },
  // ── Network18 / Reliance ──
  "news18.com": { name: "News18", familyKey: "network18-reliance", type: "national-english", languages: ["en"], region: "india" },
  "tamil.news18.com": { name: "News18 Tamil", familyKey: "network18-reliance", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  "moneycontrol.com": { name: "Moneycontrol", familyKey: "network18-reliance", type: "business", languages: ["en"], region: "india" },
  "firstpost.com": { name: "Firstpost", familyKey: "network18-reliance", type: "digital-native", languages: ["en"], region: "india" },
  "cnbctv18.com": { name: "CNBC-TV18", familyKey: "network18-reliance", type: "business", languages: ["en"], region: "india" },
  // ── NDTV / Adani ──
  "ndtv.com": { name: "NDTV", familyKey: "ndtv-adani", type: "national-english", languages: ["en"], region: "india" },
  "ndtvprofit.com": { name: "NDTV Profit", familyKey: "ndtv-adani", type: "business", languages: ["en"], region: "india" },
  // ── India Today / Living Media ──
  "indiatoday.in": { name: "India Today", familyKey: "india-today-group", type: "national-english", languages: ["en"], region: "india" },
  "businesstoday.in": { name: "Business Today", familyKey: "india-today-group", type: "business", languages: ["en"], region: "india" },
  "aajtak.in": { name: "Aaj Tak", familyKey: "india-today-group", type: "regional-other", languages: ["hi"], region: "india" },
  // ── Indian Express Group ──
  "indianexpress.com": { name: "The Indian Express", familyKey: "indian-express-group", type: "national-english", languages: ["en"], region: "india" },
  "financialexpress.com": { name: "The Financial Express", familyKey: "indian-express-group", type: "business", languages: ["en"], region: "india" },
  "newindianexpress.com": { name: "The New Indian Express", familyKey: "express-publications-madurai", type: "national-english", languages: ["en"], region: "india" },
  "cnbctv18.com/": { name: "CNBC-TV18", familyKey: "network18-reliance", type: "business", languages: ["en"], region: "india" },
  // ── ABP ──
  "abplive.com": { name: "ABP Live", familyKey: "abp-group", type: "national-english", languages: ["en"], region: "india" },
  "tamil.abplive.com": { name: "ABP Tamil", familyKey: "abp-group", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  // ── Sun Group (Tamil Nadu) ──
  "dinakaran.com": { name: "Dinakaran", familyKey: "sun-group", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  // ── Independent Tamil / regional mastheads (own family) ──
  "dinamalar.com": { name: "Dinamalar", familyKey: "dinamalar", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  "dailythanthi.com": { name: "Daily Thanthi", familyKey: "daily-thanthi", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  "maalaimalar.com": { name: "Maalai Malar", familyKey: "maalaimalar", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  "vikatan.com": { name: "Vikatan", familyKey: "vikatan-group", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  "puthiyathalaimurai.com": { name: "Puthiyathalaimurai", familyKey: "puthiyathalaimurai", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  "polimernews.com": { name: "Polimer News", familyKey: "polimer", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  "nakkheeran.in": { name: "Nakkheeran", familyKey: "nakkheeran", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  "dtnext.in": { name: "DT Next", familyKey: "kmm-dtnext", type: "regional-other", languages: ["en"], region: "tamil-nadu" },
  "tamil.oneindia.com": { name: "Oneindia Tamil", familyKey: "oneindia", type: "tamil-regional", languages: ["ta"], region: "tamil-nadu" },
  "oneindia.com": { name: "Oneindia", familyKey: "oneindia", type: "digital-native", languages: ["en"], region: "india" },
  // ── Digital-native / independent ──
  "thenewsminute.com": { name: "The News Minute", familyKey: "the-news-minute", type: "digital-native", languages: ["en"], region: "india" },
  "scroll.in": { name: "Scroll.in", familyKey: "scroll-media", type: "digital-native", languages: ["en"], region: "india" },
  "thewire.in": { name: "The Wire", familyKey: "foundation-for-independent-journalism", type: "digital-native", languages: ["en"], region: "india" },
  "theprint.in": { name: "ThePrint", familyKey: "theprint", type: "digital-native", languages: ["en"], region: "india" },
  "thehindu.com/": { name: "The Hindu", familyKey: "kasturi-and-sons", type: "national-english", languages: ["en"], region: "india" },
  "deccanherald.com": { name: "Deccan Herald", familyKey: "the-printers-mysore", type: "national-english", languages: ["en"], region: "india" },
  "deccanchronicle.com": { name: "Deccan Chronicle", familyKey: "deccan-chronicle-holdings", type: "national-english", languages: ["en"], region: "india" },
  "telegraphindia.com": { name: "The Telegraph", familyKey: "abp-group", type: "national-english", languages: ["en"], region: "india" },
  "business-standard.com": { name: "Business Standard", familyKey: "business-standard", type: "business", languages: ["en"], region: "india" },
  "livelaw.in": { name: "LiveLaw", familyKey: "livelaw", type: "digital-native", languages: ["en"], region: "india" },
  "barandbench.com": { name: "Bar and Bench", familyKey: "bar-and-bench", type: "digital-native", languages: ["en"], region: "india" },
  "freepressjournal.in": { name: "The Free Press Journal", familyKey: "free-press-journal", type: "national-english", languages: ["en"], region: "india" },
  // ── Kerala neighbours (relevant to TN border / Mullaperiyar stories) ──
  "manoramaonline.com": { name: "Malayala Manorama", familyKey: "malayala-manorama", type: "regional-other", languages: ["ml"], region: "kerala" },
  "onmanorama.com": { name: "Onmanorama", familyKey: "malayala-manorama", type: "regional-other", languages: ["en"], region: "kerala" },
  "mathrubhumi.com": { name: "Mathrubhumi", familyKey: "mathrubhumi", type: "regional-other", languages: ["ml"], region: "kerala" },
  // ── Public broadcaster / wire / official ──
  "newsonair.gov.in": { name: "Prasar Bharati (NewsOnAir)", familyKey: "prasar-bharati", type: "public-broadcaster", languages: ["en"], region: "india" },
  "ddnews.gov.in": { name: "DD News", familyKey: "prasar-bharati", type: "public-broadcaster", languages: ["en"], region: "india" },
  "pib.gov.in": { name: "Press Information Bureau", familyKey: "govt-india-pib", type: "official", languages: ["en"], region: "india" },
  "ptinews.com": { name: "Press Trust of India", familyKey: "wire-pti", type: "wire-agency", languages: ["en"], region: "india" },
  "aninews.in": { name: "ANI", familyKey: "wire-ani", type: "wire-agency", languages: ["en"], region: "india" },
  "reuters.com": { name: "Reuters", familyKey: "wire-reuters", type: "wire-agency", languages: ["en"], region: "global" },
  "bbc.com": { name: "BBC", familyKey: "bbc", type: "public-broadcaster", languages: ["en"], region: "global" },
  "bbc.co.uk": { name: "BBC", familyKey: "bbc", type: "public-broadcaster", languages: ["en"], region: "global" },
  "altnews.in": { name: "Alt News", familyKey: "pravda-media-foundation", type: "fact-checker", languages: ["en"], region: "india" },
  "factly.in": { name: "Factly", familyKey: "factly-media", type: "fact-checker", languages: ["en"], region: "india" },
  "boomlive.in": { name: "BOOM", familyKey: "boom-live", type: "fact-checker", languages: ["en"], region: "india" },
};

const REGISTRY_BY_DOMAIN = new Map<string, string>();
for (const p of PUBLISHERS) REGISTRY_BY_DOMAIN.set(p.domain.replace(/^www\./, ""), p.name);

export interface ResolvedOutlet {
  name: string;
  publisherId: string;
  registered: boolean;
  familyKey: string;
  type: DiscoveredOutletType;
  language?: "ta" | "en" | "unknown";
}

function baseDomain(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, "");
  // keep publisher sub-domains that the maps use, else collapse to eTLD+1
  if (DISCOVERY_DOMAIN_MAP[h] || REGISTRY_BY_DOMAIN.has(h)) return h;
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const tail2 = parts.slice(-2).join(".");
  const tail3 = parts.slice(-3).join(".");
  if (DISCOVERY_DOMAIN_MAP[tail3] || REGISTRY_BY_DOMAIN.has(tail3)) return tail3;
  return DISCOVERY_DOMAIN_MAP[tail2] || REGISTRY_BY_DOMAIN.has(tail2) ? tail2 : h;
}

export function resolveOutlet(source: string, domain?: string): ResolvedOutlet {
  const cleanSource = (source || "").replace(/\s*[-–—|]\s*[A-Z][\w .'&]+$/, "").trim();

  // 1. registry by exact name
  const byName = publisherByName(cleanSource) || publisherByName(source);
  if (byName) {
    return { name: byName.name, publisherId: byName.id, registered: true, familyKey: byName.familyKey, type: outletTypeFromRegistry(byName.name) };
  }

  // 2. domain — registry, then curated map
  let host = "";
  try {
    host = domain ? domain.toLowerCase() : new URL(source.startsWith("http") ? source : `https://${source}`).hostname;
  } catch {
    host = (domain || "").toLowerCase();
  }
  host = baseDomain(host.replace(/^www\./, ""));

  const regName = REGISTRY_BY_DOMAIN.get(host);
  if (regName) {
    const p = publisherByName(regName)!;
    return { name: p.name, publisherId: p.id, registered: true, familyKey: p.familyKey, type: outletTypeFromRegistry(p.name) };
  }
  const mapped = DISCOVERY_DOMAIN_MAP[host];
  if (mapped) {
    return {
      name: mapped.name,
      publisherId: "",
      registered: false,
      familyKey: mapped.familyKey,
      type: mapped.type,
      language: mapped.languages.includes("ta") ? "ta" : mapped.languages.includes("en") ? "en" : "unknown",
    };
  }

  // 3. fallback — a family of one, UNKNOWN everything
  const fallbackName = cleanSource || host || "Unknown outlet";
  return { name: fallbackName, publisherId: "", registered: false, familyKey: `domain:${host || fallbackName.toLowerCase()}`, type: "unknown" };
}

function outletTypeFromRegistry(name: string): DiscoveredOutletType {
  if (/BusinessLine|Mint|Profit|Business Standard|Moneycontrol|Economic Times/i.test(name)) return "business";
  if (/Sportstar|cricinfo/i.test(name)) return "sports";
  if (/Tamil|Puthiya|Nakkheeran|Dinakaran|Dinamalar/i.test(name)) return "tamil-regional";
  if (/BBC|Prasar|DD News/i.test(name)) return "public-broadcaster";
  if (/RBI|Reserve Bank|SACHET|NDMA|PIB|Press Information|SEBI|Meteorolog|OCHA|ReliefWeb/i.test(name)) return "official";
  if (/Alt News|Factly|BOOM/i.test(name)) return "fact-checker";
  if (/Mongabay|Scroll|Wire|Print|News Minute/i.test(name)) return "digital-native";
  return "national-english";
}
