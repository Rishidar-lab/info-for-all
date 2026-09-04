/**
 * Build a `DiscoveryEvent` from a cluster, and a small set of high-quality
 * `DiscoveryQuery` search intents from that event graph.
 *
 * The queries are built from STRUCTURED event features (entities, places,
 * numbers, dates, actions) via the frozen event-identity signature — never the
 * raw headline, never a paraphrase, never a model string. A large keyword bag
 * would surface noise the same-event gate then has to reject; a handful of
 * precise intents is the point.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { CategoryId } from "@/lib/domain/categories";
import { buildSignature } from "@/lib/event-identity";
import { cleanHeadline } from "@/lib/brief/text";
import { resolvePlaces } from "@/lib/language/locations";
import { tamilConceptTokens } from "@/lib/language/tamil";
import type { DiscoveryEvent, DiscoveryQuery } from "./types";

const TAMIL_RE = /[஀-௿]/;

const CLICKBAIT =
  /\b(breaking(?:\s+news)?|watch|live(?:\s+updates?)?|exclusive|big breaking|just in|explained|video|photos?|viral|shocking|must[- ]watch|watch:)\b/gi;

function stripNoise(s: string): string {
  return s
    .replace(CLICKBAIT, " ")
    .replace(/\s*\|\s*[A-Z][\w .'-]+$/g, "")
    .replace(/["“”‘’|•·—–]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "the", "a", "an", "of", "for", "and", "or", "to", "in", "on", "at", "as", "by", "with", "from",
  "amid", "after", "over", "is", "are", "was", "were", "be", "will", "that", "this", "says", "said",
  "how", "why", "what", "when", "who", "into", "not", "no", "his", "her", "its", "their",
]);

/** The 3–8 content words that identify the event. */
function headlineCore(title: string): string {
  const cleaned = stripNoise(cleanHeadline(title));
  return cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()))
    .slice(0, 8)
    .join(" ");
}

const NUM_RE =
  /(?:₹|rs\.?\s*)?\d[\d,]*(?:\.\d+)?\s*(?:crore|lakh|%|per cent|mm|cusecs?|kmph|bps|points?|km|acres?)?/gi;
const DATE_RE =
  /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}\b/gi;

const TN_PUBLISHER = /hindu tamil|news18 tamil|puthiyathalaimurai|bbc tamil|abp tamil|nakkheeran|dinamalar|dinakaran|maalaimalar|vikatan|polimer|thanthi|dt next|dtnext/i;

export function buildDiscoveryEvent(cluster: LiveCluster, articles: LiveArticle[]): DiscoveryEvent {
  const ents = new Set<string>();
  for (const a of articles.slice(0, 6)) {
    const sig = buildSignature({
      title: a.title,
      excerpt: a.excerpt,
      publishedAt: a.publishedAt,
      language: a.language,
      districts: a.districts,
      crisisType: a.crisisType,
    });
    for (const e of sig.entities) ents.add(e);
  }
  // proper-noun phrases straight from the cleaned title (buildSignature is
  // conservative about single names)
  for (const m of stripNoise(cluster.title).matchAll(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3}\b/g)) {
    ents.add(m[0]);
  }

  const blob = `${cluster.title}. ${articles
    .slice(0, 4)
    .map((a) => `${a.title}. ${a.excerpt ?? ""}`)
    .join(" ")}`;

  const places = [
    ...new Set([...cluster.districts, ...resolvePlaces(blob).map((p) => p.place.canonical)]),
  ]
    .filter((p) => p && p !== "India")
    .slice(0, 6);

  const numbers = [
    ...new Set(
      (blob.match(NUM_RE) ?? [])
        .map((s) => s.trim())
        .filter((s) => /\d/.test(s) && s.replace(/\D/g, "").length >= 1 && s.length > 1),
    ),
  ].slice(0, 5);

  const dates = [...new Set((blob.match(DATE_RE) ?? []).map((s) => s.toLowerCase().trim()))].slice(0, 3);

  const anchorDate = (cluster.trendData?.firstSeenAt ?? cluster.updatedAt ?? "").slice(0, 10);

  const tamilNadu =
    cluster.scope === "tamil-nadu" ||
    cluster.districts.length > 0 ||
    cluster.trendData?.geoTier === "P0" ||
    articles.some((a) => TN_PUBLISHER.test(a.publisher));

  return {
    slug: cluster.slug,
    title: cluster.title,
    category: (cluster.trendData?.category as CategoryId) ?? "other-relevant",
    scope: cluster.scope,
    districts: cluster.districts,
    entities: [...ents].filter((e) => e.length > 2 && !STOP.has(e.toLowerCase())).slice(0, 12),
    places,
    numbers,
    dates,
    anchorDate,
    languages: [...new Set(articles.map((a) => a.language))],
    knownPublishers: [...new Set(articles.map((a) => a.publisher))],
    knownGenuineFamilies: cluster.trendData?.independence?.families ?? 1,
    tamilNadu,
  };
}

const TA_PLACE: Record<string, string> = {
  Chennai: "சென்னை", Coimbatore: "கோயம்புத்தூர்", Madurai: "மதுரை", Cuddalore: "கடலூர்",
  Salem: "சேலம்", Erode: "ஈரோடு", Tiruchirappalli: "திருச்சி", Trichy: "திருச்சி",
  Thanjavur: "தஞ்சாவூர்", Tirunelveli: "திருநெல்வேலி", Vellore: "வேலூர்", Tiruppur: "திருப்பூர்",
  Thoothukudi: "தூத்துக்குடி", Nagapattinam: "நாகப்பட்டினம்", Kancheepuram: "காஞ்சிபுரம்",
  Villupuram: "விழுப்புரம்", Dindigul: "திண்டுக்கல்", Karur: "கரூர்", Namakkal: "நாமக்கல்",
  "Tamil Nadu": "தமிழ்நாடு", Puducherry: "புதுச்சேரி",
};

/** Tamil-side identity terms for an English/TN event (place + concept lexicon). */
function tamilTerms(event: DiscoveryEvent): string[] {
  const out = new Set<string>();
  const { concepts, places } = tamilConceptTokens(`${event.title} ${event.entities.join(" ")}`);
  for (const p of places) out.add(p);
  for (const c of concepts) out.add(c.replace(/-/g, " "));
  for (const p of event.places) if (TA_PLACE[p]) out.add(TA_PLACE[p]);
  return [...out].filter((t) => TAMIL_RE.test(t)).slice(0, 5);
}

export function buildDiscoveryQueries(event: DiscoveryEvent): DiscoveryQuery[] {
  const core = headlineCore(event.title);
  const isTamilTitle = TAMIL_RE.test(event.title);
  const namedEnts = event.entities.filter((e) => /^[A-Z]/.test(e) || TAMIL_RE.test(e)).slice(0, 3);
  const topPlaces = event.places.slice(0, 2);
  const q: DiscoveryQuery[] = [];

  const add = (cls: DiscoveryQuery["cls"], text: string, language: DiscoveryQuery["language"] = "any") => {
    const t = text.replace(/\s+/g, " ").trim();
    if (t.length >= 4 && !q.some((x) => x.text.toLowerCase() === t.toLowerCase())) {
      q.push({ cls, text: t, language, anchorDate: event.anchorDate });
    }
  };

  if (core) add("headline_core", core, isTamilTitle ? "ta" : "en");
  if (namedEnts.length && core) {
    add("entity_action", `${namedEnts[0]} ${core.split(" ").slice(-4).join(" ")}`);
  }
  if (namedEnts.length && topPlaces.length) add("entity_place", `${namedEnts[0]} ${topPlaces[0]}`);
  if (namedEnts.length && event.dates.length) add("entity_date", `${namedEnts[0]} ${event.dates[0]}`);

  // cross-language — never replaces the original-language query, it adds to it
  if (event.tamilNadu && !isTamilTitle) {
    const ta = tamilTerms(event);
    if (ta.length >= 2) add("tamil_cross_language", ta.join(" "), "ta");
  }
  if (isTamilTitle) {
    const en = event.entities.filter((e) => /^[A-Za-z]/.test(e)).slice(0, 3);
    if (en.length) add("english_cross_language", `${en.join(" ")} ${topPlaces.join(" ")}`.trim(), "en");
  }

  if (topPlaces.length && core) {
    add("local_coverage", `${topPlaces[0]} ${core.split(" ").slice(0, 4).join(" ")}`);
  }
  if (core) add("national_coverage", `${core.split(" ").slice(0, 5).join(" ")}`.trim(), "en");

  if ((event.category === "politics" || event.category === "finance") && namedEnts.length) {
    add("counter_response", `${namedEnts.slice(0, 2).join(" ")} response`.trim(), "en");
  }

  return q.slice(0, 8);
}
