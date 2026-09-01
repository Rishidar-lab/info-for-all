import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { listEventSummaries } from "@/lib/domain/events";
import { EVENT_CATEGORIES } from "@/lib/domain/types";
import { CATEGORY_LABEL } from "@/lib/ui";
import { EventCard } from "@/components/event-card";
import { SectionHeading } from "@/components/primitives";
import { SearchBox } from "@/components/search-box";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const all = await listEventSummaries(db, { limit: 200 });
  const byCategory = new Map<string, typeof all>();
  for (const e of all) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category)!.push(e);
  }

  return (
    <div className="space-y-8">
      <SectionHeading label="Explore" title="Find your way in" />
      <div className="max-w-xl">
        <SearchBox size="lg" />
      </div>

      <section>
        <h2 className="label mb-2 border-b border-rule pb-1">By category</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EVENT_CATEGORIES.map((c) => {
            const list = byCategory.get(c) ?? [];
            return (
              <Link
                key={c}
                href={`/events?category=${c}`}
                className="card flex items-baseline justify-between p-3 hover:border-accent"
              >
                <span className="font-serif text-[15px] text-ink">{CATEGORY_LABEL[c]}</span>
                <span className="mono text-[12px] text-ink-3">{list.length}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="label mb-2 border-b border-rule pb-1">Quick views</h2>
        <ul className="ui grid gap-1.5 text-[13px] sm:grid-cols-2">
          <li><Link href="/events?sort=cgi_desc" className="link-quiet underline">Highest factual convergence →</Link></li>
          <li><Link href="/events?sort=cgi_asc" className="link-quiet underline">Most contested events →</Link></li>
          <li><Link href="/events?status=developing" className="link-quiet underline">Developing stories →</Link></li>
          <li><Link href="/evidence" className="link-quiet underline">Stories with primary documents →</Link></li>
          <li><Link href="/topics" className="link-quiet underline">All topics →</Link></li>
          <li><Link href="/sources" className="link-quiet underline">Source directory →</Link></li>
        </ul>
      </section>

      <section>
        <SectionHeading label="Recent" title="Latest across all categories" />
        <div className="divide-y divide-rule">
          {all.slice(0, 8).map((e) => (
            <EventCard key={e.id} event={e} compact />
          ))}
        </div>
      </section>
    </div>
  );
}
