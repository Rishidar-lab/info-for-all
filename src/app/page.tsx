import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { StatusBanner } from "@/components/live/status-banner";
import { SituationBar } from "@/components/iffa/situation-bar";
import { CategoryNav } from "@/components/iffa/category-nav";
import { FeedSection } from "@/components/feed/feed-section";
import { dataset } from "@/lib/live/dataset";
import { toFeedItems, trendingCount, tierCount } from "@/lib/live/feed-view";
import {
  urgentClusters,
  trendingClusters,
  fastRisingClusters,
  watchingClusters,
  backgroundClusters,
  clustersByTier,
  editorialBands,
  hasTrendData,
} from "@/lib/live/trends-view";

export default function HomePage() {
  const urgent = toFeedItems(urgentClusters());
  const rightNow = toFeedItems(trendingClusters(10));
  const rightNowSlugs = new Set(rightNow.map((c) => c.slug));
  const fastRising = toFeedItems(fastRisingClusters(9).filter((c) => !rightNowSlugs.has(c.slug)));
  const tamilNadu = toFeedItems(clustersByTier("P0", 8));
  const tnSlugs = new Set(tamilNadu.map((c) => c.slug));
  const india = toFeedItems(clustersByTier("P1", 8).filter((c) => !tnSlugs.has(c.slug)));
  const watching = toFeedItems(watchingClusters(6));
  const background = toFeedItems(backgroundClusters(12));
  const bands = editorialBands();

  return (
    <div className="flex flex-col gap-8">
      <AnalyticsBeacon event="home_view" payload={{}} />
      <section className="border-b border-rule-strong pb-5">
        <p className="label">{BRAND.name} · {BRAND.full}</p>
        <h1 className="mt-2 max-w-3xl font-serif text-[26px] leading-[1.12] tracking-tight sm:text-[36px]">
          See the coverage, not just the headline
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          One event at a time: <strong>who is reporting it, who isn&rsquo;t, who owns those sources</strong>,
          which claims the reporting agrees on, which are disputed, and which have primary-document
          evidence — Tamil&nbsp;Nadu and India, Tamil and English.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 ui text-[12.5px] font-semibold">
          <Link href="/landscape/" className="text-accent hover:underline">Today&rsquo;s media landscape →</Link>
          <Link href="/search/" className="text-accent hover:underline">Search or paste an article URL</Link>
        </div>
      </section>

      <StatusBanner />
      <SituationBar />
      <CategoryNav />

      {urgent.length > 0 && (
        <FeedSection
          id="urgent"
          n="00"
          label="Urgent"
          title="Requires attention now"
          items={urgent}
          columns={2}
        />
      )}

      <FeedSection
        id="top-stories"
        n="01"
        label="Top stories"
        title="The most-covered stories right now"
        note="Ranked by editorial priority, with source-concentration control. Each card shows the source count, independent families and evidence profile — open a story to compare every source."
        items={rightNow}
        totalHint={trendingCount()}
        more={{ all: true }}
        ranked
        columns={2}
        emptyText="No story cleared the editorial bar in the latest refresh — see &ldquo;Background / more&rdquo; below."
      />

      {fastRising.length > 0 && (
        <FeedSection
          id="fast-rising"
          n="02"
          label="Fast rising"
          title="A genuinely new development, spreading fast"
          note="Publication is accelerating across independent newsrooms AND the story added new information — not one wire copy reprinted."
          items={fastRising}
          more={{ rising: true }}
          columns={2}
        />
      )}

      <FeedSection
        id="tamil-nadu"
        n="03"
        label="Tamil Nadu"
        title="Tamil Nadu now"
        items={tamilNadu}
        totalHint={tierCount("P0")}
        more={{ tier: "P0" }}
        columns={2}
      />

      <FeedSection
        id="india"
        n="04"
        label="India"
        title="India — national"
        note="India-wide events, and events abroad that materially affect India or Tamil Nadu."
        items={india}
        totalHint={tierCount("P1")}
        more={{ tier: "P1" }}
        columns={2}
      />

      {watching.length > 0 && (
        <FeedSection
          id="watching"
          n="05"
          label="Watching"
          title="Developing — not yet established"
          note={
            <>
              Potentially consequential, but early or thinly sourced. A single local report does not
              become a confirmed crisis here. <Link href="/trends/" className="text-accent hover:underline">Full watch list →</Link>
            </>
          }
          items={watching}
          columns={2}
        />
      )}

      {background.length > 0 && (
        <FeedSection
          id="background"
          n="06"
          label="Background / more"
          title="Relevant, but not currently developing"
          note="General and regional interest, and stable stories with no new information since they were first reported. Kept accessible, de-emphasised — not misclassified."
          items={background}
          columns={3}
        />
      )}

      <section className="card bg-surface-2 p-5">
        <div className="label mb-2">How this page is built</div>
        <p className="ui text-[13px] leading-relaxed text-ink-2">
          {hasTrendData()
            ? "Events, clusters, trend and editorial scores are computed deterministically from public RSS / CAP feeds at the timestamp in the status bar — no language model in the deployed build."
            : "This build is showing the committed demonstration snapshot; the live deployment refreshes it every 15 minutes."}{" "}
          The editorial score is a <strong>ranking</strong> — not a probability of truth. Five copied
          articles are not five confirmations. See the{" "}
          <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/EDITORIAL-MODEL.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">editorial model</a>,
          the <Link href="/about/" className="text-accent hover:underline">methodology</Link> and the{" "}
          <Link href="/methodology/quality/" className="text-accent hover:underline">quality dashboard</Link>.
        </p>
        <p className="ui mt-2 text-[11.5px] text-ink-3">
          Snapshot generated {new Date(dataset.generatedAt).toISOString()}. This refresh:{" "}
          {(["urgent", "high", "standard", "background", "suppressed"] as const)
            .map((b) => `${bands[b] ?? 0} ${b}`)
            .join(" · ")}
          . Celebrity and entertainment stories are classified and suppressed from the default
          surface, not deleted. Perspective / political-orientation ratings are not applied.
        </p>
      </section>
    </div>
  );
}
