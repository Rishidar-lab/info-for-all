import Link from "next/link";
import type { ArticleView } from "@/lib/domain/view";
import { SOURCE_TYPE_LABEL } from "@/lib/ui";
import { formatDateTime } from "@/lib/format";

const CLUSTER_LABELS = "ABCDEFGHIJKLMNOP".split("");

export function CoverageList({ articles }: { articles: ArticleView[] }) {
  if (articles.length === 0) return <p className="ui text-[13px] text-ink-3">No coverage recorded.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full ui text-[12.5px]">
        <thead>
          <tr className="label border-b border-rule-strong text-left">
            <th className="py-1.5 pr-3 font-semibold">Publication</th>
            <th className="py-1.5 pr-3 font-semibold">Headline</th>
            <th className="hidden py-1.5 pr-3 font-semibold md:table-cell">Type</th>
            <th className="hidden py-1.5 pr-3 font-semibold sm:table-cell">Country</th>
            <th className="hidden py-1.5 pr-3 font-semibold lg:table-cell">Ownership</th>
            <th className="py-1.5 pr-3 font-semibold" title="Independent source cluster">Ind.</th>
            <th className="py-1.5 font-semibold">Published</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id} className="border-b border-rule/60 align-top">
              <td className="py-2 pr-3">
                {a.source ? (
                  <Link href={`/sources/${a.source.id}`} className="link-quiet font-medium">
                    {a.publication}
                  </Link>
                ) : (
                  <span className="font-medium">{a.publication}</span>
                )}
                {a.wireService && (
                  <div className="text-[10.5px] text-ink-3">via {a.wireService} wire</div>
                )}
              </td>
              <td className="py-2 pr-3">
                <a href={a.url} target="_blank" rel="noreferrer" className="link-quiet">
                  {a.title}
                </a>
                {a.role && <span className="ml-1 pill text-ink-3">{a.role.replace(/_/g, " ")}</span>}
              </td>
              <td className="hidden py-2 pr-3 text-ink-2 md:table-cell">
                {a.source?.orgType ? (SOURCE_TYPE_LABEL[a.source.orgType] ?? a.source.orgType) : "—"}
              </td>
              <td className="hidden py-2 pr-3 text-ink-2 sm:table-cell">{a.source?.country ?? "—"}</td>
              <td className="hidden py-2 pr-3 text-ink-2 lg:table-cell">
                {a.source?.ownershipGroup ?? a.source?.parentCompany ?? "—"}
              </td>
              <td className="py-2 pr-3">
                {a.independenceClusterId !== null && a.independenceClusterId !== undefined ? (
                  <span className="mono text-ink-3" title="Articles sharing a letter are not independent of each other">
                    {CLUSTER_LABELS[a.independenceClusterId] ?? a.independenceClusterId}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 mono text-ink-3">{formatDateTime(a.publishedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
