import { db } from "@/lib/db";
import { getEventDetail, resolveEventSlug } from "@/lib/domain/events";
import { notFound } from "@/lib/errors";
import { ok, routeWithParams } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = routeWithParams<{ id: string }>(
  "events.claims",
  async (_req, { requestId, params }) => {
    const slug = await resolveEventSlug(db, params.id);
    if (!slug) throw notFound(`No event matches "${params.id}"`);
    const event = await getEventDetail(db, slug);
    if (!event) throw notFound(`No event matches "${params.id}"`);
    return ok(
      {
        eventId: event.id,
        slug: event.slug,
        claims: event.claims,
        agreement: event.agreement.map((c) => c.id),
        disagreement: event.disagreement.contradiction.map((d) => ({
          id: d.id,
          claimA: d.claimA.id,
          claimB: d.claimB.id,
          confidence: d.confidence,
          rationale: d.rationale,
        })),
      },
      requestId,
    );
  },
);
