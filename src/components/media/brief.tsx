"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/format";
import type {
  BriefDisagreement,
  BriefReference,
  BriefSentence,
  BriefUncertainty,
  IFFABrief,
} from "@/lib/brief/types";
import { SUPPORT_LABEL, WITHHOLD_LABEL } from "@/lib/brief/labels";

/** Ordered, de-duplicated citation list — the [n] a reader sees. */
function citationOrder(brief: IFFABrief): { ref: BriefReference; n: number }[] {
  const seen = new Map<string, number>();
  const out: { ref: BriefReference; n: number }[] = [];
  const groups: BriefSentence[][] = [brief.shortVersion, brief.keyFacts, brief.whyItMatters, brief.whatChanged];
  const idToRef = new Map(brief.references.map((r) => [r.sourceId, r]));
  for (const group of groups) {
    for (const s of group) {
      for (const id of [...s.citations.sourceIds, ...s.citations.evidenceIds]) {
        if (seen.has(id) || !idToRef.has(id)) continue;
        seen.set(id, out.length + 1);
        out.push({ ref: idToRef.get(id)!, n: out.length + 1 });
      }
    }
  }
  // any remaining references (not cited by a surviving sentence) come after
  for (const r of brief.references) {
    if (!seen.has(r.sourceId)) {
      seen.set(r.sourceId, out.length + 1);
      out.push({ ref: r, n: out.length + 1 });
    }
  }
  return out;
}

function fmt(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d) + " IST";
}

export function Brief({ brief, tamil }: { brief: IFFABrief; tamil?: IFFABrief | null }) {
  const [lang, setLang] = useState<"en" | "ta">("en");
  const active = lang === "ta" && tamil ? tamil : brief;
  const order = useMemo(() => citationOrder(brief), [brief]);
  const numById = useMemo(() => new Map(order.map((o) => [o.ref.sourceId, o.n])), [order]);
  const [openRef, setOpenRef] = useState<number | null>(null);

  const nums = (s: BriefSentence): number[] =>
    [...new Set([...s.citations.sourceIds, ...s.citations.evidenceIds].map((id) => numById.get(id)).filter((n): n is number => !!n))].sort((a, b) => a - b);

  const openRefData = openRef ? order.find((o) => o.n === openRef)?.ref : undefined;

  return (
    <section aria-label="IFFA Brief" className="card border-l-2 border-accent p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="label text-[10px]">IFFA Brief</div>
        {tamil && !tamil.withheldReason && (
          <div className="flex gap-1 ui text-[11px]">
            <button onClick={() => setLang("en")} className={cn("rounded px-2 py-0.5", lang === "en" ? "bg-accent/15 font-semibold text-accent" : "text-ink-3 hover:text-ink")}>English</button>
            <button onClick={() => setLang("ta")} className={cn("rounded px-2 py-0.5", lang === "ta" ? "bg-accent/15 font-semibold text-accent" : "text-ink-3 hover:text-ink")}>தமிழ்</button>
          </div>
        )}
      </div>

      {active.withheldReason ? (
        <div className="rounded bg-surface-2 p-3">
          <p className="ui text-[13px] font-semibold text-ink">
            {lang === "ta" ? "தமிழ் சுருக்கம் இன்னும் தயாராகவில்லை" : "IFFA Brief not yet available"}
          </p>
          <p className="ui mt-1 text-[12.5px] text-ink-2">{active.withheldDetail ?? WITHHOLD_LABEL[active.withheldReason]}</p>
          <p className="ui mt-1.5 text-[11px] text-ink-3">
            Coverage and every source are listed below. A brief is written only when the evidence supports one — it is never padded.
          </p>
        </div>
      ) : (
        <>
          <div className="label mb-1.5 text-[10px] text-ink-3">The short version</div>
          <div className="flex flex-col gap-2">
            {active.shortVersion.map((s) => (
              <p key={s.id} className="font-serif text-[15.5px] leading-relaxed text-ink">
                {s.text} <Cites nums={nums(s)} onOpen={setOpenRef} support={s.support} />
              </p>
            ))}
          </div>

          {active.keyFacts.length > 0 && (
            <Group title="Key facts" mark="✓" markClass="text-agree">
              {active.keyFacts.map((s) => (
                <li key={s.id} className="flex gap-2">
                  <span aria-hidden className="mt-0.5 shrink-0 text-agree">✓</span>
                  <span className="text-[13px] leading-relaxed text-ink-2">
                    {s.attributedTo && !new RegExp(escapeRe(s.attributedTo), "i").test(s.text) && (
                      <span className="text-ink-3">{titleCase(s.attributedTo)}: </span>
                    )}
                    {s.text} <Cites nums={nums(s)} onOpen={setOpenRef} support={s.support} />
                  </span>
                </li>
              ))}
            </Group>
          )}

          {active.uncertainties.length > 0 && (
            <Group title="Developing / uncertain" mark="?" markClass="text-caution">
              {active.uncertainties.map((u: BriefUncertainty) => (
                <li key={u.id} className="flex gap-2">
                  <span aria-hidden className="mt-0.5 shrink-0 text-caution">?</span>
                  <span className="text-[13px] leading-relaxed text-ink-2">{u.text}</span>
                </li>
              ))}
            </Group>
          )}

          {active.whyItMatters.length > 0 && (
            <Group title="Why it matters" mark="→" markClass="text-ink-3">
              {active.whyItMatters.map((s) => (
                <li key={s.id} className="flex gap-2">
                  <span aria-hidden className="mt-0.5 shrink-0 text-ink-3">→</span>
                  <span className="text-[13px] leading-relaxed text-ink-2">
                    {s.text} <Cites nums={nums(s)} onOpen={setOpenRef} support={s.support} />
                  </span>
                </li>
              ))}
            </Group>
          )}

          {active.whatChanged.length > 0 && (
            <Group title="What changed" mark="↻" markClass="text-accent">
              {active.whatChanged.map((s) => (
                <li key={s.id} className="flex gap-2">
                  <span aria-hidden className="mt-0.5 shrink-0 text-accent">↻</span>
                  <span className="text-[13px] leading-relaxed text-ink-2">
                    {s.text} <Cites nums={nums(s)} onOpen={setOpenRef} support={s.support} />
                  </span>
                </li>
              ))}
            </Group>
          )}
        </>
      )}

      {active.disagreements.length > 0 && (
        <div className="mt-4 border-t border-rule pt-3">
          <div className="label mb-1.5 text-[10px] text-dispute">Where sources disagree</div>
          <div className="flex flex-col gap-3">
            {active.disagreements.map((d, i) => (
              <Disagreement key={i} d={d} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 border-t border-rule pt-2.5 ui text-[11px] leading-relaxed text-ink-3">
        IFFA synthesises this brief from the reporting and primary records listed below. Every factual
        statement is linked to its evidence; a sentence that cannot be traced to a source is dropped
        before publication. {brief.verification.sentencesDropped > 0 && `${brief.verification.sentencesDropped} sentence(s) were dropped by that check. `}
        This is a synthesis of what the sources say — not a verdict on whether every claim is true.
      </p>

      {openRefData && <RefCard ref_={openRefData} n={openRef!} onClose={() => setOpenRef(null)} />}
    </section>
  );
}

function Group({ title, children }: { title: string; mark: string; markClass: string; children: React.ReactNode }) {
  return (
    <div className="mt-3.5">
      <div className="label mb-1 text-[10px] text-ink-3">{title}</div>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

function Cites({ nums, onOpen, support }: { nums: number[]; onOpen: (n: number) => void; support: string }) {
  return (
    <span className="whitespace-nowrap align-baseline">
      {nums.map((n) => (
        <button
          key={n}
          onClick={() => onOpen(n)}
          title={SUPPORT_LABEL[support as keyof typeof SUPPORT_LABEL] ?? "source"}
          className="ml-0.5 rounded-sm bg-surface-2 px-1 text-[10px] font-semibold text-accent align-super leading-none hover:bg-accent/15"
        >
          {n}
        </button>
      ))}
      {support === "LIMITED" && <span className="ml-1 align-super text-[9px] font-semibold uppercase text-caution">1 src</span>}
      {support === "DISPUTED" && <span className="ml-1 align-super text-[9px] font-semibold uppercase text-dispute">disputed</span>}
    </span>
  );
}

function Disagreement({ d }: { d: BriefDisagreement }) {
  return (
    <div className="rounded bg-dispute-bg/40 p-3 ui text-[12.5px]">
      <div className="mb-1 font-semibold uppercase tracking-wide text-ink-2">{d.topic.replace(/_/g, " ")}</div>
      <div className="flex flex-col gap-1">
        {d.positions.map((p, i) => (
          <div key={i} className="flex flex-wrap items-baseline gap-x-2">
            <span className="mono font-semibold text-ink">{p.value}</span>
            <span className="text-ink-3">{p.publishers.join(", ") || "—"}</span>
            {p.at && <span className="text-ink-3">· {fmt(p.at)}</span>}
          </div>
        ))}
      </div>
      {d.bestSupported && (
        <p className="mt-1.5 text-ink-2">
          <span className="font-semibold text-ink">Currently best-supported: {d.bestSupported}</span> — {d.reasoning}
        </p>
      )}
      {!d.bestSupported && d.reasoning && <p className="mt-1.5 text-ink-2">{d.reasoning}</p>}
      <p className="mt-1 text-[11px] text-ink-3">&ldquo;Best-supported&rdquo; is not a guarantee of truth. Earlier figures stay on the timeline.</p>
    </div>
  );
}

function RefCard({ ref_, n, onClose }: { ref_: BriefReference; n: number; onClose: () => void }) {
  return (
    <div className="mt-3 rounded border border-accent/40 bg-surface-2 p-3">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-accent/15 px-1.5 text-[11px] font-semibold text-accent">{n}</span>
          <span className="ui text-[12px] font-semibold text-ink">{ref_.publisher}</span>
          <span className="pill bg-surface text-ink-3">{ref_.roleLabel}</span>
          <span className="ui text-[10.5px] text-ink-3">{ref_.language === "ta" ? "தமிழ்" : ref_.language === "en" ? "English" : ""}</span>
        </div>
        <button onClick={onClose} aria-label="Close" className="ui shrink-0 text-[13px] text-ink-3 hover:text-accent">✕</button>
      </div>
      <p className="ui text-[13px] leading-snug text-ink">{ref_.title}</p>
      {ref_.publishedAt && <p className="ui mt-0.5 text-[11px] text-ink-3">{fmt(ref_.publishedAt)}</p>}
      {ref_.excerpt && <p className="mt-1.5 border-l-2 border-rule pl-2 ui text-[12px] italic text-ink-2">&ldquo;{ref_.excerpt}&rdquo;</p>}
      {ref_.supportsClaimIds.length > 0 && (
        <p className="ui mt-1 text-[11px] text-ink-3">Supports {ref_.supportsClaimIds.length} claim{ref_.supportsClaimIds.length === 1 ? "" : "s"} in this brief.</p>
      )}
      <a href={ref_.url} target="_blank" rel="noopener noreferrer" className="ui mt-1.5 inline-block text-[12px] font-semibold text-accent hover:underline">
        Read original ↗
      </a>
    </div>
  );
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
