import { z } from "zod";
import { env } from "./env";
import { logger } from "./logger";
import { ApiError, badRequest, payloadTooLarge, rateLimited, toErrorBody } from "./errors";

export function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
} as const;

export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
}

export function ok(data: unknown, requestIdValue: string, init?: ResponseInit): Response {
  return jsonResponse({ data, requestId: requestIdValue }, { status: 200, ...init });
}

/**
 * Read and validate a JSON body with an explicit byte cap.
 * Guards against oversized payloads before parsing.
 */
export async function readJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>,
  maxBytes: number,
): Promise<T> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError("unsupported_media_type", "Expected application/json body");
  }

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared && declared > maxBytes) throw payloadTooLarge();

  const raw = await req.arrayBuffer();
  if (raw.byteLength > maxBytes) throw payloadTooLarge();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw badRequest("Body is not valid JSON");
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) throw result.error;
  return result.data;
}

export function parseQuery<T>(url: URL, schema: z.ZodType<T>): T {
  const obj = Object.fromEntries(url.searchParams.entries());
  const result = schema.safeParse(obj);
  if (!result.success) throw result.error;
  return result.data;
}

/** In-memory fixed-window rate limiter. Single-instance only — see docs/THREAT_MODEL.md. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw rateLimited();
}

export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || req.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

/** Require the write token when one is configured. No-op in keyless demo mode. */
export function assertWriteAuthorized(req: Request): void {
  if (!env.IFA_WRITE_TOKEN) return;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== env.IFA_WRITE_TOKEN) {
    throw new ApiError("bad_request", "Missing or invalid write token");
  }
}

type Handler = (req: Request, ctx: { requestId: string }) => Promise<Response>;

/** Wrap a route handler with request-id, structured logging and error mapping. */
export function route(name: string, handler: Handler) {
  return async (req: Request): Promise<Response> => {
    const id = requestId();
    const started = Date.now();
    const log = logger.child({ route: name, requestId: id, method: req.method });
    try {
      const res = await handler(req, { requestId: id });
      log.info("request.completed", { status: res.status, ms: Date.now() - started });
      return res;
    } catch (err) {
      const { status, body } = toErrorBody(err, id);
      const level = status >= 500 ? "error" : "warn";
      log[level]("request.failed", {
        status,
        ms: Date.now() - started,
        code: body.error.code,
        message: err instanceof Error ? err.message : String(err),
      });
      return jsonResponse(body, { status });
    }
  };
}

export function routeWithParams<P>(
  name: string,
  handler: (req: Request, ctx: { requestId: string; params: P }) => Promise<Response>,
) {
  return async (req: Request, segment: { params: Promise<P> }): Promise<Response> => {
    const id = requestId();
    const started = Date.now();
    const log = logger.child({ route: name, requestId: id, method: req.method });
    try {
      const params = await segment.params;
      const res = await handler(req, { requestId: id, params });
      log.info("request.completed", { status: res.status, ms: Date.now() - started });
      return res;
    } catch (err) {
      const { status, body } = toErrorBody(err, id);
      const level = status >= 500 ? "error" : "warn";
      log[level]("request.failed", {
        status,
        ms: Date.now() - started,
        code: body.error.code,
        message: err instanceof Error ? err.message : String(err),
      });
      return jsonResponse(body, { status });
    }
  };
}
