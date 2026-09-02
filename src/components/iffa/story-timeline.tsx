import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { buildTimeline } from "@/lib/trends/timeline";
import { cn } from "@/lib/format";

function fmtIST(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Event timeline — what CHANGED, not six near-identical articles. */
export function StoryTimeline({ cluster, articles }: { cluster: LiveCluster; articles: LiveArticle[] }) {
  const timeline = cluster.trendData?.timeline ?? buildTimeline(articles);
  if (timeline.length < 2) return null;

  const newFacts = timeline.filter((e) => e.addedNewFact).length;

  return (
    <section>
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">Timeline</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">
          What changed ({newFacts} update{newFacts === 1 ? "" : "s"} across {timeline.length} reports)
        </h2>
        <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
          Reports in order of publication. A marked entry introduced a fact — a figure, a place, or
          a materially new detail — not present earlier.
        </p>
      </div>
      <ol className="flex flex-col">
        {timeline.map((e, i) => (
          <li
            key={i}
            className={cn(
              "grid grid-cols-[84px_1fr] gap-x-3 border-l-2 py-2.5 pl-3",
              e.addedNewFact ? "border-accent" : "border-rule",
            )}
          >
            <span className="mono pt-0.5 text-[11px] text-ink-3">{fmtIST(e.at)}</span>
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 ui text-[11px]">
                <span className={cn("font-semibold", e.official ? "text-agree" : "text-ink-2")}>{e.sourceName}</span>
                {e.official && <span className="pill text-agree bg-agree-bg">Official</span>}
                {e.language === "ta" && <span className="pill text-ink-3">தமிழ்</span>}
                {e.addedNewFact && <span className="pill text-accent bg-accent-soft">New detail</span>}
              </div>
              <p className="mt-1 text-[13.5px] leading-snug text-ink">{e.headline}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
