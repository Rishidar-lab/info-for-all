import { and, desc, eq, gte, or } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import { createId, slugify } from "../db/id";
import { logger } from "../logger";
import { badRequest } from "../errors";
import { defaultClustering, type ClusterEvent } from "../clustering";
import { getProvider } from "../intelligence";
import { recognizeEntities } from "../nlp/entities";
import { normalizeItem } from "../ingestion/normalize";
import { rssAdapter, type RssInput } from "../ingestion/rss";
import { manualAdapter, type ManualInput } from "../ingestion/manual";
import { newsApiAdapter, type NewsApiInput } from "../ingestion/api";
import type { NormalizedArticle } from "../ingestion/types";
import { analyzeEvent } from "./analyze";
import type { EventCategory } from "./types";

const log = logger.child({ module: "ingest" });

export interface IngestInput {
  adapter: "rss" | "manual" | "api";
  rss?: RssInput;
  manual?: ManualInput;
  api?: NewsApiInput;
  markDemo?: boolean;
  runAnalysis?: boolean;
  category?: EventCategory;
}

export interface IngestReport {
  runId: string;
  adapter: string;
  status: "success" | "partial" | "error";
  itemsSeen: number;
  itemsAccepted: number;
  itemsRejected: number;
  articles: {
    id: string;
    title: string;
    url: string;
    eventId: string;
    eventSlug: string;
    eventCreated: boolean;
    clusterSimilarity: number;
    clusterBreakdown: Record<string, number>;
    method: string;
    claimsExtracted: number;
  }[];
  rejected: { url?: string; reason: string }[];
  affectedEvents: { id: string; slug: string; cgi: number | null }[];
}

const CATEGORY_BY_KEYWORD: [RegExp, EventCategory][] = [
  [/\b(ai|model|chip|semiconductor|software|platform|cyber|data)\b/i, "technology"],
  [/\b(treaty|border|diplomat|sanction|foreign|embassy|summit)\b/i, "international"],
  [/\b(study|researchers|clinical|species|climate model|physics|genome)\b/i, "science"],
  [/\b(inflation|gdp|market|central bank|tariff|unemployment|budget)\b/i, "economics"],
  [/\b(vaccine|hospital|disease|health agency|outbreak|patients)\b/i, "health"],
  [/\b(emissions|wildfire|biodiversity|pollution|conservation)\b/i, "environment"],
];

function inferCategory(text: string, fallback?: EventCategory): EventCategory {
  for (const [re, cat] of CATEGORY_BY_KEYWORD) if (re.test(text)) return cat;
  return fallback ?? "public_policy";
}

async function fetchItems(input: IngestInput): Promise<NormalizedArticle[]> {
  let result;
  if (input.adapter === "rss") {
    if (!input.rss) throw badRequest("rss input required");
    result = await rssAdapter.fetch(input.rss);
  } else if (input.adapter === "manual") {
    if (!input.manual) throw badRequest("manual input required");
    result = await manualAdapter.fetch(input.manual);
  } else {
    if (!input.api) throw badRequest("api input required");
    result = await newsApiAdapter.fetch(input.api);
  }
  return result.items
    .map((item) => {
      try {
        return normalizeItem(item, { fallbackPublication: result.sourceHint?.name });
      } catch (err) {
        log.warn("ingest.normalize_failed", { error: err instanceof Error ? err.message : String(err) });
        return null;
      }
    })
    .filter((a): a is NormalizedArticle => a !== null);
}

async function upsertSource(db: Db, article: NormalizedArticle, isDemo: boolean): Promise<string> {
  const [existing] = await db
    .select({ id: schema.sources.id })
    .from(schema.sources)
    .where(eq(schema.sources.domain, article.sourceDomain));
  if (existing) return existing.id;

  const id = createId("src");
  await db.insert(schema.sources).values({
    id,
    name: article.publication,
    domain: article.sourceDomain,
    language: article.language,
    orgType: article.wireService ? "wire_service" : "private_news",
    category: article.wireService ? "wire_service" : "private_news",
    isDemo,
  });
  log.info("ingest.source_created", { domain: article.sourceDomain });
  return id;
}

async function upsertEntities(
  db: Db,
  names: { name: string; type: string }[],
  isDemo: boolean,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const { name, type } of names) {
    const [existing] = await db
      .select({ id: schema.entities.id })
      .from(schema.entities)
      .where(and(eq(schema.entities.name, name), eq(schema.entities.type, type)));
    if (existing) {
      map.set(name, existing.id);
      continue;
    }
    const id = createId("ent");
    await db.insert(schema.entities).values({ id, name, type, isDemo }).onConflictDoNothing();
    map.set(name, id);
  }
  return map;
}

export async function ingest(db: Db, input: IngestInput): Promise<IngestReport> {
  const provider = getProvider();
  const isDemo = input.markDemo ?? false;
  const runAnalysis = input.runAnalysis ?? true;
  const runId = createId("run");
  const startedAt = new Date();

  const normalized = await fetchItems(input);
  const report: IngestReport = {
    runId,
    adapter: input.adapter,
    status: "success",
    itemsSeen: normalized.length,
    itemsAccepted: 0,
    itemsRejected: 0,
    articles: [],
    rejected: [],
    affectedEvents: [],
  };

  const affected = new Set<string>();
  const createdEvents = new Set<string>();

  for (const article of normalized) {
    try {
      const dedupeUrl = article.canonicalUrl ?? article.url;
      const [dupe] = await db
        .select({ id: schema.articles.id })
        .from(schema.articles)
        .where(or(eq(schema.articles.canonicalUrl, dedupeUrl), eq(schema.articles.url, article.url)));
      if (dupe) {
        report.rejected.push({ url: article.url, reason: "duplicate article" });
        continue;
      }

      const sourceId = await upsertSource(db, article, isDemo);
      const articleId = createId("art");
      await db.insert(schema.articles).values({
        id: articleId,
        url: article.url,
        canonicalUrl: article.canonicalUrl,
        title: article.title,
        description: article.description,
        contentExcerpt: article.contentExcerpt,
        publication: article.publication,
        author: article.author,
        publishedAt: article.publishedAt,
        language: article.language,
        imageUrl: article.imageUrl,
        wireService: article.wireService,
        metadata: article.metadata,
        isDemo,
        sourceId,
      });

      const bodyText = article.contentExcerpt ?? article.description ?? article.title;
      const recognized = recognizeEntities(`${article.title}. ${bodyText}`);
      const entityMap = await upsertEntities(db, recognized, isDemo);
      for (const [, entityId] of entityMap) {
        await db
          .insert(schema.articleEntities)
          .values({ articleId, entityId, mentions: 1 })
          .onConflictDoNothing();
      }

      // ---- Clustering ----
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const candidateEvents = await db
        .select()
        .from(schema.events)
        .where(gte(schema.events.latestUpdateAt, since))
        .orderBy(desc(schema.events.latestUpdateAt))
        .limit(100);

      const clusterEvents: ClusterEvent[] = [];
      for (const ev of candidateEvents) {
        const evEntities = await db
          .select({ name: schema.entities.name })
          .from(schema.eventEntities)
          .innerJoin(schema.entities, eq(schema.entities.id, schema.eventEntities.entityId))
          .where(eq(schema.eventEntities.eventId, ev.id));
        const [firstArticle] = await db
          .select({ title: schema.articles.title, excerpt: schema.articles.contentExcerpt })
          .from(schema.eventArticles)
          .innerJoin(schema.articles, eq(schema.articles.id, schema.eventArticles.articleId))
          .where(eq(schema.eventArticles.eventId, ev.id))
          .limit(1);
        clusterEvents.push({
          id: ev.id,
          title: ev.title,
          representativeText: `${ev.summary} ${firstArticle?.excerpt ?? firstArticle?.title ?? ""}`,
          entities: evEntities.map((e) => e.name),
          startedAt: ev.startedAt,
          latestUpdateAt: ev.latestUpdateAt,
        });
      }

      const assignment = defaultClustering.assign(
        {
          id: articleId,
          title: article.title,
          text: bodyText,
          publishedAt: article.publishedAt,
          entities: recognized.map((e) => e.name),
        },
        clusterEvents,
      );

      let eventId = assignment.eventId;
      let eventCreated = false;
      if (!eventId) {
        eventId = createId("evt");
        eventCreated = true;
        const category = inferCategory(`${article.title} ${bodyText}`, input.category);
        const slug = `${slugify(article.title).slice(0, 60)}-${eventId.slice(-6)}`;
        await db.insert(schema.events).values({
          id: eventId,
          slug,
          title: article.title,
          summary: article.description ?? article.title,
          category,
          status: "developing",
          startedAt: article.publishedAt,
          latestUpdateAt: article.publishedAt,
          clusteringMethod: assignment.method,
          isDemo,
        });
        createdEvents.add(eventId);
      } else {
        const [ev] = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
        if (ev && article.publishedAt > ev.latestUpdateAt) {
          await db
            .update(schema.events)
            .set({ latestUpdateAt: article.publishedAt, updatedAt: new Date() })
            .where(eq(schema.events.id, eventId));
        }
      }
      affected.add(eventId);

      await db.insert(schema.eventArticles).values({
        eventId,
        articleId,
        similarity: assignment.similarity,
        role: eventCreated ? "origin" : "corroboration",
      });

      for (const [, entityId] of entityMap) {
        await db
          .insert(schema.eventEntities)
          .values({ eventId, entityId, salience: 0.5 })
          .onConflictDoNothing();
      }

      // ---- Claim extraction ----
      const extracted = await provider.extractClaims({
        articleId,
        title: article.title,
        text: bodyText,
        knownEntities: recognized.map((e) => e.name),
      });
      let claimsExtracted = 0;
      for (const claim of extracted) {
        const claimId = createId("clm");
        const isKey =
          claim.extractionConfidence >= 0.7 &&
          ["observation", "attribution", "statistic", "official_statement"].includes(claim.type);
        await db.insert(schema.claims).values({
          id: claimId,
          canonicalText: claim.canonicalText,
          originalText: claim.originalText,
          normalizedMeaning: claim.normalizedMeaning,
          type: claim.type,
          extractionConfidence: claim.extractionConfidence,
          isKeyClaim: isKey,
          eventId,
          sourceArticleId: articleId,
          sourceParagraph: claim.sourceParagraph,
          isDemo,
        });
        claimsExtracted += 1;

        for (const entityName of claim.entities) {
          const entityId = entityMap.get(entityName);
          if (entityId) {
            await db
              .insert(schema.claimEntities)
              .values({ claimId, entityId })
              .onConflictDoNothing();
          }
        }
      }

      await db.insert(schema.timelineEntries).values({
        id: createId("tl"),
        eventId,
        occurredAt: article.publishedAt,
        headline: `${article.publication} reports: ${article.title}`,
        detail: article.description,
        type: eventCreated ? "report" : "report",
        confidence: 0.7,
        sourceArticleId: articleId,
        isDemo,
      });

      report.articles.push({
        id: articleId,
        title: article.title,
        url: article.url,
        eventId,
        eventSlug: "",
        eventCreated,
        clusterSimilarity: assignment.similarity,
        clusterBreakdown: assignment.breakdown as unknown as Record<string, number>,
        method: assignment.method,
        claimsExtracted,
      });
      report.itemsAccepted += 1;
    } catch (err) {
      log.error("ingest.item_failed", { error: err instanceof Error ? err.message : String(err) });
      report.rejected.push({ url: article.url, reason: err instanceof Error ? err.message : "unknown error" });
    }
  }

  report.itemsRejected = report.rejected.length;

  // ---- Contradiction detection + analysis per affected event ----
  for (const eventId of affected) {
    const claimRows = await db
      .select()
      .from(schema.claims)
      .where(eq(schema.claims.eventId, eventId));
    if (claimRows.length >= 2) {
      const findings = await provider.detectContradictions(
        claimRows.map((c) => ({
          id: c.id,
          canonicalText: c.canonicalText,
          normalizedMeaning: c.normalizedMeaning ?? c.canonicalText,
          type: c.type as never,
          entities: [],
        })),
      );
      for (const finding of findings) {
        await db
          .insert(schema.claimRelationships)
          .values({
            id: createId("rel"),
            type: finding.type,
            fromClaimId: finding.fromId,
            toClaimId: finding.toId,
            confidence: finding.confidence,
            rationale: finding.rationale,
            detectedBy: `${provider.name}-ai`,
          })
          .onConflictDoNothing();
      }
    }

    if (createdEvents.has(eventId)) {
      const articleRows = await db
        .select({
          id: schema.articles.id,
          title: schema.articles.title,
          excerpt: schema.articles.contentExcerpt,
          publishedAt: schema.articles.publishedAt,
        })
        .from(schema.eventArticles)
        .innerJoin(schema.articles, eq(schema.articles.id, schema.eventArticles.articleId))
        .where(eq(schema.eventArticles.eventId, eventId));
      const keyClaims = await db
        .select({ text: schema.claims.canonicalText, corroborationCount: schema.claims.corroborationCount })
        .from(schema.claims)
        .where(and(eq(schema.claims.eventId, eventId), eq(schema.claims.isKeyClaim, true)));
      const summary = await provider.summarizeEvent({
        articles: articleRows.map((a) => ({
          id: a.id,
          title: a.title,
          excerpt: a.excerpt,
          publishedAt: a.publishedAt,
        })),
        keyClaims,
      });
      await db
        .update(schema.events)
        .set({ summary: summary.summary, updatedAt: new Date() })
        .where(eq(schema.events.id, eventId));
    }

    if (runAnalysis) {
      const result = await analyzeEvent(db, eventId);
      const [ev] = await db
        .select({ slug: schema.events.slug })
        .from(schema.events)
        .where(eq(schema.events.id, eventId));
      report.affectedEvents.push({ id: eventId, slug: ev?.slug ?? "", cgi: result.cgi.score });
    } else {
      const [ev] = await db
        .select({ slug: schema.events.slug })
        .from(schema.events)
        .where(eq(schema.events.id, eventId));
      report.affectedEvents.push({ id: eventId, slug: ev?.slug ?? "", cgi: null });
    }
  }

  for (const article of report.articles) {
    const match = report.affectedEvents.find((e) => e.id === article.eventId);
    if (match) article.eventSlug = match.slug;
  }

  if (report.itemsAccepted === 0 && report.itemsSeen > 0) report.status = "error";
  else if (report.itemsRejected > 0) report.status = "partial";

  await db.insert(schema.ingestionRuns).values({
    id: runId,
    adapter: input.adapter,
    status: report.status,
    itemsSeen: report.itemsSeen,
    itemsAccepted: report.itemsAccepted,
    itemsRejected: report.itemsRejected,
    notes: `affected ${report.affectedEvents.length} event(s)`,
    startedAt,
    finishedAt: new Date(),
  });

  log.info("ingest.completed", {
    runId,
    adapter: input.adapter,
    accepted: report.itemsAccepted,
    rejected: report.itemsRejected,
  });
  return report;
}
