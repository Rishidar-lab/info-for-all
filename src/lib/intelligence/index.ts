import { env } from "../env";
import { logger } from "../logger";
import { MockProvider } from "./mock-provider";
import { AnthropicProvider, OpenAiProvider } from "./remote-providers";
import type { AIProvider } from "./provider";

export * from "./provider";
export { MockProvider } from "./mock-provider";

let cached: AIProvider | null = null;

/**
 * Resolve the active intelligence provider from the environment.
 * `AI_PROVIDER=mock` (the default) is deterministic and keyless.
 */
export function getProvider(): AIProvider {
  if (cached) return cached;

  switch (env.AI_PROVIDER) {
    case "anthropic":
      cached = new AnthropicProvider({
        apiKey: env.AI_API_KEY!,
        baseUrl: env.AI_BASE_URL,
        model: env.AI_MODEL,
      });
      break;
    case "openai":
    case "openai-compatible":
      cached = new OpenAiProvider(
        { apiKey: env.AI_API_KEY!, baseUrl: env.AI_BASE_URL, model: env.AI_MODEL },
        env.AI_PROVIDER,
      );
      break;
    default:
      cached = new MockProvider();
  }

  logger.info("intelligence.provider_selected", { provider: cached.name });
  return cached;
}

/** Test/CLI helper to force a provider. */
export function setProvider(provider: AIProvider | null): void {
  cached = provider;
}
