import { desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import type { ArticleView, SourceView } from "./view";

function toSourceView(s: typeof schema.sources.$inferSelect, articleCount?: number): SourceView {
  return {
    id: s.id,
    name: s.name,
    domain: s.domain,
    country: s.country,
    language: s.language,
    orgType: s.orgType,
    category: s.category,
    parentCompany: s.parentCompany,
    ownershipGroup: s.ownershipGroup,
    foundedYear: s.foundedYear,
    websiteUrl: s.websiteUrl,
    wikipediaUrl: s.wikipediaUrl,
    aboutUrl: s.aboutUrl,
    publishesPrimarySources: s.publishesPrimarySources,
    isDemo: s.isDemo,
    articleCount,
  };
}

export async function listSources(db: Db): Promise<SourceView[]> {
  const sources = await db.select().from(schema.sources).orderBy(schema.sources.name);
  const counts = await db
    .select({
      sourceId: schema.articles.sourceId,
      count: sql<number>`count(*)`,
    })
    .from(schema.articles)
    .groupBy(schema.articles.sourceId);
  const countBySource = new Map(counts.map((c) => [c.sourceId, Number(c.count)]));
  return sources.map((s) => toSourceView(s, countBySource.get(s.id) ?? 0));
}

export interface SourceDetail {
  source: SourceView;
  articles: ArticleView[];
  events: { id: string; slug: string; title: string; latestUpdateAt: string }[];
}

export async function getSourceDetail(db: Db, id: string): Promise<SourceDetail | null> {
  const [source] = await db.select().from(schema.sources).where(eq(schema.sources.id, id));
  if (!source) return null;

  const articleRows = await db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.sourceId, id))
    .orderBy(desc(schema.articles.publishedAt))
    .limit(50);

  const articleIds = articleRows.map((a) => a.id);
  const eventLinks = articleIds.length
    ? await db
        .select({
          eventId: schema.eventArticles.eventId,
          slug: schema.events.slug,
          title: schema.events.title,
          latestUpdateAt: schema.events.latestUpdateAt,
        })
        .from(schema.eventArticles)
        .innerJoin(schema.events, eq(schema.events.id, schema.eventArticles.eventId))
        .where(inArray(schema.eventArticles.articleId, articleIds))
    : [];
  const eventMap = new Map<string, { id: string; slug: string; title: string; latestUpdateAt: string }>();
  for (const link of eventLinks) {
    if (!eventMap.has(link.eventId)) {
      eventMap.set(link.eventId, {
        id: link.eventId,
        slug: link.slug,
        title: link.title,
        latestUpdateAt: link.latestUpdateAt.toISOString(),
      });
    }
  }

  return {
    source: toSourceView(source, articleRows.length),
    articles: articleRows.map((a) => ({
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
      source: {
        id: source.id,
        name: source.name,
        domain: source.domain,
        country: source.country,
        orgType: source.orgType,
        category: source.category,
        ownershipGroup: source.ownershipGroup,
        parentCompany: source.parentCompany,
      },
    })),
    events: [...eventMap.values()].sort(
      (a, b) => new Date(b.latestUpdateAt).getTime() - new Date(a.latestUpdateAt).getTime(),
    ),
  };
}
