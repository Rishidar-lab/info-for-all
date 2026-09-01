import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createId } from "./id";

/**
 * IFA relational schema (SQLite / Drizzle).
 *
 * Design notes
 * - String columns back every domain "enum" (see src/lib/domain/types.ts) because
 *   SQLite has no enum type. Values are validated at the application boundary.
 * - Timestamps are stored as epoch-ms integers and surface as `Date`.
 * - `isDemo` marks synthetic development rows so the UI can badge them and so a
 *   real ingestion run can be separated from seed data.
 * - Join tables model the SOURCE → ARTICLE → CLAIM → EVIDENCE provenance chain and
 *   the CLAIM ↔ CLAIM relationship graph. A graph store can replace these later
 *   without touching callers (see docs/ARCHITECTURE.md).
 */

const pk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

/* ─────────────────────────── User ─────────────────────────── */

export const users = sqliteTable("users", {
  id: pk(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role").notNull().default("reader"), // reader | editor | admin
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ─────────────────────────── Source ───────────────────────── */

export const sources = sqliteTable(
  "sources",
  {
    id: pk(),
    name: text("name").notNull(),
    domain: text("domain").notNull().unique(),
    country: text("country"),
    language: text("language").default("en"),
    orgType: text("org_type"), // SOURCE_CATEGORIES
    parentCompany: text("parent_company"),
    ownershipGroup: text("ownership_group"),
    foundedYear: integer("founded_year"),
    aboutUrl: text("about_url"),
    wikipediaUrl: text("wikipedia_url"),
    websiteUrl: text("website_url"),
    rssFeeds: text("rss_feeds", { mode: "json" }).$type<string[]>().default([]),
    category: text("category"),
    /** True for bodies that publish primary records (governments, courts, agencies). */
    publishesPrimarySources: integer("publishes_primary_sources", { mode: "boolean" })
      .notNull()
      .default(false),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sources_org_type_idx").on(t.orgType)],
);

/* ─────────────────────────── Article ──────────────────────── */

export const articles = sqliteTable(
  "articles",
  {
    id: pk(),
    url: text("url").notNull().unique(),
    canonicalUrl: text("canonical_url"),
    title: text("title").notNull(),
    description: text("description"),
    contentExcerpt: text("content_excerpt"),
    publication: text("publication").notNull(),
    author: text("author"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    language: text("language").notNull().default("en"),
    imageUrl: text("image_url"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    /** Upstream wire this article is derived from, if any (independence signal). */
    wireService: text("wire_service"),
    syndicatedFromSourceId: text("syndicated_from_source_id").references(
      (): typeof sources.id => sources.id,
      { onDelete: "set null" },
    ),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("articles_published_at_idx").on(t.publishedAt),
    index("articles_source_id_idx").on(t.sourceId),
  ],
);

/* ─────────────────────────── Event ────────────────────────── */

export const events = sqliteTable(
  "events",
  {
    id: pk(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    category: text("category").notNull(), // EVENT_CATEGORIES
    location: text("location"),
    status: text("status").notNull().default("developing"), // EVENT_STATUSES
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    latestUpdateAt: integer("latest_update_at", { mode: "timestamp_ms" }).notNull(),
    clusteringMethod: text("clustering_method"),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("events_category_idx").on(t.category),
    index("events_latest_update_idx").on(t.latestUpdateAt),
  ],
);

export const eventArticles = sqliteTable(
  "event_articles",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    similarity: real("similarity"),
    role: text("role"), // origin | corroboration | reaction | primary_document
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.articleId] })],
);

/* ─────────────────────────── Claim ────────────────────────── */

export const claims = sqliteTable(
  "claims",
  {
    id: pk(),
    canonicalText: text("canonical_text").notNull(),
    originalText: text("original_text").notNull(),
    normalizedMeaning: text("normalized_meaning"),
    type: text("type").notNull(), // CLAIM_TYPES
    status: text("status").notNull().default("UNVERIFIED"), // CLAIM_STATUSES
    extractionConfidence: real("extraction_confidence").notNull().default(0.5),
    evidenceStatus: text("evidence_status").notNull().default("none"), // EVIDENCE_STATUSES
    corroborationCount: integer("corroboration_count").notNull().default(0),
    contradictionCount: integer("contradiction_count").notNull().default(0),
    isKeyClaim: integer("is_key_claim", { mode: "boolean" }).notNull().default(false),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sourceArticleId: text("source_article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    /** Provenance: paragraph index within the source article. */
    sourceParagraph: integer("source_paragraph"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("claims_event_id_idx").on(t.eventId),
    index("claims_status_idx").on(t.status),
  ],
);

export const claimRelationships = sqliteTable(
  "claim_relationships",
  {
    id: pk(),
    type: text("type").notNull(), // CLAIM_RELATIONSHIP_TYPES
    fromClaimId: text("from_claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    toClaimId: text("to_claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    confidence: real("confidence").notNull().default(0.5),
    rationale: text("rationale"),
    detectedBy: text("detected_by"), // mock-ai | rule | human
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("claim_rel_unique").on(t.fromClaimId, t.toClaimId, t.type),
    index("claim_rel_from_idx").on(t.fromClaimId),
    index("claim_rel_to_idx").on(t.toClaimId),
  ],
);

/* ─────────────────────────── Evidence ─────────────────────── */

export const evidence = sqliteTable(
  "evidence",
  {
    id: pk(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    publisher: text("publisher"),
    type: text("type").notNull(), // EVIDENCE_TYPES
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    archiveUrl: text("archive_url"),
    contentHash: text("content_hash"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    retrievalMeta: text("retrieval_meta", { mode: "json" }).$type<Record<string, unknown>>(),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }),
    sourceId: text("source_id").references(() => sources.id, { onDelete: "set null" }),
    articleId: text("article_id").references(() => articles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("evidence_event_id_idx").on(t.eventId)],
);

export const claimEvidence = sqliteTable(
  "claim_evidence",
  {
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    evidenceId: text("evidence_id")
      .notNull()
      .references(() => evidence.id, { onDelete: "cascade" }),
    stance: text("stance").notNull(), // supports | contradicts | contextualizes
    note: text("note"),
    confidence: real("confidence").notNull().default(0.5),
  },
  (t) => [primaryKey({ columns: [t.claimId, t.evidenceId] })],
);

/* ─────────────────────────── Entity ───────────────────────── */

export const entities = sqliteTable(
  "entities",
  {
    id: pk(),
    name: text("name").notNull(),
    type: text("type").notNull(), // ENTITY_TYPES
    canonicalName: text("canonical_name"),
    wikipediaUrl: text("wikipedia_url"),
    description: text("description"),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("entities_name_type_unique").on(t.name, t.type)],
);

export const articleEntities = sqliteTable(
  "article_entities",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    mentions: integer("mentions").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.entityId] })],
);

export const eventEntities = sqliteTable(
  "event_entities",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    salience: real("salience").notNull().default(0.5),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.entityId] })],
);

export const claimEntities = sqliteTable(
  "claim_entities",
  {
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.claimId, t.entityId] })],
);

/* ─────────────────────────── Timeline ─────────────────────── */

export const timelineEntries = sqliteTable(
  "timeline_entries",
  {
    id: pk(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    headline: text("headline").notNull(),
    detail: text("detail"),
    type: text("type").notNull(), // TIMELINE_ENTRY_TYPES
    confidence: real("confidence").notNull().default(0.6),
    sourceArticleId: text("source_article_id").references(() => articles.id, {
      onDelete: "set null",
    }),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("timeline_event_occurred_idx").on(t.eventId, t.occurredAt)],
);

/* ────────────────────── Common Ground Index ───────────────── */

export const commonGroundScores = sqliteTable(
  "common_ground_scores",
  {
    id: pk(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    score: integer("score").notNull(), // 0..100
    band: text("band").notNull(), // CGI_BANDS
    formulaVersion: text("formula_version").notNull().default("cgi-v0.1"),
    inputsSnapshot: text("inputs_snapshot", { mode: "json" })
      .$type<Record<string, number>>()
      .notNull(),
    computedAt: integer("computed_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("cgi_event_computed_idx").on(t.eventId, t.computedAt)],
);

/** Score components are stored separately so the formula can evolve. */
export const cgiComponents = sqliteTable("cgi_components", {
  id: pk(),
  scoreId: text("score_id")
    .notNull()
    .references(() => commonGroundScores.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  label: text("label").notNull(),
  rawValue: real("raw_value").notNull(),
  weight: real("weight").notNull(),
  contribution: real("contribution").notNull(), // signed points added to the score
  direction: text("direction").notNull(), // positive | negative
  explanation: text("explanation").notNull(),
});

/* ─────────────────────────── Topic ────────────────────────── */

export const topics = sqliteTable("topics", {
  id: pk(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: createdAt(),
});

export const eventTopics = sqliteTable(
  "event_topics",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.topicId] })],
);

/* ─────────────────────────── Corrections ──────────────────── */

export const corrections = sqliteTable("corrections", {
  id: pk(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  claimId: text("claim_id").references(() => claims.id, { onDelete: "set null" }),
  originalText: text("original_text").notNull(),
  updatedText: text("updated_text").notNull(),
  reason: text("reason").notNull(),
  sourceUrl: text("source_url"),
  correctedAt: integer("corrected_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/* ─────────────────────── Ingestion audit log ──────────────── */

export const ingestionRuns = sqliteTable("ingestion_runs", {
  id: pk(),
  adapter: text("adapter").notNull(), // rss | manual | api
  status: text("status").notNull(), // success | partial | error
  itemsSeen: integer("items_seen").notNull().default(0),
  itemsAccepted: integer("items_accepted").notNull().default(0),
  itemsRejected: integer("items_rejected").notNull().default(0),
  notes: text("notes"),
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
});

export const SCHEMA_MARKER = sql`1`;

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;
export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;
export type Entity = typeof entities.$inferSelect;
export type TimelineEntry = typeof timelineEntries.$inferSelect;
export type CommonGroundScore = typeof commonGroundScores.$inferSelect;
export type CgiComponentRow = typeof cgiComponents.$inferSelect;
export type ClaimRelationship = typeof claimRelationships.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Correction = typeof corrections.$inferSelect;
export type IngestionRun = typeof ingestionRuns.$inferSelect;
