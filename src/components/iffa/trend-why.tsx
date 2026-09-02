import type { LiveCluster } from "@/lib/live/types";
import { TREND_STATE_LABEL, type TrendState } from "@/lib/trends/types";
import { cn } from "@/lib/format";

/** The "why is this trending / ranked here" inspector — no opaque ranking. */
export function TrendWhy({ cluster, open = false }: { cluster: LiveCluster; open?: boolean }) {
  const t = cluster.trendData?.trend;
  if (!t) return null;
  const state = t.state as TrendState;
  const ind = cluster.trendData?.independence;

  const bars: [string, number][] = [
    ["Recency", t.recencyScore],
    ["Velocity", t.velocityScore],
    ["Source diversity", t.sourceDiversityScore],
    ["Geographic relevance", t.geoScore],
    ["Category weight", t.categoryScore],
    ["Consequence", t.consequenceScore],
    ["Novelty", t.noveltyScore],
    ["Corroboration", t.corroborationScore],
  ];

  return (
    <details open={open} className="mt-2 border-t border-rule pt-2">
      <summary className="ui flex cursor-pointer items-center gap-2 text-[11.5px] font-semibold text-ink-2">
        <span className={cn("disclosure-caret transition-transform", "text-ink-3")} aria-hidden>
          ▸
        </span>
        Why {TREND_STATE_LABEL[state].toLowerCase()} · trend score{" "}
        <span className="mono text-ink">{t.score.toFixed(0)}</span>
      </summary>

      <ul className="mt-2 flex flex-col gap-1">
        {t.explanation.map((e, i) => (
          <li
            key={i}
            className={cn(
              "ui text-[11.5px] leading-snug",
              e.startsWith("+") ? "text-agree" : e.startsWith("−") ? "text-dispute" : "text-ink-2",
            )}
          >
            {e}
          </li>
        ))}
      </ul>

      <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {bars.map(([label, v]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="ui w-[104px] shrink-0 text-[10.5px] text-ink-3">{label}</span>
            <span className="h-1.5 flex-1 rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-accent/70"
                style={{ width: `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%` }}
              />
            </span>
            <span className="mono w-7 shrink-0 text-right text-[10px] text-ink-3">{v.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <p className="ui mt-2 text-[10.5px] leading-snug text-ink-3">
        Trend score is a weighted geometric mean of the eight factors above — every one is shown.
        {ind ? ` ${ind.reports} report${ind.reports === 1 ? "" : "s"} from ${ind.families} independent source famil${ind.families === 1 ? "y" : "ies"}${ind.syndicated ? `; ${ind.syndicated} are syndicated copies` : ""}.` : ""}
      </p>
    </details>
  );
}
