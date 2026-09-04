/**
 * Analytics dispatch — no-op by default.
 *
 * IFFA ships with **no analytics provider**. `track()` is safe to call from
 * anywhere; with no provider configured it does nothing, makes no network
 * request, sets no cookie, and touches no storage. The app must behave
 * identically whether analytics is on or off.
 *
 * To connect a provider later, implement `AnalyticsProvider` and register it in
 * `getProvider()` behind `NEXT_PUBLIC_ANALYTICS`. Choose a provider that is
 * cookieless and does not fingerprint. See `docs/PRODUCT-METRICS.md`.
 */
import type { AnalyticsEvent, AnalyticsEventName, AnalyticsEventMap } from "./events";

export type { AnalyticsEvent, AnalyticsEventName } from "./events";
export { queryLengthBucket } from "./events";

export interface AnalyticsProvider {
  readonly name: string;
  send(event: AnalyticsEvent): void;
}

/** The default. Does nothing. */
const NullProvider: AnalyticsProvider = {
  name: "none",
  send() {
    /* intentionally empty */
  },
};

let resolved: AnalyticsProvider | null = null;

function getProvider(): AnalyticsProvider {
  if (resolved) return resolved;
  // No providers are bundled. `NEXT_PUBLIC_ANALYTICS` is unset in every shipped
  // build; this switch is the single, reviewed place a provider is wired in.
  const configured = process.env.NEXT_PUBLIC_ANALYTICS;
  switch (configured) {
    // case "plausible": resolved = makePlausibleProvider(); break;
    default:
      resolved = NullProvider;
  }
  return resolved;
}

/** True when a real provider is active (never, in a shipped build). */
export function analyticsEnabled(): boolean {
  return getProvider().name !== "none";
}

/**
 * Record a product event. Typed so a call site cannot pass article text or a
 * raw query. A no-op unless a provider is configured.
 */
export function track<N extends AnalyticsEventName>(name: N, payload: AnalyticsEventMap[N]): void {
  if (typeof window === "undefined") return;
  const provider = getProvider();
  if (provider.name === "none") return;
  try {
    provider.send({ name, ...payload } as AnalyticsEvent);
  } catch {
    /* analytics must never break the page */
  }
}
