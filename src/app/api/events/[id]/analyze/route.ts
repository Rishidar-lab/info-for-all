import { db } from "@/lib/db";
import { analyzeEvent } from "@/lib/domain/analyze";
import { resolveEventSlug } from "@/lib/domain/events";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { assertWriteAuthorized, clientKey, ok, rateLimit, routeWithParams } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = routeWithParams<{ id: string }>(
  "events.analyze",
  async (req, { requestId, params }) => {
    assertWriteAuthorized(req);
    rateLimit(clientKey(req, "analyze"), 20, 60_000);

    const slug = await resolveEventSlug(db, params.id);
    if (!slug) throw notFound(`No event matches "${params.id}"`);
    const [event] = await db.select().from(schema.events).where(eq(schema.events.slug, slug));
    if (!event) throw notFound(`No event matches "${params.id}"`);

    const result = await analyzeEvent(db, event.id);
    return ok(
      {
        eventId: result.eventId,
        slug,
        claimsUpdated: result.claimsUpdated,
        contradictionPairs: result.contradictionPairs,
        independentSourceCount: result.independentSourceCount,
        cgi: {
          score: result.cgi.score,
          band: result.cgi.band,
          bandLabel: result.cgi.bandLabel,
          formulaVersion: result.cgi.formulaVersion,
          components: result.cgi.components,
          narrative: result.cgi.narrative,
        },
      },
      requestId,
    );
  },
);
