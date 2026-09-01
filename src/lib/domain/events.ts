import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import { cgiBand, CGI_BAND_LABELS, type CgiBand } from "./types";
import { computeIndependence, type IndependenceArticle } from "../independence";
import type {
  ArticleView,
  CgiView,
  ClaimView,
  EventDetailView,
  EventSummaryView,
  EvidenceView,
  TimelineEntryView,
} from "./view";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

type EventRow = typeof schema.events.$inferSelect;

export interface EventFilters {
  category?: string;
  status?: string;
  topic?: string;
  limit?: number;
  offset?: number;
  sort?: "recent" | "cgi_desc" | "cgi_asc" | "sources";
}

async function latestScores(db: Db, eventIds: string[]) {
  if (eventIds.length === 0) return new Map<string, typeof schema.commonGroundScores.$inferSelect>();
  const rows = await db
    .select()
    .from(schema.commonGroundScores)
    .where(inArray(schema.commonGroundScores.eventId, eventIds))
    .orderBy(desc(schema.commonGroundScores.computedAt));
  const byEvent = new Map<string, typeof schema.commonGroundScores.$inferSelect>();
  for (const row of rows) if (!byEvent.has(row.eventId)) byEvent.set(row.eventId, row);
  return byEvent;
}

async function eventAggregates(db: Db, eventIds: string[]) {
  const empty = {
    articleCount: 0,
    sourceCount: 0,
    corroboratedClaimCount: 0,
    disputedClaimCount: 0,
    primaryEvidenceCount: 0,
  };
  if (eventIds.length === 0) return new Map<string, typeof empty>();

  const articleCounts = await db
    .select({
      eventId: schema.eventArticles.eventId,
      articleCount: sql<number>`count(*)`,
      sourceCount: sql<number>`count(distinct ${schema.articles.sourceId})`,
    })
    .from(schema.eventArticles)
    .innerJoin(schema.articles, eq(schema.articles.id, schema.eventArticles.articleId))
    .where(inArray(schema.eventArticles.eventId, eventIds))
    .groupBy(schema.eventArticles.eventId);

  const claimCounts = await db
    .select({
      eventId: schema.claims.eventId,
      corroborated: sql<number>`sum(case when ${schema.claims.status} in ('CONFIRMED','CORROBORATED') then 1 else 0 end)`,
      disputed: sql<number>`sum(case when ${schema.claims.status} = 'DISPUTED' then 1 else 0 end)`,
    })
    .from(schema.claims)
    .where(inArray(schema.claims.eventId, eventIds))
    .groupBy(schema.claims.eventId);

  const evidenceCounts = await db
    .select({
      eventId: schema.evidence.eventId,
      primaryCount: sql<number>`sum(case when ${schema.evidence.isPrimary} then 1 else 0 end)`,
    })
    .from(schema.evidence)
    .where(inArray(schema.evidence.eventId, eventIds))
    .groupBy(schema.evidence.eventId);

  const map = new Map<string, typeof empty>();
  for (const id of eventIds) map.set(id, { ...empty });
  for (const row of articleCounts) {
    const agg = map.get(row.eventId)!;
    agg.articleCount = Number(row.articleCount);
    agg.sourceCount = Number(row.sourceCount);
  }
  for (const row of claimCounts) {
    const agg = map.get(row.eventId)!;
    agg.corroboratedClaimCount = Number(row.corroborated ?? 0);
    agg.disputedClaimCount = Number(row.disputed ?? 0);
  }
  for (const row of evidenceCounts) {
    if (!row.eventId) continue;
    const agg = map.get(row.eventId);
    if (agg) agg.primaryEvidenceCount = Number(row.primaryCount ?? 0);
  }
  return map;
}

async function topicsByEvent(db: Db, eventIds: string[]) {
  const map = new Map<string, { slug: string; name: string }[]>();
  if (eventIds.length === 0) return map;
  const rows = await db
    .select({
      eventId: schema.eventTopics.eventId,
      slug: schema.topics.slug,
      name: schema.topics.name,
    })
    .from(schema.eventTopics)
    .innerJoin(schema.topics, eq(schema.topics.id, schema.eventTopics.topicId))
    .where(inArray(schema.eventTopics.eventId, eventIds));
  for (const row of rows) {
    if (!map.has(row.eventId)) map.set(row.eventId, []);
    map.get(row.eventId)!.push({ slug: row.slug, name: row.name });
  }
  return map;
}

function toSummary(
  event: EventRow,
  score: typeof schema.commonGroundScores.$inferSelect | undefined,
  agg: { articleCount: number; sourceCount: number; corroboratedClaimCount: number; disputedClaimCount: number; primaryEvidenceCount: number },
  topics: { slug: string; name: string }[],
): EventSummaryView {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    category: event.category,
    location: event.location,
    status: event.status,
    startedAt: event.startedAt.toISOString(),
    latestUpdateAt: event.latestUpdateAt.toISOString(),
    isDemo: event.isDemo,
    sourceCount: agg.sourceCount,
    articleCount: agg.articleCount,
    corroboratedClaimCount: agg.corroboratedClaimCount,
    disputedClaimCount: agg.disputedClaimCount,
    primaryEvidenceCount: agg.primaryEvidenceCount,
    cgi: score
      ? { score: score.score, band: score.band as CgiBand, bandLabel: CGI_BAND_LABELS[score.band as CgiBand] }
      : null,
    topics,
  };
}

export async function listEventSummaries(
  db: Db,
  filters: EventFilters = {},
): Promise<EventSummaryView[]> {
  const conditions = [];
  if (filters.category) conditions.push(eq(schema.events.category, filters.category));
  if (filters.status) conditions.push(eq(schema.events.status, filters.status));

  let eventIds: string[] | null = null;
  if (filters.topic) {
    const rows = await db
      .select({ eventId: schema.eventTopics.eventId })
      .from(schema.eventTopics)
      .innerJoin(schema.topics, eq(schema.topics.id, schema.eventTopics.topicId))
      .where(eq(schema.topics.slug, filters.topic));
    eventIds = rows.map((r) => r.eventId);
    if (eventIds.length === 0) return [];
    conditions.push(inArray(schema.events.id, eventIds));
  }

  const events = await db
    .select()
    .from(schema.events)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.events.latestUpdateAt));

  const ids = events.map((e) => e.id);
  const [scores, aggs, topics] = await Promise.all([
    latestScores(db, ids),
    eventAggregates(db, ids),
    topicsByEvent(db, ids),
  ]);

  let summaries = events.map((event) =>
    toSummary(event, scores.get(event.id), aggs.get(event.id)!, topics.get(event.id) ?? []),
  );

  switch (filters.sort) {
    case "cgi_desc":
      summaries = summaries.sort((a, b) => (b.cgi?.score ?? -1) - (a.cgi?.score ?? -1));
      break;
    case "cgi_asc":
      summaries = summaries.sort((a, b) => (a.cgi?.score ?? 101) - (b.cgi?.score ?? 101));
      break;
    case "sources":
      summaries = summaries.sort((a, b) => b.sourceCount - a.sourceCount);
      break;
    default:
      break;
  }

  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;
  return summaries.slice(offset, offset + limit);
}

export interface HomeSections {
  topStories: EventSummaryView[];
  highAgreement: EventSummaryView[];
  highDisagreement: EventSummaryView[];
  developing: EventSummaryView[];
  primaryEvidenceAvailable: EventSummaryView[];
}

export async function getHomeSections(db: Db): Promise<HomeSections> {
  const all = await listEventSummaries(db, { limit: 200 });
  return {
    topStories: [...all]
      .sort((a, b) => new Date(b.latestUpdateAt).getTime() - new Date(a.latestUpdateAt).getTime())
      .slice(0, 6),
    highAgreement: [...all]
      .filter((e) => (e.cgi?.score ?? 0) >= 75)
      .sort((a, b) => (b.cgi?.score ?? 0) - (a.cgi?.score ?? 0))
      .slice(0, 4),
    highDisagreement: [...all]
      .filter((e) => e.disputedClaimCount > 0 || (e.cgi?.score ?? 100) < 60)
      .sort((a, b) => (a.cgi?.score ?? 100) - (b.cgi?.score ?? 100) || b.disputedClaimCount - a.disputedClaimCount)
      .slice(0, 4),
    developing: [...all]
      .filter((e) => e.status === "developing")
      .sort((a, b) => new Date(b.latestUpdateAt).getTime() - new Date(a.latestUpdateAt).getTime())
      .slice(0, 4),
    primaryEvidenceAvailable: [...all]
      .filter((e) => e.primaryEvidenceCount > 0)
      .sort((a, b) => b.primaryEvidenceCount - a.primaryEvidenceCount)
      .slice(0, 4),
  };
}

/* ───────────────────────── Event detail ───────────────────────── */

async function buildClaimViews(db: Db, eventId: string): Promise<ClaimView[]> {
  const claimRows = await db
    .select()
    .from(schema.claims)
    .where(eq(schema.claims.eventId, eventId))
    .orderBy(desc(schema.claims.isKeyClaim), desc(schema.claims.corroborationCount));
  if (claimRows.length === 0) return [];

  const claimIds = claimRows.map((c) => c.id);
  const articleIds = [...new Set(claimRows.map((c) => c.sourceArticleId))];
  const articleRows = await db
    .select()
    .from(schema.articles)
    .where(inArray(schema.articles.id, articleIds));
  const articleById = new Map(articleRows.map((a) => [a.id, a]));

  const relRows = await db
    .select()
    .from(schema.claimRelationships)
    .where(
      or(
        inArray(schema.claimRelationships.fromClaimId, claimIds),
        inArray(schema.claimRelationships.toClaimId, claimIds),
      ),
    );

  const ceRows = await db
    .select()
    .from(schema.claimEvidence)
    .where(inArray(schema.claimEvidence.claimId, claimIds));
  const evidenceIds = [...new Set(ceRows.map((e) => e.evidenceId))];
  const evidenceRows = evidenceIds.length
    ? await db.select().from(schema.evidence).where(inArray(schema.evidence.id, evidenceIds))
    : [];
  const evidenceById = new Map(evidenceRows.map((e) => [e.id, e]));
  const claimTextById = new Map(claimRows.map((c) => [c.id, c.canonicalText]));

  return claimRows.map((claim): ClaimView => {
    const article = articleById.get(claim.sourceArticleId);
    const links = ceRows.filter((e) => e.claimId === claim.id);
    const evidence: EvidenceView[] = links
      .map((link) => {
        const ev = evidenceById.get(link.evidenceId);
        if (!ev) return null;
        return {
          id: ev.id,
          url: ev.url,
          title: ev.title,
          publisher: ev.publisher,
          type: ev.type as EvidenceView["type"],
          isPrimary: ev.isPrimary,
          publishedAt: iso(ev.publishedAt),
          archiveUrl: ev.archiveUrl,
          contentHash: ev.contentHash,
          isDemo: ev.isDemo,
          linkedClaims: [{ claimId: claim.id, stance: link.stance, note: link.note }],
        } satisfies EvidenceView;
      })
      .filter((e): e is EvidenceView => e !== null);

    const relationships = relRows
      .filter((r) => r.fromClaimId === claim.id || r.toClaimId === claim.id)
      .map((r) => {
        const direction = r.fromClaimId === claim.id ? ("from" as const) : ("to" as const);
        const otherClaimId = direction === "from" ? r.toClaimId : r.fromClaimId;
        return {
          id: r.id,
          type: r.type as ClaimView["relationships"][number]["type"],
          direction,
          otherClaimId,
          otherClaimText: claimTextById.get(otherClaimId) ?? "(claim outside this event)",
          confidence: r.confidence,
          rationale: r.rationale,
        };
      });

    return {
      id: claim.id,
      canonicalText: claim.canonicalText,
      originalText: claim.originalText,
      normalizedMeaning: claim.normalizedMeaning,
      type: claim.type as ClaimView["type"],
      status: claim.status as ClaimView["status"],
      extractionConfidence: claim.extractionConfidence,
      evidenceStatus: claim.evidenceStatus,
      corroborationCount: claim.corroborationCount,
      contradictionCount: claim.contradictionCount,
      isKeyClaim: claim.isKeyClaim,
      sourceParagraph: claim.sourceParagraph,
      sourceArticle: article
        ? { id: article.id, title: article.title, publication: article.publication, url: article.url }
        : null,
      supportingArticles: [],
      evidence,
      relationships,
    };
  });
}

export async function getEventDetail(db: Db, slug: string): Promise<EventDetailView | null> {
  const [event] = await db.select().from(schema.events).where(eq(schema.events.slug, slug));
  if (!event) return null;

  const [scores, aggs, topics] = await Promise.all([
    latestScores(db, [event.id]),
    eventAggregates(db, [event.id]),
    topicsByEvent(db, [event.id]),
  ]);
  const summary = toSummary(event, scores.get(event.id), aggs.get(event.id)!, topics.get(event.id) ?? []);

  // Coverage
  const links = await db
    .select()
    .from(schema.eventArticles)
    .where(eq(schema.eventArticles.eventId, event.id));
  const articleRows = links.length
    ? await db
        .select()
        .from(schema.articles)
        .where(inArray(schema.articles.id, links.map((l) => l.articleId)))
    : [];
  const sourceRows = articleRows.length
    ? await db
        .select()
        .from(schema.sources)
        .where(inArray(schema.sources.id, [...new Set(articleRows.map((a) => a.sourceId))]))
    : [];
  const sourceById = new Map(sourceRows.map((s) => [s.id, s]));
  const linkByArticle = new Map(links.map((l) => [l.articleId, l]));

  const independenceArticles: IndependenceArticle[] = articleRows.map((a) => ({
    id: a.id,
    publication: a.publication,
    sourceDomain: sourceById.get(a.sourceId)?.domain ?? a.publication,
    ownershipGroup: sourceById.get(a.sourceId)?.ownershipGroup ?? null,
    parentCompany: sourceById.get(a.sourceId)?.parentCompany ?? null,
    wireService: a.wireService,
    syndicatedFromSourceId: a.syndicatedFromSourceId,
    text: a.contentExcerpt ?? a.description,
    publishedAt: a.publishedAt,
  }));
  const independence = computeIndependence(independenceArticles);
  const clusterOfArticle = new Map<string, number>();
  independence.clusters.forEach((c, i) => c.articleIds.forEach((id) => clusterOfArticle.set(id, i)));

  const coverage: ArticleView[] = articleRows
    .map((a): ArticleView => {
      const source = sourceById.get(a.sourceId);
      const link = linkByArticle.get(a.id);
      return {
        id: a.id,
        url: a.url,
        canonicalUrl: a.canonicalUrl,
        title: a.title,
        description: a.description,
        contentExcerpt: a.contentExcerpt,
        publication: a.publication,
        author: a.author,
        publishedAt: a.publishedAt.toISOString(),
        language: a.language,
        imageUrl: a.imageUrl,
        wireService: a.wireService,
        isDemo: a.isDemo,
        role: link?.role ?? null,
        similarity: link?.similarity ?? null,
        independenceClusterId: clusterOfArticle.get(a.id) ?? null,
        source: source
          ? {
              id: source.id,
              name: source.name,
              domain: source.domain,
              country: source.country,
              orgType: source.orgType,
              category: source.category,
              ownershipGroup: source.ownershipGroup,
              parentCompany: source.parentCompany,
            }
          : null,
      };
    })
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

  // Claims
  const claims = await buildClaimViews(db, event.id);
  const claimById = new Map(claims.map((c) => [c.id, c]));

  const agreement = claims
    .filter((c) => c.corroborationCount >= 2 && c.contradictionCount === 0)
    .sort((a, b) => b.corroborationCount - a.corroborationCount);

  const contradictionRels = await db
    .select()
    .from(schema.claimRelationships)
    .where(eq(schema.claimRelationships.type, "CONTRADICTS"));
  const disagreementPairs = contradictionRels
    .filter((r) => claimById.has(r.fromClaimId) && claimById.has(r.toClaimId))
    .map((r) => ({
      id: r.id,
      confidence: r.confidence,
      rationale: r.rationale,
      claimA: claimById.get(r.fromClaimId)!,
      claimB: claimById.get(r.toClaimId)!,
    }));

  // Uncertainty surfacing
  const uncertainties: { label: string; detail: string }[] = [];
  const noPrimary = claims.filter((c) => c.isKeyClaim && !c.evidence.some((e) => e.isPrimary));
  if (noPrimary.length > 0) {
    uncertainties.push({
      label: "No primary document for some core claims",
      detail: `${noPrimary.length} core claim${noPrimary.length === 1 ? "" : "s"} rely on journalism alone; no primary record has been located.`,
    });
  }
  for (const c of claims.filter((c) => /anonymous|unnamed source|person familiar/i.test(c.originalText))) {
    uncertainties.push({
      label: "Claim rests on an anonymous source",
      detail: c.canonicalText,
    });
  }
  for (const c of claims.filter((c) => c.status === "DISPUTED")) {
    uncertainties.push({ label: "Sources disagree", detail: c.canonicalText });
  }
  if (event.status === "developing") {
    uncertainties.push({
      label: "Event still developing",
      detail: "Facts may change as more reporting and official confirmation arrive.",
    });
  }
  if (claims.filter((c) => c.corroborationCount <= 1).length > 0) {
    uncertainties.push({
      label: "Single-source claims present",
      detail: `${claims.filter((c) => c.corroborationCount <= 1).length} claim(s) are reported by only one independent source so far.`,
    });
  }

  // Evidence
  const evidenceRows = await db
    .select()
    .from(schema.evidence)
    .where(eq(schema.evidence.eventId, event.id));
  const ceAll = evidenceRows.length
    ? await db
        .select()
        .from(schema.claimEvidence)
        .where(inArray(schema.claimEvidence.evidenceId, evidenceRows.map((e) => e.id)))
    : [];
  const primaryEvidence: EvidenceView[] = evidenceRows
    .filter((e) => e.isPrimary)
    .map((e) => ({
      id: e.id,
      url: e.url,
      title: e.title,
      publisher: e.publisher,
      type: e.type as EvidenceView["type"],
      isPrimary: e.isPrimary,
      publishedAt: iso(e.publishedAt),
      archiveUrl: e.archiveUrl,
      contentHash: e.contentHash,
      isDemo: e.isDemo,
      linkedClaims: ceAll
        .filter((c) => c.evidenceId === e.id)
        .map((c) => ({ claimId: c.claimId, stance: c.stance, note: c.note })),
    }));

  // Timeline
  const timelineRows = await db
    .select()
    .from(schema.timelineEntries)
    .where(eq(schema.timelineEntries.eventId, event.id))
    .orderBy(schema.timelineEntries.occurredAt);
  const timelineArticleIds = timelineRows.map((t) => t.sourceArticleId).filter(Boolean) as string[];
  const timelineArticles = timelineArticleIds.length
    ? await db.select().from(schema.articles).where(inArray(schema.articles.id, timelineArticleIds))
    : [];
  const timelineArticleById = new Map(timelineArticles.map((a) => [a.id, a]));
  const timeline: TimelineEntryView[] = timelineRows.map((t) => {
    const a = t.sourceArticleId ? timelineArticleById.get(t.sourceArticleId) : undefined;
    return {
      id: t.id,
      occurredAt: t.occurredAt.toISOString(),
      headline: t.headline,
      detail: t.detail,
      type: t.type as TimelineEntryView["type"],
      confidence: t.confidence,
      sourceArticle: a ? { id: a.id, title: a.title, url: a.url } : null,
    };
  });

  // Entities
  const entityRows = await db
    .select({
      id: schema.entities.id,
      name: schema.entities.name,
      type: schema.entities.type,
      salience: schema.eventEntities.salience,
    })
    .from(schema.eventEntities)
    .innerJoin(schema.entities, eq(schema.entities.id, schema.eventEntities.entityId))
    .where(eq(schema.eventEntities.eventId, event.id))
    .orderBy(desc(schema.eventEntities.salience));

  // Corrections
  const correctionRows = await db
    .select()
    .from(schema.corrections)
    .where(eq(schema.corrections.eventId, event.id))
    .orderBy(desc(schema.corrections.correctedAt));

  // CGI (full, with components)
  const scoreRow = scores.get(event.id);
  let cgi: CgiView | null = null;
  if (scoreRow) {
    const componentRows = await db
      .select()
      .from(schema.cgiComponents)
      .where(eq(schema.cgiComponents.scoreId, scoreRow.id));
    const positives = componentRows
      .filter((c) => c.contribution >= 1.5)
      .sort((a, b) => b.contribution - a.contribution)
      .map((c) => `+ ${c.explanation}`);
    const negatives = componentRows
      .filter((c) => c.contribution <= -1.5)
      .sort((a, b) => a.contribution - b.contribution)
      .map((c) => `− ${c.explanation}`);
    cgi = {
      score: scoreRow.score,
      band: scoreRow.band as CgiBand,
      bandLabel: CGI_BAND_LABELS[scoreRow.band as CgiBand],
      formulaVersion: scoreRow.formulaVersion,
      base: 40,
      computedAt: scoreRow.computedAt.toISOString(),
      components: componentRows
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .map((c) => ({
          key: c.key,
          label: c.label,
          rawValue: c.rawValue,
          weight: c.weight,
          contribution: c.contribution,
          direction: c.direction as "positive" | "negative",
          explanation: c.explanation,
        })),
      inputs: scoreRow.inputsSnapshot,
      narrative: { positives, negatives },
    };
  }

  return {
    ...summary,
    clusteringMethod: event.clusteringMethod,
    cgi,
    whatWeKnow: event.summary,
    agreement,
    disagreement: { contradiction: disagreementPairs },
    uncertainties: dedupeUncertainties(uncertainties),
    primaryEvidence,
    timeline,
    coverage,
    claims,
    entities: entityRows.map((e) => ({ id: e.id, name: e.name, type: e.type, salience: e.salience })),
    corrections: correctionRows.map((c) => ({
      id: c.id,
      originalText: c.originalText,
      updatedText: c.updatedText,
      reason: c.reason,
      correctedAt: c.correctedAt.toISOString(),
      sourceUrl: c.sourceUrl,
    })),
    independence: {
      totalArticles: independence.totalArticles,
      independentCount: independence.independentCount,
      independenceRatio: independence.independenceRatio,
      ownershipGroups: independence.ownershipGroups,
      wireDependentArticles: independence.wireDependentArticles,
    },
  };
}

export async function resolveEventSlug(db: Db, idOrSlug: string): Promise<string | null> {
  const [bySlug] = await db
    .select({ slug: schema.events.slug })
    .from(schema.events)
    .where(eq(schema.events.slug, idOrSlug));
  if (bySlug) return bySlug.slug;
  const [byId] = await db
    .select({ slug: schema.events.slug })
    .from(schema.events)
    .where(eq(schema.events.id, idOrSlug));
  return byId?.slug ?? null;
}

function dedupeUncertainties(list: { label: string; detail: string }[]) {
  const seen = new Set<string>();
  return list.filter((u) => {
    const key = `${u.label}::${u.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { cgiBand };
