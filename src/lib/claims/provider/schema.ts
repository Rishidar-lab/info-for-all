/**
 * Zod schemas for provider-assisted claim extraction (v0.4, Phase 7).
 *
 * A model's raw output is UNTRUSTED. It is validated against these schemas
 * before anything downstream sees it; a single failing field rejects the whole
 * response. IFA never lets raw provider output become public data.
 */
import { z } from "zod";

export const ModelEntity = z.object({
  text: z.string().min(1).max(120),
  kind: z.enum(["place", "person", "organisation", "event", "other"]).default("other"),
});

export const ModelQuantity = z.object({
  value: z.number().finite(),
  unit: z.string().max(24),
  raw: z.string().min(1).max(60),
});

export const ModelTemporal = z.object({
  /** When the described event/state holds. */
  eventTime: z.string().max(60).optional(),
  /** Whether the claim is about the past, present or future. */
  tense: z.enum(["past", "present", "future", "unknown"]).default("unknown"),
});

export const ModelClaim = z.object({
  canonicalText: z.string().min(8).max(280),
  /** Original-language rendering, when the source was not English. */
  originalText: z.string().max(400).optional(),
  type: z.enum([
    "fact",
    "event",
    "statistic",
    "attribution",
    "official-statement",
    "allegation",
    "prediction",
    "opinion",
  ]),
  /** The speaker, when the claim is attributed. `null` means "direct, no speaker". */
  attribution: z.string().max(120).nullable().default(null),
  entities: z.array(ModelEntity).max(12).default([]),
  quantities: z.array(ModelQuantity).max(8).default([]),
  temporalContext: ModelTemporal.default({ tense: "unknown" }),
  /** The verbatim source span the model says supports this claim. */
  supportingExcerpt: z.string().min(1).max(400),
  /** Model's own confidence, 0–1. Advisory only — IFA re-scores. */
  confidence: z.number().min(0).max(1),
});

export const ModelClaimResponse = z.object({
  claims: z.array(ModelClaim).max(12),
});

export type ModelClaim = z.infer<typeof ModelClaim>;
export type ModelClaimResponse = z.infer<typeof ModelClaimResponse>;

export interface SchemaValidation {
  ok: boolean;
  data?: ModelClaimResponse;
  errors: string[];
}

/** Parse + validate a raw provider response (already JSON-parsed or a string). */
export function validateModelResponse(raw: unknown): SchemaValidation {
  let candidate = raw;
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return { ok: false, errors: ["response is not valid JSON"] };
    }
  }
  const parsed = ModelClaimResponse.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  return { ok: true, data: parsed.data, errors: [] };
}
