import type { StoryCluster } from "@/data/demo";
import { PERSPECTIVE_STYLE, coverageSegments } from "@/lib/ifa";
import { cn } from "@/lib/format";

/**
 * Accessible segmented coverage bar: Left / Center / Right share of reporting.
 * Reads as a labelled list to assistive technology; the bar itself is
 * decorative and hidden from the accessibility tree.
 */
export function CoverageBar({
  story,
  size = "md",
}: {
  story: StoryCluster;
  size?: "sm" | "md";
}) {
  const segments = coverageSegments(story);
  const barH = size === "sm" ? "h-2" : "h-3";

  return (
    <div className="ui">
      <div
        className={cn(
          "flex w-full overflow-hidden rounded-[2px] border border-rule-strong",
          barH,
        )}
        aria-hidden
      >
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={cn(PERSPECTIVE_STYLE[seg.key].bar)}
            style={{ width: `${seg.pct}%` }}
          />
        ))}
      </div>

      <dl
        className={cn(
          "mt-2 grid gap-x-4 gap-y-1",
          size === "sm" ? "grid-cols-3 text-[11px]" : "grid-cols-3 text-[12px]",
        )}
      >
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-ink-2">
              <span
                aria-hidden
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  PERSPECTIVE_STYLE[seg.key].dot,
                )}
              />
              {seg.label}
            </dt>
            <dd className="mono font-semibold tabular-nums text-ink">{seg.pct}%</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
