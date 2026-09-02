import type { Metadata } from "next";
import { CategoryNav } from "@/components/iffa/category-nav";
import { EventList } from "@/components/iffa/event-list";
import { clustersByTier } from "@/lib/live/trends-view";
import { dataset } from "@/lib/live/dataset";

export const metadata: Metadata = {
  title: "India",
  description: "IFFA — national events, and events abroad that materially affect India or Tamil Nadu, grouped and trend-ranked.",
};

export default function IndiaPage() {
  const p0 = new Set(clustersByTier("P0", 200).map((c) => c.slug));
  const clusters = clustersByTier("P1", 60).filter((c) => !p0.has(c.slug));

  return (
    <div className="flex flex-col gap-7">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Geography · P1</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight sm:text-[34px]">India</h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          National events, and events outside India that materially affect Indian citizens, the
          economy, markets or foreign policy. Purely local Tamil Nadu items are on the{" "}
          <a href="/tamil-nadu/" className="text-accent hover:underline">Tamil Nadu</a> page.
        </p>
      </header>

      <CategoryNav />

      <EventList
        title="India — trend-ranked"
        clusters={clusters}
        showWhy
        ranked
        columns={2}
        emptyText="No national event in the latest refresh."
      />

      <p className="ui text-[11.5px] text-ink-3">Snapshot generated {new Date(dataset.generatedAt).toISOString()}.</p>
    </div>
  );
}
