import { db } from "@/lib/db";
import { listSources } from "@/lib/domain/sources";
import { ok, route } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route("sources.list", async (_req, { requestId }) => {
  const sources = await listSources(db);
  return ok({ sources, count: sources.length }, requestId);
});
