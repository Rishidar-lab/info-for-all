import type { ReactNode } from "react";
import type { LiveCluster } from "@/lib/live/types";
import { EventCard } from "./event-card";

/** A titled section of event cards. */
export function EventList({
  id,
  n,
  label,
  title,
  note,
  clusters,
  emphasis = false,
  showWhy = false,
  ranked = false,
  emptyText,
  columns = 3,
}: {
  id?: string;
  n?: string;
  label?: string;
  title: string;
  note?: ReactNode;
  clusters: LiveCluster[];
  emphasis?: boolean;
  showWhy?: boolean;
  ranked?: boolean;
  emptyText: string;
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2 xl:grid-cols-3";

  return (
    <section id={id} className="scroll-mt-4">
      <div className="mb-3 border-b border-rule-strong pb-2">
        {label && (
          <div className="label mb-1">
            {n && <span className="mono text-ink-3">{n}</span>} {n ? "· " : ""}
            {label}
          </div>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-[20px] font-semibold text-ink">{title}</h2>
          <span className="ui text-[12px] text-ink-3">{clusters.length} shown</span>
        </div>
        {note && <p className="ui mt-1 text-[12px] leading-snug text-ink-3">{note}</p>}
      </div>
      {clusters.length === 0 ? (
        <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">{emptyText}</p>
      ) : (
        <div className={`grid gap-3 ${grid}`}>
          {clusters.map((c, i) => (
            <EventCard
              key={c.id}
              cluster={c}
              emphasis={emphasis}
              showWhy={showWhy}
              rank={ranked ? i + 1 : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
