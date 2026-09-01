/**
 * Seeds the database with DEMO DATA (see seed-data.ts) and runs the full
 * analysis pipeline so the Common Ground Index and claim statuses are populated.
 *
 * Idempotent: it clears existing rows first. Run with `npm run db:seed`.
 */
import { sql } from "drizzle-orm";
import { db, schema } from "./index";
import { createId } from "./id";
import { contentTokens } from "../text";
import { analyzeAllEvents } from "../domain/analyze";
import {
  SEED_ENTITIES,
  SEED_EVENTS,
  SEED_SOURCES,
  SEED_TOPICS,
  type SeedArticle,
} from "./seed-data";

const HOUR = 3_600_000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR);
const normalizedMeaning = (text: string) => contentTokens(text).sort().join(" ");

const TABLES_IN_DELETE_ORDER = [
  schema.cgiComponents,
  schema.commonGroundScores,
  schema.claimEvidence,
  schema.claimEntities,
  schema.claimRelationships,
  schema.corrections,
  schema.timelineEntries,
  schema.evidence,
  schema.claims,
  schema.eventArticles,
  schema.eventEntities,
  schema.eventTopics,
  schema.articleEntities,
  schema.articles,
  schema.events,
  schema.entities,
  schema.topics,
  schema.sources,
  schema.ingestionRuns,
  schema.users,
] as const;

async function reset() {
  db.$client.pragma("foreign_keys = OFF");
  for (const table of TABLES_IN_DELETE_ORDER) await db.delete(table);
  db.$client.pragma("foreign_keys = ON");
}

async function seed() {
  const started = Date.now();
  await reset();

  await db.insert(schema.users).values({
    id: createId("usr"),
    email: "editor@ifa.local",
    name: "Demo Editor",
    role: "editor",
  });

  const topicId = new Map<string, string>();
  for (const topic of SEED_TOPICS) {
    const id = createId("top");
    topicId.set(topic.slug, id);
    await db.insert(schema.topics).values({ id, slug: topic.slug, name: topic.name, description: topic.description });
  }

  const sourceId = new Map<string, string>();
  for (const source of SEED_SOURCES) {
    const id = createId("src");
    sourceId.set(source.key, id);
    await db.insert(schema.sources).values({
      id,
      name: source.name,
      domain: source.domain,
      country: source.country,
      language: source.language ?? "en",
      orgType: source.orgType,
      category: source.category,
      parentCompany: source.parentCompany ?? null,
      ownershipGroup: source.ownershipGroup ?? null,
      foundedYear: source.foundedYear ?? null,
      websiteUrl: source.websiteUrl ?? null,
      publishesPrimarySources: source.publishesPrimarySources ?? false,
      isDemo: true,
    });
  }

  const entityId = new Map<string, string>();
  for (const entity of SEED_ENTITIES) {
    const id = createId("ent");
    entityId.set(entity.key, id);
    await db.insert(schema.entities).values({
      id,
      name: entity.name,
      type: entity.type,
      description: entity.description ?? null,
      isDemo: true,
    });
  }

  let articleCount = 0;
  let claimCount = 0;
  let evidenceCount = 0;

  for (const event of SEED_EVENTS) {
    const eventId = createId("evt");
    await db.insert(schema.events).values({
      id: eventId,
      slug: event.slug,
      title: event.title,
      summary: event.summary,
      category: event.category,
      location: event.location,
      status: event.status,
      startedAt: ago(event.startedHoursAgo),
      latestUpdateAt: ago(event.latestUpdateHoursAgo),
      clusteringMethod: "seed:curated",
      isDemo: true,
    });

    for (const slug of event.topics) {
      const tid = topicId.get(slug);
      if (tid) await db.insert(schema.eventTopics).values({ eventId, topicId: tid }).onConflictDoNothing();
    }
    for (const ref of event.entities) {
      const eid = entityId.get(ref.key);
      if (eid) {
        await db
          .insert(schema.eventEntities)
          .values({ eventId, entityId: eid, salience: ref.salience })
          .onConflictDoNothing();
      }
    }

    const articleId = new Map<string, string>();
    const similarityForRole = (role: SeedArticle["role"]) =>
      role === "origin" || role === "primary_document" ? null : role === "reaction" ? 0.46 : 0.71;

    for (const article of event.articles) {
      const id = createId("art");
      articleId.set(article.key, id);
      const src = sourceId.get(article.sourceKey)!;
      await db.insert(schema.articles).values({
        id,
        url: `https://${SEED_SOURCES.find((s) => s.key === article.sourceKey)!.domain}/a/${article.key}`,
        canonicalUrl: `https://${SEED_SOURCES.find((s) => s.key === article.sourceKey)!.domain}/a/${article.key}`,
        title: article.title,
        description: article.description,
        contentExcerpt: article.body,
        publication: SEED_SOURCES.find((s) => s.key === article.sourceKey)!.name,
        author: article.author ?? null,
        publishedAt: ago(article.hoursAgo),
        language: "en",
        wireService: article.wireService ?? null,
        syndicatedFromSourceId: article.syndicatedFrom ? (sourceId.get(article.syndicatedFrom) ?? null) : null,
        metadata: { seedKey: article.key },
        isDemo: true,
        sourceId: src,
      });
      articleCount += 1;

      await db.insert(schema.eventArticles).values({
        eventId,
        articleId: id,
        similarity: similarityForRole(article.role),
        role: article.role,
        addedAt: ago(article.hoursAgo),
      });

      for (const ref of event.entities) {
        const entity = SEED_ENTITIES.find((e) => e.key === ref.key);
        const eid = entityId.get(ref.key);
        if (entity && eid && `${article.title} ${article.body}`.toLowerCase().includes(entity.name.toLowerCase().split(" ")[0])) {
          await db.insert(schema.articleEntities).values({ articleId: id, entityId: eid, mentions: 1 }).onConflictDoNothing();
        }
      }
    }

    const claimId = new Map<string, string>();
    for (const claim of event.claims) {
      const id = createId("clm");
      claimId.set(claim.key, id);
      await db.insert(schema.claims).values({
        id,
        canonicalText: claim.canonicalText,
        originalText: claim.originalText,
        normalizedMeaning: normalizedMeaning(claim.canonicalText),
        type: claim.type,
        status: claim.status ?? "UNVERIFIED",
        extractionConfidence: claim.extractionConfidence ?? 0.7,
        isKeyClaim: claim.isKeyClaim ?? false,
        eventId,
        sourceArticleId: articleId.get(claim.articleKey)!,
        sourceParagraph: claim.paragraph ?? null,
        isDemo: true,
      });
      claimCount += 1;

      for (const key of claim.entityKeys ?? []) {
        const eid = entityId.get(key);
        if (eid) await db.insert(schema.claimEntities).values({ claimId: id, entityId: eid }).onConflictDoNothing();
      }
    }

    for (const rel of event.relationships) {
      const from = claimId.get(rel.from);
      const to = claimId.get(rel.to);
      if (from && to) {
        await db
          .insert(schema.claimRelationships)
          .values({
            id: createId("rel"),
            type: rel.type,
            fromClaimId: from,
            toClaimId: to,
            confidence: rel.confidence,
            rationale: rel.rationale,
            detectedBy: "seed",
          })
          .onConflictDoNothing();
      }
    }

    for (const ev of event.evidence) {
      const id = createId("evd");
      await db.insert(schema.evidence).values({
        id,
        url: ev.url,
        title: ev.title,
        publisher: ev.publisher,
        type: ev.type,
        isPrimary: ev.isPrimary,
        publishedAt: ev.hoursAgo != null ? ago(ev.hoursAgo) : null,
        archivedAt: ev.hoursAgo != null ? ago(ev.hoursAgo) : null,
        archiveUrl: `https://archive.example/${id}`,
        contentHash: ev.contentHash ?? null,
        eventId,
        isDemo: true,
      });
      evidenceCount += 1;

      for (const claimKey of ev.supports) {
        const cid = claimId.get(claimKey);
        if (cid) {
          await db
            .insert(schema.claimEvidence)
            .values({ claimId: cid, evidenceId: id, stance: "supports", note: ev.note ?? null, confidence: 0.8 })
            .onConflictDoNothing();
        }
      }
      for (const claimKey of ev.contradicts ?? []) {
        const cid = claimId.get(claimKey);
        if (cid) {
          await db
            .insert(schema.claimEvidence)
            .values({ claimId: cid, evidenceId: id, stance: "contradicts", confidence: 0.7 })
            .onConflictDoNothing();
        }
      }
    }

    for (const entry of event.timeline) {
      await db.insert(schema.timelineEntries).values({
        id: createId("tl"),
        eventId,
        occurredAt: ago(entry.hoursAgo),
        headline: entry.headline,
        detail: entry.detail ?? null,
        type: entry.type,
        confidence: entry.confidence,
        sourceArticleId: entry.articleKey ? (articleId.get(entry.articleKey) ?? null) : null,
        isDemo: true,
      });
    }

    for (const correction of event.corrections ?? []) {
      await db.insert(schema.corrections).values({
        id: createId("cor"),
        eventId,
        claimId: correction.claimKey ? (claimId.get(correction.claimKey) ?? null) : null,
        originalText: correction.originalText,
        updatedText: correction.updatedText,
        reason: correction.reason,
        sourceUrl: correction.sourceUrl ?? null,
        correctedAt: ago(correction.hoursAgo),
      });
    }
  }

  const analysis = await analyzeAllEvents(db);

  const [{ count: scoreCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.commonGroundScores);

  process.stdout.write(
    [
      "IFA seed complete (DEMO DATA)",
      `  events:        ${SEED_EVENTS.length}`,
      `  sources:       ${SEED_SOURCES.length}`,
      `  articles:      ${articleCount}`,
      `  claims:        ${claimCount}`,
      `  evidence:      ${evidenceCount}`,
      `  topics:        ${SEED_TOPICS.length}`,
      `  entities:      ${SEED_ENTITIES.length}`,
      `  CGI scores:    ${Number(scoreCount)}`,
      ...analysis.map(
        (a) => `    · ${a.eventId.slice(0, 10)}  CGI ${a.cgi.score} (${a.cgi.band})  contradictions:${a.contradictionPairs}`,
      ),
      `  elapsed:       ${Date.now() - started}ms`,
      "",
    ].join("\n"),
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
