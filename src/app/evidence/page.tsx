import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { EVIDENCE_TYPE_LABEL } from "@/lib/ui";
import { PRIMARY_EVIDENCE_TYPES, type EvidenceType } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { EvidenceMark, SectionHeading } from "@/components/primitives";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Evidence" };

export default async function EvidencePage() {
  const rows = await db
    .select({
      id: schema.evidence.id,
      url: schema.evidence.url,
      title: schema.evidence.title,
      publisher: schema.evidence.publisher,
      type: schema.evidence.type,
      isPrimary: schema.evidence.isPrimary,
      publishedAt: schema.evidence.publishedAt,
      contentHash: schema.evidence.contentHash,
      archiveUrl: schema.evidence.archiveUrl,
      eventId: schema.evidence.eventId,
      eventSlug: schema.events.slug,
      eventTitle: schema.events.title,
    })
    .from(schema.evidence)
    .leftJoin(schema.events, eq(schema.events.id, schema.evidence.eventId))
    .orderBy(desc(schema.evidence.publishedAt));

  const primary = rows.filter(
    (r) => r.isPrimary || PRIMARY_EVIDENCE_TYPES.has(r.type as EvidenceType),
  );
  const secondary = rows.filter((r) => !primary.includes(r));

  return (
    <div className="space-y-8">
      <SectionHeading
        label="Evidence engine"
        title="Documents and records linked to claims"
        note={`${primary.length} primary · ${secondary.length} other`}
      />
      <p className="prose-measure ui text-[13px] text-ink-3">
        Primary sources — legislation, official statements, transcripts, filings, datasets — are
        visually distinguished from journalism. Each item is linked to the specific claims it supports
        or contradicts on the relevant event page.
      </p>

      <section>
        <h2 className="label mb-2 border-b border-rule pb-1">Primary evidence</h2>
        <ul className="divide-y divide-rule">
          {primary.map((e) => (
            <li key={e.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <EvidenceMark primary />
                <a href={e.url} target="_blank" rel="noreferrer" className="link-quiet font-serif text-[15px]">
                  {e.title}
                </a>
              </div>
              <div className="mt-1 ui text-[12px] text-ink-3">
                {EVIDENCE_TYPE_LABEL[e.type] ?? e.type}
                {e.publisher && <> · {e.publisher}</>}
                {e.publishedAt && <> · {formatDateTime(e.publishedAt)}</>}
                {e.contentHash && <> · <span className="mono">{e.contentHash}</span></>}
                {e.eventSlug && (
                  <>
                    {" · "}
                    <Link href={`/events/${e.eventSlug}`} className="underline">
                      {e.eventTitle}
                    </Link>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {secondary.length > 0 && (
        <section>
          <h2 className="label mb-2 border-b border-rule pb-1">Other evidence</h2>
          <ul className="divide-y divide-rule">
            {secondary.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceMark primary={false} />
                  <a href={e.url} target="_blank" rel="noreferrer" className="link-quiet font-serif text-[15px]">
                    {e.title}
                  </a>
                </div>
                <div className="mt-1 ui text-[12px] text-ink-3">
                  {EVIDENCE_TYPE_LABEL[e.type] ?? e.type}
                  {e.publisher && <> · {e.publisher}</>}
                  {e.eventSlug && (
                    <>
                      {" · "}
                      <Link href={`/events/${e.eventSlug}`} className="underline">
                        {e.eventTitle}
                      </Link>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
