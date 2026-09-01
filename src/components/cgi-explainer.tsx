import Link from "next/link";
import type { CgiView } from "@/lib/domain/view";
import { BAND_STYLE } from "@/lib/ui";
import { cn, formatDateTime } from "@/lib/format";
import { CgiBadge } from "./primitives";

export function CgiExplainer({ cgi }: { cgi: CgiView }) {
  const style = BAND_STYLE[cgi.band];
  const maxAbs = Math.max(1, ...cgi.components.map((c) => Math.abs(c.contribution)));

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CgiBadge score={cgi.score} band={cgi.band} size="lg" />
          <div>
            <p className={cn("ui text-[13px] font-semibold", style.text)}>{cgi.bandLabel}</p>
            <p className="ui text-[11px] text-ink-3">
              Common Ground Index · {cgi.formulaVersion} · computed {formatDateTime(cgi.computedAt)}
            </p>
          </div>
        </div>
      </div>

      <p className="prose-measure mt-3 text-[14px] text-ink-2">
        The CGI estimates how far <em>independently sourced</em> reporting converges on this event&rsquo;s
        core factual claims. It is not a truth score and not a political-balance score. Every point is
        attributable to a component below.
      </p>

      <div className="mt-4">
        <div className="label mb-2">How this score was built</div>
        <table className="w-full ui text-[12.5px]">
          <thead>
            <tr className="label border-b border-rule text-left">
              <th className="py-1 font-semibold">Component</th>
              <th className="py-1 pr-2 text-right font-semibold">Raw</th>
              <th className="py-1 pr-2 text-right font-semibold">Weight</th>
              <th className="py-1 pr-2 text-right font-semibold">Points</th>
              <th className="hidden py-1 font-semibold sm:table-cell"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule/60">
              <td className="py-1.5 text-ink-2">Baseline</td>
              <td className="py-1.5 pr-2 text-right mono text-ink-3">—</td>
              <td className="py-1.5 pr-2 text-right mono text-ink-3">—</td>
              <td className="py-1.5 pr-2 text-right mono text-ink-2">{cgi.base.toFixed(1)}</td>
              <td className="hidden sm:table-cell" />
            </tr>
            {cgi.components.map((c) => {
              const positive = c.contribution >= 0;
              return (
                <tr key={c.key} className="border-b border-rule/60 align-top">
                  <td className="py-1.5 pr-3">
                    <div className="text-ink">{c.label}</div>
                    <div className="text-[11px] text-ink-3">{c.explanation}</div>
                  </td>
                  <td className="py-1.5 pr-2 text-right mono text-ink-2">{c.rawValue.toFixed(2)}</td>
                  <td className="py-1.5 pr-2 text-right mono text-ink-3">{c.weight}</td>
                  <td
                    className={cn(
                      "py-1.5 pr-2 text-right mono font-semibold",
                      positive ? "text-agree" : "text-dispute",
                    )}
                  >
                    {positive ? "+" : "−"}
                    {Math.abs(c.contribution).toFixed(1)}
                  </td>
                  <td className="hidden py-2 pl-2 sm:table-cell sm:w-28">
                    <div className="h-1.5 w-full bg-rule/50">
                      <div
                        className={cn("h-full", positive ? "bg-agree" : "bg-dispute")}
                        style={{ width: `${(Math.abs(c.contribution) / maxAbs) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="py-2 font-semibold text-ink">Common Ground Index</td>
              <td />
              <td />
              <td className={cn("py-2 pr-2 text-right mono text-[15px] font-bold", style.text)}>
                {cgi.score}
              </td>
              <td className="hidden sm:table-cell" />
            </tr>
          </tbody>
        </table>
      </div>

      {(cgi.narrative.positives.length > 0 || cgi.narrative.negatives.length > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="label mb-1 text-agree">What lifts the score</div>
            <ul className="space-y-1 text-[13px] text-ink-2">
              {cgi.narrative.positives.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
              {cgi.narrative.positives.length === 0 && <li className="text-ink-3">Nothing notable.</li>}
            </ul>
          </div>
          <div>
            <div className="label mb-1 text-dispute">What holds it down</div>
            <ul className="space-y-1 text-[13px] text-ink-2">
              {cgi.narrative.negatives.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
              {cgi.narrative.negatives.length === 0 && <li className="text-ink-3">Nothing notable.</li>}
            </ul>
          </div>
        </div>
      )}

      <p className="mt-4 border-t border-rule pt-3 ui text-[11px] text-ink-3">
        Inputs snapshot:{" "}
        {Object.entries(cgi.inputs)
          .map(([k, v]) => `${k}=${v}`)
          .join(" · ")}
        . Full method in <Link href="/methodology" className="underline">Methodology</Link>.
      </p>
    </div>
  );
}
