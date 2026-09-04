"use client";

import { useEffect } from "react";
import { track, type AnalyticsEventName } from "@/lib/analytics";
import type { AnalyticsEventMap } from "@/lib/analytics/events";

/**
 * Fires one product-analytics event on mount. Renders nothing. A no-op unless a
 * provider is configured (see `src/lib/analytics/index.ts`) — safe to place on
 * any page.
 */
export function AnalyticsBeacon<N extends AnalyticsEventName>({
  event,
  payload,
}: {
  event: N;
  payload: Omit<AnalyticsEventMap[N], "path">;
}) {
  useEffect(() => {
    track(event, {
      ...(payload as AnalyticsEventMap[N]),
      path: location.pathname,
    });
    // event identity is stable for the life of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
