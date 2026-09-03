import { cn } from "@/lib/format";
import type { FramingComparison } from "@/lib/media-landscape/types";

const STANCE_LABEL: Record<string, string> = {
  supportive: "supportive",
  critical: "critical",
  "neutral-descriptive": "neutral / descriptive",
  mixed: "mixed",
  unclear: "unclear",
};
const EMPHASIS_LABEL: Record<string, string> = {
  "government-action": "government action",
  "political-causation": "political causation",
  "opposition-pressure": "opposition pressure",
  "measurement-data": "measurement / data",
  "human-impact": "human impact",
  "conflict-dispute": "conflict / dispute",
  "process-procedure": "process / procedure",
  "reaction-quote": "reaction / quote",
  accusation: "accusation",
  "outcome-result": "outcome / result",
  uncategorised: "—",
};

export function HeadlineComparison({
  framing,
  articlePub,
}: {
  framing: FramingComparison;
  /** articleId → publisher display name */
  articlePub: Record<string, string>;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">Headline comparison</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">How each source frames the same story</h2>
        <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
          IFFA does not decide which framing is correct. It shows the emphasis each headline chooses,
          its stance toward the main actor, any loaded language, and which corroborated claims the
          headline leaves out.
        </p>
      </div>

      <div className="card w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
              <th className="px-3 py-2 font-semibold">Source</th>
              <th className="px-3 py-2 font-semibold">Headline</th>
              <th className="px-3 py-2 font-semibold">Emphasis</th>
              <th className="px-3 py-2 font-semibold">Stance</th>
              <th className="px-3 py-2 font-semibold">Omits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {framing.observations.map((o) => (
              <tr key={o.articleId} className="align-top">
                <td className="px-3 py-2.5 ui text-[12.5px] font-semibold text-ink">
                  {articlePub[o.articleId] ?? o.publisherId}
                  <div className="ui text-[10.5px] font-normal text-ink-3">{o.language === "ta" ? "தமிழ்" : "English"}</div>
                </td>
                <td className="px-3 py-2.5 ui text-[12.5px] text-ink">
                  {o.headline}
                  {o.loadedPhrases.length > 0 && (
                    <div className="mt-1 ui text-[11px] text-caution">loaded: {o.loadedPhrases.join(", ")}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 ui text-[12px] text-ink-2">
                  {o.emphasis.map((e) => EMPHASIS_LABEL[e] ?? e).join(", ")}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "pill",
                      o.stance === "supportive"
                        ? "bg-caution-bg text-caution"
                        : o.stance === "critical"
                          ? "bg-dispute-bg text-dispute"
                          : "bg-surface-2 text-ink-3",
                    )}
                  >
                    {STANCE_LABEL[o.stance]}
                  </span>
                </td>
                <td className="px-3 py-2.5 ui text-[11.5px] text-ink-3">
                  {o.omittedKeyClaims.length ? o.omittedKeyClaims.join(" · ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="label mb-1 text-agree">Shared factual core</div>
          <ul className="flex flex-col gap-1 ui text-[12.5px] text-ink-2">
            {framing.sharedFactualCore.length ? (
              framing.sharedFactualCore.map((c, i) => <li key={i}>· {c}</li>)
            ) : (
              <li className="text-ink-3">Not enough corroborated claims to state a shared core yet.</li>
            )}
          </ul>
        </div>
        <div>
          <div className="label mb-1">Framing differences</div>
          <ul className="flex flex-col gap-1 ui text-[12.5px] text-ink-2">
            {framing.framingDifferences.map((d, i) => (
              <li key={i}>· {d}</li>
            ))}
          </ul>
          {framing.uniqueClaims.length > 0 && (
            <>
              <div className="label mb-1 mt-3">Claims in only one source</div>
              <ul className="flex flex-col gap-1 ui text-[12px] text-ink-3">
                {framing.uniqueClaims.map((u, i) => (
                  <li key={i}>· {u.claim}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
