/**
 * Product-analytics event schema (v0.12).
 *
 * A stable, typed vocabulary for what people do on IFFA. It exists so that a
 * privacy-respecting analytics provider CAN be connected later without touching
 * call sites — see `docs/PRODUCT-METRICS.md`. By default nothing is sent
 * anywhere (see `./index.ts`).
 *
 * Rules baked into the types:
 *  - no free-text article content, no raw search strings, no personal data;
 *  - every payload field is an enum, a bounded string, a count, or a boolean;
 *  - `search_used` carries the query LENGTH and whether it looked like a URL,
 *    never the query itself.
 */

export type AnalyticsEventName =
  | "home_view"
  | "story_open"
  | "evidence_open"
  | "reference_open"
  | "source_profile_open"
  | "compare_open"
  | "search_used"
  | "load_more"
  | "pwa_install_prompt"
  | "partnership_cta";

interface Base {
  /** Route the event fired on, path only, no query string. */
  path: string;
}

export interface AnalyticsEventMap {
  home_view: Base;
  story_open: Base & {
    /** Story slug — already public, in the URL. */
    slug: string;
    category: string | null;
    scope: string;
    /** Was an IFFA brief shown, or withheld? */
    briefState: "delivered" | "withheld";
    genuineFamilies: number;
  };
  evidence_open: Base & { slug: string; tab: "evidence" | "landscape" | "headlines" | "perspectives" };
  reference_open: Base & { slug: string; /** 1-indexed citation number */ refIndex: number };
  source_profile_open: Base & { sourceId: string };
  compare_open: Base & { from: "home" | "story" | "sources" | "nav" };
  search_used: Base & {
    /** Length bucket, never the text. */
    queryLength: 0 | 1 | 2 | 3;
    looksLikeUrl: boolean;
    resultCount: number;
  };
  load_more: Base & { section: string; pageIndex: number };
  pwa_install_prompt: Base & { outcome: "shown" | "accepted" | "dismissed" };
  partnership_cta: Base & { placement: "footer" | "about" };
}

export type AnalyticsEvent = {
  [K in AnalyticsEventName]: { name: K } & AnalyticsEventMap[K];
}[AnalyticsEventName];

/** Query-length → bucket, so the query text never leaves the browser. */
export function queryLengthBucket(q: string): 0 | 1 | 2 | 3 {
  const n = q.trim().length;
  if (n === 0) return 0;
  if (n < 8) return 1;
  if (n < 24) return 2;
  return 3;
}
