/**
 * §B.3 Phase 4 — coverage query generation.
 *
 * B.2 built deterministic PRIMARY-RECORD queries. B.3 needs COVERAGE queries:
 * multiple classes per event, English and Tamil, built from the canonical event
 * graph — never the raw headline, never a paraphrase, never a model string.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { buildSignature } from "@/lib/event-identity";
import { cleanHeadline } from "@/lib/brief/text";
import { resolvePlaces } from "@/lib/language/locations";
import { tamilConceptTokens } from "@/lib/language/tamil";
import type { DiscoveryEvent, DiscoveryQuery } from "./types";

const CLICKBAIT =
  /\b(breaking(?:\s+news)?|watch|live(?:\s+updates?)?|exclusive|big breaking|just in|explained|video|photos?|viral|shocking|must[- ]watch)\b/gi;

function stripNoise(s: string): string {
  return s
    .replace(CLICKBAIT, " ")
    .replace(/\s*\|\s*[A-Z][\w .'-]+$/g, "")
    .replace(/["""''|•·—–]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The 3–6 content words that identify the event. */
function headlineCore(title: string): string {
  const cleaned = stripNoise(cleanHeadline(title));
  const stop = new Set(["the", "a", "an", "of", "for", "and", "or", "to", "in", "on", "at", "as", "by", "with", "from", "amid", "after", "over", "is", "are", "was", "were", "be", "will", "that", "this", "says", "said", "how", "why"]);
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w.toLowerCase()))
    .slice(0, 8);
  return words.join(" ");
}

export function buildDiscoveryEvent(cluster: LiveCluster, articles: LiveArticle[]): DiscoveryEvent {
  const ents = new Set<string>();
  const acts = new Set<string>();
  for (const a of articles.slice(0, 6)) {
    const sig = buildSignature({ title: a.title, excerpt: a.excerpt, publishedAt: a.publishedAt, language: a.language, districts: a.districts, crisisType: a.crisisType });
    for (const e of sig.entities) ents.add(e);
    for (const f of sig.actions) acts.add(f);
  }
  // proper nouns from the cleaned title
  for (const m of stripNoise(cluster.title).matchAll(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3}/g)) ents.add(m[0]);

  const blob = `${cluster.title}. ${articles.slice(0, 4).map((a) => `${a.title}. ${a.excerpt ?? ""}`).join(" ")}`;
  const places = [
    ...new Set([
      ...cluster.districts,
      ...resolvePlaces(blob).map((p) => p.place.canonical),
    ]),
  ].filter((p) => p !== "India").slice(0, 6);
  const numbers = [...new Set((blob.match(/(?:₹|rs\.?\s*)?\d[\d,]*(?:\.\d+)?\s*(?:crore|lakh|%|per cent|mm|cusecs?|kmph|bps|points?)?/gi) ?? []).map((s) => s.trim()).filter((s) => /\d/.test(s) && s.length > 1))].slice(0, 6);
  const dates = [...new Set((blob.match(/\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}/gi) ?? []).map((s) => s.toLowerCase())].slice(0, 4);

  const anchorDate = (cluster.trendData?.firstSeenAt ?? cluster.updatedAt ?? "").slice(0, 10);

  return {
    slug: cluster.slug,
    title: cluster.title,
    category: cluster.trendData?.category ?? "other-relevant",
    scope: cluster.scope,
    districts: cluster.districts,
    entities: [...ents].filter((e) => e.length > 2).slice(0, 12),
    places,
    numbers,
    dates,
    anchorDate,
    languages: [...new Set(articles.map((a) => a.language))],
    knownPublishers: [...new Set(articles.map((a) => a.publisher))],
  };
}

/** Tamil-side identity terms for an English/TN event (place + concept lexicon). */
function tamilTerms(event: DiscoveryEvent): string[] {
  const out = new Set<string>();
  const { concepts, places } = tamilConceptTokens(`${event.title} ${event.entities.join(" ")}`);
  for (const p of places) out.add(p);
  for (const c of concepts) out.add(c.replace(/-/g, " "));
  // known Tamil renderings of the common districts
  const TA_PLACE: Record<string, string> = {
    Chennai: "சென்னை", Coimbatore: "கோயம்புத்தூர்", Madurai: "மதுரை", Cuddalore: "கடலூர்",
    Salem: "சேலம்", Erode: "ஈரோடு", Tiruchirappalli: "திருச்சி", Thanjavur: "தஞ்சாவூர்",
    Tirunelveli: "திருநெல்வேலி", Vellore: "வேலூர்", "Tamil Nadu": "தமிழ்நாடு",
  };
  for (const p of event.places) if (TA_PLACE[p]) out.add(TA_PLACE[p]);
  return [...out].slice(0, 5);
}

export function buildDiscoveryQueries(event: DiscoveryEvent): DiscoveryQuery[] {
  const now = new Date().toISOString();
  void now;
  const core = headlineCore(event.title);
  const topEnts = event.entities.filter((e) => /[A-Z]/.test(e) || /[஀-௿]/.test(e)).slice(0, 3);
  const topPlaces = event.places.slice(0, 2);
  const isTamilTitle = /[஀-௿]/.test(event.title);
  const isTN = event.scope === "tamil-nadu" || event.districts.length > 0;

  const q: DiscoveryQuery[] = [];
  const add = (cls: DiscoveryQuery["cls"], text: string, language: DiscoveryQuery["language"] = "any") => {
    const t = text.replace(/\s+/g, " ").trim();
    if (t.length >= 4 && !q.some((x) => x.text === t)) q.push({ cls, text: t, language, anchorDate: event.anchorDate });
  };

  if (core) add("headline_core", `"${core}"`, isTamilTitle ? "ta" : "en");
  if (topEnts.length && event.entities.length) {
    add("entity_action", `"${topEnts[0]}" ${core.split(" ").slice(-3).join(" ")}`);
  }
  if (topEnts.length && topPlaces.length) add("entity_location", `"${topEnts[0]}" "${topPlaces[0]}"`);
  if (topEnts.length && event.dates.length) add("entity_date", `"${topEnts[0]}" ${event.dates[0]}`);

  // cross-language
  if (isTN && !isTamilTitle) {
    const ta = tamilTerms(event);
    if (ta.length >= 2) add("tamil_entity_action", ta.join(" "), "ta");
  }
  if (isTamilTitle) {
    // English side from proper nouns already extracted (buildSignature keeps latin names)
    const en = event.entities.filter((e) => /^[A-Za-z]/.test(e)).slice(0, 3);
    if (en.length) add("english_entity_action", `${en.join(" ")} ${topPlaces.join(" ")}`.trim(), "en");
  }

  if (topPlaces.length) add("local_coverage", `"${topPlaces[0]}" ${core.split(" ").slice(0, 3).join(" ")}`);
  add("national_coverage", `${core.split(" ").slice(0, 4).join(" ")} India`, "en");

  if (event.category === "politics") add("counterclaim", `${topEnts.join(" ")} denies OR rejects OR responds`.trim(), "en");
  add("factcheck", `${core.split(" ").slice(0, 4).join(" ")} fact check`, "en");

  return q.slice(0, 10);
}
