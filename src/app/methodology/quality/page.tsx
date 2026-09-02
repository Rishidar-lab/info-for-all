import type { Metadata } from "next";
import Link from "next/link";
import evalData from "@/data/claim-eval.json";
import { cn } from "@/lib/format";

export const metadata: Metadata = {
  title: "Claim quality",
  description:
    "How IFA's claim engine scores against a hand-labelled gold corpus — extraction, matching, contradiction, attribution, primary evidence, and the false-corroboration rate. Weak numbers shown too.",
};

const d = evalData as typeof evalData;

function pct(x: number | null | undefined): string {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

const METRIC_ORDER = [
  "claimExtraction",
  "claimMatching",
  "contradiction",
  "temporalUpdate",
  "attribution",
  "primaryEvidence",
  "independence",
  "wireDetection",
  "tamilMatching",
  "crossLanguageHeld",
  "tamilOriginalKept",
] as const;

const FAILURE_LABEL: Record<string, string> = {
  "false-match": "False match (unrelated pair merged)",
  "missed-match": "Missed match (same fact kept separate)",
  "false-contradiction": "False contradiction",
  "missed-contradiction": "Missed contradiction",
  "attribution-lost": "Attribution lost",
  "wrong-temporal-relation": "Wrong temporal relation",
  "wrong-independence": "Wrong independence call",
  "wrong-evidence-link": "Wrong evidence link",
  "missed-evidence-link": "Missed evidence link",
  "extraction-miss": "Extraction miss",
  "false-corroboration": "False corroboration",
  "tamil-original-lost": "Tamil original lost",
};

export default function QualityDashboard() {
  const metrics = d.metrics as Record<
    string,
    { label: string; precision: number | null; recall: number | null; f1: number | null; accuracy: number | null; n: number }
  >;
  const fc = d.falseCorroboration;
  const cats = Object.entries(d.categoryBreakdown as Record<string, { n: number; passed: number }>);

  return (
    <div className="flex flex-col gap-9">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Methodology · evaluation</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight sm:text-[36px]">
          How well does the claim engine actually work?
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          IFA&rsquo;s claim layer is measured against a hand-labelled{" "}
          <strong>gold corpus</strong> of {d.totals.cases} comparison cases
          ({(d.languageBreakdown as { english: number }).english} English,{" "}
          {(d.languageBreakdown as { tamil: number }).tamil} Tamil,{" "}
          {(d.languageBreakdown as { mixed: number }).mixed} cross-language). The
          numbers below are produced by <code>npm run eval:claims</code>, which runs
          the real, unmodified pipeline. Weak results are shown, not hidden.
        </p>
        <p className="mt-2 ui text-[12px] text-ink-3">
          Last run {fmtDate(d.generatedAt)} · provider mode: <strong>{d.provider}</strong> ·{" "}
          {d.totals.passed}/{d.totals.cases} cases fully clean
        </p>
      </header>

      {/* ── the number that matters most ─────────────────────────────── */}
      <section
        className={cn(
          "card p-5",
          fc.count === 0 ? "border-agree/40 bg-agree-bg" : "border-dispute/50 bg-dispute-bg",
        )}
      >
        <div className="label mb-1">False corroboration rate</div>
        <p className="font-serif text-[26px] font-semibold text-ink">
          {fc.count} / {fc.denominator}{" "}
          <span className="text-[17px] font-normal text-ink-2">
            unrelated or cross-language pairs shown as corroborated — {pct(fc.rate)}
          </span>
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          This is the metric IFA optimises against hardest. A missed match is a
          shortcoming; a <em>fabricated</em> consensus is a failure of the whole
          premise. {fc.count === 0 ? "No case in the corpus produced one." : `Cases: ${fc.cases.join(", ")}.`}
        </p>
      </section>

      {/* ── version history ─────────────────────────────────────────── */}
      {"v04" in d && "v05" in d && "languageRecall" in d && (
        <section>
          <div className="mb-3 border-b border-rule-strong pb-2">
            <div className="label mb-1">Version history</div>
            <h2 className="font-serif text-[20px] font-semibold text-ink">v0.4 → v0.5 → v0.6</h2>
            <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
              v0.5 added a structured event-identity engine, a Tamil normaliser and a
              cross-language layer. v0.6 hardened recall: 10 known missed matches
              resolved with precision and the zero-false-corroboration guarantee
              held. Regressions are shown, not hidden.
            </p>
          </div>
          <div className="card w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2.5 font-semibold">Metric</th>
                  <th className="px-4 py-2.5 font-semibold">v0.4</th>
                  <th className="px-4 py-2.5 font-semibold">v0.5</th>
                  <th className="px-4 py-2.5 font-semibold">v0.6</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {(() => {
                  const v04 = d.v04 as { cases: number; clean: number; matchingPrecision: number; matchingRecall: number; tamilMatching: number; crossLanguage: number | null; falseCorroboration: number; falseCorroborationDen: number };
                  const v05 = d.v05 as typeof v04;
                  const lr = d.languageRecall as { english: number | null; tamilTamil: number | null; crossLanguage: number | null };
                  const cross = (v: number | null) => (v == null ? "n/a" : pct(v));
                  const rows: [string, string, string, string][] = [
                    ["Corpus size", String(v04.cases), String(v05.cases), String(d.totals.cases)],
                    ["Fully clean", `${v04.clean} (${pct(v04.clean / v04.cases)})`, `${v05.clean} (${pct(v05.clean / v05.cases)})`, `${d.totals.passed} (${pct(d.totals.passed / d.totals.cases)})`],
                    ["Claim-matching precision", pct(v04.matchingPrecision), pct(v05.matchingPrecision), pct(metrics.claimMatching.precision)],
                    ["Claim-matching recall (all)", pct(v04.matchingRecall), pct(v05.matchingRecall), pct(metrics.claimMatching.recall)],
                    ["Tamil ↔ Tamil matching", pct(v04.tamilMatching), pct(v05.tamilMatching), pct(metrics.tamilMatching?.accuracy)],
                    ["Tamil ↔ English recall", cross(v04.crossLanguage), cross(v05.crossLanguage), pct(lr.crossLanguage)],
                    ["False corroboration", `${v04.falseCorroboration} / ${v04.falseCorroborationDen}`, `${v05.falseCorroboration} / ${v05.falseCorroborationDen}`, `${fc.count} / ${fc.denominator}`],
                  ];
                  return rows.map(([k, a, b, c]) => (
                    <tr key={k} className="align-top">
                      <td className="px-4 py-3 ui text-[13px] font-semibold text-ink">{k}</td>
                      <td className="px-4 py-3 mono text-[13px] text-ink-3">{a}</td>
                      <td className="px-4 py-3 mono text-[13px] text-ink-3">{b}</td>
                      <td className="px-4 py-3 mono text-[13px] font-semibold text-ink">{c}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          <p className="mt-2 ui text-[11.5px] leading-relaxed text-ink-3">
            The full A/B on the frozen 148-case corpus, the candidate-recall / decision-precision
            split, and the decision-threshold curve are in{" "}
            <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/evaluation/reports/ab-matcher.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">ab-matcher.md</a>
            {", "}
            <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/evaluation/reports/identity.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">identity.md</a>
            {" and "}
            <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/evaluation/reports/threshold-analysis.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">threshold-analysis.md</a>.
          </p>
        </section>
      )}

      {/* ── metrics table ───────────────────────────────────────────── */}
      <section>
        <div className="mb-3 border-b border-rule-strong pb-2">
          <div className="label mb-1">Metrics</div>
          <h2 className="font-serif text-[20px] font-semibold text-ink">Per-task scores</h2>
        </div>
        <div className="card w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Task</th>
                <th className="px-4 py-2.5 font-semibold">Precision</th>
                <th className="px-4 py-2.5 font-semibold">Recall</th>
                <th className="px-4 py-2.5 font-semibold">F1</th>
                <th className="px-4 py-2.5 font-semibold">Accuracy</th>
                <th className="px-4 py-2.5 font-semibold">n</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {METRIC_ORDER.filter((k) => metrics[k]).map((k) => {
                const m = metrics[k];
                const weak =
                  (m.accuracy != null && m.accuracy < 0.5) ||
                  (m.recall != null && m.recall < 0.5 && m.precision != null);
                return (
                  <tr key={k} className={cn("align-top", weak && "bg-caution-bg/40")}>
                    <td className="px-4 py-3 ui text-[13px] font-semibold text-ink">{m.label}</td>
                    <td className="px-4 py-3 mono text-[13px] text-ink-2">{pct(m.precision)}</td>
                    <td className="px-4 py-3 mono text-[13px] text-ink-2">{pct(m.recall)}</td>
                    <td className="px-4 py-3 mono text-[13px] text-ink-2">{pct(m.f1)}</td>
                    <td className="px-4 py-3 mono text-[13px] text-ink-2">{pct(m.accuracy)}</td>
                    <td className="px-4 py-3 mono text-[13px] text-ink-3">{m.n}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 ui text-[11.5px] leading-relaxed text-ink-3">
          Any row below 50% is shaded. IFA deliberately prefers <em>missing</em> an
          uncertain comparison over presenting a false consensus — so a low recall
          number here is a known shortcoming, never hidden, while precision and the
          false-corroboration rate are held hard.
        </p>
      </section>

      {/* ── category breakdown ──────────────────────────────────────── */}
      <section>
        <div className="mb-3 border-b border-rule-strong pb-2">
          <div className="label mb-1">Gold corpus</div>
          <h2 className="font-serif text-[20px] font-semibold text-ink">Cases by category</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {cats.map(([name, v]) => {
            const rate = v.n ? v.passed / v.n : 0;
            return (
              <div key={name} className="card flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="ui text-[13px] text-ink-2">{name}</span>
                <span
                  className={cn(
                    "mono shrink-0 text-[12.5px] font-semibold",
                    rate === 1 ? "text-agree" : rate >= 0.6 ? "text-caution" : "text-dispute",
                  )}
                >
                  {v.passed}/{v.n}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── failure analysis ────────────────────────────────────────── */}
      <section>
        <div className="mb-3 border-b border-rule-strong pb-2">
          <div className="label mb-1">Error analysis</div>
          <h2 className="font-serif text-[20px] font-semibold text-ink">Where it fails, and how</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(d.failureCounts as Record<string, number>)
            .sort((a, b) => b[1] - a[1])
            .map(([kind, count]) => (
              <span key={kind} className="pill text-ink-2">
                {FAILURE_LABEL[kind] ?? kind} · <strong className="mono">{count}</strong>
              </span>
            ))}
        </div>
        {d.sampleFailures.length > 0 && (
          <div className="mt-4 card w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2.5 font-semibold">Case</th>
                  <th className="px-4 py-2.5 font-semibold">Kind</th>
                  <th className="px-4 py-2.5 font-semibold">Expected</th>
                  <th className="px-4 py-2.5 font-semibold">Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {(d.sampleFailures as { id: string; kind: string; expected: string; actual: string }[]).map((f, i) => (
                  <tr key={i} className="align-top ui text-[12.5px]">
                    <td className="px-4 py-2.5 mono text-ink-3">{f.id}</td>
                    <td className="px-4 py-2.5 text-ink-2">{FAILURE_LABEL[f.kind] ?? f.kind}</td>
                    <td className="px-4 py-2.5 text-ink-2">{f.expected}</td>
                    <td className="px-4 py-2.5 text-ink">{f.actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card bg-surface-2 p-5 prose-measure">
        <h2 className="font-serif text-[17px] font-semibold text-ink">How to read this honestly</h2>
        <ul className="mt-3 flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink-2">
          <li>
            <strong>Precision over recall.</strong> The engine is tuned to never
            fabricate agreement. On this corpus matching precision and recall are
            both at 100% as of v0.6, but the corpus is small — on live data the
            engine still holds some genuine same-fact pairs apart (as{" "}
            <em>uncertain</em>) rather than risk a wrong merge.
          </li>
          <li>
            <strong>The corpus is small and hand-authored.</strong> {d.totals.cases}{" "}
            cases is enough to catch regressions and gross errors, not enough to
            claim a precise population estimate.
          </li>
          <li>
            <strong>Rule-only.</strong> These numbers are the deterministic engine
            with no language model. The provider-assisted path exists but is not
            wired into the deployed build.
          </li>
          <li>
            The full formulae are public:{" "}
            <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/CLAIM-CONFIDENCE-v2.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
              claim confidence
            </a>
            ,{" "}
            <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/evaluation/reports/latest.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
              the full evaluation report
            </a>
            , and{" "}
            <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/evaluation/reports/cgi-sensitivity.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
              CGI sensitivity
            </a>
            .
          </li>
        </ul>
        <p className="mt-3 ui text-[12px] text-ink-3">
          See also the <Link href="/about" className="text-accent hover:underline">methodology</Link> and{" "}
          <Link href="/methodology/examples" className="text-accent hover:underline">worked examples</Link>.
        </p>
      </section>
    </div>
  );
}
