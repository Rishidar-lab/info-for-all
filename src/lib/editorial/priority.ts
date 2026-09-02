/**
 * computeEditorialPriority — the interpretable ranking layer (v0.9, Phase A).
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { isDigestHeadline } from "@/lib/live/entities";
import { assessConsequence } from "@/lib/domain/consequence";
import type { EditorialPriority, EditorialFactor, EditorialPenalty, EditorialBand } from "./types";
import {
  EDITORIAL_WEIGHTS,
  GEO_RELEVANCE,
  CATEGORY_PRIORITY,
  INFO_GAIN,
  MEANINGFUL_RECENCY_CURVE,
  PENALTY,
  BANDS,
  curve,
} from "./weights";

const OFFICIAL_PRIMARY = new Set(["official-alert", "primary-document"]);
const GENERIC_CAP_TITLE = /^(?:heavy|very heavy|moderate|light)?\s*(?:rain|rainfall|thunderstorm|flood|flash flood|lightning|squall|wind)s?(?:\s+with\s+lightning)?\s*$/i;
const CELEBRITY_RE = /\b(dating rumours|spotted at|red carpet|airport look|cryptic post|fan frenzy|box office|first look|wedding pics)\b/i;
/** A headline that is purely a reaction / quip — not an event. */
const PURE_REACTION_RE = /\b(jibe[sd]?|takes? a (?:dig|jibe)|hits? out|slams?|mocks?|taunts?|trolls?|flays?|lashes? out|swipe[sd]?|counters?|responds? to|reacts? to|first reaction|reacts|grateful to (?:lord|god)|condemns?|welcomes?|hails?|lauds?)\b/i;
const CONCRETE_ACTION_RE = /\b(announce[sd]?|launch\w*|introduce[sd]?|pass\w*|approve[sd]?|order\w*|arrest\w*|resign\w*|appoint\w*|evacuat\w*|died|killed|injured|collapse[sd]?|flood\w*|derail\w*|inaugurat\w*|sanction\w*|allocat\w*|ban\w*)\b/i;

export interface EditorialInput {
  cluster: LiveCluster;
  articles: LiveArticle[];
  now: number;
}

function officialInstitution(articles: LiveArticle[]): boolean {
  return articles.some(
    (a) =>
      OFFICIAL_PRIMARY.has(a.evidenceRole) ||
      a.evidenceRole === "government-statement" ||
      /\b(assembly|high court|supreme court|rbi|sebi|election commission|parliament|ndma|imd)\b/i.test(a.title),
  );
}

/**
 * Consequence for the ranking score. The interpretable, anti-sensationalism
 * signal set lives in `src/lib/domain/consequence.ts`; here it is only combined
 * with the (independently derived) event severity so that a `severe`/`critical`
 * alert still scores high even before its on-the-ground impact is reported.
 */
function consequence(cluster: LiveCluster, articles: LiveArticle[]): number {
  const c = assessConsequence(cluster, articles);
  if (c.isolatedIncident) return c.score; // one incident, however it is worded
  const sev = cluster.trendData?.severity?.level;
  const bySeverity =
    sev === "critical" ? 0.95 : sev === "severe" ? 0.8 : sev === "significant" ? 0.5 : sev === "watch" ? 0.28 : 0;
  const institutional = officialInstitution(articles) ? 0.5 : 0;
  return Math.min(1, Math.max(c.score, bySeverity, institutional, Math.min(0.55, cluster.crisisPriority / 100)));
}

function corroboration(cluster: LiveCluster, articles: LiveArticle[]): number {
  const fam = cluster.trendData?.independence?.families ?? cluster.distinctPublishers;
  const official = articles.some((a) => OFFICIAL_PRIMARY.has(a.evidenceRole));
  if (fam >= 5) return 1;
  if (fam >= 4) return official ? 1 : 0.85;
  if (fam === 3) return official ? 0.88 : 0.72;
  if (fam === 2) return official ? 0.68 : 0.5;
  return official ? 0.42 : 0.15;
}

function localImpact(cluster: LiveCluster, articles: LiveArticle[]): number {
  if (cluster.trendData?.geoTier !== "P0") return cluster.trendData?.geoTier === "P1" ? 0.1 : 0;
  const districts = cluster.districts.length;
  const text = articles.map((a) => `${a.title} ${a.excerpt ?? ""}`).join(" ");
  const infra = (text.match(/\b(school|bus|train|metro|highway|road|airport|power|water supply|hospital|fishing|dam|reservoir|port)\b/gi) ?? []).length;
  return Math.min(1, 0.35 + Math.min(districts, 6) * 0.09 + Math.min(infra, 4) * 0.05);
}

export function computeEditorialPriority(input: EditorialInput): EditorialPriority {
  const { cluster, articles, now } = input;
  const td = cluster.trendData;
  const tier = td?.geoTier ?? (cluster.scope === "tamil-nadu" ? "P0" : cluster.scope === "excluded" ? "out" : "P1");
  const category = td?.category ?? "other-relevant";
  const updateKind = td?.novelty?.updateKind ?? "unknown";
  const fam = td?.independence?.families ?? cluster.distinctPublishers;
  const syndicated = td?.independence?.syndicated ?? 0;
  const reports = td?.independence?.reports ?? articles.length;

  const minutesSinceMeaningful = td?.lastMeaningfulUpdateAt
    ? Math.max(0, (now - Date.parse(td.lastMeaningfulUpdateAt)) / 60_000)
    : Math.max(0, (now - Date.parse(cluster.updatedAt)) / 60_000);

  const headText = articles.map((a) => a.title).join("  ");
  const pureReaction = PURE_REACTION_RE.test(headText) && !CONCRETE_ACTION_RE.test(headText);

  const conseq = assessConsequence(cluster, articles);
  let consequenceV = consequence(cluster, articles);
  let infoGainV = INFO_GAIN[updateKind] ?? 0.4;

  // An isolated single-victim crime does not get crisis-domain prominence,
  // however it is classified or worded — the priority-domain lever is for
  // public-safety events at scale, not for a lurid headline. (Phase I.)
  let categoryPriorityV = CATEGORY_PRIORITY[category] ?? 0.22;
  if (conseq.isolatedIncident && (category === "crisis" || category === "other-relevant")) {
    categoryPriorityV = Math.min(categoryPriorityV, 0.24);
  }
  // "new to us" ≠ "a major development" — moderate the gain when the event is
  // low-consequence and thinly sourced (a political quip, a minor local item).
  if ((updateKind === "new-event" || updateKind === "major-development") && consequenceV < 0.35 && fam < 3) {
    infoGainV = 0.5;
  }
  if (pureReaction) {
    consequenceV = Math.min(consequenceV, 0.28);
    infoGainV = Math.min(infoGainV, 0.4);
  }

  const values = {
    geoRelevance: GEO_RELEVANCE[tier] ?? 0.4,
    categoryPriority: categoryPriorityV,
    consequence: consequenceV,
    informationGain: infoGainV,
    corroboration: corroboration(cluster, articles),
    meaningfulRecency: curve(minutesSinceMeaningful, MEANINGFUL_RECENCY_CURVE),
    localImpact: localImpact(cluster, articles),
    velocity: Math.min(1, (td?.trend?.velocityScore ?? 0.15)),
  };

  const factors: EditorialFactor[] = (Object.keys(EDITORIAL_WEIGHTS) as (keyof typeof EDITORIAL_WEIGHTS)[]).map((k) => ({
    name: k,
    value: Math.round(values[k] * 100) / 100,
    weight: EDITORIAL_WEIGHTS[k],
    contribution: Math.round(values[k] * EDITORIAL_WEIGHTS[k] * 1000) / 1000,
  }));
  let base = factors.reduce((s, f) => s + f.contribution, 0);

  // ── penalties ──
  const penalties: EditorialPenalty[] = [];
  const pen = (name: string, amount: number, reason: string) => {
    if (amount > 0) {
      penalties.push({ name, amount: Math.round(amount * 1000) / 1000, reason });
      base -= amount;
    }
  };

  // A "rephrasing" update (fresh article, zero new info) is real SEO churn.
  // A "duplicate" (no new article at all) is just a stable story — a lighter touch.
  if (updateKind === "rephrasing") pen("churn", PENALTY.duplicate, "a fresh article that added no new information");
  else if (updateKind === "duplicate") pen("not-developing", PENALTY.duplicate * 0.4, "no new report since the last snapshot");
  if (minutesSinceMeaningful > 24 * 60) pen("staleness", PENALTY.staleness24h, "no meaningful update in over a day");
  else if (minutesSinceMeaningful > 12 * 60) pen("staleness", PENALTY.staleness12h, "no meaningful update in over 12 hours");

  if (reports > 1 && syndicated > 0) {
    pen("syndication", (PENALTY.syndicationMax * syndicated) / reports, `${syndicated} of ${reports} reports are syndicated copies`);
  }

  // A SACHET-only CAP watch whose title is a bare hazard word ("Light Rain",
  // "Thunderstorm"), optionally followed by a district list, and which is one
  // source family and not a serious CAP severity — a forecast polygon, not a
  // developing event. The appended "— Dist, Dist +" list does not make it more
  // consequential.
  const capTitleCore = cluster.title.trim().split(/\s+[—–-]\s+/)[0] ?? cluster.title.trim();
  const capSev = (cluster.cap?.severity ?? "").toLowerCase();
  const genericCap =
    cluster.publishers.length === 1 &&
    cluster.publishers[0] === "NDMA SACHET" &&
    GENERIC_CAP_TITLE.test(capTitleCore) &&
    fam <= 1 &&
    capSev !== "severe" &&
    capSev !== "extreme" &&
    !["significant", "severe", "critical"].includes(cluster.trendData?.severity?.level ?? "");
  if (genericCap) pen("generic-cap", PENALTY.genericCap, "a generic single-source CAP watch, not a developing event");

  const noExcerpt = articles.every((a) => !a.excerpt || a.excerpt.length < 20);
  if (noExcerpt && articles.length <= 1) pen("headline-only", PENALTY.headlineOnly, "a single headline with no excerpt to assess");

  if (fam <= 1 && !articles.some((a) => OFFICIAL_PRIMARY.has(a.evidenceRole))) {
    pen("weak-evidence", PENALTY.weakEvidence, "a single source family and no official primary source");
  }

  const gossip = CELEBRITY_RE.test(headText);
  if (gossip || category === "celebrity") pen("gossip", PENALTY.gossip, "celebrity / personal-life content");
  if (pureReaction) pen("reaction-only", 0.1, "a reaction / quip, not a concrete development");

  const score01 = Math.max(0, Math.min(1, base));
  const score = Math.round(score01 * 100 * 10) / 10;

  // ── hard suppression rules (genuine junk only) ──
  let suppressedByRule: string | undefined;
  if (tier === "out") suppressedByRule = "outside India with no stated India / Tamil Nadu consequence";
  else if (category === "celebrity" || category === "entertainment") suppressedByRule = "celebrity / entertainment (excluded from IFFA's default surfaces)";
  else if (isDigestHeadline(cluster.title)) suppressedByRule = "a multi-topic news bulletin / digest, not a single event";
  else if (gossip) suppressedByRule = "celebrity / personal-life content";
  else if (reports >= 3 && fam <= 1 && syndicated >= reports - 1 && values.consequence < 0.3)
    suppressedByRule = "syndicated copies of one low-consequence dispatch, no independent reporting";

  // ── band ──
  let band: EditorialBand;
  if (suppressedByRule) band = "suppressed";
  else if (
    score >= BANDS.urgentMin &&
    (cluster.trendData?.severity?.level === "severe" || cluster.trendData?.severity?.level === "critical") &&
    values.informationGain >= 0.45 &&
    values.corroboration >= 0.45
  ) {
    band = "urgent";
  } else if (score >= BANDS.highMin || (tier === "P0" && values.consequence >= 0.6 && values.informationGain >= 0.5)) {
    band = "high";
  } else if (score >= BANDS.standardMin) band = "standard";
  else if (score >= BANDS.backgroundMin) band = "background";
  else band = "suppressed";

  // A general-interest story is never above STANDARD unless it is genuinely
  // consequential — this is how OTHER_RELEVANT is de-emphasised without
  // misclassifying it.
  if (category === "other-relevant" && band !== "suppressed") {
    if (values.consequence >= 0.55 && tier === "P0") {
      if (band === "high") band = "standard";
    } else {
      band = "background";
    }
  }

  // An isolated single-victim incident is real news but not front-page
  // consequence for a civic-intelligence product — cap it at STANDARD, however
  // vivid the headline. (Phase I, anti-sensationalism.)
  if (conseq.isolatedIncident && (band === "urgent" || band === "high")) band = "standard";

  // ── reasons ──
  const reasons: string[] = [];
  const R = (cond: boolean, text: string) => cond && reasons.push(text);
  R(tier === "P0", "Tamil Nadu (P0) relevance");
  R(tier === "P1" && category === "crisis", "India-wide public-safety event");
  R(category === "crisis" && (cluster.trendData?.severity?.level === "severe" || cluster.trendData?.severity?.level === "critical"), `${cluster.trendData?.severity?.level} event severity`);
  R(articles.some((a) => OFFICIAL_PRIMARY.has(a.evidenceRole)), "official / primary source present");
  R(fam >= 3, `${fam} independent source families`);
  R(["new-event", "new-fact", "new-number", "new-location", "new-official-confirmation", "correction", "major-development"].includes(updateKind), `new development: ${(td?.novelty?.changes ?? [])[0] ?? updateKind}`);
  R(cluster.districts.length >= 2, `affects ${cluster.districts.slice(0, 4).join(", ")}`);
  R(values.meaningfulRecency >= 0.9, "updated in the last hour");
  R(conseq.signals.length > 0 && !conseq.isolatedIncident, `consequence: ${conseq.signals[0]?.evidence ?? ""}`);
  R(conseq.isolatedIncident, "an isolated incident — not de-prioritised junk, but not front-page consequence");
  if (reasons.length === 0) reasons.push(category === "other-relevant" ? "general / regional interest — not a priority domain" : "limited current signal");

  return {
    score,
    band,
    factors,
    reasons: reasons.slice(0, 6),
    penalties,
    suppressedByRule,
    consequenceSignals: conseq.signals.slice(0, 5),
  };
}
