import Link from "next/link";
import { dataset, istTimestamp, relativeIST } from "@/lib/live/dataset";
import { cn } from "@/lib/format";

/**
 * Compact data-state line: live / degraded / stale, last successful refresh in
 * IST, working feed count. The "not an emergency service" disclaimer lives in
 * the footer — it does not need to repeat at the top of every page. When the
 * data is NOT live, the banner expands with what went wrong.
 */
export function StatusBanner() {
  const { health, lastSuccessAt, feeds, counts } = dataset;
  const failed = feeds.filter((f) => f.status !== "ok");

  const tone =
    health === "live"
      ? "border-agree/40 bg-agree-bg text-agree"
      : health === "degraded"
        ? "border-caution/50 bg-caution-bg text-caution"
        : "border-dispute/50 bg-dispute-bg text-dispute";

  const label = health === "live" ? "LIVE" : health === "degraded" ? "DEGRADED" : health === "empty" ? "EMPTY" : "STALE";

  return (
    <section className={cn("card px-4 py-2.5", tone)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ui text-[12px] text-ink-2">
        <span className="text-[12.5px] font-bold tracking-wide">{label}</span>
        <span>
          refreshed <strong className="mono text-ink">{istTimestamp(lastSuccessAt)}</strong>{" "}
          <span className="text-ink-3">({relativeIST(lastSuccessAt)})</span>
        </span>
        <span className="text-ink-3">·</span>
        <span>
          <strong className="mono text-ink">{counts.workingFeeds}</strong>/{feeds.length} feeds
        </span>
        <span className="grow" />
        <Link href="/about/" className="font-semibold text-accent hover:underline">
          Sources &amp; method →
        </Link>
      </div>

      {health !== "live" && (
        <p className="ui mt-2 border-t border-current/20 pt-2 text-[12px] leading-snug text-ink-2">
          {health === "empty"
            ? "No valid Tamil Nadu or India item was available from any feed at the last refresh. This is not evidence that nothing is happening — it means this refresh found nothing to show."
            : health === "stale"
              ? "The last refresh did not reach any feed. The information below is the last known good snapshot and may be out of date."
              : `Some feeds did not respond on the last run: ${failed.map((f) => f.sourceName).join("; ")}. Items from those feeds are the last known good copy and are marked stale.`}
        </p>
      )}
    </section>
  );
}
