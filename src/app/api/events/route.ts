import { z } from "zod";
import { db } from "@/lib/db";
import { EVENT_CATEGORIES, EVENT_STATUSES } from "@/lib/domain/types";
import { listEventSummaries } from "@/lib/domain/events";
import { ok, parseQuery, route } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QuerySchema = z.object({
  category: z.enum(EVENT_CATEGORIES).optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  topic: z.string().max(80).optional(),
  sort: z.enum(["recent", "cgi_desc", "cgi_asc", "sources"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
});

export const GET = route("events.list", async (req, { requestId }) => {
  const query = parseQuery(new URL(req.url), QuerySchema);
  const events = await listEventSummaries(db, query);
  return ok({ events, count: events.length }, requestId);
});
