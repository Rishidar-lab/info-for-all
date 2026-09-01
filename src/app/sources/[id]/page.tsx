import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSourceDetail } from "@/lib/domain/sources";
import { SOURCE_TYPE_LABEL, labelize } from "@/lib/ui";
import { formatDateTime } from "@/lib/format";
import { SectionHeading, Stat } from "@/components/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getSourceDetail(db, id);
  return { title: detail ? detail.source.name : "Source not found" };
}

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getSourceDetail(db, id);
  if (!detail) notFound();
  const { source, articles, events } = detail;

  return (
    <div className="space-y-8">
      <header className="border-b border-rule-strong pb-4">
        <span className="label">{SOURCE_TYPE_LABEL[source.orgType ?? ""] ?? labelize(source.orgType)}</span>
        <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-tight">{source.name}</h1>
        <p className="mt-1 ui text-[13px] text-ink-3">
          {source.domain}
          {source.websiteUrl && (
            <> · <a href={source.websiteUrl} target="_blank" rel="noreferrer" className="underline">website</a></>
          )}
          {source.wikipediaUrl && (
            <> · <a href={source.wikipediaUrl} target="_blank" rel="noreferrer" className="underline">Wikipedia</a></>
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <Stat label="Country" value={source.country ?? "—"} />
          <Stat label="Language" value={source.language ?? "—"} />
          <Stat label="Founded" value={source.foundedYear ?? "—"} />
          <Stat label="Reports on IFA" value={source.articleCount ?? articles.length} />
          <Stat label="Publishes primary records" value={source.publishesPrimarySources ? "yes" : "no"} />
        </div>
      </header>

      <section>
        <SectionHeading label="Ownership" title="Corporate structure" />
        <dl className="ui grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="label">Parent company</dt>
            <dd className="text-ink-2">{source.parentCompany ?? "—"}</dd>
          </div>
          <div>
            <dt className="label">Ownership group</dt>
            <dd className="text-ink-2">{source.ownershipGroup ?? "—"}</dd>
          </div>
          <div>
            <dt className="label">Organisation type</dt>
            <dd className="text-ink-2">{SOURCE_TYPE_LABEL[source.orgType ?? ""] ?? "—"}</dd>
          </div>
        </dl>
        <p className="mt-3 ui text-[12px] text-ink-3">
          No political-bias score is assigned. The architecture supports future perspective metadata,
          but IFA does not fabricate ideological classifications.
        </p>
      </section>

      {events.length > 0 && (
        <section>
          <SectionHeading label="Coverage" title="Events this source has reported" />
          <ul className="divide-y divide-rule">
            {events.map((e) => (
              <li key={e.id} className="py-2">
                <Link href={`/events/${e.slug}`} className="link-quiet font-serif text-[15px]">
                  {e.title}
                </Link>
                <span className="ml-2 ui text-[11px] text-ink-3">
                  updated {formatDateTime(e.latestUpdateAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHeading label="Articles" title={`${articles.length} recorded reports`} />
        <ul className="divide-y divide-rule">
          {articles.map((a) => (
            <li key={a.id} className="py-2.5">
              <a href={a.url} target="_blank" rel="noreferrer" className="link-quiet font-serif text-[15px]">
                {a.title}
              </a>
              <div className="ui text-[11.5px] text-ink-3">
                {formatDateTime(a.publishedAt)}
                {a.author && <> · {a.author}</>}
                {a.wireService && <> · via {a.wireService}</>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
