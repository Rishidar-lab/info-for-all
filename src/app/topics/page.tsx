import Link from "next/link";
import type { Metadata } from "next";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { SectionHeading } from "@/components/primitives";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Topics" };

export default async function TopicsPage() {
  const topics = await db.select().from(schema.topics).orderBy(schema.topics.name);
  const counts = await db
    .select({
      topicId: schema.eventTopics.topicId,
      n: sql<number>`count(*)`,
    })
    .from(schema.eventTopics)
    .groupBy(schema.eventTopics.topicId);
  const countBy = new Map(counts.map((c) => [c.topicId, Number(c.n)]));

  return (
    <div className="space-y-6">
      <SectionHeading label="Topics" title="Browse by subject" note={`${topics.length} topics`} />
      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((t) => (
          <Link key={t.id} href={`/topics/${t.slug}`} className="card block p-4 hover:border-accent">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-[17px] font-semibold text-ink">{t.name}</h2>
              <span className="mono text-[12px] text-ink-3">{countBy.get(t.id) ?? 0} events</span>
            </div>
            {t.description && <p className="mt-1 ui text-[13px] text-ink-2">{t.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
