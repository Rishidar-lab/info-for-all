import { db } from "@/lib/db";
import { getEventDetail, resolveEventSlug } from "@/lib/domain/events";
import { notFound } from "@/lib/errors";
import { ok, routeWithParams } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = routeWithParams<{ id: string }>(
  "events.articles",
  async (_req, { requestId, params }) => {
    const slug = await resolveEventSlug(db, params.id);
    if (!slug) throw notFound(`No event matches "${params.id}"`);
    const event = await getEventDetail(db, slug);
    if (!event) throw notFound(`No event matches "${params.id}"`);
    return ok(
      { eventId: event.id, slug: event.slug, articles: event.coverage, independence: event.independence },
      requestId,
    );
  },
);
