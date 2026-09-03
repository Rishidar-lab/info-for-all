/**
 * Trend-engine orchestrator (v0.7, Phase E/F).
 *
 * Consumes a clustered `LiveDataset` and ADDS enrichment — category, geo tier,
 * independence summary, timeline, first-seen tracking and the interpretable
 * trend score — to every cluster, plus dataset-level `trending` / `watching` /
 * `situation` / `counts.byCategory`.
 *
 * It never edits the identity / claims / clustering engines: it only reads
 * `LiveArticle[]` and `LiveCluster[]` and writes new fields. Pure and
 * deterministic given (dataset, now, previous).
 */
import type { LiveArticle, LiveCluster, LiveDataset, ClusterTrendData } from "@/lib/live/types";
import { analyseIndependence, independenceLabel } from "@/lib/independence";
import { type CategoryId, CATEGORY_ORDER, DEFAULT_ENABLED } from "@/lib/domain/categories";
import { classifyEvent } from "@/lib/domain/classify";
import { buildSignature } from "@/lib/event-identity";
import { geoTierOf, type GeoTier } from "@/lib/domain/geo-tiers";
import { resolveDistricts } from "@/lib/domain/districts";
import { buildTimeline, lastMeaningfulUpdate } from "./timeline";
import { trendWindows, velocityScore, trendState } from "./velocity";
import { computeTrend } from "./score";
import { buildSituation } from "./situation";
import { TREND_MIN } from "./weights";
import type { IndependenceSummary } from "./types";
import { assessNovelty, buildEventState } from "./novelty";
import { resolveTemporal } from "@/lib/domain/temporal";
import { assessLocalImpact } from "@/lib/domain/local-impact";
import { detectPoliticalEvent, threadRelation, type ThreadRelation } from "@/lib/domain/politics";
import { assessPoliticalCoverage } from "@/lib/domain/political-coverage";
import { detectPolicyEvent, isMarketReaction, parseMarketMoves } from "@/lib/domain/finance";
import { detectFixture } from "@/lib/domain/sports";
import { assessSeverity } from "@/lib/domain/severity";
import { computeEditorialPriority, buildSurfaces } from "@/lib/editorial";
import { buildMediaLandscape, buildLandscapeContext } from "@/lib/media-landscape";
import { matchDiscourse, detectEmergingClaims } from "@/lib/discourse";

const OFFICIAL_PRIMARY = new Set(["official-alert", "primary-document"]);

export interface EnrichOptions {
  now?: number;
  /** The previous snapshot, for first-seen tracking and novelty. */
  previous?: Pick<LiveDataset, "clusters"> | null;
  /** v0.10 — public-discourse mentions (Reddit etc.), matched to clusters. */
  discourse?: import("@/lib/media-landscape/types").DiscourseMention[];
}

function articlesOf(cluster: LiveCluster, byId: Map<string, LiveArticle>): LiveArticle[] {
  return cluster.articleIds.map((id) => byId.get(id)).filter((a): a is LiveArticle => !!a);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

/** Match a current cluster to one in the previous snapshot. */
function matchPrevious(
  cluster: LiveCluster,
  prev: LiveCluster[],
  prevBySlug: Map<string, LiveCluster>,
): LiveCluster | undefined {
  const bySlug = prevBySlug.get(cluster.slug);
  if (bySlug) return bySlug;
  let best: { c: LiveCluster; j: number } | undefined;
  for (const p of prev) {
    const j = jaccard(cluster.articleIds, p.articleIds);
    if (j >= 0.5 && (!best || j > best.j)) best = { c: p, j };
  }
  return best?.c;
}

export interface EnrichedDataset extends LiveDataset {
  trending: string[];
  watching: string[];
}

export function enrichDataset(dataset: LiveDataset, opts: EnrichOptions = {}): EnrichedDataset {
  const now = opts.now ?? Date.now();
  const hasPrev = !!opts.previous;
  const prevClusters = opts.previous?.clusters ?? [];
  const prevBySlug = new Map(prevClusters.map((c) => [c.slug, c]));
  const byId = new Map(dataset.articles.map((a) => [a.id, a]));

  const byCategory: Record<string, number> = {};
  const situationInput: Parameters<typeof buildSituation>[0] = [];

  for (const cluster of dataset.clusters) {
    const articles = articlesOf(cluster, byId);
    if (articles.length === 0) continue;

    const excerptBlob = articles
      .map((a) => a.excerpt ?? "")
      .join(" ")
      .slice(0, 600);

    // ── v0.8: multi-signal classification over ALL cluster members ──
    // Union entities / concepts / actions from every member's signature, and
    // classify the concatenated headlines + excerpts, not just the title.
    const titleBlob = articles.map((a) => a.title).join("  ·  ").slice(0, 800);
    const sigEntities = new Set<string>();
    const sigConcepts = new Set<string>();
    const sigActions = new Set<string>();
    for (const a of articles.slice(0, 6)) {
      const sig = buildSignature({
        title: a.title,
        excerpt: a.excerpt,
        publishedAt: a.publishedAt,
        language: a.language,
        districts: a.districts,
        crisisType: a.crisisType,
      });
      for (const e of sig.entities) sigEntities.add(e);
      for (const c of sig.concepts) sigConcepts.add(c);
      for (const f of sig.actions) sigActions.add(f);
    }
    const anyTamil = articles.some((a) => a.language === "ta");
    const cat = classifyEvent({
      title: titleBlob,
      excerpt: excerptBlob,
      language: anyTamil ? "ta" : "en",
      entities: [...sigEntities],
      concepts: [...sigConcepts],
      actions: [...sigActions],
      districts: cluster.districts,
      state: cluster.state,
      crisisType: cluster.crisisType,
    });
    // A cluster that names a Tamil Nadu district is P0 even if the feed's own
    // scope stayed "india" (common for national CAP alerts that list TN districts).
    const namesTNDistrict =
      cluster.districts.length > 0 ||
      resolveDistricts(`${cluster.title} ${excerptBlob}`).length > 0;
    const tier = namesTNDistrict && cluster.scope !== "excluded"
      ? { tier: "P0" as GeoTier, reason: "Names a Tamil Nadu district." }
      : geoTierOf({ scope: cluster.scope, title: cluster.title, excerpt: excerptBlob });

    const ind = analyseIndependence(articles);
    const independence: IndependenceSummary = {
      families: ind.independentGroups,
      reports: articles.length,
      syndicated: ind.possibleSyndicated,
      wireCredits: ind.wireCredits,
      label: independenceLabel(ind),
    };
    const familyOf = new Map<string, string>();
    for (const g of ind.groups) for (const id of g) familyOf.set(id, g[0]);

    const timeline = buildTimeline(articles);
    const lastSeenAt = articles.reduce((m, a) => (a.publishedAt > m ? a.publishedAt : m), articles[0].publishedAt);
    const lastMeaningfulUpdateAt = lastMeaningfulUpdate(timeline);
    const earliest = articles.reduce((m, a) => (a.publishedAt < m ? a.publishedAt : m), articles[0].publishedAt);

    const prev = matchPrevious(cluster, prevClusters, prevBySlug);
    const firstSeenAt = prev?.trendData?.firstSeenAt
      ? prev.trendData.firstSeenAt < earliest
        ? prev.trendData.firstSeenAt
        : earliest
      : earliest;

    const novelty = assessNovelty(cluster, articles, prev, hasPrev, now);
    const { noveltyClass, quietGapHours } = novelty;
    const sev = assessSeverity(cluster, articles);

    // v0.9 Phase F — when did the event happen / when does it apply, vs when it
    // was published. Scanned over the lead headline + the excerpt blob.
    const temporal = resolveTemporal({
      title: cluster.title,
      excerpt: `${titleBlob} ${excerptBlob}`.slice(0, 700),
      publishedAt: earliest,
      updatedAt: lastSeenAt !== earliest ? lastSeenAt : undefined,
    });

    // v0.9 Phase O / P — structured domain event state. Finance: keep the policy
    // decision distinct from the market's reaction to it. Sports: fixture
    // identity + lifecycle status + result, read from the reporting only.
    const domainBlob = `${cluster.title} · ${articles
      .slice(0, 4)
      .map((a) => `${a.title}. ${a.excerpt ?? ""}`)
      .join(" · ")}`.slice(0, 900);
    const financeEvent =
      cat.category === "finance"
        ? (() => {
            const policy = detectPolicyEvent(domainBlob, { effectiveFrom: temporal.effectiveFrom?.iso });
            const moves = parseMarketMoves(domainBlob).slice(0, 3);
            const marketReaction = isMarketReaction(domainBlob);
            if (!policy && moves.length === 0) return undefined;
            return {
              policy,
              marketMoves: moves.map((m) => ({ instrument: m.instrument, direction: m.direction, value: m.value, unit: m.unit })),
              /** what this atomic event primarily is */
              kind: policy && !marketReaction ? ("policy-decision" as const) : marketReaction ? ("market-reaction" as const) : ("market-data" as const),
            };
          })()
        : undefined;
    const sportsContext =
      /\b(match|fixture|innings|wickets?|overs?|goals?|tournament|series|trophy|cup|league|final|squad|playing xi|batting|bowling|defeat\w*|beat|beats|won|score\w*|runs|test|odi|t20|kabaddi|hockey|chess|athletic\w*|sprint\w*|medal)\b/i.test(
        domainBlob,
      );
    const sportsEvent =
      cat.category === "sports" && sportsContext
        ? (() => {
            const f = detectFixture(domainBlob, temporal.eventOccurredAt?.iso ?? temporal.scheduledFor?.iso);
            if (f.teams.length === 0 && !f.competition && !f.round && f.status === "unknown") return undefined;
            return {
              competition: f.competition,
              sport: f.sport,
              teams: f.teams,
              round: f.round,
              status: f.status,
              result: f.result,
              women: f.women,
              date: f.date,
            };
          })()
        : undefined;

    const windows = trendWindows(articles, familyOf, now);
    const vel = velocityScore(articles, familyOf, now);
    const ageHours = (now - Date.parse(lastMeaningfulUpdateAt)) / 3_600_000;
    const state = trendState({
      velocityScore: vel.score,
      acceleration: vel.acceleration,
      noveltyClass,
      ageHours,
      priorSeen: !!prev,
      quietGapHours,
    });

    const hasOfficialPrimary = articles.some((a) => OFFICIAL_PRIMARY.has(a.evidenceRole));
    const trend = computeTrend({
      cluster,
      category: cat.category,
      geoTier: tier.tier,
      independence,
      hasOfficialPrimary,
      velocityScore: vel.score,
      acceleration: vel.acceleration,
      windows,
      noveltyClass,
      minutesSinceMeaningful: Math.max(0, (now - Date.parse(lastMeaningfulUpdateAt)) / 60_000),
      state,
    });

    const trendData: ClusterTrendData = {
      category: cat.category,
      categoryReason: cat.reason,
      secondaryCategories: cat.secondaryCategories,
      categoryConfidence: cat.confidenceClass,
      categorySignals: cat.matchedSignals,
      categoryEvidence: cat.categoryEvidence,
      geoTier: tier.tier,
      trend,
      independence,
      firstSeenAt,
      lastSeenAt,
      lastMeaningfulUpdateAt,
      timeline,
      novelty: {
        updateKind: novelty.updateKind,
        meaningfulUpdateScore: novelty.meaningfulUpdateScore,
        updateSignificance: novelty.updateSignificance,
        changes: novelty.changes,
      },
      eventState: buildEventState(cluster, articles, lastMeaningfulUpdateAt, novelty),
      severity: { level: sev.severity, reason: sev.reason, peak: sev.peak },
      temporal: {
        tense: temporal.tense,
        eventOccurredAt: temporal.eventOccurredAt,
        scheduledFor: temporal.scheduledFor,
        effectiveFrom: temporal.effectiveFrom,
        effectiveUntil: temporal.effectiveUntil,
        notes: temporal.notes,
      },
      // Local impact is a Tamil-Nadu-on-the-ground readout: only for P0 (TN scope),
      // and only kept when an impact was actually demonstrated in the reporting.
      localImpact: (() => {
        if (tier.tier !== "P0") return undefined;
        const li = assessLocalImpact(cluster, articles);
        return li.statements.length > 0 ? li : undefined;
      })(),
      financeEvent,
      sportsEvent,
    };
    cluster.trendData = trendData;

    // ── v0.9: editorial priority (which events deserve prominence) ──
    cluster.trendData.editorial = computeEditorialPriority({ cluster, articles, now });

    byCategory[cat.category] = (byCategory[cat.category] ?? 0) + 1;
    situationInput.push({
      slug: cluster.slug,
      title: cluster.title,
      tier: tier.tier,
      isCrisis: cluster.isCrisis,
      crisisPriority: cluster.crisisPriority,
      lifecycle: cluster.lifecycle,
      officialCount: cluster.officialCount,
      independentFamilies: independence.families,
      districtCount: cluster.districts.length,
      capSeverity: cluster.cap?.severity,
      severity: sev.severity,
    });
  }

  linkPoliticalThreads(dataset.clusters, byId);

  // v0.9 Phase N — descriptive political coverage (NOT a bias score). Runs after
  // thread-linking so it can see whether a response is on record elsewhere.
  for (const c of dataset.clusters) {
    if (c.trendData?.category !== "politics" || c.trendData.geoTier === "out") continue;
    c.trendData.politicalCoverage = assessPoliticalCoverage(c, articlesOf(c, byId));
  }

  // ── v0.10: media landscape (who covers this, who owns them, how framing
  //    differs, which claims agree, where coverage is asymmetric). Runs last so
  //    it sees the finished category / claims / independence data. ──
  const landscapeCtx = buildLandscapeContext(dataset);
  for (const c of dataset.clusters) {
    if (!c.trendData) continue;
    const arts = articlesOf(c, byId);
    if (arts.length === 0) continue;
    c.trendData.mediaLandscape = buildMediaLandscape(c, arts, landscapeCtx);
  }

  // ── v0.10: public discourse — a SEPARATE input, matched to clusters, NEVER
  //    counted as factual corroboration. ──
  if (opts.discourse && opts.discourse.length > 0) {
    const byCluster = matchDiscourse(dataset.clusters, opts.discourse);
    const matchedIds = new Set(opts.discourse.filter((m) => m.matchedEventSlug).map((m) => m.id));
    for (const c of dataset.clusters) {
      const ml = c.trendData?.mediaLandscape;
      if (!ml) continue;
      ml.discourse = (byCluster.get(c.slug) ?? []).slice(0, 12);
    }
    dataset.emergingClaims = detectEmergingClaims(opts.discourse, matchedIds);
  }

  const { trending, watching } = rankTrendingWatching(dataset.clusters);
  const situation = buildSituation(situationInput, dataset.generatedAt);
  const editorial = buildSurfaces(dataset.clusters);

  const enriched: EnrichedDataset = {
    ...dataset,
    counts: { ...dataset.counts, byCategory },
    // v0.7 trending/watching kept for continuity; v0.9 surfaces are authoritative
    trending: editorial.rightNow.length ? editorial.rightNow : trending,
    watching: editorial.watching.length ? editorial.watching : watching,
    situation,
    editorial,
  };
  return enriched;
}

/**
 * v0.9 Phase D — link political events into claim threads. Two political
 * clusters that share a subject and stand in a typed relation (a denial of an
 * allegation, a response to a criticism, an investigation supporting a charge,
 * a later update of the same action) are cross-referenced. Typed structure,
 * not a graph DB: each cluster gets `politicalThread.links[]` naming the other
 * slug and the relation.
 */
const THREAD_STOP = new Set([
  "tamil", "nadu", "india", "indian", "state", "minister", "ministers", "assembly", "government",
  "govt", "chief", "party", "leader", "leaders", "opposition", "centre", "union", "cabinet",
  "council", "house", "session", "over", "after", "amid", "against", "about", "says",
  "said", "claims", "alleges", "slams", "hits", "announces", "launches", "proposes", "seeks",
  "welcomes", "condemns", "demands", "meeting", "press", "conference", "today", "yesterday",
  "vijay", "stalin", "modi", "rahul", "gandhi", "annamalai", "palaniswami", "edappadi",
  "district", "districts", "people", "scheme", "schemes", "project", "projects", "bill",
  // generic political concepts — shared-ness of these does NOT mean same subject
  "corruption", "probe", "investigation", "inquiry", "allegation", "allegations", "welfare",
  "protest", "election", "elections", "resignation", "bjp", "dmk", "congress", "aiadmk", "tvk",
  "vck", "pmk", "ntk", "coalition", "alliance", "cbi", "cb-cid", "enforcement", "vigilance",
  "corporation", "collector", "governor", "speaker", "court", "case", "police", "video",
  "deepfake", "scam", "kickback", "graft", "row", "issue", "matter", "statement", "remarks",
]);

function linkPoliticalThreads(clusters: LiveCluster[], byId: Map<string, LiveArticle>): void {
  const pol = clusters.filter((c) => c.trendData?.category === "politics" && c.trendData.geoTier !== "out");
  const meta = pol.map((c) => {
    const arts = articlesOf(c, byId);
    const blob = [c.title, ...arts.slice(0, 4).map((a) => a.title)].join("  ·  ");
    const ev = detectPoliticalEvent(blob);
    // canonical subject: strong signature entities, districts, and specific
    // proper-noun / scheme / place tokens — minus generic political vocabulary.
    const entities = new Set<string>();
    const add = (s: string) => {
      const k = s.toLowerCase().trim();
      if (k.length >= 5 && !THREAD_STOP.has(k)) entities.add(k);
    };
    for (const a of arts.slice(0, 4)) {
      const sig = buildSignature({ title: a.title, excerpt: a.excerpt, publishedAt: a.publishedAt, language: a.language, districts: a.districts });
      for (const e of sig.entities) add(e);
    }
    for (const d of c.districts) add(d);
    for (const w of `${c.title} ${arts[0]?.excerpt ?? ""}`.replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/)) {
      if (w.length >= 7 && /^[A-Z]/.test(w)) add(w);
    }
    const at = Date.parse(c.trendData?.firstSeenAt ?? c.updatedAt);
    return { c, ev, entities, at };
  });

  // Only the highest-confidence relations cross-link two events: an explicit
  // denial of an allegation, or a direct contradiction. "supports" / "updates"
  // lean on the topic heuristic and are too noisy for a public thread.
  const strong = (r: ThreadRelation | null): r is ThreadRelation => r === "denies" || r === "contradicts";

  for (let i = 0; i < meta.length; i++) {
    for (let j = i + 1; j < meta.length; j++) {
      const a = meta[i];
      const b = meta[j];
      if (a.ev.action === "other" && b.ev.action === "other") continue;
      if (Number.isFinite(a.at) && Number.isFinite(b.at) && Math.abs(a.at - b.at) > 4 * 86_400_000) continue;

      // same subject: a shared strong entity/place, at least one ≥7 chars
      const sharedEntities = [...a.entities].filter((e) => b.entities.has(e));
      if (!sharedEntities.some((e) => e.length >= 7)) continue;

      const relAB = threadRelation(a.ev, b.ev);
      const relBA = threadRelation(b.ev, a.ev);
      if (!strong(relAB) && !strong(relBA)) continue;

      attachLink(a.c, b.c.slug, strong(relAB) ? relAB : inverseRelation(relBA), b.c.title);
      attachLink(b.c, a.c.slug, strong(relBA) ? relBA : inverseRelation(relAB), a.c.title);
    }
  }
}

/** The other end of a directed relation, for the reverse link. */
function inverseRelation(rel: ThreadRelation | null): ThreadRelation {
  switch (rel) {
    case "denies":
    case "responds-to":
    case "contradicts":
      return "related"; // "X is denied by Y" — keep it descriptive, not inverted
    case "supports":
      return "supports";
    case "updates":
    case "corrects":
    case "supersedes":
      return "updates";
    default:
      return "related";
  }
}

function attachLink(cluster: LiveCluster, slug: string, relation: ThreadRelation, headline: string): void {
  const td = cluster.trendData;
  if (!td) return;
  td.politicalThread ??= { links: [] };
  if (td.politicalThread.links.some((l) => l.slug === slug)) return;
  if (td.politicalThread.links.length >= 4) return; // a thread, not a web
  td.politicalThread.links.push({ slug, relation, headline: headline.slice(0, 140) });
}

const ACTIVE_LIFECYCLE = new Set(["active", "update", "developing"]);

function rankTrendingWatching(clusters: LiveCluster[]): { trending: string[]; watching: string[] } {
  const withTrend = clusters.filter((c) => c.trendData?.trend);
  const enabled = (c: LiveCluster) =>
    DEFAULT_ENABLED[(c.trendData!.category ?? "other-relevant") as CategoryId] !== false &&
    c.trendData!.geoTier !== "out";

  const trendingC = withTrend
    .filter(enabled)
    .filter((c) => {
      const t = c.trendData!;
      const fam = t.independence?.families ?? 1;
      const official = c.officialCount > 0;
      return t.trend!.score >= TREND_MIN && (fam >= 2 || official);
    })
    .sort((a, b) => b.trendData!.trend!.score - a.trendData!.trend!.score);

  const trendingSlugs = new Set(trendingC.map((c) => c.slug));

  const watchingC = withTrend
    .filter(enabled)
    .filter((c) => !trendingSlugs.has(c.slug))
    .filter((c) => {
      const t = c.trendData!.trend!;
      const consequential = t.consequenceScore >= 0.55;
      const active = c.isCrisis && ACTIVE_LIFECYCLE.has(c.lifecycle);
      const emerging = t.state === "new" || t.state === "rising" || t.state === "fast-rising";
      return consequential || active || emerging;
    })
    .sort(
      (a, b) =>
        b.trendData!.trend!.consequenceScore - a.trendData!.trend!.consequenceScore ||
        Date.parse(b.trendData!.lastSeenAt ?? b.updatedAt) - Date.parse(a.trendData!.lastSeenAt ?? a.updatedAt),
    );

  // stable ordering by category priority within equal trend score is already
  // handled by the score itself (categoryScore is a factor).
  void CATEGORY_ORDER;

  return {
    trending: trendingC.slice(0, 30).map((c) => c.slug),
    watching: watchingC.slice(0, 20).map((c) => c.slug),
  };
}
