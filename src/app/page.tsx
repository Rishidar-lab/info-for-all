import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { StatusBanner } from "@/components/live/status-banner";
import { SituationBar } from "@/components/iffa/situation-bar";
import { CategoryNav } from "@/components/iffa/category-nav";
import { EventList } from "@/components/iffa/event-list";
import { dataset } from "@/lib/live/dataset";
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
  const urgent = urgentClusters();
  const rightNow = trendingClusters(10);
  const rightNowSet = new Set(rightNow.map((c) => c.slug));
  const fastRising = fastRisingClusters(9).filter((c) => !rightNowSet.has(c.slug));
  const tamilNadu = clustersByTier("P0", 10);
  const tnSet = new Set(tamilNadu.map((c) => c.slug));
  const india = clustersByTier("P1", 10).filter((c) => !tnSet.has(c.slug));
  const watching = watchingClusters(12);
  const background = backgroundClusters(18);
  const bands = editorialBands();

  return (
    <div className="flex flex-col gap-8">
      <section className="border-b border-rule-strong pb-6">
        <p className="label">{BRAND.name} · {BRAND.full}</p>
        <h1 className="mt-2 max-w-3xl font-serif text-[30px] leading-[1.14] tracking-tight sm:text-[38px]">
          Current events without the noise
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
          {BRAND.tagline} {BRAND.name} ingests broadly but shows selectively: every event is
          scored for <strong>editorial priority</strong> — how locally relevant it is, how
          consequential, how much genuinely new information it carries, and how independently it
          is corroborated. Tamil&nbsp;Nadu first; crisis, politics, finance and sports before
          anything else. Every ranking explains itself.
        </p>
      </section>

      <StatusBanner />
      <SituationBar />
      <CategoryNav />

      {urgent.length > 0 && (
        <EventList
          id="urgent"
          n="00"
          label="Urgent"
          title="Requires attention now"
          note="A severe or critical event with a new development and independent corroboration."
          clusters={urgent}
          emphasis
          showWhy
          columns={1}
          emptyText=""
        />
      )}

      <EventList
        id="right-now"
        n="01"
        label="Right now"
        title="What matters right now"
        note="Editorial-priority ranked, with source-concentration control so one publisher cannot fill the page. Expand “why” on any card."
        clusters={rightNow}
        emphasis
        showWhy
        ranked
        columns={2}
        emptyText="No event cleared the editorial bar in the latest refresh. See “More” below."
      />

      {fastRising.length > 0 && (
        <EventList
          id="fast-rising"
          n="02"
          label="Fast rising"
          title="A genuinely new development, spreading fast"
          note="Publication is accelerating across independent newsrooms AND the story added new information — not one wire copy reprinted."
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
        title="Developing — not yet established"
        note="Potentially consequential, but early or thinly sourced. A single local report does not become a confirmed crisis here."
        clusters={watching}
        emptyText="Nothing on the watch list right now."
      />

      {background.length > 0 && (
        <EventList
          id="background"
          n="06"
          label="Background / more"
          title="Relevant, but not currently developing"
          note="General and regional interest, and stable stories with no new information since they were first reported. Kept accessible, de-emphasised — not misclassified."
          clusters={background}
          columns={3}
          emptyText=""
        />
      )}

      <section className="card bg-surface-2 p-5">
        <div className="label mb-2">How this page is built</div>
        <p className="ui text-[13px] leading-relaxed text-ink-2">
          {hasTrendData()
            ? "Events, clusters, trend and editorial scores are computed deterministically from public RSS / CAP feeds at the timestamp in the status bar — no language model in the deployed build."
            : "This build is showing the committed demonstration snapshot; the live deployment refreshes it every 15 minutes."}{" "}
          The editorial score is a <strong>ranking</strong> — not a probability of truth. Five
          copied articles are not five confirmations. See the{" "}
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
