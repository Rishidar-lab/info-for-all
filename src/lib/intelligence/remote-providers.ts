import { notAvailable, upstreamError } from "../errors";
import { logger } from "../logger";
import { LlmProvider } from "./llm-provider";
import { EMBEDDING_DIM, type GenerateOptions } from "./provider";

const log = logger.child({ module: "intelligence" });

/**
 * Real provider adapters. The official vendor SDKs are OPTIONAL dependencies and
 * are loaded lazily — demo mode, CI and tests never import them. A deployment
 * that sets AI_PROVIDER=anthropic|openai|openai-compatible must
 * `npm install @anthropic-ai/sdk` / `npm install openai` (see README § AI providers).
 *
 * Default model per the Anthropic API guidance: claude-opus-5.
 */

interface RemoteConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadModule(name: string): Promise<any> {
  try {
    return await import(/* webpackIgnore: true */ name);
  } catch {
    throw notAvailable(
      `AI provider requires the "${name}" package. Run: npm install ${name}`,
    );
  }
}

export class AnthropicProvider extends LlmProvider {
  readonly name = "anthropic";
  private readonly model: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clientPromise: Promise<any> | null = null;

  constructor(private readonly config: RemoteConfig) {
    super();
    this.model = config.model ?? "claude-opus-5";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async client(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = loadModule("@anthropic-ai/sdk").then((mod) => {
        const Anthropic = mod.default ?? mod.Anthropic;
        return new Anthropic({ apiKey: this.config.apiKey, baseURL: this.config.baseUrl });
      });
    }
    return this.clientPromise;
  }

  async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
    const client = await this.client();
    try {
      const message = await client.messages.create({
        model: this.model,
        max_tokens: opts?.maxTokens ?? 4000,
        system: opts?.system,
        messages: [{ role: "user", content: prompt }],
      });
      const block = (message.content ?? []).find(
        (b: { type: string }) => b.type === "text",
      );
      return block?.text ?? "";
    } catch (err) {
      log.error("intelligence.anthropic_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw upstreamError("Anthropic request failed");
    }
  }

  /** Anthropic has no embeddings endpoint — fall back to the deterministic embedding. */
  async embed(texts: string[]): Promise<number[][]> {
    return this.fallback.embed(texts);
  }
}

export class OpenAiProvider extends LlmProvider {
  readonly name: string;
  private readonly model: string;
  private readonly embedModel = "text-embedding-3-small";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clientPromise: Promise<any> | null = null;

  constructor(
    private readonly config: RemoteConfig,
    variant: "openai" | "openai-compatible" = "openai",
  ) {
    super();
    this.name = variant;
    this.model = config.model ?? "gpt-4o-mini";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async client(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = loadModule("openai").then((mod) => {
        const OpenAI = mod.default ?? mod.OpenAI;
        return new OpenAI({ apiKey: this.config.apiKey, baseURL: this.config.baseUrl });
      });
    }
    return this.clientPromise;
  }

  async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
    const client = await this.client();
    try {
      const completion = await client.chat.completions.create({
        model: this.model,
        temperature: opts?.temperature ?? 0,
        max_tokens: opts?.maxTokens ?? 4000,
        messages: [
          ...(opts?.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: prompt },
        ],
      });
      return completion.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      log.error("intelligence.openai_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw upstreamError("OpenAI request failed");
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const client = await this.client();
    try {
      const response = await client.embeddings.create({ model: this.embedModel, input: texts });
      return response.data.map((d: { embedding: number[] }) => d.embedding);
    } catch (err) {
      log.warn("intelligence.openai_embed_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return this.fallback.embed(texts);
    }
  }
}

export const REMOTE_EMBEDDING_DIM = EMBEDDING_DIM;
