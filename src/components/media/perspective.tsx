import type { PerspectiveCompare } from "@/lib/brief/types";

/**
 * PERSPECTIVES — how coverage of this story differs across groups. Not a US
 * Left/Center/Right axis: language, locality, and official-vs-news, plus the
 * shared factual core. Political cohorts appear only when calibration allows.
 */
export function PerspectivePanel({ pc }: { pc: PerspectiveCompare }) {
  const rows: { label: string; items: string[] }[] = [
    { label: "Tamil-language media emphasises", items: pc.tamilMediaEmphasis },
    { label: "English-language media emphasises", items: pc.englishMediaEmphasis },
    { label: "Local / Tamil Nadu outlets emphasise", items: pc.localMediaEmphasis },
    { label: "National outlets emphasise", items: pc.nationalMediaEmphasis },
    { label: "Official / primary sources state", items: pc.officialSourcesEmphasis },
  ].filter((r) => r.items.length > 0);

  return (
    <section className="min-w-0">
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">Perspectives</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">How the coverage differs</h2>
      </div>

      {pc.sharedFactualCore.length > 0 && (
        <div className="card mb-4 border-l-2 border-agree bg-agree-bg/40 p-3.5">
          <div className="label mb-1.5 text-[10px] text-agree">Shared factual core</div>
          <ul className="flex flex-col gap-1 ui text-[13px] text-ink-2">
            {pc.sharedFactualCore.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-agree">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <p className="ui mt-1.5 text-[11px] text-ink-3">Facts every framing agrees on, from the corroborated-claim set.</p>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.label} className="border-l-2 border-rule-strong pl-3">
              <div className="label mb-1 text-[10px] text-ink-3">{r.label}</div>
              <ul className="flex flex-wrap gap-1.5">
                {r.items.map((it, i) => (
                  <li key={i} className="rounded bg-surface-2 px-2 py-0.5 ui text-[12px] text-ink-2">{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
          Not enough articles in more than one group to compare emphasis for this story.
        </p>
      )}

      {pc.insufficientDataReasons.length > 0 && (
        <div className="mt-4 border-t border-rule pt-3">
          <div className="label mb-1 text-[10px] text-ink-3">Not shown</div>
          <ul className="flex flex-col gap-1 ui text-[11.5px] text-ink-3">
            {pc.insufficientDataReasons.map((r, i) => (
              <li key={i}>· {r}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
