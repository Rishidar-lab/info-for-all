"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/format";

export interface CompareRow {
  id: string;
  name: string;
  ownership: string;
  parent: string;
  funding: string;
  family: string;
  articles: number;
  politicalArticles: number;
  sensationalism: number | null;
  primarySourceUsage: number | null;
  topics: string[];
  topEntities: { name: string; n: number; supportive: number; critical: number }[];
  externalRatings: number;
}

export function SourceCompare({ rows }: { rows: CompareRow[] }) {
  const [picked, setPicked] = useState<string[]>(rows.slice(0, 2).map((r) => r.id));
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]));
  const sel = rows.filter((r) => picked.includes(r.id));

  const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => toggle(r.id)}
            className={cn(
              "rounded border px-2 py-1 ui text-[11.5px]",
              picked.includes(r.id) ? "border-accent bg-accent/10 text-ink" : "border-rule text-ink-3 hover:text-ink-2",
            )}
          >
            {r.name}
          </button>
        ))}
      </div>

      {sel.length >= 2 ? (
        <div className="mt-4 card w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <tbody className="divide-y divide-rule ui text-[12.5px]">
              <Line k="Publisher" cells={sel.map((r) => (
                <Link key={r.id} href={`/source/${r.id}`} className="font-semibold text-ink hover:text-accent">{r.name}</Link>
              ))} />
              <Line k="Ownership" cells={sel.map((r) => <span key={r.id}>{r.ownership}</span>)} />
              <Line k="Ultimate parent" cells={sel.map((r) => <span key={r.id}>{r.parent}</span>)} />
              <Line k="Funding" cells={sel.map((r) => <span key={r.id}>{r.funding}</span>)} />
              <Line k="Source family" cells={sel.map((r) => <span key={r.id} className="text-ink-3">{r.family}</span>)} />
              <Line k="Articles (snapshot)" cells={sel.map((r) => <span key={r.id} className="mono">{r.articles}</span>)} />
              <Line k="Political stories" cells={sel.map((r) => <span key={r.id} className="mono">{r.politicalArticles}</span>)} />
              <Line k="Headline sensationalism" cells={sel.map((r) => <span key={r.id} className="mono">{pct(r.sensationalism)}</span>)} />
              <Line k="Primary-source usage" cells={sel.map((r) => <span key={r.id} className="mono">{pct(r.primarySourceUsage)}</span>)} />
              <Line k="Topics" cells={sel.map((r) => <span key={r.id} className="text-ink-2">{r.topics.join(" · ") || "—"}</span>)} />
              <Line
                k="Entity stance (n; supportive/critical)"
                cells={sel.map((r) => (
                  <span key={r.id} className="text-ink-2">
                    {r.topEntities.length
                      ? r.topEntities.map((e) => `${e.name}: n${e.n} ${e.supportive}/${e.critical}`).join("; ")
                      : "insufficient data"}
                  </span>
                ))}
              />
              <Line k="External ratings on record" cells={sel.map((r) => <span key={r.id} className="mono">{r.externalRatings}</span>)} />
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 ui text-[13px] text-ink-3">Pick at least two publishers to compare.</p>
      )}
      <p className="ui mt-3 text-[11px] text-ink-3">
        Entity-stance percentages with a small n are indicative only — see the per-source profile for the sample band.
      </p>
    </div>
  );
}

function Line({ k, cells }: { k: string; cells: React.ReactNode[] }) {
  return (
    <tr className="align-top">
      <th className="w-[190px] px-3 py-2 text-left font-semibold text-ink-3">{k}</th>
      {cells.map((c, i) => (
        <td key={i} className="px-3 py-2">
          {c}
        </td>
      ))}
    </tr>
  );
}
