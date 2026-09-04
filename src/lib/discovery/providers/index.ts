/**
 * Provider registry + per-provider feature gating.
 *
 * `DISCOVERY_PROVIDERS` (comma-separated env var) is the allow-list. When it is
 * unset only the no-network `corpus-rescan` provider runs — so `npm test`,
 * `npm run build` and CI never touch the network. The deploy workflow sets
 * `DISCOVERY_PROVIDERS=gdelt,corpus-rescan`.
 */
import { gdeltProvider } from "./gdelt";
import { corpusRescanProvider } from "./corpus-rescan";
import { mockProvider } from "./mock";
import type { DiscoveryProvider } from "../types";

export function loadProviders(allowList?: string): DiscoveryProvider[] {
  const raw = allowList ?? process.env.DISCOVERY_PROVIDERS ?? "";
  const allow = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  // corpus-rescan is always available (no network); it is the discovery floor.
  const all: DiscoveryProvider[] = [
    corpusRescanProvider(true),
    gdeltProvider(allow.has("gdelt")),
  ];
  return all.filter((p) => p.enabled || allow.has(p.id));
}

export { gdeltProvider, corpusRescanProvider, mockProvider };
