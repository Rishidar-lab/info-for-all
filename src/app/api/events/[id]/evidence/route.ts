import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveEventSlug } from "@/lib/domain/events";
import { notFound } from "@/lib/errors";
import { ok, routeWithParams } from "@/lib/http";
import { PRIMARY_EVIDENCE_TYPES, type EvidenceType } from "@/lib/domain/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = routeWithParams<{ id: string }>(
  "events.evidence",
  async (_req, { requestId, params }) => {
    const slug = await resolveEventSlug(db, params.id);
    if (!slug) throw notFound(`No event matches "${params.id}"`);
    const [event] = await db.select().from(schema.events).where(eq(schema.events.slug, slug));
    if (!event) throw notFound(`No event matches "${params.id}"`);

    const rows = await db.select().from(schema.evidence).where(eq(schema.evidence.eventId, event.id));
    const links = rows.length
      ? await db.select().from(schema.claimEvidence)
      : [];

    const evidence = rows.map((e) => ({
      id: e.id,
      url: e.url,
      title: e.title,
      publisher: e.publisher,
      type: e.type,
      isPrimary: e.isPrimary || PRIMARY_EVIDENCE_TYPES.has(e.type as EvidenceType),
      publishedAt: e.publishedAt?.toISOString() ?? null,
      archiveUrl: e.archiveUrl,
      contentHash: e.contentHash,
      isDemo: e.isDemo,
      linkedClaims: links
        .filter((l) => l.evidenceId === e.id)
        .map((l) => ({ claimId: l.claimId, stance: l.stance, note: l.note })),
    }));

    return ok(
      {
        eventId: event.id,
        slug,
        evidence,
        primaryCount: evidence.filter((e) => e.isPrimary).length,
      },
      requestId,
    );
  },
);
