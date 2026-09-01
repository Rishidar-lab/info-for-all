import type { Metadata } from "next";
import { SOURCES, PERSPECTIVE_NOTE, RELIABILITY_NOTE } from "@/data/demo";
import { PERSPECTIVE_LABEL, RELIABILITY_LABEL, hostname } from "@/lib/ifa";
import { PerspectiveBadge, ReliabilityBadge } from "@/components/ifa/badges";
import { DemoNotice } from "@/components/ifa/demo-notice";

export const metadata: Metadata = {
  title: "Sources",
  description:
    "The demonstration publications used in IFA examples, with editorial perspective, reliability, region and description.",
};

export default function SourcesPage() {
  const sorted = [...SOURCES].sort((a, b) =>
    a.publication.localeCompare(b.publication),
  );

  const counts = {
    left: SOURCES.filter((s) => s.perspective === "left").length,
    center: SOURCES.filter((s) => s.perspective === "center").length,
    right: SOURCES.filter((s) => s.perspective === "right").length,
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Directory</p>
        <h1 className="mt-2 font-serif text-[32px] leading-tight tracking-tight sm:text-[38px]">
          Sources
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
          The publications that appear in IFA&rsquo;s comparison examples. Each entry lists a
          broad editorial perspective and a separate reliability indicator, alongside region and
          a short description.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 ui text-[12px] text-ink-3">
          <span>
            <strong className="mono text-ink">{SOURCES.length}</strong> publications
          </span>
          <span>
            {PERSPECTIVE_LABEL.left} <strong className="mono text-ink">{counts.left}</strong> ·{" "}
            {PERSPECTIVE_LABEL.center}{" "}
            <strong className="mono text-ink">{counts.center}</strong> ·{" "}
            {PERSPECTIVE_LABEL.right}{" "}
            <strong className="mono text-ink">{counts.right}</strong>
          </span>
        </div>
      </header>

      <DemoNotice />

      <div className="grid gap-3">
        <p className="ui text-[12px] leading-relaxed text-ink-3">
          {PERSPECTIVE_NOTE} {RELIABILITY_NOTE}
        </p>

        {/* Desktop table */}
        <div className="card hidden overflow-hidden md:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Publication</th>
                <th className="px-4 py-2.5 font-semibold">Perspective</th>
                <th className="px-4 py-2.5 font-semibold">Reliability</th>
                <th className="px-4 py-2.5 font-semibold">Region</th>
                <th className="px-4 py-2.5 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {sorted.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="ui text-[13.5px] font-semibold text-ink">
                      {s.publication}
                    </div>
                    <a
                      href={s.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui text-[12px] text-accent hover:underline"
                    >
                      {hostname(s.website)} <span aria-hidden>↗</span>
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="ui text-[13px] text-ink-2">
                      {PERSPECTIVE_LABEL[s.perspective]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="ui text-[13px] text-ink-2">
                      {RELIABILITY_LABEL[s.reliability]}
                    </span>
                  </td>
                  <td className="px-4 py-3 ui text-[13px] text-ink-2">{s.region}</td>
                  <td className="px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">
                    {s.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {sorted.map((s) => (
            <article key={s.id} className="card p-4">
              <div className="ui text-[15px] font-semibold text-ink">{s.publication}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <PerspectiveBadge perspective={s.perspective} />
                <ReliabilityBadge reliability={s.reliability} />
              </div>
              <dl className="mt-3 grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 ui text-[13px]">
                <dt className="text-ink-3">Region</dt>
                <dd className="text-ink-2">{s.region}</dd>
                <dt className="text-ink-3">Website</dt>
                <dd>
                  <a
                    href={s.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {hostname(s.website)} <span aria-hidden>↗</span>
                  </a>
                </dd>
              </dl>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{s.description}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
