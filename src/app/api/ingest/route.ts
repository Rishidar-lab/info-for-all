import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ingest, type IngestInput } from "@/lib/domain/ingest";
import { EVENT_CATEGORIES } from "@/lib/domain/types";
import { assertWriteAuthorized, clientKey, ok, rateLimit, readJsonBody, route } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ManualSchema = z.object({
  url: z.string().url(),
  title: z.string().min(3).max(300),
  summary: z.string().max(4000).optional(),
  content: z.string().max(20_000).optional(),
  author: z.string().max(200).optional(),
  publication: z.string().max(200).optional(),
  publishedAt: z.string().max(40).optional(),
  wireService: z.string().max(120).optional(),
  language: z.string().max(5).optional(),
});

const RssSchema = z.object({
  feedUrl: z.string().url(),
  xml: z.string().max(2_000_000).optional(),
});

const ApiItemsSchema = z.object({
  items: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().min(3).max(300),
        summary: z.string().max(4000).optional(),
        content: z.string().max(20_000).optional(),
        publication: z.string().max(200).optional(),
        publishedAt: z.string().max(40).optional(),
        wireService: z.string().max(120).optional(),
      }),
    )
    .min(1)
    .max(25),
});

const BodySchema = z.discriminatedUnion("adapter", [
  z.object({ adapter: z.literal("manual"), manual: ManualSchema, category: z.enum(EVENT_CATEGORIES).optional(), markDemo: z.boolean().optional() }),
  z.object({ adapter: z.literal("rss"), rss: RssSchema, category: z.enum(EVENT_CATEGORIES).optional(), markDemo: z.boolean().optional() }),
  z.object({ adapter: z.literal("api"), api: ApiItemsSchema, category: z.enum(EVENT_CATEGORIES).optional(), markDemo: z.boolean().optional() }),
]);

export const POST = route("ingest", async (req, { requestId }) => {
  assertWriteAuthorized(req);
  rateLimit(clientKey(req, "ingest"), 10, 60_000);

  const body = await readJsonBody(req, BodySchema, env.INGEST_MAX_BYTES);
  const input: IngestInput = {
    adapter: body.adapter,
    markDemo: body.markDemo ?? env.isDemoMode,
    category: body.category,
    manual: body.adapter === "manual" ? body.manual : undefined,
    rss: body.adapter === "rss" ? body.rss : undefined,
    api: body.adapter === "api" ? { items: body.api.items } : undefined,
  };

  const report = await ingest(db, input);
  return ok(report, requestId, { status: report.status === "error" ? 422 : 200 });
});
