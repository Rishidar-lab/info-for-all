import type { BriefReference } from "@/lib/brief/types";

function fmt(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d) + " IST"
  );
}

/**
 * REFERENCES — external links as deeper reading / verification, not the primary
 * reading experience. Primary records first, then reporting, newest first.
 */
export function ReferencesPanel({ references }: { references: BriefReference[] }) {
  const primary = references.filter((r) => r.isPrimaryRecord);
  const news = references
    .filter((r) => !r.isPrimaryRecord)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

  return (
    <section className="min-w-0">
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">References</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">Deeper reading &amp; primary records ({references.length})</h2>
        <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
          Every source behind the brief. Open a link only to verify or to read the full report — the
          brief above is the primary reading experience.
        </p>
      </div>

      {primary.length > 0 && (
        <>
          <div className="label mb-1.5 text-[10px] text-evidence">Primary records</div>
          <ul className="mb-4 flex flex-col gap-2">
            {primary.map((r, i) => (
              <RefRow key={r.sourceId + i} r={r} />
            ))}
          </ul>
        </>
      )}

      <div className="label mb-1.5 text-[10px]">Reporting</div>
      <ul className="flex flex-col gap-2">
        {news.map((r, i) => (
          <RefRow key={r.sourceId + i} r={r} />
        ))}
      </ul>
    </section>
  );
}

function RefRow({ r }: { r: BriefReference }) {
  return (
    <li className="card min-w-0 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="ui text-[12.5px] font-semibold text-ink">{r.publisher}</span>
        <span className="pill bg-surface-2 text-ink-3">{r.roleLabel}</span>
        <span className="ui text-[10.5px] text-ink-3">
          {r.language === "ta" ? "தமிழ்" : r.language === "en" ? "English" : ""}
        </span>
        {r.publishedAt && <span className="ui text-[10.5px] text-ink-3">{fmt(r.publishedAt)}</span>}
      </div>
      <p className="mt-1 break-words font-serif text-[14px] leading-snug text-ink">{r.title}</p>
      {r.excerpt && (
        <p className="mt-1 border-l-2 border-rule pl-2 ui text-[12px] italic text-ink-2">&ldquo;{r.excerpt}&rdquo;</p>
      )}
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="ui mt-1.5 inline-block text-[12px] font-semibold text-accent hover:underline"
      >
        Read original ↗
      </a>
    </li>
  );
}
