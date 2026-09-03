import type { Metadata } from "next";
import Link from "next/link";
import { dataset } from "@/lib/live/dataset";
import { PUBLISHERS } from "@/data/publishers";
import { describePublisher } from "@/lib/media-landscape/publishers";
import { computePublisherObserved } from "@/lib/media-landscape/observed";
import { SourceCompare, type CompareRow } from "@/components/media/source-compare";

export const metadata: Metadata = {
  title: "Compare sources",
  description: "Compare two or more publishers on ownership, coverage volume, topics, entity stance, sensationalism and correction history.",
};

export default function SourceComparePage() {
  const rows: CompareRow[] = PUBLISHERS.filter((p) => !p.name.includes("SACHET") && !p.name.includes("ReliefWeb"))
    .map((p) => {
      const prof = describePublisher(p.name, dataset);
      const obs = computePublisherObserved(p.name, dataset, "all");
      return {
        id: p.id,
        name: p.name,
        ownership: p.ownership.category.replace(/_/g, " "),
        parent: p.ownership.ultimateParent ?? p.ownership.parent ?? "—",
        funding: p.ownership.fundingType.replace(/-/g, " "),
        family: prof.sourceFamilyId,
        articles: prof.articleCount,
        politicalArticles: obs.politicalArticles,
        sensationalism: obs.sensationalismRate,
        primarySourceUsage: obs.primarySourceUsage,
        topics: Object.entries(obs.topics).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`),
        topEntities: obs.entityStance.slice(0, 3).map((e) => ({
          name: e.entityName,
          n: e.n,
          supportive: e.n ? Math.round((e.supportive / e.n) * 100) : 0,
          critical: e.n ? Math.round((e.critical / e.n) * 100) : 0,
        })),
        externalRatings: p.externalRatings.length,
      };
    })
    .sort((a, b) => b.articles - a.articles);

  return (
    <div className="min-w-0 pb-8">
      <nav className="ui mb-4 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
        <Link href="/sources" className="link-quiet hover:text-accent">Sources</Link>
        <span aria-hidden>/</span>
        <span className="text-ink-2">Compare</span>
      </nav>
      <h1 className="font-serif text-[27px] font-semibold leading-tight sm:text-[32px]">Compare sources</h1>
      <p className="ui mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-3">
        Pick two or more publishers. Every IFFA-observed figure is snapshot-scoped with its sample size —
        small samples are indicative, not a characterisation. External ratings and IFFA metrics are never blended.
      </p>
      <div className="mt-5">
        <SourceCompare rows={rows} />
      </div>
    </div>
  );
}
