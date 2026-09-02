import type { Metadata } from "next";
import { dataset, istTimestamp, FEED_HEALTH_LABEL, FEED_HEALTH_TONE } from "@/lib/live/dataset";
import { categoryCounts, hasTrendData, situation } from "@/lib/live/trends-view";
import { CATEGORY_LABEL, type CategoryId } from "@/lib/domain/categories";
import { DESCRIBED_FEEDS } from "@/data/feeds";

export const metadata: Metadata = {
  title: "Diagnostics",
  description: "IFFA pipeline observability — ingestion counts, feed health, clustering, trend detection and Tamil↔English linking for the current snapshot.",
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-3">
      <div className="label">{label}</div>
      <div className="mono mt-1 text-[20px] text-ink">{value}</div>
      {sub && <div className="ui mt-0.5 text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}

export default function DiagnosticsPage() {
  const d = dataset;
  const clustersWithTrend = d.clusters.filter((c) => c.trendData?.trend).length;
  const families = d.clusters.reduce((n, c) => n + (c.trendData?.independence?.families ?? 0), 0);
  const syndicated = d.clusters.reduce((n, c) => n + (c.trendData?.independence?.syndicated ?? 0), 0);
  const crossLang = d.clusters.filter((c) => c.languages.includes("ta") && c.languages.includes("en")).length;
  const cats = categoryCounts();
  const s = situation();
  const feedFail = d.feeds.filter((f) => f.status !== "ok" && f.health !== "disabled");

  return (
    <div className="flex flex-col gap-7">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Developer · observability</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight tracking-tight sm:text-[32px]">Pipeline diagnostics</h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          Everything measured from the current static snapshot — no live calls. Health{" "}
          <strong>{d.health}</strong>, generated {istTimestamp(d.generatedAt)}, last successful
          fetch {istTimestamp(d.lastSuccessAt)}.
        </p>
      </header>

      <section>
        <div className="label mb-2">Ingestion</div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Articles" value={d.articles.length} />
          <Stat label="Clusters" value={d.clusters.length} />
          <Stat label="Feeds OK" value={`${d.counts.workingFeeds}/${d.feeds.length}`} />
          <Stat label="Distinct publishers" value={d.counts.distinctPublishers} />
          <Stat label="Tamil Nadu articles" value={d.counts.tamilNadu} />
          <Stat label="India articles" value={d.counts.india} />
          <Stat label="Active crisis clusters" value={d.counts.activeCrisis} />
          <Stat label="Weak matches kept apart" value={d.counts.weakMatchesRejected} />
        </div>
      </section>

      <section>
        <div className="label mb-2">Clustering &amp; independence</div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Verified comparisons" value={d.counts.comparisons} sub="2+ publishers, strong/probable" />
          <Stat label="Independent families" value={families} sub="summed across clusters" />
          <Stat label="Syndicated copies" value={syndicated} sub="not counted as confirmation" />
          <Stat label="Tamil↔English clusters" value={crossLang} sub="both languages in one event" />
        </div>
      </section>

      <section>
        <div className="label mb-2">Trend detection</div>
        {hasTrendData() ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Clusters scored" value={clustersWithTrend} />
            <Stat label="Trending" value={d.trending?.length ?? 0} />
            <Stat label="Watching" value={d.watching?.length ?? 0} />
            <Stat label="Situation TN / IN" value={s ? `${s.tamilNadu} / ${s.india}` : "—"} />
          </div>
        ) : (
          <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
            This snapshot predates the v0.7 trend engine. The live deployment regenerates it on
            the next ingest.
          </p>
        )}
      </section>

      <section>
        <div className="label mb-2">By category</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(cats) as CategoryId[]).map((c) => (
            <span key={c} className="card px-3 py-1.5 ui text-[12.5px] text-ink-2">
              {CATEGORY_LABEL[c]} <strong className="mono text-ink">{cats[c]}</strong>
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="label mb-2">Source health ({d.feeds.length} feeds)</div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-3 py-2 font-semibold">Feed</th>
                <th className="px-3 py-2 font-semibold">Health</th>
                <th className="px-3 py-2 font-semibold">HTTP</th>
                <th className="px-3 py-2 font-semibold">Seen / kept / rej.</th>
                <th className="px-3 py-2 font-semibold">Lag</th>
                <th className="px-3 py-2 font-semibold">Last item</th>
                <th className="px-3 py-2 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {[...d.feeds].sort((a, b) => (a.health === "disabled" ? 1 : 0) - (b.health === "disabled" ? 1 : 0)).map((f) => {
                const h = f.health ?? (f.status === "ok" ? "healthy" : f.status === "stale" ? "stale" : "failed");
                return (
                  <tr key={f.sourceId}>
                    <td className="px-3 py-2 ui text-[12px] text-ink">{f.sourceName}</td>
                    <td className={`px-3 py-2 ui text-[12px] font-semibold ${FEED_HEALTH_TONE[h] ?? "text-ink-3"}`}>
                      {FEED_HEALTH_LABEL[h] ?? h}
                      {(f.consecutiveFailures ?? 0) > 0 && <span className="ml-1 text-ink-3">×{f.consecutiveFailures}</span>}
                    </td>
                    <td className="px-3 py-2 mono text-[11px] text-ink-3">{f.httpState ?? "—"}</td>
                    <td className="px-3 py-2 mono text-[11px] text-ink-2">
                      {f.itemsSeen ?? "—"} / {f.itemsAccepted ?? f.itemCount} / {f.itemsRejected ?? 0}
                    </td>
                    <td className="px-3 py-2 mono text-[11px] text-ink-3">{f.medianLagMinutes != null ? `${f.medianLagMinutes}m` : "—"}</td>
                    <td className="px-3 py-2 ui text-[10.5px] text-ink-3">{f.lastItemAt ? istTimestamp(f.lastItemAt) : "—"}</td>
                    <td className="px-3 py-2 ui text-[10.5px] text-ink-3">{(f.error ?? "").slice(0, 90)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="ui mt-2 text-[11.5px] text-ink-3">
          A feed that returned 200 with no new article is <strong>healthy</strong>, not failed.
          &ldquo;Stale&rdquo; = last-known-good is being served after a fetch failure or the newest
          item is &gt; 3 days old. {feedFail.length === 0 ? "All feeds responded on the last run." : `${feedFail.length} feed(s) did not respond: ${feedFail.map((f) => f.sourceName).join("; ")}.`}
        </p>
      </section>

      <section>
        <div className="label mb-2">Registry ({DESCRIBED_FEEDS.length} feeds, {DESCRIBED_FEEDS.filter((f) => f.enabled).length} enabled)</div>
        <p className="ui text-[12px] leading-relaxed text-ink-3">
          {DESCRIBED_FEEDS.filter((f) => !f.enabled).map((f) => f.name).join("; ") || "All configured feeds enabled."}
        </p>
      </section>
    </div>
  );
}
