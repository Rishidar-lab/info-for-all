import type { Metadata } from "next";
import Link from "next/link";
import evalData from "@/data/claim-eval.json";
import categoryEval from "../../../../evaluation/reports/category-latest.json";
import { cn } from "@/lib/format";
import { dataset } from "@/lib/live/dataset";
import { hasTrendData, categoryCounts, situation, v09Metrics } from "@/lib/live/trends-view";
import { v010Metrics } from "@/lib/media-landscape/quality-metrics";
import stanceEval from "../../../../evaluation/reports/stance-latest.json";
import framingEval from "../../../../evaluation/reports/framing-latest.json";
import evidenceEval from "../../../../evaluation/reports/evidence-latest.json";

/** IFFA test-suite tallies (from `npm test` + `npm run test:e2e`). */
const IFFA_SUITES: [string, number][] = [
  ["Category taxonomy + geo tiers", 17],
  ["Multi-signal classifier v2 + secondary engine", 16],
  ["Tamil Nadu district resolution", 8],
  ["Source registry", 9],
  ["Trend engine (velocity, score, situation)", 17],
  ["Claim-aware novelty v2 + update significance", 10],
  ["Event severity", 7],
  ["Event identity v2 (specialist split guard)", 6],
  ["Critical-safety corpus (12 spec non-negotiables)", 13],
  ["Finance / sports fixture guards + event state", 20],
  ["v0.9 · editorial priority", 9],
  ["v0.9 · consequence model (anti-sensationalism)", 7],
  ["v0.9 · political event identity + speech acts", 12],
  ["v0.9 · political claim threads", 1],
  ["v0.9 · temporal intelligence", 12],
  ["v0.9 · local-impact model", 8],
  ["v0.9 · political coverage description", 5],
  ["Adversarial mini-corpus (category / geo / district)", 43],
  ["Browser E2E (Playwright, desktop + 390px)", 50],
];

export const metadata: Metadata = {
  title: "Claim quality",
  description:
    "How IFFA's claim engine scores against a hand-labelled gold corpus — extraction, matching, contradiction, attribution, primary evidence, and the false-corroboration rate. Weak numbers shown too.",
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
          IFFA&rsquo;s claim layer is measured against a hand-labelled{" "}
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
          This is the metric IFFA optimises against hardest. A missed match is a
          shortcoming; a <em>fabricated</em> consensus is a failure of the whole
          premise. {fc.count === 0 ? "No case in the corpus produced one." : `Cases: ${fc.cases.join(", ")}.`}
        </p>
      </section>

      {/* ── version history ─────────────────────────────────────────── */}
      {"v04" in d && "v05" in d && "languageRecall" in d && (
        <section>
          <div className="mb-3 border-b border-rule-strong pb-2">
            <div className="label mb-1">Version history · semantic regression</div>
            <h2 className="font-serif text-[20px] font-semibold text-ink">v0.4 → v0.5 → v0.6 → v0.7 → v0.8</h2>
            <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
              v0.5 added a structured event-identity engine, a Tamil normaliser and a
              cross-language layer. v0.6 hardened recall. <strong>v0.7 (Trend Intelligence)
              and v0.8 (Live Signal Intelligence) did NOT change the claim / identity
              engine</strong> — the current column is measured live each run and equals v0.6.
              Regressions are shown, not hidden.
            </p>
          </div>
          <div className="card w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2.5 font-semibold">Metric</th>
                  <th className="px-4 py-2.5 font-semibold">v0.4</th>
                  <th className="px-4 py-2.5 font-semibold">v0.5</th>
                  <th className="px-4 py-2.5 font-semibold">v0.6</th>
                  <th className="px-4 py-2.5 font-semibold">v0.7</th>
                  <th className="px-4 py-2.5 font-semibold">v0.8</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {(() => {
                  const v04 = d.v04 as { cases: number; clean: number; matchingPrecision: number; matchingRecall: number; tamilMatching: number; crossLanguage: number | null; falseCorroboration: number; falseCorroborationDen: number };
                  const v05 = d.v05 as typeof v04;
                  const v06 = ("v06" in d ? d.v06 : v05) as typeof v04;
                  const v07 = ("v07" in d ? d.v07 : v06) as typeof v04;
                  const lr = d.languageRecall as { english: number | null; tamilTamil: number | null; crossLanguage: number | null };
                  const cross = (v: number | null) => (v == null ? "n/a" : pct(v));
                  const rows: [string, string, string, string, string, string][] = [
                    ["Corpus size", String(v04.cases), String(v05.cases), String(v06.cases), String(v07.cases), String(d.totals.cases)],
                    ["Fully clean", `${v04.clean} (${pct(v04.clean / v04.cases)})`, `${v05.clean} (${pct(v05.clean / v05.cases)})`, `${v06.clean} (${pct(v06.clean / v06.cases)})`, `${v07.clean} (${pct(v07.clean / v07.cases)})`, `${d.totals.passed} (${pct(d.totals.passed / d.totals.cases)})`],
                    ["Claim-matching precision", pct(v04.matchingPrecision), pct(v05.matchingPrecision), pct(v06.matchingPrecision), pct(v07.matchingPrecision), pct(metrics.claimMatching.precision)],
                    ["Claim-matching recall (all)", pct(v04.matchingRecall), pct(v05.matchingRecall), pct(v06.matchingRecall), pct(v07.matchingRecall), pct(metrics.claimMatching.recall)],
                    ["Tamil ↔ Tamil matching", pct(v04.tamilMatching), pct(v05.tamilMatching), pct(v06.tamilMatching), pct(v07.tamilMatching), pct(metrics.tamilMatching?.accuracy)],
                    ["Tamil ↔ English recall", cross(v04.crossLanguage), cross(v05.crossLanguage), cross(v06.crossLanguage), cross(v07.crossLanguage), pct(lr.crossLanguage)],
                    ["False corroboration", `${v04.falseCorroboration}/${v04.falseCorroborationDen}`, `${v05.falseCorroboration}/${v05.falseCorroborationDen}`, `${v06.falseCorroboration}/${v06.falseCorroborationDen}`, `${v07.falseCorroboration}/${v07.falseCorroborationDen}`, `${fc.count}/${fc.denominator}`],
                  ];
                  return rows.map(([k, a, b, c, e, g]) => (
                    <tr key={k} className="align-top">
                      <td className="px-4 py-3 ui text-[13px] font-semibold text-ink">{k}</td>
                      <td className="px-4 py-3 mono text-[12px] text-ink-3">{a}</td>
                      <td className="px-4 py-3 mono text-[12px] text-ink-3">{b}</td>
                      <td className="px-4 py-3 mono text-[12px] text-ink-3">{c}</td>
                      <td className="px-4 py-3 mono text-[12px] text-ink-3">{e}</td>
                      <td className="px-4 py-3 mono text-[13px] font-semibold text-ink">{g}</td>
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

      {/* ── v0.8 category classifier ───────────────────────────────── */}
      <section>
        <div className="mb-3 border-b border-rule-strong pb-2">
          <div className="label mb-1">v0.8 · category classification</div>
          <h2 className="font-serif text-[20px] font-semibold text-ink">
            News-domain classifier — {pct((categoryEval as { accuracy: number }).accuracy)} accuracy
          </h2>
          <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
            v0.7&rsquo;s classifier read English headline keywords only, so ~77% of events fell
            into &ldquo;other-relevant&rdquo;. v0.8&rsquo;s multi-signal classifier (headline +
            excerpt + a Tamil gloss + entities + concepts + finance instruments + sports
            competitions + a &ldquo;government actor takes a governance action&rdquo; pattern)
            brought that to ~51%. Measured against{" "}
            <strong>{(categoryEval as { corpusSize: number }).corpusSize} hand-labelled real
            headlines</strong> — deliberately adversarial (political metaphors that use crisis
            words, culture pieces that name chess players, RBI operational notes). The corpus was
            built in two batches: the second was labelled from a fresh snapshot slice{" "}
            <em>before</em> tuning, giving an honest first-pass 91.2% that principled fixes then
            raised.
          </p>
        </div>
        <div className="card w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Category</th>
                <th className="px-4 py-2.5 font-semibold">Support</th>
                <th className="px-4 py-2.5 font-semibold">Precision</th>
                <th className="px-4 py-2.5 font-semibold">Recall</th>
                <th className="px-4 py-2.5 font-semibold">F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {(categoryEval as { perCat: { cat: string; support: number; precision: number | null; recall: number | null; f1: number | null }[] }).perCat.map((r) => (
                <tr key={r.cat}>
                  <td className="px-4 py-2.5 ui text-[13px] font-semibold text-ink">{r.cat}</td>
                  <td className="px-4 py-2.5 mono text-[12.5px] text-ink-2">{r.support}</td>
                  <td className="px-4 py-2.5 mono text-[12.5px] text-ink-2">{pct(r.precision)}</td>
                  <td className="px-4 py-2.5 mono text-[12.5px] text-ink-2">{pct(r.recall)}</td>
                  <td className="px-4 py-2.5 mono text-[12.5px] font-semibold text-ink">{pct(r.f1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 ui text-[11.5px] leading-relaxed text-ink-3">
          Confusion matrix and every misclassification:{" "}
          <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/evaluation/reports/category-latest.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">category-latest.md</a>.
          A lower &ldquo;other-relevant&rdquo; count is not a win if precision collapses — it did not
          (all classified categories ≥ 90% precision on the corpus). <strong>Secondary-category
          recall is still weak (~15%)</strong> — a v0.9 target. Entertainment / celebrity are
          classified and kept off the default feed.
        </p>
      </section>

      {/* ── v0.8 Live Signal Intelligence layer ────────────────────── */}
      <section>
        <div className="mb-3 border-b border-rule-strong pb-2">
          <div className="label mb-1">v0.8 · Live Signal Intelligence layer</div>
          <h2 className="font-serif text-[20px] font-semibold text-ink">Ingestion, clustering, trend detection</h2>
          <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
            The trend / novelty / severity engines are an additive layer over the frozen claim /
            identity engine. Measured from the current static snapshot
            ({new Date(dataset.generatedAt).toISOString().slice(0, 16).replace("T", " ")}Z) plus
            the unit + E2E suites.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            ["Feeds healthy", `${dataset.feeds.filter((f) => f.health === "healthy").length}/${dataset.feeds.filter((f) => f.health !== "disabled").length}`],
            ["Articles ingested", String(dataset.articles.length)],
            ["Events (clusters)", String(dataset.clusters.length)],
            ["Distinct publishers", String(dataset.counts.distinctPublishers)],
            ["Independent families (Σ)", String(dataset.clusters.reduce((n, c) => n + (c.trendData?.independence?.families ?? 0), 0))],
            ["Weak matches kept apart", String(dataset.counts.weakMatchesRejected)],
            ["Trending / watching", hasTrendData() ? `${dataset.trending?.length ?? 0} / ${dataset.watching?.length ?? 0}` : "—"],
            ["Situation TN / India", situation() ? `${situation()!.tamilNadu} / ${situation()!.india}` : "—"],
            ["Meaningful updates", String(dataset.clusters.filter((c) => c.trendData?.novelty && !["duplicate", "rephrasing"].includes(c.trendData.novelty.updateKind)).length)],
            ["Severe / critical events", String(dataset.clusters.filter((c) => ["severe", "critical"].includes(c.trendData?.severity?.level ?? "")).length)],
            ["Tamil-only events", String(dataset.clusters.filter((c) => c.languages.includes("ta") && !c.languages.includes("en")).length)],
            ["Category share (other)", `${Math.round(100 * (categoryCounts()["other-relevant"] ?? 0) / dataset.clusters.length)}%`],
          ].map(([k, v]) => (
            <div key={k} className="card p-3">
              <div className="label text-[10px]">{k}</div>
              <div className="mono mt-1 text-[18px] text-ink">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 card w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">IFFA suite</th>
                <th className="px-4 py-2.5 font-semibold">Tests</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {IFFA_SUITES.map(([name, n]) => (
                <tr key={name}>
                  <td className="px-4 py-2.5 ui text-[13px] text-ink">{name}</td>
                  <td className="px-4 py-2.5 mono text-[13px] text-ink-2">{n}</td>
                  <td className="px-4 py-2.5 ui text-[12px] font-semibold text-agree">pass</td>
                </tr>
              ))}
              <tr className="bg-surface-2">
                <td className="px-4 py-2.5 ui text-[13px] font-semibold text-ink">Total (v0.6 baseline 200 unit + IFFA unit + E2E)</td>
                <td className="px-4 py-2.5 mono text-[13px] font-semibold text-ink">411 + 50</td>
                <td className="px-4 py-2.5 ui text-[12px] font-semibold text-agree">pass</td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul className="mt-3 flex flex-col gap-1.5 ui text-[12.5px] leading-relaxed text-ink-2">
          <li><strong>Source independence:</strong> velocity and corroboration count DISTINCT source families, not raw articles — many sites running one wire dispatch count as one confirmation (locked by critical test 10).</li>
          <li><strong>Political claim safety:</strong> allegations keep their claimant through clustering (critical tests 1, 9).</li>
          <li><strong>Financial numbers:</strong> a move in points is never a move in percent (critical tests 4, 5).</li>
          <li><strong>Sports identity:</strong> the same two teams on two dates, or a men&rsquo;s vs a women&rsquo;s match, are distinct fixtures (critical test 6).</li>
          <li><strong>No fabricated alert level:</strong> the Current Situation bar is derived from active events only and always lists its drivers; routine national CAP watches do not read as &ldquo;Crisis&rdquo;.</li>
          <li><strong>Trend ranking is not a black box:</strong> every one of the eight factors is stored and shown on the card, and the weights are in <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/TREND-MODEL.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">docs/TREND-MODEL.md</a>.</li>
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.entries(categoryCounts()) as [string, number][]).map(([c, n]) => (
            <span key={c} className="pill text-ink-3">{c} {n}</span>
          ))}
        </div>
      </section>

      {/* ── v0.9 Editorial Intelligence layer ─────────────────────────── */}
      {(() => {
        const m = v09Metrics();
        const ce = categoryEval as {
          corpusSize: number;
          secondaryHit: number;
          secondaryTotal: number;
          secTP: number;
          secFP: number;
          secFN: number;
        };
        const secP = ce.secTP + ce.secFP > 0 ? ce.secTP / (ce.secTP + ce.secFP) : 1;
        const secR = ce.secTP + ce.secFN > 0 ? ce.secTP / (ce.secTP + ce.secFN) : 1;
        const dist = (o: Record<string, number>) =>
          Object.entries(o)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k} ${v}`)
            .join(" · ");
        return (
          <section>
            <div className="mb-3 border-b border-rule-strong pb-2">
              <div className="label mb-1">v0.9 · Editorial Intelligence layer</div>
              <h2 className="font-serif text-[20px] font-semibold text-ink">
                Which events deserve prominence — and can the ranking explain itself?
              </h2>
              <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
                Every figure below is a straight count over the current snapshot
                ({new Date(dataset.generatedAt).toISOString().slice(0, 16).replace("T", " ")}Z) or the
                {" "}{ce.corpusSize}-case category corpus (hand-labelled, and tuned against during
                development — the corpus precision/recall below is not a held-out generalisation
                measure). The editorial score is a <strong>ranking</strong>, not a
                probability of truth. Method:{" "}
                <a
                  href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/EDITORIAL-MODEL.md"
                  className="text-accent hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  docs/EDITORIAL-MODEL.md
                </a>
                .
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                ["Editorial bands (U/H/S/B/Sup)", `${m.bands.urgent ?? 0}/${m.bands.high ?? 0}/${m.bands.standard ?? 0}/${m.bands.background ?? 0}/${m.bands.suppressed ?? 0}`],
                ["Secondary category — live rate", `${(m.secondaryCategory.rate * 100).toFixed(1)}%`],
                ["Secondary category — corpus P/R (tuned set)", `${(secP * 100).toFixed(1)}% / ${(secR * 100).toFixed(1)}%`],
                ["Political events described", String(m.politicalIdentity.politics)],
                ["— threaded to another event", String(m.politicalIdentity.threaded)],
                ["— allegation w/ no response", String(m.politicalIdentity.unanswered)],
                ["Temporal: event≠publication resolved", `${m.temporal.resolved}/${m.temporal.ofInScope}`],
                ["Local impact resolved (P0)", `${m.localImpact.resolved}/${m.localImpact.ofP0}`],
                ["Finance: policy / market-reaction", `${m.finance.policy} / ${m.finance.reaction}`],
                ["Sports: fixtures with state", `${m.sports.withState}/${m.sports.total}`],
                ["Isolated incidents de-prioritised", String(m.isolatedIncidents)],
                ["Source-concentration caps hit", String(m.concentrationNotes.length)],
              ].map(([k, v]) => (
                <div key={k} className="card p-3">
                  <div className="label text-[10px]">{k}</div>
                  <div className="mono mt-1 text-[16px] text-ink">{v}</div>
                </div>
              ))}
            </div>

            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ["Speech-act mix (politics)", dist(m.politicalIdentity.speechActs)],
                ["Tense mix (in-scope)", dist(m.temporal.tenses)],
                ["Update significance", dist(m.updateSignificance)],
                ["Live category mix", dist(m.categoryMix as unknown as Record<string, number>)],
              ].map(([k, v]) => (
                <div key={k} className="card p-3">
                  <div className="label text-[10px]">{k}</div>
                  <div className="ui mt-1 text-[12px] text-ink-2">{v}</div>
                </div>
              ))}
            </dl>

            {m.concentrationNotes.length > 0 && (
              <p className="mt-3 ui text-[12px] text-ink-3">
                Source-concentration control this run: {m.concentrationNotes.join("; ")}.
              </p>
            )}

            <div className="mt-4 card w-full min-w-0 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <caption className="px-4 pt-3 text-left label text-[10px]">
                  Top 10 events by editorial score — why each is ranked
                </caption>
                <thead>
                  <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                    <th className="px-4 py-2.5 font-semibold">Score</th>
                    <th className="px-4 py-2.5 font-semibold">Band</th>
                    <th className="px-4 py-2.5 font-semibold">Event</th>
                    <th className="px-4 py-2.5 font-semibold">Why ranked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {m.topEvents.map((e) => (
                    <tr key={e.slug}>
                      <td className="px-4 py-2.5 mono text-[13px] text-ink">{e.score.toFixed(1)}</td>
                      <td className="px-4 py-2.5 ui text-[12px] text-ink-2">{e.band}</td>
                      <td className="px-4 py-2.5 ui text-[12.5px] text-ink">
                        {e.title.length > 70 ? `${e.title.slice(0, 70)}…` : e.title}
                        <span className="ml-1 text-ink-3">
                          ({e.category}/{e.tier})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 ui text-[11.5px] text-ink-3">{e.reasons.slice(0, 3).join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-3 flex flex-col gap-1.5 ui text-[12.5px] leading-relaxed text-ink-2">
              <li>
                <strong>Classification ≠ importance:</strong> an <code>other-relevant</code> event is capped at
                STANDARD unless it is genuinely consequential and Tamil-Nadu-local — that is how the ~52%
                figure is de-emphasised without being reclassified.
              </li>
              <li>
                <strong>Anti-sensationalism:</strong> an isolated single-victim crime is capped at STANDARD
                however vivid the headline; emotional-intensity words carry zero weight in the consequence model.
              </li>
              <li>
                <strong>Not a bias score:</strong> political coverage is described (claim / response / official
                record / source families), never graded on a left–right or government–opposition axis.
              </li>
            </ul>
          </section>
        );
      })()}

      {/* ── v0.10 Media Landscape layer ─────────────────────────────── */}
      {(() => {
        const m = v010Metrics();
        const tile = (k: string, v: React.ReactNode, hint?: string) => (
          <div key={k} className="card p-3">
            <div className="mono text-[16px] font-semibold text-ink">{v}</div>
            <div className="ui text-[10px] leading-snug text-ink-3">{k}</div>
            {hint && <div className="ui mt-0.5 text-[9.5px] text-ink-3">{hint}</div>}
          </div>
        );
        return (
          <section>
            <div className="mb-3 border-b border-rule-strong pb-2">
              <div className="label mb-1">v0.10 · Media Landscape layer</div>
              <h2 className="font-serif text-[20px] font-semibold text-ink">
                Who covers a story, who owns them, which claims have evidence
              </h2>
              <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
                Straight counts over the current snapshot ({new Date(dataset.generatedAt).toISOString().slice(0, 16).replace("T", " ")}Z)
                and the publisher registry. Ownership is metadata, never a bias determinant. Bias ≠ falsehood.
                Where real data is missing it reads &ldquo;unknown&rdquo; / &ldquo;insufficient&rdquo;, never a guess.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {tile("Publishers profiled", m.publishersProfiled, `${m.publishersIngested} seen in this snapshot`)}
              {tile("Ownership completeness", `${m.ownershipCompletenessPct}%`, `${m.ownershipUnknown} UNKNOWN, by design not inference`)}
              {tile("External-ratings coverage", `${m.externalRatingsCoveragePct}%`, "no provider integrated yet")}
              {tile("Source families", m.sourceFamilies, `${m.multiPublisherFamilies} multi-publisher`)}
              {tile("Alignment-qualified publishers", `${m.alignmentQualified}/${m.alignmentTotal}`, "n ≥ 20 political stories")}
              {tile("Clusters with a landscape", `${m.clustersWithLandscape}/${m.clustersTotal}`)}
              {tile("Clusters with a blindspot", m.clustersWithBlindspot)}
              {tile("Clusters with a claim-evidence matrix", m.clustersWithEvidenceMatrix)}
              {tile("Claim-evidence claims", m.totalMatrixClaims)}
              {tile("Primary-document-supported", `${m.primaryDocSupportedClaims}/${m.totalMatrixClaims}`)}
              {tile("Corroborated / disputed claims", `${m.corroboratedClaims} / ${m.disputedClaims}`)}
              {tile("Discourse mentions / emerging claims", `${m.discourseMentions} / ${m.emergingClaims}`, "public discourse never = corroboration")}
            </div>
            <p className="ui mt-3 text-[11.5px] leading-relaxed text-ink-3">
              Observed editorial alignment is <strong>snapshot-scoped</strong> until IFFA has accumulated a
              rolling window of daily history; below n = 20 political stories no alignment is shown. See the
              per-publisher profiles on <Link href="/sources" className="text-accent hover:underline">the source directory</Link>{" "}
              and the full method in{" "}
              <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/MEDIA-LANDSCAPE.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                docs/MEDIA-LANDSCAPE.md
              </a>.
            </p>
          </section>
        );
      })()}

      {/* ── v0.11 Calibration & data depth ─────────────────────────── */}
      {(() => {
        const s = stanceEval as { n: number; humanVerified: number; accuracy: number; macroF1: number };
        const f = framingEval as { n: number; precision: number; recall: number; exactMatch: number };
        const ev = evidenceEval as { n: number; accuracy: number };
        const m = v010Metrics();
        const pct = (x: number) => `${Math.round(x * 100)}%`;
        return (
          <section>
            <div className="mb-3 border-b border-rule-strong pb-2">
              <div className="label mb-1">v0.11 · Calibration &amp; data depth</div>
              <h2 className="font-serif text-[20px] font-semibold text-ink">
                How well-measured is each media-landscape signal?
              </h2>
              <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
                The media-landscape layer shipped in v0.10 <strong>without a benchmark</strong>. These are the
                first measurements. The stance / framing corpora are <strong>first-pass, not human-verified</strong>{" "}
                — the numbers are <strong>indicative</strong>, not validated accuracy. Weak numbers are shown, not hidden.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div className="card p-3">
                <div className="mono text-[16px] font-semibold text-ink">{pct(s.accuracy)}</div>
                <div className="ui text-[10px] text-ink-3">
                  Stance classifier accuracy · macro-F1 {pct(s.macroF1)} · n={s.n} ({s.humanVerified} human-verified)
                </div>
              </div>
              <div className="card p-3">
                <div className="mono text-[16px] font-semibold text-ink">{pct(f.precision)} / {pct(f.recall)}</div>
                <div className="ui text-[10px] text-ink-3">
                  Framing emphasis — label precision / recall · exact-set {pct(f.exactMatch)} · n={f.n}
                </div>
              </div>
              <div className="card p-3">
                <div className="mono text-[16px] font-semibold text-agree">{pct(ev.accuracy)}</div>
                <div className="ui text-[10px] text-ink-3">
                  Claim-evidence status accuracy · n={ev.n} · built on the frozen claim engine
                </div>
              </div>
              <div className="card p-3">
                <div className="mono text-[16px] font-semibold text-ink">1</div>
                <div className="ui text-[10px] text-ink-3">
                  Days of alignment history — needs ≥7 before observed alignment is claimed
                </div>
              </div>
              <div className="card p-3">
                <div className="mono text-[16px] font-semibold text-ink">{m.alignmentQualified}/{m.alignmentTotal}</div>
                <div className="ui text-[10px] text-ink-3">Alignment-qualified publishers (n≥20 political stories)</div>
              </div>
              <div className="card p-3">
                <div className="mono text-[16px] font-semibold text-ink">{m.ownershipCompletenessPct}%</div>
                <div className="ui text-[10px] text-ink-3">Ownership category recorded ({m.ownershipUnknown} UNKNOWN, by design)</div>
              </div>
            </div>
            <p className="ui mt-3 text-[11.5px] leading-relaxed text-ink-3">
              <strong>Implication:</strong> claim-evidence status is well-calibrated (the differentiator);{" "}
              <strong>stance and framing are not yet strong enough to claim alignment accuracy</strong>, so observed
              editorial alignment is shown as raw counts with a prominent caveat, gated on sample size, and never as
              a &ldquo;DMK-leaning&rdquo; / &ldquo;BJP-leaning&rdquo; label. Full method + corpora:{" "}
              <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/evaluation/corpora/README.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                evaluation/corpora
              </a>,{" "}
              <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/evaluation/reports/v0.11-baseline.md" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                v0.11-baseline.md
              </a>.
            </p>
          </section>
        );
      })()}

      {/* ── v0.11 Phase N · payload & data shape ────────────────────── */}
      <section>
        <div className="mb-3 border-b border-rule-strong pb-2">
          <div className="label mb-1">v0.11 · Payload &amp; data shape</div>
          <h2 className="font-serif text-[20px] font-semibold text-ink">What each page actually ships</h2>
          <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
            Measured on the exported static build (2026-09-03). The <strong>~7.6&nbsp;MB</strong> figure sometimes
            quoted is <code>live-feed.json</code> — a <strong>build input that is never served</strong>. Next.js
            per-page renders; no route loads the corpus. The search index is now a{" "}
            <strong>served shard</strong> (<code>/data/search/index.json</code>), fetched on demand, not inlined.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="card p-3">
            <div className="mono text-[16px] font-semibold text-agree">383K → 18K</div>
            <div className="ui text-[10px] text-ink-3">Search page HTML — index de-inlined to a cacheable shard</div>
          </div>
          <div className="card p-3">
            <div className="mono text-[16px] font-semibold text-agree">940K → 584K</div>
            <div className="ui text-[10px] text-ink-3">Search route first load (HTML + shared JS)</div>
          </div>
          <div className="card p-3">
            <div className="mono text-[16px] font-semibold text-ink">~936K</div>
            <div className="ui text-[10px] text-ink-3">Home first load (373K HTML + 563K shared JS) — unchanged</div>
          </div>
          <div className="card p-3">
            <div className="mono text-[16px] font-semibold text-ink">~1.0M</div>
            <div className="ui text-[10px] text-ink-3">India / Tamil&nbsp;Nadu HTML — 60 dense cards, rendered markup (not corpus data)</div>
          </div>
          <div className="card p-3">
            <div className="mono text-[16px] font-semibold text-ink">5 shards</div>
            <div className="ui text-[10px] text-ink-3">
              <code>meta</code> · <code>search</code> · <code>index</code> · <code>landscape</code> · <code>sources</code> under <code>/data/</code>
            </div>
          </div>
          <div className="card p-3">
            <div className="mono text-[16px] font-semibold text-ink">0</div>
            <div className="ui text-[10px] text-ink-3">Routes that serialise the full dataset (verified)</div>
          </div>
        </div>
        <p className="ui mt-3 text-[11.5px] leading-relaxed text-ink-3">
          <strong>Still open:</strong> the India / Tamil&nbsp;Nadu list pages are ~1&nbsp;MB of rendered markup for
          60 information-dense cards each. Cutting that is a card-density / pagination decision deferred past this
          &ldquo;no-redesign&rdquo; release — and Tamil&nbsp;Nadu story visibility is deliberately <em>not</em> reduced
          in the release that widens Tamil coverage.
        </p>
      </section>

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
          Any row below 50% is shaded. IFFA deliberately prefers <em>missing</em> an
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
