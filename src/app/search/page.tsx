import type { Metadata } from "next";
import { dataset } from "@/lib/live/dataset";
import { clusterArticles } from "@/lib/live/dataset";
import { Search, type SearchEntry } from "@/components/media/search";

export const metadata: Metadata = {
  title: "Search",
  description: "Search IFFA stories by headline, topic, politician, party, district or publisher — or paste a news URL to find its cross-source comparison.",
};

export default function SearchPage() {
  const index: SearchEntry[] = dataset.clusters
    .filter((c) => c.slug)
    .map((c) => {
      const arts = clusterArticles(c);
      const ml = c.trendData?.mediaLandscape;
      return {
        slug: c.slug,
        title: c.title,
        category: c.trendData?.category ?? "other-relevant",
        scope: c.scope,
        publishers: [...new Set(arts.map((a) => a.publisher))],
        districts: c.districts,
        urls: arts.map((a) => a.url),
        sources: ml?.coverage.uniquePublishers ?? c.distinctPublishers,
        families: ml?.coverage.independentSourceFamilies ?? 1,
      };
    });

  return (
    <div className="min-w-0 pb-8">
      <header className="border-b-2 border-ink/80 pb-4">
        <div className="label">Search</div>
        <h1 className="mt-1 font-serif text-[27px] font-semibold leading-tight sm:text-[33px]">Find a story</h1>
      </header>
      <div className="mt-6 max-w-2xl">
        <Search index={index} />
      </div>
    </div>
  );
}
