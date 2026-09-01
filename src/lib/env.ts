import { z } from "zod";

/**
 * Central environment validation. Import `env` anywhere server-side.
 * Fails fast with a readable message when configuration is invalid.
 */
const boolish = z.enum(["true", "false"]);

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_VERSION: z.string().min(1).default("0.1.0"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  DATABASE_URL: z.string().min(1).default("file:./ifa.db"),

  IFA_DEMO_MODE: boolish.default("true"),

  AI_PROVIDER: z
    .enum(["mock", "openai", "anthropic", "openai-compatible"])
    .default("mock"),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  AI_MODEL: z.string().optional(),

  INGEST_MAX_BYTES: z.coerce.number().int().positive().max(50_000_000).default(2_000_000),
  INGEST_ALLOW_PRIVATE_NETWORK: boolish.default("false"),
  INGEST_HOST_ALLOWLIST: z.string().default(""),

  /** When set, write endpoints (POST /api/ingest, analyze) require this bearer token. */
  IFA_WRITE_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema> & {
  isDemoMode: boolean;
  allowPrivateNetwork: boolean;
  ingestHostAllowlist: string[];
};

function load(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  const v = parsed.data;

  if (v.AI_PROVIDER !== "mock" && !v.AI_API_KEY) {
    throw new Error(
      `AI_PROVIDER="${v.AI_PROVIDER}" requires AI_API_KEY. Use AI_PROVIDER=mock for keyless operation.`,
    );
  }

  return {
    ...v,
    isDemoMode: v.IFA_DEMO_MODE === "true",
    allowPrivateNetwork: v.INGEST_ALLOW_PRIVATE_NETWORK === "true",
    ingestHostAllowlist: v.INGEST_HOST_ALLOWLIST.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };
}

export const env: Env = load();
