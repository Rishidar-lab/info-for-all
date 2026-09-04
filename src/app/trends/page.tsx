import type { Metadata } from "next";
import Link from "next/link";
import { CategoryNav } from "@/components/iffa/category-nav";
import { FeedSection } from "@/components/feed/feed-section";
import { trendingClusters, watchingClusters } from "@/lib/live/trends-view";
import { toFeedItems, trendingCount } from "@/lib/live/feed-view";
import { TREND_WEIGHTS } from "@/lib/trends/weights";
import { dataset } from "@/lib/live/dataset";

export const metadata: Metadata = {
  title: "Trends",
  description: "IFFA's trend leaderboard — every event ranked by an interpretable score, with the full breakdown of why.",
};

const WEIGHT_ROWS: [string, number, string][] = [
  ["Recency", TREND_WEIGHTS.recency, "time since the last meaningful update"],
  ["Velocity", TREND_WEIGHTS.velocity, "acceleration of independent-family publication"],
  ["Source diversity", TREND_WEIGHTS.diversity, "how many independent newsrooms"],
  ["Geographic relevance", TREND_WEIGHTS.geo, "Tamil Nadu > India > abroad-relevant"],
  ["Category weight", TREND_WEIGHTS.category, "crisis > politics > finance > sports"],
  ["Consequence", TREND_WEIGHTS.consequence, "official alert, wide district impact, corroboration"],
  ["Novelty", TREND_WEIGHTS.novelty, "a new fact or correction beats a repeat"],
  ["Corroboration", TREND_WEIGHTS.corroboration, "independent confirmation or an official primary source"],
];

export default function TrendsPage() {
  const trending = toFeedItems(trendingClusters(18));
  const trendingTotal = trendingCount();
  const watching = toFeedItems(watchingClusters(12));

  return (
    <div className="flex flex-col gap-7">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Trend intelligence</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight sm:text-[34px]">
          What is trending, and exactly why
        </h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          Trending is not &ldquo;most articles&rdquo;. A story trends when several signals move
          together. The score is a weighted geometric mean of eight factors — all shown on every
          card, none hidden.
        </p>
      </header>

      <CategoryNav active="trends" />

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
              <th className="px-4 py-2.5 font-semibold">Factor</th>
              <th className="px-4 py-2.5 font-semibold">Weight</th>
              <th className="px-4 py-2.5 font-semibold">What it measures</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {WEIGHT_ROWS.map(([name, w, desc]) => (
              <tr key={name}>
                <td className="px-4 py-2.5 ui text-[13px] font-semibold text-ink">{name}</td>
                <td className="px-4 py-2.5 mono text-[12.5px] text-ink-2">{w.toFixed(2)}</td>
                <td className="px-4 py-2.5 ui text-[12.5px] text-ink-3">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ui px-4 py-2.5 text-[11px] text-ink-3">
          Full model and a worked example:{" "}
          <a
            href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/TREND-MODEL.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            docs/TREND-MODEL.md
          </a>
          . A geographic-relevance of zero (an out-of-scope story) removes the item entirely.
        </p>
      </section>

      <FeedSection
        title="Trending"
        note="Cleared the trend bar and has at least two independent source families (or an official primary source)."
        items={trending}
        totalHint={trendingTotal}
        more={{ all: true }}
        ranked
        columns={2}
        emptyText="No event is trending in the latest refresh."
      />

      <FeedSection
        title="Watching"
        note="Enough consequence or momentum to track, but not yet the independent evidence to be called trending."
        items={watching}
        columns={2}
        emptyText="Nothing on the watch list."
      />

      <p className="ui text-[11.5px] text-ink-3">
        Snapshot generated {new Date(dataset.generatedAt).toISOString()}.{" "}
        <Link href="/methodology/quality/" className="text-accent hover:underline">Quality dashboard →</Link>
      </p>
    </div>
  );
}
