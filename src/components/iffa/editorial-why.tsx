import type { LiveCluster } from "@/lib/live/types";
import { cn } from "@/lib/format";

const FACTOR_LABEL: Record<string, string> = {
  geoRelevance: "Local relevance",
  categoryPriority: "Priority domain",
  consequence: "Consequence",
  informationGain: "New information",
  corroboration: "Independent corroboration",
  meaningfulRecency: "Recently updated",
  localImpact: "Tamil Nadu impact",
  velocity: "Publication velocity",
};

/** "Why am I seeing this?" — the editorial ranking, fully broken out. */
export function EditorialWhy({ cluster, open = false }: { cluster: LiveCluster; open?: boolean }) {
  const e = cluster.trendData?.editorial;
  if (!e) return null;

  return (
    <details open={open} className="mt-2 border-t border-rule pt-2">
      <summary className="ui flex cursor-pointer items-center gap-2 text-[11.5px] font-semibold text-ink-2">
        <span className="disclosure-caret text-ink-3" aria-hidden>▸</span>
        Why this is {e.band === "urgent" || e.band === "high" ? "prominent" : "ranked here"} ·
        editorial score <span className="mono text-ink">{e.score.toFixed(0)}</span>
      </summary>

      <ul className="mt-2 flex flex-col gap-1">
        {e.reasons.map((r, i) => (
          <li key={i} className="ui text-[11.5px] leading-snug text-agree">+ {r}</li>
        ))}
        {e.penalties.map((p, i) => (
          <li key={`p${i}`} className="ui text-[11.5px] leading-snug text-dispute">
            − {p.reason}
          </li>
        ))}
        {e.suppressedByRule && (
          <li className="ui text-[11.5px] leading-snug text-ink-3">— suppressed: {e.suppressedByRule}</li>
        )}
      </ul>

      <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {e.factors.map((f) => (
          <div key={f.name} className="flex items-center gap-2">
            <span className="ui w-[132px] shrink-0 text-[10.5px] text-ink-3">{FACTOR_LABEL[f.name] ?? f.name}</span>
            <span className="h-1.5 flex-1 rounded-full bg-surface-2">
              <span
                className={cn("block h-full rounded-full", f.value >= 0.6 ? "bg-agree/70" : "bg-accent/60")}
                style={{ width: `${Math.round(Math.max(0, Math.min(1, f.value)) * 100)}%` }}
              />
            </span>
            <span className="mono w-7 shrink-0 text-right text-[10px] text-ink-3">{f.value.toFixed(2)}</span>
            <span className="mono w-8 shrink-0 text-right text-[9.5px] text-ink-3" title="weight">×{f.weight.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <p className="ui mt-2 text-[10.5px] leading-snug text-ink-3">
        Editorial score = 100 · Σ(factor × weight) − penalties. It decides <em>prominence</em>. It is
        NOT a probability that the reports are true or reliable — provenance is on the sources tab.
      </p>
    </details>
  );
}
