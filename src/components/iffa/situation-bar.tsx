import Link from "next/link";
import { SITUATION_LABEL, type SituationLevel } from "@/lib/trends/types";
import { situation } from "@/lib/live/trends-view";
import { cn } from "@/lib/format";

const TONE: Record<SituationLevel, string> = {
  normal: "text-agree bg-agree-bg border-agree/35",
  watch: "text-caution bg-caution-bg border-caution/40",
  elevated: "text-caution bg-caution-bg border-caution/55",
  crisis: "text-dispute bg-dispute-bg border-dispute/55",
};

function Reading({ label, level }: { label: string; level: SituationLevel }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-1", TONE[level])}>
      <span className="ui text-[10.5px] font-semibold uppercase tracking-wider">{label}</span>
      <span className="ui text-[12px] font-bold">{SITUATION_LABEL[level]}</span>
    </span>
  );
}

/** Current Situation strip — derived from active event signals only. */
export function SituationBar() {
  const s = situation();
  if (!s) return null;
  const anyRaised = s.tamilNadu !== "normal" || s.india !== "normal";

  return (
    <section className="card p-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="label">Current situation</span>
        <Reading label="Tamil Nadu" level={s.tamilNadu} />
        <Reading label="India" level={s.india} />
        <span className="grow" />
        <span className="ui text-[11px] text-ink-3">Derived from active events — not an official alert level.</span>
      </div>
      {anyRaised && s.derivedFrom.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1 border-t border-rule pt-2">
          {s.derivedFrom.slice(0, 4).map((d) => (
            <li key={d.slug} className="ui text-[12px] leading-snug text-ink-2">
              <span
                className={cn(
                  "mr-1.5 font-semibold uppercase",
                  d.level === "crisis" ? "text-dispute" : d.level === "elevated" ? "text-caution" : "text-caution",
                )}
              >
                {SITUATION_LABEL[d.level as SituationLevel]}
              </span>
              <Link href={`/story/${d.slug}/`} className="text-ink hover:text-accent hover:underline">
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
