import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { StatusBanner } from "@/components/live/status-banner";
import { LiveFeed } from "@/components/live/live-feed";
import {
  activeCrisisClusters,
  developingCrisisClusters,
  tamilNaduClusters,
  indiaClusters,
  comparisonClusters,
  singleReportClusters,
  allDistricts,
  dataset,
} from "@/lib/live/dataset";

export default function HomePage() {
  const active = activeCrisisClusters();
  const developing = developingCrisisClusters();

  return (
    <div className="flex flex-col gap-8">
      <section className="border-b border-rule-strong pb-6">
        <p className="label">{BRAND.name} · {BRAND.full}</p>
        <h1 className="mt-2 max-w-3xl font-serif text-[30px] leading-[1.14] tracking-tight sm:text-[38px]">
          Current events without the noise
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
          {BRAND.tagline} {BRAND.name} groups reporting into events, ranks them by what is
          actually changing, and shows which sources independently confirm each claim, what
          remains uncertain, and how Tamil and English coverage describe the same story.
          Tamil&nbsp;Nadu first; crisis, politics, finance and sports before anything else.
        </p>
      </section>

      <StatusBanner />

      <LiveFeed
        active={active}
        developing={developing}
        tamilNadu={tamilNaduClusters(15)}
        india={indiaClusters(15)}
        comparisons={comparisonClusters(12)}
        singleReports={singleReportClusters(24)}
        districts={allDistricts()}
        counts={{
          activeCrisis: dataset.counts.activeCrisis,
          comparisons: dataset.counts.comparisons,
          singleReports: dataset.counts.singleReports,
          weakMatchesRejected: dataset.counts.weakMatchesRejected,
          distinctPublishers: dataset.counts.distinctPublishers,
          workingFeeds: dataset.counts.workingFeeds,
          failedFeeds: dataset.counts.failedFeeds,
        }}
      />

      <section className="card bg-surface-2 p-5">
        <div className="label mb-2">Not live reporting</div>
        <p className="ui text-[13px] leading-relaxed text-ink-2">
          The sections above are built from public RSS / CAP feeds at the timestamp shown in the
          status bar. Separately, {BRAND.name} keeps a set of{" "}
          <Link href="/methodology/examples" className="text-accent hover:underline">
            methodology demonstrations
          </Link>{" "}
          — synthetic comparison stories used to show how the model works. Those are clearly
          marked and are never mixed into this feed.
        </p>
        <p className="ui mt-2 text-[11.5px] text-ink-3">
          Snapshot generated {new Date(dataset.generatedAt).toISOString()}. Perspective /
          political-orientation ratings are not used for Indian publications; sources carry an
          evidence-role label instead. See{" "}
          <Link href="/about" className="text-accent hover:underline">
            methodology
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
