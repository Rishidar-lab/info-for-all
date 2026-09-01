import { z } from "zod";

/**
 * Typed application error + structured HTTP error responses.
 */
export type ErrorCode =
  | "bad_request"
  | "validation_failed"
  | "not_found"
  | "payload_too_large"
  | "unsupported_media_type"
  | "rate_limited"
  | "upstream_error"
  | "not_available"
  | "internal_error";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  validation_failed: 422,
  not_found: 404,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  upstream_error: 502,
  not_available: 503,
  internal_error: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export const badRequest = (m: string, d?: unknown) => new ApiError("bad_request", m, d);
export const notFound = (m = "Resource not found") => new ApiError("not_found", m);
export const payloadTooLarge = (m = "Request body too large") =>
  new ApiError("payload_too_large", m);
export const rateLimited = (m = "Too many requests") => new ApiError("rate_limited", m);
export const notAvailable = (m: string) => new ApiError("not_available", m);
export const upstreamError = (m: string, d?: unknown) => new ApiError("upstream_error", m, d);

export function fromZod(error: z.ZodError): ApiError {
  return new ApiError("validation_failed", "Request validation failed", {
    issues: error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    })),
  });
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
  requestId: string;
}

export function toErrorBody(err: unknown, requestId: string): { status: number; body: ErrorBody } {
  if (err instanceof ApiError) {
    return {
      status: err.status,
      body: { error: { code: err.code, message: err.message, details: err.details }, requestId },
    };
  }
  if (err instanceof z.ZodError) {
    const api = fromZod(err);
    return {
      status: api.status,
      body: { error: { code: api.code, message: api.message, details: api.details }, requestId },
    };
  }
  return {
    status: 500,
    body: {
      error: { code: "internal_error", message: "An unexpected error occurred" },
      requestId,
    },
  };
}
