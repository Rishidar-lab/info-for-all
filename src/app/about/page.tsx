import type { Metadata } from "next";
import Link from "next/link";
import { dataset, istTimestamp } from "@/lib/live/dataset";

export const metadata: Metadata = {
  title: "About & Methodology",
  description:
    "How IFA's crisis-first India / Tamil Nadu edition ingests, classifies, ranks and clusters public feeds — and what its limits are.",
};

export default function AboutPage() {
  return (
    <div className="prose-measure flex flex-col gap-9">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">About &amp; Methodology</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight sm:text-[36px]">
          A crisis-first, evidence-oriented news comparison platform for Tamil Nadu and India.
        </h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
          Information abundance does not automatically create understanding. IFA groups public
          alerts and reporting around the same event so a reader can see what the official alert
          says, which independent sources confirm or contextualise it, what remains uncertain,
          and when the information was last refreshed.
        </p>
      </header>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Scope</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          <strong>Primary:</strong> Tamil Nadu. <strong>Secondary:</strong> India-wide events that
          materially affect Tamil Nadu or carry major national public importance. IFA deliberately
          excludes generic international news, entertainment feeds, and foreign politics without a
          direct India / Tamil Nadu consequence.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">The pipeline</h2>
        <ol className="mt-3 flex flex-col gap-0 overflow-hidden rounded-[3px] border border-rule">
          {[
            ["Fetch", "Configured RSS / Atom / CAP feeds are fetched with a 15-second timeout and an identifying user agent. One feed failing never aborts the run."],
            ["Normalise & sanitise", "Every externally sourced string is stripped of markup, decoded, cleaned of control characters and length-clamped. Items without a valid source URL or a parseable date are rejected."],
            ["Deduplicate", "By canonical URL and by normalised-headline tokens within a source."],
            ["Geo-classify", "A rule-based Tamil Nadu dictionary (38 districts + state terms + Tamil-script tokens) assigns scope: tamil-nadu / india / india-relevant / excluded. Every classification carries the terms that matched and a reason."],
            ["Crisis-classify", "Deterministic matchers detect priority incident types (cyclone, flood, dam warning, coastal warning, earthquake, landslide, heatwave, industrial accident, and more). CAP disaster-type from an official alert is trusted directly."],
            ["Rank", "A reproducible 0–100 priority from: official-alert status, crisis-type weight, CAP severity/urgency/certainty (preserved verbatim), Tamil Nadu match, affected district count, recency, corroborating source count and primary documentation. Expired and all-clear alerts are scored down and kept out of the active banner."],
            ["Cluster", "Two reports join a cluster only when time window, event type and geography all align and headline tokens overlap — or an official alert's key terms are contained in a report about the same districts. Unrelated events are not merged just because both mention rain."],
          ].map(([name, desc], i) => (
            <li key={name} className="grid grid-cols-1 gap-1 border-b border-rule px-4 py-3 last:border-b-0 sm:grid-cols-[160px_1fr] sm:gap-4">
              <span className="ui text-[13px] font-semibold text-ink">
                <span className="mono text-ink-3">{String(i + 1).padStart(2, "0")}</span> {name}
              </span>
              <span className="text-[13.5px] leading-relaxed text-ink-2">{desc}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Labels</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          This edition does <strong>not</strong> apply Left / Center / Right political-orientation
          ratings to Indian publications. Each report instead carries an <strong>evidence role</strong>:
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {["Official alert", "Primary document", "Government statement", "On-ground report", "Independent report", "Expert analysis", "Developing / unverified"].map((r) => (
            <li key={r} className="pill text-ink-2">{r}</li>
          ))}
        </ul>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
          Reliability is expressed as <strong>evidence status</strong> — how well corroborated a
          claim is, not an ideological judgement:
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {["Official primary source", "Independently corroborated", "Single-source report", "Developing", "Disputed", "Unverified"].map((r) => (
            <li key={r} className="pill text-ink-2">{r}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Copyright &amp; provenance</h2>
        <ul className="mt-2 flex flex-col gap-2 text-[14px] leading-relaxed text-ink-2">
          <li>IFA stores only the headline, source name, canonical URL, publication timestamp, a feed-provided short excerpt, and structured alert metadata.</li>
          <li>It never copies full article bodies, removes attribution, or circumvents a paywall.</li>
          <li>Every item links to the original publisher for the full report.</li>
          <li>IFA summaries are never presented as the publisher&rsquo;s own wording.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Limitations</h2>
        <ul className="mt-2 flex flex-col gap-2 text-[14px] leading-relaxed text-ink-2">
          <li>IFA does not claim algorithmic neutrality. Clustering and geo-classification are rule-based and can err.</li>
          <li>Common ground is only shown when derivable from explicit shared official facts; otherwise it is marked pending review.</li>
          <li>Metadata differences between reports are not claims of contradiction.</li>
          <li>Feeds go down. When they do, IFA keeps the last known good snapshot, marks it stale, and never shows &ldquo;LIVE&rdquo;.</li>
          <li><strong>IFA is not an emergency service.</strong> For any emergency, follow the issuing authority&rsquo;s own instructions.</li>
        </ul>
      </section>

      <section className="card bg-surface-2 p-5">
        <h2 className="font-serif text-[17px] font-semibold">Refresh &amp; data status</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          The live feed is regenerated on a schedule by a GitHub Actions workflow that runs the
          ingestion, validates the output, rebuilds the static site and redeploys it. The last
          snapshot in this build was generated {istTimestamp(dataset.generatedAt)} with{" "}
          {dataset.counts.workingFeeds} of {dataset.feeds.length} feeds responding.
        </p>
        <p className="mt-3 ui text-[12.5px] text-ink-3">
          See the <Link href="/sources" className="text-accent hover:underline">source directory</Link> for
          per-feed status, or the{" "}
          <Link href="/methodology/examples" className="text-accent hover:underline">methodology demonstrations</Link>{" "}
          for synthetic worked examples of the comparison model.
        </p>
      </section>
    </div>
  );
}
