import type { Metadata } from "next";
import { CategoryNav } from "@/components/iffa/category-nav";
import { FeedSection } from "@/components/feed/feed-section";
import { clustersByTier } from "@/lib/live/trends-view";
import { toFeedItems, tierCount } from "@/lib/live/feed-view";
import { dataset, allDistricts } from "@/lib/live/dataset";

export const metadata: Metadata = {
  title: "Tamil Nadu",
  description: "IFFA — every Tamil Nadu event in the latest refresh, grouped and trend-ranked, with district-level detail.",
};

const INITIAL = 18;

export default function TamilNaduPage() {
  const items = toFeedItems(clustersByTier("P0", INITIAL));
  const total = tierCount("P0");
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

      <FeedSection
        title="Tamil Nadu — trend-ranked"
        items={items}
        totalHint={total}
        more={{ tier: "P0" }}
        ranked
        columns={2}
        emptyText="No Tamil Nadu event in the latest refresh."
      />

      <p className="ui text-[11.5px] text-ink-3">Snapshot generated {new Date(dataset.generatedAt).toISOString()}.</p>
    </div>
  );
}
