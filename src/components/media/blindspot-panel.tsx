import { cn } from "@/lib/format";
import type { Blindspot } from "@/lib/media-landscape/types";

const TYPE_LABEL: Record<Blindspot["type"], string> = {
  POLITICAL_COVERAGE: "Political coverage asymmetry",
  LANGUAGE: "Language blindspot",
  REGIONAL: "Regional blindspot",
  OWNERSHIP: "Ownership concentration",
  SOURCE_FAMILY: "Source-family concentration",
};

const CONF_LABEL: Record<string, string> = {
  INSUFFICIENT_COVERAGE: "insufficient coverage",
  POSSIBLE_ASYMMETRY: "possible asymmetry",
  CLEAR_ASYMMETRY: "clear asymmetry",
};

export function BlindspotBadge({ blindspots }: { blindspots: Blindspot[] }) {
  const clear = blindspots.filter((b) => b.confidence === "CLEAR_ASYMMETRY");
  const weak = blindspots.filter((b) => b.confidence !== "CLEAR_ASYMMETRY");
  if (!blindspots.length) {
    return <span className="ui text-[11.5px] text-agree">Coverage asymmetry: none detected</span>;
  }
  if (!clear.length) {
    return (
      <span className="ui text-[11.5px] text-ink-3">
        Coverage: {weak.map((b) => `${TYPE_LABEL[b.type].toLowerCase()} (small sample)`).join(" · ")}
      </span>
    );
  }
  return (
    <span className="ui text-[11.5px] font-semibold text-caution">
      Blindspot: {clear.map((b) => TYPE_LABEL[b.type]).join(" · ")}
    </span>
  );
}

export function BlindspotPanel({ blindspots }: { blindspots: Blindspot[] }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">Coverage asymmetry</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">Blindspots</h2>
        <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
          Where one group of sources covers this far more than another. A blindspot is a fact about
          <em> coverage</em>, not about whether the story is true.
        </p>
      </div>
      {blindspots.length === 0 ? (
        <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
          No significant coverage asymmetry detected across language, region, ownership or source family.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {blindspots.map((b, i) => (
            <li key={i} className="card p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  className={cn(
                    "pill",
                    b.confidence === "CLEAR_ASYMMETRY" ? "bg-caution-bg text-caution" : "bg-surface-2 text-ink-3",
                  )}
                >
                  {TYPE_LABEL[b.type]}
                </span>
                <span className="ui text-[11px] uppercase tracking-wide text-ink-3">{CONF_LABEL[b.confidence]}</span>
                <span className="mono ui text-[12px] text-ink-2">
                  {b.overCoveredCount} vs {b.underCoveredCount} · {b.ratio}×
                </span>
              </div>
              <p className="mt-2 ui text-[13px] leading-relaxed text-ink-2">{b.description}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
