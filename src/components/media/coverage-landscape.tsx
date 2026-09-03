import Link from "next/link";
import type { CoverageLandscape } from "@/lib/media-landscape/types";
import { AlignmentBar } from "./alignment-bar";

function Dist({ title, data, hint }: { title: string; data: Record<string, number>; hint?: string }) {
  const entries = Object.entries(data)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
  if (!entries.length) return null;
  return (
    <div>
      <div className="label mb-1 text-[10px]">{title}</div>
      <ul className="flex flex-col gap-1">
        {entries.map(([k, n]) => (
          <li key={k} className="ui text-[12px] text-ink-2">
            <span className="mono text-ink">{n}</span>{" "}
            <span className="text-ink-3">({Math.round((n / total) * 100)}%)</span> {k.replace(/_/g, " ").toLowerCase()}
          </li>
        ))}
      </ul>
      {hint && <p className="ui mt-1 text-[10.5px] text-ink-3">{hint}</p>}
    </div>
  );
}

/** The "COVERAGE LANDSCAPE" panel on the story page. */
export function CoverageLandscapePanel({ cov }: { cov: CoverageLandscape }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">Coverage landscape</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">Who is covering this — and how it breaks down</h2>
        <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
          Straight counts over the reports in this cluster. Publication count is not corroboration count —
          the independent-source-family number is what matters.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["Reports", cov.totalArticles],
          ["Publishers", cov.uniquePublishers],
          ["Independent families", cov.independentSourceFamilies],
          ["Official / primary", cov.officialCount],
          ["Tamil-language", cov.tamilCount],
          ["English-language", cov.englishCount],
          ["Regional / TN outlets", cov.regionalCount],
          ["National outlets", cov.nationalCount],
        ].map(([k, v]) => (
          <div key={k as string} className="card p-3">
            <div className="mono text-[18px] font-semibold text-ink">{v as number}</div>
            <div className="ui text-[10.5px] leading-snug text-ink-3">{k as string}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 card p-4">
        <div className="label mb-1.5 text-[10px]">Coverage alignment (this story)</div>
        <AlignmentBar groups={cov.alignment} reason={cov.alignmentUnavailableReason} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Dist
          title="By owning-entity category"
          data={cov.ownershipDistribution}
          hint="Ownership is metadata — it does not determine alignment."
        />
        <Dist
          title="By external-factuality rating"
          data={cov.reliabilityDistribution}
          hint={
            Object.keys(cov.reliabilityDistribution).join() === "unrated"
              ? "No external rating provider is integrated yet — shown as unrated rather than guessed."
              : undefined
          }
        />
        <Dist title="By locality" data={cov.localityDistribution} />
      </div>

      <p className="ui mt-3 text-[11px] text-ink-3">
        Per-publisher ownership, funding and observed metrics:{" "}
        <Link href="/sources" className="text-accent hover:underline">the source directory</Link>.
      </p>
    </section>
  );
}
