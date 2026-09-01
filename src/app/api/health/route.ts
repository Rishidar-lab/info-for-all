import { sql } from "drizzle-orm";
import { db, databaseFileExists, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { getProvider } from "@/lib/intelligence";
import { jsonResponse, route } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route("health", async (_req, { requestId }) => {
  let database: "ok" | "unreachable" | "not_migrated" = "ok";
  let eventCount = 0;
  try {
    if (!databaseFileExists()) {
      database = "not_migrated";
    } else {
      const [row] = await db.select({ n: sql<number>`count(*)` }).from(schema.events);
      eventCount = Number(row?.n ?? 0);
    }
  } catch {
    database = "unreachable";
  }

  const healthy = database === "ok";
  return jsonResponse(
    {
      status: healthy ? "healthy" : "degraded",
      version: env.APP_VERSION,
      timestamp: new Date().toISOString(),
      requestId,
      checks: {
        database,
        eventCount,
        demoMode: env.isDemoMode,
        aiProvider: getProvider().name,
      },
    },
    { status: healthy ? 200 : 503 },
  );
});
