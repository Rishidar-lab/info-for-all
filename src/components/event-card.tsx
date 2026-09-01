import Link from "next/link";
import type { EventSummaryView } from "@/lib/domain/view";
import { CATEGORY_LABEL } from "@/lib/ui";
import { relativeTime } from "@/lib/format";
import { CgiBadge } from "./primitives";

export function EventCard({ event, compact = false }: { event: EventSummaryView; compact?: boolean }) {
  return (
    <article className="group py-4">
      <div className="flex items-center gap-2">
        <span className="label">{CATEGORY_LABEL[event.category] ?? event.category}</span>
        {event.status === "developing" && (
          <span className="pill text-caution bg-caution-bg">Developing</span>
        )}
        <span className="ui text-[11px] text-ink-3">· updated {relativeTime(event.latestUpdateAt)}</span>
      </div>

      <h3 className="mt-1 font-serif text-[19px] font-semibold leading-snug">
        <Link href={`/events/${event.slug}`} className="link-quiet group-hover:text-accent">
          {event.title}
        </Link>
      </h3>

      {!compact && (
        <p className="prose-measure mt-1 text-[14.5px] text-ink-2">{event.summary}</p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 ui text-[12px] text-ink-3">
        {event.cgi && <CgiBadge score={event.cgi.score} band={event.cgi.band} size="sm" />}
        <span className="mono">{event.sourceCount} sources</span>
        <span className="mono">{event.articleCount} reports</span>
        {event.corroboratedClaimCount > 0 && (
          <span className="text-agree">✓ {event.corroboratedClaimCount} corroborated</span>
        )}
        {event.disputedClaimCount > 0 && (
          <span className="text-dispute">⚠ {event.disputedClaimCount} disputed</span>
        )}
        {event.primaryEvidenceCount > 0 && (
          <span className="text-evidence">▣ {event.primaryEvidenceCount} primary</span>
        )}
      </div>
    </article>
  );
}

export function EventCardList({ events }: { events: EventSummaryView[] }) {
  if (events.length === 0) {
    return <p className="ui py-6 text-[13px] text-ink-3">No events match.</p>;
  }
  return (
    <div className="divide-y divide-rule">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
