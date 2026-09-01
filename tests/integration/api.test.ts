import { describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { GET as listEvents } from "@/app/api/events/route";
import { GET as eventDetail } from "@/app/api/events/[id]/route";
import { GET as eventClaims } from "@/app/api/events/[id]/claims/route";
import { GET as search } from "@/app/api/search/route";
import { GET as listSources } from "@/app/api/sources/route";
import { POST as ingestRoute } from "@/app/api/ingest/route";

const BASE = "http://ifa.test";

async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("GET /api/health", () => {
  it("reports healthy with a migrated, seeded database", async () => {
    const { status, body } = await json(await health(new Request(`${BASE}/api/health`)));
    expect(status).toBe(200);
    expect(body.status).toBe("healthy");
    expect((body.checks as { database: string }).database).toBe("ok");
    expect((body.checks as { eventCount: number }).eventCount).toBeGreaterThan(0);
  });
});

describe("GET /api/events", () => {
  it("returns the seeded events", async () => {
    const { status, body } = await json(await listEvents(new Request(`${BASE}/api/events`)));
    expect(status).toBe(200);
    const data = body.data as { events: unknown[]; count: number };
    expect(data.count).toBeGreaterThanOrEqual(5);
  });

  it("validates query params with a structured error", async () => {
    const { status, body } = await json(
      await listEvents(new Request(`${BASE}/api/events?category=bogus`)),
    );
    expect(status).toBe(422);
    expect((body.error as { code: string }).code).toBe("validation_failed");
    expect(body).toHaveProperty("requestId");
  });

  it("filters by category", async () => {
    const { body } = await json(
      await listEvents(new Request(`${BASE}/api/events?category=economics`)),
    );
    const data = body.data as { events: { category: string }[] };
    expect(data.events.every((e) => e.category === "economics")).toBe(true);
  });
});

describe("GET /api/events/[id]", () => {
  it("resolves by slug and returns the full detail shape with a CGI", async () => {
    const { status, body } = await json(
      await eventDetail(new Request(`${BASE}/api/events/reserve-bank-ardenne-holds-rate`), {
        params: Promise.resolve({ id: "reserve-bank-ardenne-holds-rate" }),
      }),
    );
    expect(status).toBe(200);
    const event = body.data as { cgi: { score: number } | null; claims: unknown[]; timeline: unknown[] };
    expect(event.cgi?.score).toBeGreaterThan(0);
    expect(event.claims.length).toBeGreaterThan(0);
    expect(event.timeline.length).toBeGreaterThan(0);
  });

  it("404s for an unknown event", async () => {
    const { status, body } = await json(
      await eventDetail(new Request(`${BASE}/api/events/nope`), {
        params: Promise.resolve({ id: "nope" }),
      }),
    );
    expect(status).toBe(404);
    expect((body.error as { code: string }).code).toBe("not_found");
  });
});

describe("GET /api/events/[id]/claims", () => {
  it("returns agreement and disagreement partitions", async () => {
    const { body } = await json(
      await eventClaims(new Request(`${BASE}/api/events/kestrel-sea-boundary-accord-signed/claims`), {
        params: Promise.resolve({ id: "kestrel-sea-boundary-accord-signed" }),
      }),
    );
    const data = body.data as { claims: unknown[]; disagreement: unknown[] };
    expect(data.claims.length).toBeGreaterThan(0);
    expect(Array.isArray(data.disagreement)).toBe(true);
  });
});

describe("GET /api/search", () => {
  it("searches across entities", async () => {
    const { status, body } = await json(
      await search(new Request(`${BASE}/api/search?q=oversight%20bill`)),
    );
    expect(status).toBe(200);
    const data = body.data as { results: { type: string }[] };
    expect(data.results.length).toBeGreaterThan(0);
  });

  it("requires a query", async () => {
    const { status } = await json(await search(new Request(`${BASE}/api/search`)));
    expect(status).toBe(422);
  });
});

describe("GET /api/sources", () => {
  it("lists sources with article counts", async () => {
    const { body } = await json(await listSources(new Request(`${BASE}/api/sources`)));
    const data = body.data as { sources: { articleCount?: number }[] };
    expect(data.sources.length).toBeGreaterThan(5);
  });
});

describe("POST /api/ingest", () => {
  it("rejects a non-JSON body", async () => {
    const { status } = await json(
      await ingestRoute(new Request(`${BASE}/api/ingest`, { method: "POST", body: "x" })),
    );
    expect(status).toBe(415);
  });

  it("validates the discriminated body", async () => {
    const { status, body } = await json(
      await ingestRoute(
        new Request(`${BASE}/api/ingest`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ adapter: "manual", manual: { url: "not-a-url", title: "x" } }),
        }),
      ),
    );
    expect(status).toBe(422);
    expect((body.error as { code: string }).code).toBe("validation_failed");
  });

  it("ingests a valid manual article and returns a pipeline report", async () => {
    const { status, body } = await json(
      await ingestRoute(
        new Request(`${BASE}/api/ingest`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            adapter: "manual",
            markDemo: true,
            manual: {
              url: `https://demo.example/a/${Date.now()}`,
              title: "A regulator opens an inquiry into pricing practices",
              publication: "Signalpost",
              content:
                "The competition regulator opened an inquiry on Tuesday. It said it had received several complaints. The regulator will report within a year.",
            },
          }),
        }),
      ),
    );
    expect(status).toBe(200);
    const report = body.data as { itemsAccepted: number; affectedEvents: unknown[] };
    expect(report.itemsAccepted).toBe(1);
    expect(report.affectedEvents.length).toBe(1);
  });
});
