/**
 * Claim-aware novelty engine (v0.8, Phase D).
 *
 * v0.7 novelty was coarse: "did a new article arrive after the last snapshot".
 * v2 compares the FACTUAL UNITS — claim texts, figures, affected locations,
 * official actions — between the previous snapshot's version of an event and the
 * current one, and classifies exactly what changed. An article that only
 * rewrites the headline is NOT a meaningful update.
 *
 * Deterministic, no model. Every score component is inspectable.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { extractFigures, stripHeadlinePrefix } from "@/lib/live/entities";
import { titleTokens } from "@/lib/live/text";
import type { NoveltyClass } from "./types";

export type UpdateKind =
  | "duplicate"
  | "rephrasing"
  | "minor-detail"
  | "new-source-only"
  | "new-fact"
  | "new-number"
  | "new-location"
  | "new-authority-statement"
  | "new-official-confirmation"
  | "new-counterclaim"
  | "new-contradiction"
  | "correction"
  | "retraction"
  | "major-development"
  | "unknown";

/** A compact canonical view of what an event currently establishes. */
export interface EventState {
  confirmedFacts: string[];
  disputedClaims: string[];
  latestNumbers: string[];
  affectedLocations: string[];
  officialActions: string[];
  unresolvedQuestions: string[];
  lastMeaningfulUpdateAt: string;
}

export interface NoveltyResult {
  noveltyClass: NoveltyClass;
  updateKind: UpdateKind;
  /** 0–1, interpretable. */
  meaningfulUpdateScore: number;
  /** Human-readable, most important first. */
  changes: string[];
  quietGapHours: number;
}

const CORRECTION_RE = /\b(correct(?:ion|ed|s)?|revis(?:e|es|ed|ing)|updated? (?:to|the (?:toll|figure|number))|clarif\w+|amends?|rectif\w+|toll (?:cut|lowered|reduced)|scaled? (?:down|back) the)\b/i;
const RETRACTION_RE = /\b(retract\w+|withdraws?|takes? back|denies? earlier|walks? back|no longer stands)\b/i;
const OFFICIAL_ROLES = new Set(["official-alert", "primary-document", "government-statement"]);
const COUNTER_RE = /\b(denies?|rejects?|disputes?|refutes?|contests?|counters?|hits? back|opposition says|but (?:the )?(?:police|government|official))\b/i;

function figuresOf(articles: LiveArticle[]): Set<string> {
  const out = new Set<string>();
  for (const a of articles) for (const f of extractFigures(stripHeadlinePrefix(a.title) + " " + (a.excerpt ?? ""))) out.add(f);
  return out;
}
function claimTextsOf(cluster: LiveCluster): Set<string> {
  return new Set((cluster.claims?.claims ?? []).map((c) => c.canonicalText.toLowerCase()));
}
function tokenSig(articles: LiveArticle[]): Set<string> {
  const out = new Set<string>();
  for (const a of articles) for (const t of titleTokens(stripHeadlinePrefix(a.title) + " " + (a.excerpt ?? ""))) out.add(t);
  return out;
}

/** Build the canonical current-state view of an event. */
export function buildEventState(cluster: LiveCluster, articles: LiveArticle[], lastMeaningfulUpdateAt: string): EventState {
  const claims = cluster.claims?.claims ?? [];
  const confirmed = claims.filter((c) => c.status === "corroborated").map((c) => c.canonicalText);
  const disputed = claims.filter((c) => c.status === "disputed").map((c) => c.canonicalText);
  const latestNumbers = [...figuresOf(articles)].slice(0, 8);
  const officialActions = articles
    .filter((a) => OFFICIAL_ROLES.has(a.evidenceRole))
    .map((a) => stripHeadlinePrefix(a.title))
    .slice(0, 4);
  return {
    confirmedFacts: (confirmed.length ? confirmed : cluster.commonGround ?? []).slice(0, 6),
    disputedClaims: disputed.slice(0, 4),
    latestNumbers,
    affectedLocations: [...cluster.districts],
    officialActions,
    unresolvedQuestions: (cluster.unknowns ?? []).slice(0, 4),
    lastMeaningfulUpdateAt,
  };
}

/**
 * Compare the current cluster against its previous-snapshot version.
 *
 * @param hasPreviousSnapshot false only on the very first ingest ever.
 */
export function assessNovelty(
  cluster: LiveCluster,
  articles: LiveArticle[],
  prev: LiveCluster | undefined,
  hasPreviousSnapshot: boolean,
): NoveltyResult {
  if (!hasPreviousSnapshot) {
    return { noveltyClass: "unknown", updateKind: "unknown", meaningfulUpdateScore: 0.5, changes: ["first observation — nothing to compare against"], quietGapHours: 0 };
  }
  if (!prev) {
    return { noveltyClass: "new-event", updateKind: "major-development", meaningfulUpdateScore: 1, changes: ["a new event"], quietGapHours: 0 };
  }

  const prevLast = Date.parse(prev.trendData?.lastSeenAt ?? prev.updatedAt);
  const newest = Math.max(...articles.map((a) => Date.parse(a.publishedAt)));
  const quietGapHours = Math.max(0, (newest - prevLast) / 3_600_000);
  const fresh = articles.filter((a) => Date.parse(a.publishedAt) > prevLast + 20 * 60_000);

  if (fresh.length === 0) {
    return { noveltyClass: "more-of-same", updateKind: "duplicate", meaningfulUpdateScore: 0.1, changes: ["no new report since the last snapshot"], quietGapHours };
  }

  const freshText = fresh.map((a) => `${a.title} ${a.excerpt ?? ""}`).join("  ");

  // ── corrections / retractions ──
  if (RETRACTION_RE.test(freshText)) {
    return { noveltyClass: "correction", updateKind: "retraction", meaningfulUpdateScore: 0.95, changes: ["a report was retracted / withdrawn"], quietGapHours };
  }
  if (CORRECTION_RE.test(freshText)) {
    return { noveltyClass: "correction", updateKind: "correction", meaningfulUpdateScore: 0.9, changes: ["an earlier figure / claim was corrected"], quietGapHours };
  }

  // ── what's genuinely new? ──
  const prevClaims = claimTextsOf(prev);
  const nowClaims = claimTextsOf(cluster);
  const newClaims = [...nowClaims].filter((t) => !prevClaims.has(t));

  // The previous snapshot's articles are not in scope here, so figure novelty
  // is judged against the previous claim texts.
  const prevFigsFromClaims = new Set<string>();
  for (const t of prevClaims) for (const m of t.matchAll(/[\d,]+(?:\.\d+)?\s?(?:crore|lakh|dead|killed|injured|mm|cm|cusec|%|per cent|tmcft|ft|feet)/g)) prevFigsFromClaims.add(m[0]);
  const nowFigs = figuresOf(fresh);
  const newFigs = [...nowFigs].filter((f) => !prevFigsFromClaims.has(f) && ![...prevClaims].some((t) => t.includes(f)));

  const prevDistricts = new Set(prev.districts ?? []);
  const newDistricts = cluster.districts.filter((d) => !prevDistricts.has(d));

  const officialFresh = fresh.some((a) => OFFICIAL_ROLES.has(a.evidenceRole));
  const wasOfficial = (prev.officialCount ?? 0) > 0;

  const counterFresh = COUNTER_RE.test(freshText);
  const contradictionGrew = (cluster.claims?.disputes?.length ?? 0) > (prev.claims?.disputes?.length ?? 0);

  const familiesNow = cluster.trendData?.independence?.families ?? cluster.distinctPublishers;
  const familiesPrev = prev.trendData?.independence?.families ?? prev.distinctPublishers;

  const changes: string[] = [];
  let kind: UpdateKind = "new-source-only";
  let score = 0.2;

  if (contradictionGrew) {
    kind = "new-contradiction"; score = 0.85;
    changes.push("a new contradiction between sources");
  } else if (counterFresh) {
    kind = "new-counterclaim"; score = 0.6;
    changes.push("a counter-claim / denial was added");
  }
  if (officialFresh && !wasOfficial) {
    kind = "new-official-confirmation"; score = Math.max(score, 0.85);
    changes.push("an official / primary source confirmed it");
  } else if (officialFresh) {
    kind = kind === "new-source-only" ? "new-authority-statement" : kind;
    score = Math.max(score, 0.55);
    changes.push("a new authority statement");
  }
  if (newFigs.length > 0) {
    kind = kind === "new-source-only" ? "new-number" : kind;
    score = Math.max(score, 0.7);
    changes.push(`new figure(s): ${newFigs.slice(0, 3).join(", ")}`);
  }
  if (newDistricts.length > 0) {
    kind = kind === "new-source-only" ? "new-location" : kind;
    score = Math.max(score, 0.65);
    changes.push(`new affected area(s): ${newDistricts.slice(0, 3).join(", ")}`);
  }
  if (newClaims.length > 0) {
    kind = ["new-source-only", "new-authority-statement"].includes(kind) ? "new-fact" : kind;
    score = Math.max(score, 0.6);
    changes.push(`${newClaims.length} new claim(s)`);
  }

  if (changes.length === 0) {
    // only new reports, no new facts — rephrasing vs duplicate vs minor detail
    const prevTok = new Set<string>();
    for (const t of prevClaims) for (const w of t.split(/\W+/)) if (w.length > 3) prevTok.add(w.toLowerCase());
    const freshTok = tokenSig(fresh);
    const novelTok = [...freshTok].filter((t) => !prevTok.has(t));
    if (familiesNow > familiesPrev) {
      return { noveltyClass: "more-of-same", updateKind: "new-source-only", meaningfulUpdateScore: 0.3, changes: [`${familiesNow - familiesPrev} more independent source famil${familiesNow - familiesPrev === 1 ? "y" : "ies"}, same facts`], quietGapHours };
    }
    if (novelTok.length >= 4) {
      return { noveltyClass: "more-of-same", updateKind: "minor-detail", meaningfulUpdateScore: 0.25, changes: ["minor new detail, no new fact"], quietGapHours };
    }
    if (novelTok.length >= 1) {
      return { noveltyClass: "more-of-same", updateKind: "rephrasing", meaningfulUpdateScore: 0.15, changes: ["rephrased, no new information"], quietGapHours };
    }
    return { noveltyClass: "more-of-same", updateKind: "duplicate", meaningfulUpdateScore: 0.1, changes: ["duplicate of an existing report"], quietGapHours };
  }

  // resurgence bonus
  if (quietGapHours >= 12) {
    score = Math.min(1, score + 0.1);
    changes.push(`resurfaced after ~${Math.round(quietGapHours)}h quiet`);
  }

  const majorish = score >= 0.8 || (newFigs.length > 0 && newDistricts.length > 0) || (contradictionGrew && officialFresh);
  return {
    noveltyClass: "new-fact" as NoveltyClass,
    updateKind: majorish ? "major-development" : kind,
    meaningfulUpdateScore: Math.round(score * 100) / 100,
    changes: changes.slice(0, 5),
    quietGapHours,
  };
}
