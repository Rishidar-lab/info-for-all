import { z } from "zod";
import { db } from "@/lib/db";
import { runSearch } from "@/lib/domain/search";
import { ok, parseQuery, route } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["event", "article", "claim", "source", "entity", "topic"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const GET = route("search", async (req, { requestId }) => {
  const { q, type, limit } = parseQuery(new URL(req.url), QuerySchema);
  const result = await runSearch(db, q, { limit: limit ?? 20, types: type ? [type] : undefined });
  return ok(result, requestId);
});
