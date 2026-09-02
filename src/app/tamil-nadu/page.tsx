import type { Metadata } from "next";
import { CategoryNav } from "@/components/iffa/category-nav";
import { EventList } from "@/components/iffa/event-list";
import { clustersByTier } from "@/lib/live/trends-view";
import { dataset } from "@/lib/live/dataset";
import { allDistricts } from "@/lib/live/dataset";

export const metadata: Metadata = {
  title: "Tamil Nadu",
  description: "IFFA — every Tamil Nadu event in the latest refresh, grouped and trend-ranked, with district-level detail.",
};

export default function TamilNaduPage() {
  const clusters = clustersByTier("P0", 60);
  const districts = allDistricts();

  return (
    <div className="flex flex-col gap-7">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Geography · P0</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight sm:text-[34px]">Tamil Nadu</h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          Every event that names a Tamil Nadu district or the state, across all categories,
          trend-ranked. {districts.length > 0 && `Districts in this refresh: ${districts.join(", ")}.`}
        </p>
      </header>

      <CategoryNav />

      <EventList
        title="Tamil Nadu — trend-ranked"
        clusters={clusters}
        showWhy
        ranked
        columns={2}
        emptyText="No Tamil Nadu event in the latest refresh."
      />

      <p className="ui text-[11.5px] text-ink-3">Snapshot generated {new Date(dataset.generatedAt).toISOString()}.</p>
    </div>
  );
}
