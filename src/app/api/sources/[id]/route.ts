import { db } from "@/lib/db";
import { getSourceDetail } from "@/lib/domain/sources";
import { notFound } from "@/lib/errors";
import { ok, routeWithParams } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = routeWithParams<{ id: string }>(
  "sources.detail",
  async (_req, { requestId, params }) => {
    const detail = await getSourceDetail(db, params.id);
    if (!detail) throw notFound(`No source matches "${params.id}"`);
    return ok(detail, requestId);
  },
);
