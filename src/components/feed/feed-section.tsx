import type { ReactNode } from "react";
import type { FeedItem } from "@/lib/live/feed-item";
import { INDEX_SHARD_URL } from "@/lib/paths";
import { FeedCard } from "./feed-card";
import { LoadMore, type MoreFilter } from "./load-more";

/**
 * A titled feed section. The server renders `items` (already sized by the page —
 * typically ~12–18); when `more` is given, a client "Load more" appends further
 * matching FeedCards from the index shard. No JS ⇒ `items` + the section header
 * are the whole section.
 */
export function FeedSection({
  id,
  n,
  label,
  title,
  note,
  items,
  ranked = false,
  columns = 3,
  more,
  totalHint,
  emptyText,
}: {
  id?: string;
  n?: string;
  label?: string;
  title: string;
  note?: ReactNode;
  items: FeedItem[];
  ranked?: boolean;
  columns?: 1 | 2 | 3;
  more?: MoreFilter;
  /** Total stories that match `more` (for the "N shown of M" line). */
  totalHint?: number;
  emptyText?: string;
}) {
  const grid =
    columns === 1 ? "grid-cols-1" : columns === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3";
  const remaining = totalHint != null ? Math.max(totalHint - items.length, 0) : undefined;

  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-3 border-b border-rule-strong pb-2">
        {label && (
          <div className="label mb-1">
            {n && <span className="mono text-ink-3">{n} · </span>}
            {label}
          </div>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-[20px] font-semibold text-ink">{title}</h2>
          <span className="ui text-[12px] text-ink-3">
            {totalHint != null && totalHint > items.length
              ? `${items.length} of ${totalHint}`
              : `${items.length} shown`}
          </span>
        </div>
        {note && <p className="ui mt-1 max-w-3xl text-[12px] leading-snug text-ink-3">{note}</p>}
      </div>

      {items.length === 0 ? (
        <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
          {emptyText ?? "Nothing in this section for the current snapshot."}
        </p>
      ) : (
        <>
          <div className={`grid items-start gap-3 ${grid}`}>
            {items.map((it, i) => (
              <FeedCard key={it.slug} item={it} rank={ranked ? i + 1 : undefined} />
            ))}
          </div>
          {more && remaining !== 0 && (
            <LoadMore
              shardUrl={INDEX_SHARD_URL}
              filter={more}
              exclude={items.map((it) => it.slug)}
              remainingHint={remaining}
            />
          )}
        </>
      )}
    </section>
  );
}
