import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ingest } from "@/lib/domain/ingest";
import { createTestDb, schema, type TestDb } from "../helpers/test-db";

let ctx: TestDb;
beforeEach(() => {
  ctx = createTestDb();
});
afterEach(() => {
  ctx.cleanup();
});

const manualArticle = {
  url: "https://northwind.example/a/flood-plan",
  title: "Ministry publishes coastal flood defence plan",
  publication: "Northwind Public Media",
  summary: "A plan to build barriers along the Kestrel coast was published on Monday.",
  content:
    "The Ministry of Infrastructure published a coastal flood defence plan on Monday. The plan proposes forty kilometres of new barriers along the Kestrel coast. Officials said the programme would cost about 2 billion over ten years. Environmental groups welcomed the plan but said the timeline was too slow.",
};

describe("ingest pipeline", () => {
  it("normalises, clusters into a new event, extracts claims and logs the run", async () => {
    const report = await ingest(ctx.db, { adapter: "manual", manual: manualArticle, markDemo: true });

    expect(report.itemsAccepted).toBe(1);
    expect(report.articles[0].eventCreated).toBe(true);
    expect(report.articles[0].claimsExtracted).toBeGreaterThan(0);
    expect(report.affectedEvents[0].cgi).not.toBeNull();

    const events = await ctx.db.select().from(schema.events);
    expect(events).toHaveLength(1);

    const claims = await ctx.db.select().from(schema.claims).where(eq(schema.claims.eventId, events[0].id));
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.every((c) => c.sourceParagraph !== null)).toBe(true);

    const timeline = await ctx.db.select().from(schema.timelineEntries);
    expect(timeline.length).toBeGreaterThanOrEqual(1);

    const runs = await ctx.db.select().from(schema.ingestionRuns);
    expect(runs).toHaveLength(1);
    expect(runs[0].adapter).toBe("manual");
    expect(runs[0].status).toBe("success");
  });

  it("rejects a duplicate article on re-ingest", async () => {
    await ingest(ctx.db, { adapter: "manual", manual: manualArticle, markDemo: true });
    const second = await ingest(ctx.db, { adapter: "manual", manual: manualArticle, markDemo: true });
    expect(second.itemsAccepted).toBe(0);
    expect(second.itemsRejected).toBe(1);
    expect(second.rejected[0].reason).toMatch(/duplicate/);
  });

  it("clusters a follow-up report into the existing event", async () => {
    await ingest(ctx.db, { adapter: "manual", manual: manualArticle, markDemo: true });
    const followUp = await ingest(ctx.db, {
      adapter: "manual",
      markDemo: true,
      manual: {
        url: "https://harborpost.example/a/flood-plan-followup",
        title: "Coastal flood defence plan: Ministry defends the ten-year timeline",
        publication: "The Harbor Post",
        content:
          "The Ministry of Infrastructure defended its coastal flood defence plan and its forty kilometres of barriers along the Kestrel coast, after environmental groups criticised the ten-year timeline.",
      },
    });
    expect(followUp.itemsAccepted).toBe(1);
    expect(followUp.articles[0].eventCreated).toBe(false);
    const events = await ctx.db.select().from(schema.events);
    expect(events).toHaveLength(1);
  });

  it("ingests a batch via the api adapter with injected items", async () => {
    const report = await ingest(ctx.db, {
      adapter: "api",
      markDemo: true,
      api: {
        items: [
          { url: "https://a.example/x1", title: "Two states sign a maritime boundary accord" },
          { url: "https://b.example/x2", title: "Maritime boundary accord signed after two years of talks" },
        ],
      },
    });
    expect(report.itemsAccepted).toBe(2);
  });
});
