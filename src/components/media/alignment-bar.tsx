import { cn } from "@/lib/format";
import type { AlignmentGroup } from "@/lib/media-landscape/types";

/**
 * A coverage-alignment bar. NOT a left/right axis. Renders whatever alignment
 * groups the story actually has; when there is no defensible grouping it shows
 * "ALIGNMENT DATA INSUFFICIENT" — never a fake balanced bar.
 */
export function AlignmentBar({
  groups,
  reason,
  compact,
}: {
  groups: AlignmentGroup[] | null;
  reason?: string;
  compact?: boolean;
}) {
  if (!groups || groups.length === 0) {
    return (
      <div className="ui text-[11.5px] text-ink-3">
        <span className="font-semibold uppercase tracking-wide">Alignment data insufficient</span>
        {reason && !compact && <span className="block mt-0.5">{reason}</span>}
      </div>
    );
  }

  const color = (id: string) =>
    id === "government-favourable"
      ? "bg-caution"
      : id === "government-critical"
        ? "bg-dispute"
        : id === "mixed-unclear"
          ? "bg-rule-strong"
          : "bg-accent";

  return (
    <div className={cn("min-w-0", compact ? "" : "space-y-1.5")}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-rule">
        {groups.map((g) => (
          <div
            key={g.id}
            className={cn("h-full", color(g.id))}
            style={{ width: `${Math.round(g.share * 100)}%` }}
            title={`${g.label}: ${Math.round(g.share * 100)}%`}
          />
        ))}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 ui text-[11.5px] text-ink-3">
          {groups.map((g) => (
            <span key={g.id}>
              <span className={cn("mr-1 inline-block h-2 w-2 rounded-sm align-middle", color(g.id))} />
              {g.label} {Math.round(g.share * 100)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
