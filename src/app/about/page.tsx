import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice } from "@/components/ifa/demo-notice";

export const metadata: Metadata = {
  title: "About & Methodology",
  description:
    "Why IFA exists, how the comparison model works, and the limitations of classifying coverage.",
};

const PIPELINE = [
  ["Articles", "Reporting on an event is collected from many publications."],
  ["Normalization", "Text, metadata and timestamps are put into a common shape."],
  ["Story clustering", "Reports about the same underlying event are grouped."],
  ["Claim comparison", "Shared factual points and differences in framing are identified."],
  ["Source metadata", "Each publication carries perspective and reliability, kept separate."],
  ["Transparent synthesis", "The comparison is presented with its assumptions visible."],
];

export default function AboutPage() {
  return (
    <div className="prose-measure flex flex-col gap-10">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">About &amp; Methodology</p>
        <h1 className="mt-2 font-serif text-[32px] leading-tight tracking-tight sm:text-[38px]">
          Information abundance does not automatically create understanding.
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
          Reading more articles does not necessarily produce a clearer picture. IFA is built
          around comparison, provenance, source diversity, evidence visibility and epistemic
          transparency — the parts of news that a single article, and a single feed, tend to
          hide.
        </p>
      </header>

      <DemoNotice />

      <section>
        <h2 className="font-serif text-[22px] font-semibold">What IFA is designed around</h2>
        <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed text-ink-2">
          <li>
            <strong className="text-ink">Comparison.</strong> One event, placed next to the
            several newsrooms covering it.
          </li>
          <li>
            <strong className="text-ink">Provenance.</strong> Every claim links back to a
            publication; every publication carries visible metadata.
          </li>
          <li>
            <strong className="text-ink">Source diversity.</strong> Coverage is shown across
            editorial perspectives rather than collapsed into one voice.
          </li>
          <li>
            <strong className="text-ink">Evidence visibility.</strong> What is agreed, what
            differs, and what is still uncertain are kept distinct.
          </li>
          <li>
            <strong className="text-ink">Epistemic transparency.</strong> The method and its
            assumptions are stated, and are meant to be revised.
          </li>
        </ul>

        <blockquote className="mt-5 border-l-2 border-accent pl-4 font-serif text-[17px] leading-relaxed text-ink">
          Neutrality is not the absence of perspective. Transparency means knowing where
          information came from, what evidence supports it, and how alternative reporting
          differs.
        </blockquote>
      </section>

      <section>
        <h2 className="font-serif text-[22px] font-semibold">
          Perspective and reliability are separate
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          IFA uses a deliberately coarse perspective scale — <strong>Left</strong>,{" "}
          <strong>Center</strong>, <strong>Right</strong> — to describe the broad editorial
          orientation of a publication. It says nothing about whether a given report is
          accurate. Reliability is tracked as a separate dimension —{" "}
          <strong>High</strong>, <strong>Mixed</strong>, <strong>Unknown</strong> — and a
          centrist outlet is not treated as more truthful for being centrist. Both dimensions in
          this build are demonstration metadata, not audited scores.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-[22px] font-semibold">The intended pipeline</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          This MVP runs on a fixed demonstration dataset. The pipeline it is designed to grow
          into:
        </p>
        <ol className="mt-4 flex flex-col gap-0 overflow-hidden rounded-[3px] border border-rule">
          {PIPELINE.map(([name, desc], i) => (
            <li
              key={name}
              className="grid grid-cols-1 gap-1 border-b border-rule px-4 py-3 last:border-b-0 sm:grid-cols-[200px_1fr] sm:gap-4"
            >
              <span className="ui text-[13px] font-semibold text-ink">
                <span className="mono text-ink-3">{String(i + 1).padStart(2, "0")}</span>{" "}
                {name}
              </span>
              <span className="text-[14px] leading-relaxed text-ink-2">{desc}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-3">
          Any automated system in that pipeline must expose uncertainty rather than pretend that
          classification is objective. A confidence figure, a dissent, an unresolved cluster and
          a contested label are all outputs worth showing.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-[22px] font-semibold">Limitations</h2>
        <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed text-ink-2">
          <li>Classifications are contestable and will not match every reader&rsquo;s judgement.</li>
          <li>Neutral synopses and agreement summaries can omit real nuance.</li>
          <li>Story clustering can group things that do not belong together, or split what does.</li>
          <li>
            Political orientation and factual reliability are different questions; treating them
            as one produces bad conclusions.
          </li>
          <li>
            IFA is a starting point. The primary and original sources remain the thing to read.
          </li>
          <li>The methodology should be transparent, versioned and open to correction.</li>
        </ul>
      </section>

      <section className="card bg-surface-2 p-5">
        <h2 className="font-serif text-[18px] font-semibold">Data status</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          Every publication, quote, figure, person and event in this instance is synthetic.
          Publication links point to <span className="mono">.example</span> domains, which cannot
          resolve to a real site. Demonstration stories are written to be realistic and
          non-time-sensitive; they are not claims about current events.
        </p>
        <p className="mt-3 text-[13px] text-ink-3">
          Start from the{" "}
          <Link href="/" className="text-accent hover:underline">
            story clusters
          </Link>{" "}
          or the{" "}
          <Link href="/sources" className="text-accent hover:underline">
            source directory
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
