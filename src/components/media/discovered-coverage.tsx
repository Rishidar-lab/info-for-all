import type { DiscoveredCoverageView } from "@/lib/live/discovery-view";

const LANG_LABEL: Record<string, string> = { ta: "Tamil", en: "English", unknown: "—" };

/**
 * v0.13 minimal discovery surface (PHASE 10).
 *
 * A compact reader-facing signal on stories where IFFA found additional
 * same-event coverage beyond the ingested reports. Clicking reveals the split:
 * originally ingested reports vs discovered reports, with publisher, language
 * and independence grouping. No provider internals, no "verified truth".
 */
export function DiscoveredCoverage({ view }: { view: DiscoveredCoverageView }) {
  const n = view.independent.length;
  const families = [...new Set(view.independent.map((r) => r.familyKey))].length;
  return (
    <details className="card p-4">
      <summary className="ui cursor-pointer text-[13px] font-semibold text-ink hover:text-accent">
        Coverage expanded by IFFA — {n} additional report{n === 1 ? "" : "s"} · {families} independent newsroom{families === 1 ? "" : "s"} found
      </summary>
      <p className="ui mt-2 text-[12px] leading-relaxed text-ink-3">
        IFFA searched wider reporting on this event and verified {n === 1 ? "this report describes" : "these reports describe"} the
        same event. They are shown separately from the {view.ingestedCount} originally ingested report{view.ingestedCount === 1 ? "" : "s"}.
        Same-event verification is conservative: uncertain matches are kept separate and never counted.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="label mb-1.5 text-[10px]">Originally ingested ({view.ingestedCount})</div>
          <p className="ui text-[12.5px] text-ink-2">
            {view.ingestedCount} report{view.ingestedCount === 1 ? "" : "s"} from IFFA&apos;s regular feeds — see Full coverage below.
          </p>
        </div>
        <div>
          <div className="label mb-1.5 text-[10px]">Discovered by IFFA ({view.all.length})</div>
          <ul className="flex flex-col gap-2">
            {view.all.map((r) => (
              <li key={r.canonicalUrl} className="ui text-[12.5px] leading-snug">
                <a href={r.canonicalUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                  {r.title}
                </a>
                <span className="mt-0.5 block text-[11.5px] text-ink-3">
                  {r.publisher} · {LANG_LABEL[r.language] ?? r.language}
                  {r.sourceType === "independent"
                    ? " · independent newsroom"
                    : r.sourceType === "wire"
                      ? " · wire copy — not independent corroboration"
                      : r.sourceType === "same-family"
                        ? " · same owner — not independent corroboration"
                        : r.sourceType === "syndication"
                          ? " · repost — not independent corroboration"
                          : r.sourceType === "official-primary"
                            ? " · official record — anchor, not corroboration"
                            : " · unregistered outlet — independence unresolved"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
