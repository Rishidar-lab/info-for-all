import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { listEventSummaries } from "@/lib/domain/events";
import { EventCardList } from "@/components/event-card";
import { SectionHeading } from "@/components/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [topic] = await db.select().from(schema.topics).where(eq(schema.topics.slug, slug));
  return { title: topic ? topic.name : "Topic not found" };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [topic] = await db.select().from(schema.topics).where(eq(schema.topics.slug, slug));
  if (!topic) notFound();

  const events = await listEventSummaries(db, { topic: slug, limit: 100 });

  return (
    <div className="space-y-6">
      <SectionHeading label="Topic" title={topic.name} note={`${events.length} events`} />
      {topic.description && <p className="prose-measure font-serif text-[16px] text-ink-2">{topic.description}</p>}
      <EventCardList events={events} />
    </div>
  );
}
