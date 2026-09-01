import type { Metadata } from "next";
import Link from "next/link";
import { FEED_SOURCES } from "@/data/feeds";
import { dataset, istTimestamp } from "@/lib/live/dataset";

export const metadata: Metadata = {
  title: "Sources",
  description: "The public RSS / CAP feeds IFA ingests for the India / Tamil Nadu live edition, with their current status.",
};

const KIND_LABEL: Record<string, string> = {
  rss: "RSS",
  atom: "Atom",
  "sachet-json": "CAP / JSON",
};

export default function SourcesPage() {
  const statusById = new Map(dataset.feeds.map((f) => [f.sourceId, f]));

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Directory</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight sm:text-[36px]">Sources</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          IFA ingests publicly accessible RSS / Atom / CAP feeds. It stores only the feed&rsquo;s
          own headline, timestamp, short excerpt, canonical URL and structured alert metadata,
          always attributes the publisher, and always links out to the original report. It does
          not copy full articles or bypass access controls.
        </p>
        <p className="mt-3 ui text-[12px] text-ink-3">
          Feed status as of the last run — {istTimestamp(dataset.generatedAt)}.
        </p>
      </header>

      <div className="card w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
              <th className="px-4 py-2.5 font-semibold">Source</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {FEED_SOURCES.map((f) => {
              const st = statusById.get(f.id);
              const status = !f.enabled ? "disabled" : (st?.status ?? "not run");
              return (
                <tr key={f.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="ui text-[13.5px] font-semibold text-ink">{f.name}</div>
                    <a
                      href={f.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui text-[12px] text-accent hover:underline"
                    >
                      {new URL(f.homepage).hostname} <span aria-hidden>↗</span>
                    </a>
                    {f.note && <p className="mt-1 ui text-[11.5px] leading-snug text-ink-3">{f.note}</p>}
                  </td>
                  <td className="px-4 py-3 ui text-[12.5px] text-ink-2">{KIND_LABEL[f.kind] ?? f.kind}</td>
                  <td className="px-4 py-3 ui text-[12.5px] text-ink-2">
                    {f.official ? "Official / primary" : "Independent"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "ui text-[12px] font-semibold " +
                        (status === "ok"
                          ? "text-agree"
                          : status === "stale"
                            ? "text-caution"
                            : status === "disabled"
                              ? "text-ink-3"
                              : "text-dispute")
                      }
                    >
                      {status === "ok" ? "responding" : status}
                    </span>
                    {st?.error && status !== "ok" && (
                      <p className="mt-0.5 ui text-[11px] text-ink-3">{st.error}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 mono text-[13px] text-ink">{st?.itemCount ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="ui text-[12.5px] text-ink-3">
        Evidence-role and verification labels are explained in the{" "}
        <Link href="/about" className="text-accent hover:underline">methodology</Link>. Synthetic
        publications used only in the{" "}
        <Link href="/methodology/examples" className="text-accent hover:underline">
          methodology demonstrations
        </Link>{" "}
        are listed there, not here.
      </p>
    </div>
  );
}
