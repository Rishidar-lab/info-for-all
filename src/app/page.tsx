import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { StatusBanner } from "@/components/live/status-banner";
import { SituationBar } from "@/components/iffa/situation-bar";
import { CategoryNav } from "@/components/iffa/category-nav";
import { EventList } from "@/components/iffa/event-list";
import { dataset } from "@/lib/live/dataset";
import {
  trendingClusters,
  fastRisingClusters,
  watchingClusters,
  clustersByTier,
  hasTrendData,
} from "@/lib/live/trends-view";

export default function HomePage() {
  const trending = trendingClusters(24);
  const rightNow = trending.slice(0, 6);
  const fastRising = fastRisingClusters(9);
  const tamilNadu = clustersByTier("P0", 9);
  const india = clustersByTier("P1", 9).filter((c) => !tamilNadu.includes(c));
  const watching = watchingClusters(12);

  return (
    <div className="flex flex-col gap-8">
      <section className="border-b border-rule-strong pb-6">
        <p className="label">{BRAND.name} · {BRAND.full}</p>
        <h1 className="mt-2 max-w-3xl font-serif text-[30px] leading-[1.14] tracking-tight sm:text-[38px]">
          Current events without the noise
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
          {BRAND.tagline} {BRAND.name} groups reporting into events and ranks them by what is
          actually changing — recency, how fast independent newsrooms are picking it up, how much
          it matters here, and whether there is a genuinely new development. Tamil&nbsp;Nadu first;
          crisis, politics, finance and sports before anything else.
        </p>
      </section>

      <StatusBanner />
      <SituationBar />
      <CategoryNav />

      <EventList
        id="right-now"
        n="01"
        label="Right now"
        title="What matters right now"
        note="Trend-ranked. Each score is a weighted geometric mean of eight visible factors — expand “why” on any card."
        clusters={rightNow}
        emphasis
        showWhy
        ranked
        columns={2}
        emptyText="No event has cleared the trending bar in the latest refresh. Lower-signal stories are under “Watching” below."
      />

      {fastRising.length > 0 && (
        <EventList
          id="fast-rising"
          n="02"
          label="Fast rising"
          title="Accelerating across independent sources"
          note="Publication rate is climbing across different newsrooms — not one wire copy reprinted."
          clusters={fastRising}
          emptyText="Nothing is rising unusually fast right now."
        />
      )}

      <EventList
        id="tamil-nadu"
        n="03"
        label="Tamil Nadu"
        title="Tamil Nadu now"
        clusters={tamilNadu}
        emptyText="No Tamil Nadu event in this refresh."
      />

      <EventList
        id="india"
        n="04"
        label="India"
        title="India — national"
        note="India-wide events, and events abroad that materially affect India or Tamil Nadu."
        clusters={india}
        emptyText="No national event in this refresh."
      />

      <EventList
        id="watching"
        n="05"
        label="Watching"
        title="Developing — not yet confirmed"
        note="Potentially important, but early or thinly sourced. A single local report does not become a confirmed crisis here."
        clusters={watching}
        emptyText="Nothing on the watch list right now."
      />

      <section className="card bg-surface-2 p-5">
        <div className="label mb-2">How this page is built</div>
        <p className="ui text-[13px] leading-relaxed text-ink-2">
          {hasTrendData()
            ? "Events, clusters and trend scores are computed deterministically from public RSS / CAP feeds at the timestamp in the status bar — no language model in the deployed build."
            : "This build is showing the committed demonstration snapshot; the live deployment refreshes it every 15 minutes."}{" "}
          Five copied articles are not five confirmations — see the{" "}
          <Link href="/about/" className="text-accent hover:underline">methodology</Link> and the{" "}
          <Link href="/methodology/quality/" className="text-accent hover:underline">quality dashboard</Link>.
        </p>
        <p className="ui mt-2 text-[11.5px] text-ink-3">
          Snapshot generated {new Date(dataset.generatedAt).toISOString()}. Celebrity and
          entertainment stories are classified and kept out of the default feed. Perspective /
          political-orientation ratings are not applied to Indian publications.
        </p>
      </section>
    </div>
  );
}
