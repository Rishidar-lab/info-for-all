import type { Metadata } from "next";
import Link from "next/link";
import { dataset, istTimestamp } from "@/lib/live/dataset";

export const metadata: Metadata = {
  title: "About & Methodology",
  description:
    "How IFFA's crisis-first India / Tamil Nadu edition ingests, classifies, ranks and clusters public feeds — and what its limits are.",
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
          Information abundance does not automatically create understanding. IFFA groups public
          alerts and reporting around the same event so a reader can see what the official alert
          says, which independent sources confirm or contextualise it, what remains uncertain,
          and when the information was last refreshed.
        </p>
      </header>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Media landscape (v0.10)</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          For every story IFFA shows <strong>who is reporting it, who is not, who owns those
          sources</strong>, how their headlines and framing differ, which claims the reporting
          agrees on, which are disputed, and which have <strong>primary-document</strong> evidence.
          Ownership is provenance-backed <em>metadata</em> — it never determines a publisher&rsquo;s
          alignment or reliability, and <code>UNKNOWN</code> is used wherever it is unverified.
          There is <strong>no single bias score</strong>; observed editorial alignment is
          corpus-derived, entity-specific (never a US left/right axis), and is withheld below a
          documented sample size. <strong>Bias is not falsehood</strong>, coverage asymmetry is
          not falsehood, and forum consensus is not evidence — see{" "}
          <a
            href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/MEDIA-LANDSCAPE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            docs/MEDIA-LANDSCAPE.md
          </a>{" "}
          and the <Link href="/methodology" className="text-accent hover:underline">methodology hub</Link>.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Scope</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          <strong>P0:</strong> Tamil Nadu (district-level). <strong>P1:</strong> India national.{" "}
          <strong>P2:</strong> events abroad only when they materially affect Tamil Nadu, India,
          Indian citizens, the economy, markets or foreign policy, or are a major global crisis.
          Category priority is <strong>Crisis → Politics → Finance → Sports</strong>; entertainment
          and celebrity stories are classified but kept out of the default feed (disabled, not
          deleted).
        </p>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Category, novelty &amp; severity (v0.8)</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          Every event is filed into a <strong>news domain</strong> — crisis, politics, finance,
          sports, or general — by a deterministic classifier that reads the headline, the
          excerpt, a Tamil-to-English gloss, the extracted entities, and signals like a
          financial instrument or a sports competition. It reports a confidence <em>class</em>
          (strong / moderate / weak / unknown), never a fake probability, and the{" "}
          <Link href="/methodology/quality" className="text-accent hover:underline">
            quality dashboard
          </Link>{" "}
          shows its precision and recall against a hand-labelled corpus. A separate <strong>
          novelty</strong> check compares each new report against what the event already
          established — a headline rewrite is not a meaningful update; a corrected death toll or
          a first official confirmation is. Crisis events also carry an <strong>event
          severity</strong> (informational → watch → significant → severe → critical) derived
          from casualty counts and confirmed impact — this describes <em>how bad the event
          is</em>, not whether the reports are true; provenance is tracked separately.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Editorial priority (v0.9)</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          IFFA ingests broadly but <strong>displays selectively</strong>. On top of the trend
          score sits an <strong>editorial priority</strong> — a ranking score that decides how
          much prominence an event gets on the home page. It is a weighted mean of eight
          interpretable factors (geographic relevance, consequence, information gain, category,
          corroboration, meaningful recency, local impact, velocity), minus named penalties for
          churn, staleness, syndication and thin evidence. Every factor and penalty is shown on
          the card and on the{" "}
          <Link href="/methodology/quality" className="text-accent hover:underline">
            quality dashboard
          </Link>
          . The score is a <strong>ranking</strong>, not a probability of truth. A gruesome
          single-victim crime is capped below the front strip however vivid its wording;
          general-interest news is de-emphasised editorially rather than reclassified; and
          political coverage is <em>described</em> (claim / response / official record / source
          families), never scored on a left–right axis. Full method:{" "}
          <a
            href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/EDITORIAL-MODEL.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            docs/EDITORIAL-MODEL.md
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Trend ranking (v0.7)</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          IFFA ranks <strong>events</strong>, not articles, and by <strong>what is changing</strong>,
          not publication count. The trend score is a weighted geometric mean of eight factors —
          recency, publication velocity <em>across independent newsrooms</em>, source diversity,
          geographic relevance, category, consequence, novelty, and corroboration. Every factor is
          shown on the card and the weights are{" "}
          <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/TREND-MODEL.md" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">public</a>.
          Velocity counts <strong>independent source families</strong>, so many sites reprinting one
          wire dispatch count as a single confirmation. &ldquo;Watching&rdquo; holds stories that
          matter but lack the independent evidence to be called trending — a single local report of
          a bridge collapse never becomes a &ldquo;confirmed crisis&rdquo;.
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
        <h2 className="font-serif text-[20px] font-semibold">Grounded claims</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          On a multi-source event, IFFA breaks the coverage into structured{" "}
          <strong>claims</strong> and classifies each one: <em>corroborated</em> (more than one
          independent source group), <em>single source</em>, <em>attributed</em> (something a
          named speaker said, alleged, expects or warned — kept as the speaker&rsquo;s claim,
          never promoted to a bare fact unless separate evidence supports it), <em>disputed</em>,
          or <em>outdated</em>. Each claim carries a documented confidence score —{" "}
          <a
            href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/CLAIM-CONFIDENCE-v2.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            the formula is public
          </a>
          . Publication count is not corroboration count: a dedicated{" "}
          <strong>independence engine</strong> classifies every pair of reports as independent,
          syndicated, or unclear — several outlets running one PTI dispatch count as a single
          confirmation, and &ldquo;unclear&rdquo; never counts as independent. The extraction is
          deterministic and rule-based — no language model in the deployed build — and wording
          may not be exact, so the original source text is always linked. The Common Ground Index
          is experimental and describes the state of the reporting, not a verdict on the event.
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
          The claim engine is measured against a hand-labelled gold corpus. See the{" "}
          <Link href="/methodology/quality" className="text-accent hover:underline">
            claim-quality dashboard
          </Link>{" "}
          for extraction, matching, contradiction and attribution scores — including the ones
          that are still weak.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Copyright &amp; provenance</h2>
        <ul className="mt-2 flex flex-col gap-2 text-[14px] leading-relaxed text-ink-2">
          <li>IFFA stores only the headline, source name, canonical URL, publication timestamp, a feed-provided short excerpt, and structured alert metadata.</li>
          <li>It never copies full article bodies, removes attribution, or circumvents a paywall.</li>
          <li>Every item links to the original publisher for the full report.</li>
          <li>IFFA summaries are never presented as the publisher&rsquo;s own wording.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-[20px] font-semibold">Limitations</h2>
        <ul className="mt-2 flex flex-col gap-2 text-[14px] leading-relaxed text-ink-2">
          <li>IFFA does not claim algorithmic neutrality. Clustering, geo-classification and claim extraction are rule-based and can err.</li>
          <li>Claims are extracted by deterministic rules from headlines and short excerpts. A structured <a href="https://github.com/Rishidar-lab/info-for-all/blob/main/docs/EVENT-IDENTITY.md" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">event-identity engine</a> now recovers every same-fact pair in the labelled corpus, but on live data the engine still holds some genuine matches apart — as <em>uncertain</em> rather than risk a wrong merge. It never merges a pair it is unsure about; precision and recall on the labelled corpus are both 100%. The linked source is authoritative.</li>
          <li>&ldquo;Independent source groups&rdquo; is an estimate from publisher, wire credit, near-identical headlines and shared verbatim passages. When it cannot tell, it says so and does not count the reports as independent.</li>
          <li>Tamil is handled by a conservative suffix normaliser plus place / concept lexicons — not a full Tamil NLP system. Tamil ↔ English matches require a shared district, a compatible date and a shared entity or action; a shared &ldquo;Tamil Nadu&rdquo; alone never merges. The original Tamil text is always kept.</li>
          <li>Metadata differences between reports are not claims of contradiction; only a genuine semantic conflict is marked &ldquo;disputed&rdquo;.</li>
          <li>Feeds go down. When they do, IFFA keeps the last known good snapshot, marks it stale, and never shows &ldquo;LIVE&rdquo;.</li>
          <li><strong>IFFA is not an emergency service.</strong> For any emergency, follow the issuing authority&rsquo;s own instructions.</li>
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
