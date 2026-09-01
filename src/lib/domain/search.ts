import type { Db } from "../db";
import { schema } from "../db";
import { truncate } from "../text";
import { createSearchService, type SearchDoc, type SearchOptions, type SearchResult } from "../search";

/**
 * Builds a search corpus from the database and runs the swappable SearchService.
 * At MVP scale the corpus is rebuilt per query; a persistent index (Postgres FTS
 * / pgvector) slots in behind the same call. See docs/ARCHITECTURE.md § Search.
 */
export async function buildCorpus(db: Db): Promise<SearchDoc[]> {
  const [events, articles, claims, sources, entities, topics] = await Promise.all([
    db.select().from(schema.events),
    db.select().from(schema.articles),
    db.select().from(schema.claims),
    db.select().from(schema.sources),
    db.select().from(schema.entities),
    db.select().from(schema.topics),
  ]);

  const docs: SearchDoc[] = [];

  for (const e of events) {
    docs.push({
      type: "event",
      id: e.slug,
      title: e.title,
      body: `${e.summary} ${e.category} ${e.location ?? ""}`,
      url: `/events/${e.slug}`,
      meta: { category: e.category, status: e.status },
    });
  }
  for (const a of articles) {
    docs.push({
      type: "article",
      id: a.id,
      title: a.title,
      body: `${a.description ?? ""} ${a.contentExcerpt ?? ""} ${a.publication}`,
      url: a.url,
      meta: { publication: a.publication, publishedAt: a.publishedAt.toISOString() },
    });
  }
  for (const c of claims) {
    docs.push({
      type: "claim",
      id: c.id,
      title: truncate(c.canonicalText, 140),
      body: `${c.originalText} ${c.type} ${c.status}`,
      url: `/events?claim=${c.id}`,
      meta: { status: c.status, type: c.type, eventId: c.eventId },
    });
  }
  for (const s of sources) {
    docs.push({
      type: "source",
      id: s.id,
      title: s.name,
      body: `${s.domain} ${s.country ?? ""} ${s.orgType ?? ""} ${s.ownershipGroup ?? ""} ${s.parentCompany ?? ""}`,
      url: `/sources/${s.id}`,
      meta: { country: s.country, orgType: s.orgType },
    });
  }
  for (const e of entities) {
    docs.push({
      type: "entity",
      id: e.id,
      title: e.name,
      body: `${e.type} ${e.description ?? ""}`,
      url: `/search?q=${encodeURIComponent(e.name)}`,
      meta: { type: e.type },
    });
  }
  for (const t of topics) {
    docs.push({
      type: "topic",
      id: t.slug,
      title: t.name,
      body: t.description ?? "",
      url: `/topics/${t.slug}`,
      meta: {},
    });
  }

  return docs;
}

export async function runSearch(
  db: Db,
  query: string,
  options?: SearchOptions,
): Promise<{ query: string; method: string; results: SearchResult[] }> {
  const service = createSearchService();
  service.index(await buildCorpus(db));
  return { query, method: service.method, results: service.search(query, options) };
}
