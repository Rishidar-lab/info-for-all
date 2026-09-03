"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/format";

export interface FullCoverageRow {
  articleId: string;
  publisher: string;
  publisherSlug: string;
  headline: string;
  publishedAt: string;
  language: "ta" | "en" | "unknown";
  locality: string;
  sourceFamily: string;
  ownership: string;
  externalFactuality: string;
  observedAlignment: string;
  stance: string;
  role: "official" | "independent" | "specialist";
  url: string;
}

type SortKey = "latest" | "oldest" | "publisher" | "ownership" | "locality";

function fmt(iso: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) + " IST"
  );
}

function Sel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: [string, string][] }) {
  return (
    <label className="ui flex items-center gap-1 text-[11.5px] text-ink-3">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-rule bg-surface px-1.5 py-0.5 text-[11.5px] text-ink"
      >
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FullCoverage({ rows }: { rows: FullCoverageRow[] }) {
  const [sort, setSort] = useState<SortKey>("latest");
  const [lang, setLang] = useState<"all" | "ta" | "en">("all");
  const [role, setRole] = useState<"all" | "official" | "independent">("all");
  const [owner, setOwner] = useState<string>("all");

  const owners = useMemo(() => [...new Set(rows.map((r) => r.ownership))].sort(), [rows]);

  const view = useMemo(() => {
    let v = rows.filter(
      (r) =>
        (lang === "all" || r.language === lang) &&
        (role === "all" || (role === "official" ? r.role === "official" : r.role !== "official")) &&
        (owner === "all" || r.ownership === owner),
    );
    v = [...v].sort((a, b) => {
      if (sort === "latest") return b.publishedAt.localeCompare(a.publishedAt);
      if (sort === "oldest") return a.publishedAt.localeCompare(b.publishedAt);
      if (sort === "publisher") return a.publisher.localeCompare(b.publisher);
      if (sort === "ownership") return a.ownership.localeCompare(b.ownership);
      return a.locality.localeCompare(b.locality);
    });
    return v;
  }, [rows, sort, lang, role, owner]);

  return (
    <section className="min-w-0">
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">Full coverage</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">Every report in this story ({rows.length})</h2>
        <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
          Only the feed headline, timestamp and a short excerpt are stored — follow each link for the full
          report. Ownership and alignment are from the source directory.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        <Sel label="Sort" value={sort} onChange={(v) => setSort(v as SortKey)} opts={[["latest", "Latest"], ["oldest", "Oldest"], ["publisher", "Publisher"], ["ownership", "Ownership"], ["locality", "Locality"]]} />
        <Sel label="Language" value={lang} onChange={(v) => setLang(v as never)} opts={[["all", "All"], ["en", "English"], ["ta", "Tamil"]]} />
        <Sel label="Type" value={role} onChange={(v) => setRole(v as never)} opts={[["all", "All"], ["official", "Official"], ["independent", "News"]]} />
        <Sel label="Ownership" value={owner} onChange={setOwner} opts={[["all", "All"], ...owners.map((o) => [o, o.replace(/_/g, " ").toLowerCase()] as [string, string])]} />
      </div>

      <ul className="flex flex-col gap-2.5">
        {view.map((r) => (
          <li key={r.articleId} className="card min-w-0 p-3.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <a href={`/source/${r.publisherSlug}`} className="ui text-[13px] font-semibold text-ink hover:text-accent">
                {r.publisher}
              </a>
              <span className="ui text-[10.5px] text-ink-3">{r.language === "ta" ? "தமிழ்" : r.language === "en" ? "English" : "—"}</span>
              {r.role === "official" && <span className="pill bg-dispute-bg text-dispute">Official</span>}
              <span className="grow" />
              <span
                className={cn(
                  "pill",
                  r.stance === "supportive" ? "bg-caution-bg text-caution" : r.stance === "critical" ? "bg-dispute-bg text-dispute" : "bg-surface-2 text-ink-3",
                )}
              >
                {r.stance}
              </span>
            </div>
            <h3 className="mt-1.5 break-words font-serif text-[14.5px] leading-snug text-ink">{r.headline}</h3>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 ui text-[11px] text-ink-3">
              <span>{fmt(r.publishedAt)}</span>
              <span>Owner: {r.ownership.replace(/_/g, " ").toLowerCase()}</span>
              <span>Family: {r.sourceFamily}</span>
              <span>Locality: {r.locality}</span>
              <span>Ext. factuality: {r.externalFactuality}</span>
              <span>Observed alignment: {r.observedAlignment}</span>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                Open ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
