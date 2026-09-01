import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { analyzeEvent } from "@/lib/domain/analyze";
import { createId } from "@/lib/db/id";
import { contentTokens } from "@/lib/text";
import { createTestDb, schema, type TestDb } from "../helpers/test-db";

let ctx: TestDb;

const nm = (t: string) => contentTokens(t).sort().join(" ");
const at = (h: number) => new Date(Date.now() - h * 3600_000);

beforeEach(() => {
  ctx = createTestDb();
});
afterEach(() => {
  ctx.cleanup();
});

async function buildEvent() {
  const { db } = ctx;
  const eventId = createId("evt");
  await db.insert(schema.events).values({
    id: eventId,
    slug: "test-event",
    title: "Agency issues a recall",
    summary: "seed summary",
    category: "public_policy",
    status: "developing",
    startedAt: at(20),
    latestUpdateAt: at(2),
  });

  const sources = [
    { id: createId("src"), name: "Gov Agency", domain: "agency.gov.example", orgType: "government", ownershipGroup: "Government", publishesPrimarySources: true },
    { id: createId("src"), name: "Wire", domain: "wire.example", orgType: "wire_service", ownershipGroup: "Wire Co" },
    { id: createId("src"), name: "Daily A", domain: "a.example", orgType: "private_news", ownershipGroup: "Group X" },
    { id: createId("src"), name: "Daily B", domain: "b.example", orgType: "private_news", ownershipGroup: "Group X" },
  ];
  for (const s of sources) await db.insert(schema.sources).values(s);

  const articles = sources.map((s, i) => ({
    id: createId("art"),
    url: `https://${s.domain}/a/${i}`,
    canonicalUrl: `https://${s.domain}/a/${i}`,
    title: "Agency orders recall of device batch",
    contentExcerpt:
      "The agency ordered a recall of the device batch after 41 reports of overheating. The agency ordered a recall of the device batch.",
    publication: s.name,
    publishedAt: at(10 - i),
    sourceId: s.id,
  }));
  for (const a of articles) await db.insert(schema.articles).values(a);
  for (const a of articles) {
    await db.insert(schema.eventArticles).values({ eventId, articleId: a.id, role: "corroboration" });
  }

  const confirmedText = "The agency ordered a recall of the device batch.";
  const disputedTextA = "About 9,000 units are affected.";
  const disputedTextB = "About 20,000 units are affected.";

  const c1 = createId("clm");
  const c2 = createId("clm");
  const c3 = createId("clm");
  await db.insert(schema.claims).values([
    { id: c1, canonicalText: confirmedText, originalText: confirmedText, normalizedMeaning: nm(confirmedText), type: "official_statement", isKeyClaim: true, eventId, sourceArticleId: articles[0].id },
    { id: c2, canonicalText: disputedTextA, originalText: disputedTextA, normalizedMeaning: nm(disputedTextA), type: "statistic", isKeyClaim: true, eventId, sourceArticleId: articles[2].id },
    { id: c3, canonicalText: disputedTextB, originalText: disputedTextB, normalizedMeaning: nm(disputedTextB), type: "statistic", isKeyClaim: true, eventId, sourceArticleId: articles[1].id },
  ]);
  await db.insert(schema.claimRelationships).values({
    id: createId("rel"),
    type: "CONTRADICTS",
    fromClaimId: c2,
    toClaimId: c3,
    confidence: 0.8,
    rationale: "different figures",
    detectedBy: "seed",
  });

  const evId = createId("evd");
  await db.insert(schema.evidence).values({
    id: evId,
    url: "https://agency.gov.example/recall/notice",
    title: "Recall notice",
    type: "primary_document",
    isPrimary: true,
    eventId,
  });
  await db.insert(schema.claimEvidence).values({ claimId: c1, evidenceId: evId, stance: "supports", confidence: 0.9 });

  return { eventId, c1, c2, c3 };
}

describe("analyzeEvent", () => {
  it("computes and persists a Common Ground Index with its components", async () => {
    const { eventId } = await buildEvent();
    const result = await analyzeEvent(ctx.db, eventId);

    expect(result.cgi.score).toBeGreaterThanOrEqual(0);
    expect(result.cgi.score).toBeLessThanOrEqual(100);

    const [score] = await ctx.db
      .select()
      .from(schema.commonGroundScores)
      .where(eq(schema.commonGroundScores.eventId, eventId));
    expect(score.score).toBe(result.cgi.score);

    const components = await ctx.db
      .select()
      .from(schema.cgiComponents)
      .where(eq(schema.cgiComponents.scoreId, score.id));
    expect(components.length).toBe(result.cgi.components.length);
    expect(components.length).toBeGreaterThan(0);
  });

  it("derives CONFIRMED for a primary-backed claim and DISPUTED for contradicted claims", async () => {
    const { eventId, c1, c2, c3 } = await buildEvent();
    await analyzeEvent(ctx.db, eventId);

    const claims = await ctx.db.select().from(schema.claims).where(eq(schema.claims.eventId, eventId));
    const byId = new Map(claims.map((c) => [c.id, c]));
    expect(byId.get(c1)!.status).toBe("CONFIRMED");
    expect(byId.get(c2)!.status).toBe("DISPUTED");
    expect(byId.get(c3)!.status).toBe("DISPUTED");
    expect(byId.get(c2)!.contradictionCount).toBeGreaterThanOrEqual(1);
  });

  it("is idempotent for claim status across repeated runs", async () => {
    const { eventId } = await buildEvent();
    const first = await analyzeEvent(ctx.db, eventId);
    const second = await analyzeEvent(ctx.db, eventId);
    expect(second.cgi.score).toBe(first.cgi.score);
  });

  it("discounts wire-derived corroboration via source independence", async () => {
    const { eventId } = await buildEvent();
    const result = await analyzeEvent(ctx.db, eventId);
    // 4 articles, 2 in the same ownership group -> at most 3 independent sources
    expect(result.independentSourceCount).toBeLessThanOrEqual(3);
  });
});
