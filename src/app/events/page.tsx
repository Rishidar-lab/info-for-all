import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { listEventSummaries } from "@/lib/domain/events";
import { EVENT_CATEGORIES, EVENT_STATUSES } from "@/lib/domain/types";
import { CATEGORY_LABEL, labelize } from "@/lib/ui";
import { EventCardList } from "@/components/event-card";
import { SectionHeading } from "@/components/primitives";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Events" };

const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "cgi_desc", label: "Highest CGI" },
  { value: "cgi_asc", label: "Lowest CGI" },
  { value: "sources", label: "Most sources" },
] as const;

function FilterLink({
  params,
  active,
  children,
}: {
  params: Record<string, string | undefined>;
  active: boolean;
  children: React.ReactNode;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const href = qs.toString() ? `/events?${qs}` : "/events";
  return (
    <Link
      href={href}
      className={`ui border px-2 py-0.5 text-[12px] ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-rule text-ink-2 hover:border-rule-strong"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const category = first(sp.category);
  const status = first(sp.status);
  const sort = (first(sp.sort) ?? "recent") as (typeof SORTS)[number]["value"];

  const events = await listEventSummaries(db, {
    category,
    status,
    sort: sort as "recent" | "cgi_desc" | "cgi_asc" | "sources",
    limit: 100,
  });

  const base = { category, status, sort: sort === "recent" ? undefined : sort };

  return (
    <div className="space-y-6">
      <SectionHeading label="Events" title="All event clusters" note={`${events.length} shown`} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label mr-1">Category</span>
          <FilterLink params={{ ...base, category: undefined }} active={!category}>All</FilterLink>
          {EVENT_CATEGORIES.map((c) => (
            <FilterLink key={c} params={{ ...base, category: c }} active={category === c}>
              {CATEGORY_LABEL[c] ?? c}
            </FilterLink>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label mr-1">Status</span>
          <FilterLink params={{ ...base, status: undefined }} active={!status}>All</FilterLink>
          {EVENT_STATUSES.map((s) => (
            <FilterLink key={s} params={{ ...base, status: s }} active={status === s}>
              {labelize(s)}
            </FilterLink>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label mr-1">Sort</span>
          {SORTS.map((s) => (
            <FilterLink
              key={s.value}
              params={{ category, status, sort: s.value === "recent" ? undefined : s.value }}
              active={sort === s.value}
            >
              {s.label}
            </FilterLink>
          ))}
        </div>
      </div>

      <EventCardList events={events} />
    </div>
  );
}
