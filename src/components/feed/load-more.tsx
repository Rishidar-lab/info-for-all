"use client";

import { useCallback, useState } from "react";
import type { FeedItem } from "@/lib/live/feed-item";
import { FeedCard } from "./feed-card";

export interface MoreFilter {
  /** Only clusters in this geo tier. */
  tier?: "P0" | "P1" | "P2";
  /** Only clusters in this category. */
  category?: string;
  /** Only clusters whose trend state is rising / new / fast-rising / resurging. */
  rising?: boolean;
  /** All default-visible clusters (trend / home "all"). */
  all?: boolean;
}

const RISING = new Set(["new", "rising", "fast-rising", "resurging"]);

function matches(it: FeedItem, f: MoreFilter): boolean {
  if (!it.defaultVisible) return false;
  if (f.tier && it.geoTier !== f.tier) return false;
  if (f.category && it.category !== f.category) return false;
  if (f.rising && !(it.trendState && RISING.has(it.trendState))) return false;
  return true;
}

type State = "idle" | "loading" | "ready" | "done" | "error";

/**
 * Progressive loading for a feed section. The server renders the first page;
 * this fetches `/data/index/latest.json` once and appends further FeedCards that
 * match the same filter. With JS off, the server page + the section header are
 * the whole section — nothing here is required to read the feed.
 */
export function LoadMore({
  shardUrl,
  filter,
  exclude,
  pageSize = 12,
  remainingHint,
}: {
  shardUrl: string;
  filter: MoreFilter;
  exclude: string[];
  pageSize?: number;
  remainingHint?: number;
}) {
  const [pool, setPool] = useState<FeedItem[] | null>(null);
  const [shown, setShown] = useState(0);
  const [state, setState] = useState<State>("idle");

  const more = useCallback(async () => {
    setState("loading");
    try {
      let list = pool;
      if (!list) {
        const res = await fetch(shardUrl);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { clusters: FeedItem[] };
        const skip = new Set(exclude);
        list = (data.clusters ?? [])
          .filter((it) => matches(it, filter) && !skip.has(it.slug))
          .sort(
            (a, b) =>
              b.editorialScore - a.editorialScore ||
              Date.parse(b.sortAt) - Date.parse(a.sortAt),
          );
        setPool(list);
      }
      const next = Math.min(shown + pageSize, list.length);
      setShown(next);
      setState(next >= list.length ? "done" : "ready");
    } catch {
      setState("error");
    }
  }, [pool, shardUrl, exclude, filter, shown, pageSize]);

  const visible = pool ? pool.slice(0, shown) : [];
  const remaining = pool ? pool.length - shown : (remainingHint ?? 1);
  if (remaining <= 0 && pool && visible.length === 0) return null;

  return (
    <div className="mt-3">
      {visible.length > 0 && (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((it) => (
            <FeedCard key={it.slug} item={it} />
          ))}
        </div>
      )}
      {state !== "done" && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={more}
            disabled={state === "loading"}
            className="ui tap rounded-[3px] border border-rule-strong px-3 py-2 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {state === "loading"
              ? "Loading…"
              : state === "error"
                ? "Retry"
                : pool
                  ? `Load ${Math.min(pageSize, remaining)} more`
                  : "Load more stories"}
          </button>
          {state === "error" && (
            <span className="ui text-[12px] text-dispute">Could not load more — try again.</span>
          )}
        </div>
      )}
      {state === "done" && (
        <p className="ui mt-3 text-[12px] text-ink-3">
          That is every story in this section for the current snapshot.
        </p>
      )}
    </div>
  );
}
