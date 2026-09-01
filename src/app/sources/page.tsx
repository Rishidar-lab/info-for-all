import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { listSources } from "@/lib/domain/sources";
import { SOURCE_TYPE_LABEL } from "@/lib/ui";
import { SectionHeading } from "@/components/primitives";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sources" };

export default async function SourcesPage() {
  const sources = await listSources(db);
  const groups = new Map<string, typeof sources>();
  for (const s of sources) {
    const key = s.orgType ?? "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        label="Source intelligence"
        title="Publications and record-keepers"
        note={`${sources.length} sources`}
      />
      <p className="prose-measure ui text-[13px] text-ink-3">
        IFA records what kind of organisation each source is and who owns it. It does{" "}
        <strong>not</strong> assign political-bias scores. Ownership and wire-service relationships feed
        the source-independence estimate used by the Common Ground Index.
      </p>

      <div className="space-y-8">
        {[...groups.entries()].map(([type, list]) => (
          <section key={type}>
            <h2 className="label mb-2 border-b border-rule pb-1">
              {SOURCE_TYPE_LABEL[type] ?? type} · {list.length}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full ui text-[13px]">
                <thead>
                  <tr className="label text-left">
                    <th className="py-1 pr-3 font-semibold">Name</th>
                    <th className="hidden py-1 pr-3 font-semibold sm:table-cell">Country</th>
                    <th className="hidden py-1 pr-3 font-semibold md:table-cell">Ownership group</th>
                    <th className="py-1 pr-3 font-semibold">Reports</th>
                    <th className="py-1 font-semibold">Primary source?</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} className="border-t border-rule/60">
                      <td className="py-2 pr-3">
                        <Link href={`/sources/${s.id}`} className="link-quiet font-medium">
                          {s.name}
                        </Link>
                        <div className="text-[11px] text-ink-3">{s.domain}</div>
                      </td>
                      <td className="hidden py-2 pr-3 text-ink-2 sm:table-cell">{s.country ?? "—"}</td>
                      <td className="hidden py-2 pr-3 text-ink-2 md:table-cell">
                        {s.ownershipGroup ?? s.parentCompany ?? "—"}
                      </td>
                      <td className="py-2 pr-3 mono text-ink-2">{s.articleCount ?? 0}</td>
                      <td className="py-2 text-ink-2">{s.publishesPrimarySources ? "yes" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
