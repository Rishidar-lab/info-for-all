import Link from "next/link";
import { db } from "@/lib/db";
import { getHomeSections } from "@/lib/domain/events";
import { EventCard, EventCardList } from "@/components/event-card";
import { SectionHeading } from "@/components/primitives";
import { SearchBox } from "@/components/search-box";
import type { EventSummaryView } from "@/lib/domain/view";

export const dynamic = "force-dynamic";

function Column({
  label,
  title,
  events,
  href,
  empty,
}: {
  label: string;
  title: string;
  events: EventSummaryView[];
  href: string;
  empty: string;
}) {
  return (
    <section>
      <SectionHeading label={label} title={title} note={<Link href={href} className="hover:underline">more →</Link>} />
      {events.length === 0 ? (
        <p className="ui py-3 text-[13px] text-ink-3">{empty}</p>
      ) : (
        <div className="divide-y divide-rule">
          {events.map((e) => (
            <EventCard key={e.id} event={e} compact />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function HomePage() {
  const sections = await getHomeSections(db);

  return (
    <div className="space-y-10">
      <section className="border-b border-rule-strong pb-8">
        <h1 className="font-serif text-[34px] font-semibold leading-tight tracking-tight sm:text-[40px]">
          Info For All
        </h1>
        <p className="mt-2 max-w-2xl font-serif text-[17px] text-ink-2">
          Evidence-first news intelligence. For any event, IFA lays out what happened, who is
          reporting it, which claims are independently corroborated, where sources disagree, and what
          is supported by primary evidence.
        </p>
        <div className="mt-5 max-w-xl">
          <SearchBox size="lg" />
        </div>
      </section>

      <section>
        <SectionHeading
          label="Top stories"
          title="Current event clusters"
          note={<Link href="/events" className="hover:underline">all events →</Link>}
        />
        <EventCardList events={sections.topStories} />
      </section>

      <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
        <Column
          label="High agreement"
          title="Strong factual convergence"
          events={sections.highAgreement}
          href="/events?sort=cgi_desc"
          empty="No events currently above CGI 75."
        />
        <Column
          label="High disagreement"
          title="Significant contradictions"
          events={sections.highDisagreement}
          href="/events?sort=cgi_asc"
          empty="No contested events right now."
        />
        <Column
          label="Developing"
          title="Fast-changing stories"
          events={sections.developing}
          href="/events?status=developing"
          empty="Nothing marked developing."
        />
        <Column
          label="Primary evidence available"
          title="Stories with primary documents"
          events={sections.primaryEvidenceAvailable}
          href="/evidence"
          empty="No primary documents located yet."
        />
      </div>
    </div>
  );
}
