import Link from "next/link";
import { dataset, istTimestamp, relativeIST } from "@/lib/live/dataset";
import { cn } from "@/lib/format";

/**
 * Top banner: live/degraded/stale health, last successful refresh in IST,
 * working feed count, and failed-feed disclosure.
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
    <section className={cn("card px-4 py-3", tone)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="ui text-[13px] font-bold tracking-wide">{label}</span>
        <span className="ui text-[12.5px] text-ink-2">
          Last successfully refreshed: <strong className="mono text-ink">{istTimestamp(lastSuccessAt)}</strong> ({relativeIST(lastSuccessAt)})
        </span>
        <span className="ui text-[12.5px] text-ink-2">
          <strong className="mono text-ink">{counts.workingFeeds}</strong> / {feeds.length} feeds responding
        </span>
        <span className="grow" />
        <Link href="/about" className="ui text-[12px] font-semibold text-accent hover:underline">
          Data sources &amp; methodology →
        </Link>
      </div>

      {health !== "live" && (
        <p className="ui mt-2 text-[12px] leading-snug text-ink-2">
          {health === "empty"
            ? "No valid Tamil Nadu or India item was available from any feed at the last refresh. This is not evidence that nothing is happening — it means this refresh found nothing to show."
            : health === "stale"
              ? "The last refresh did not reach any feed. The information below is the last known good snapshot and may be out of date."
              : `Some feeds did not respond on the last run: ${failed.map((f) => f.sourceName).join("; ")}. Items from those feeds are the last known good copy and are marked stale.`}
        </p>
      )}

      <p className="ui mt-2 border-t border-current/20 pt-2 text-[11.5px] leading-snug text-ink-2">
        For emergencies, follow instructions from the relevant official authority. IFA aggregates
        publicly available information and is not an emergency service.
      </p>
    </section>
  );
}
