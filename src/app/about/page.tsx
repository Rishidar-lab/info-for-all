import Link from "next/link";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/primitives";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="prose-measure space-y-8">
      <div>
        <SectionHeading label="About" title="What IFA is" />
        <p className="font-serif text-[16px] text-ink-2">
          IFA — Info For All — is an evidence-first information platform. Traditional aggregators
          organise <em>articles</em>. IFA organises <em>events, sources, claims, evidence,
          disagreements, timelines, corrections</em> and <em>provenance</em>, so a reader can move
          from headline → story → sources → claims → evidence → uncertainty.
        </p>
      </div>

      <div>
        <h2 className="label mb-2 border-b border-rule pb-1">The five questions</h2>
        <ol className="ml-4 list-decimal space-y-1 font-serif text-[15px] text-ink-2">
          <li>What happened?</li>
          <li>What sources are reporting it?</li>
          <li>Which factual claims are independently corroborated?</li>
          <li>Where do sources disagree?</li>
          <li>What evidence actually supports each claim?</li>
        </ol>
      </div>

      <div>
        <h2 className="label mb-2 border-b border-rule pb-1">Product principle</h2>
        <p className="font-serif text-[16px] text-ink-2">
          IFA does not decide what users should believe. It provides sources, claims, evidence,
          provenance, agreement, disagreement, context and uncertainty. The reader decides what
          conclusions are justified.
        </p>
        <p className="mt-2 font-serif text-[16px] text-ink-2">
          IFA never treats averaging political viewpoints as truth. It distinguishes factual
          convergence, narrative agreement, ideological framing, disputed interpretation, uncertain
          information and unsupported claims. It does not assign political-bias scores to sources.
        </p>
      </div>

      <div>
        <h2 className="label mb-2 border-b border-rule pb-1">Independence</h2>
        <p className="font-serif text-[16px] text-ink-2">
          IFA is inspired by the general idea of comparing news coverage, but it is an independent
          implementation with its own data model, methodology and interface. It does not use any other
          platform&rsquo;s datasets, ratings, algorithms, branding or content.
        </p>
      </div>

      <div>
        <h2 className="label mb-2 border-b border-rule pb-1">This instance</h2>
        <p className="font-serif text-[16px] text-ink-2">
          You are looking at <strong>IFA MVP v0.1</strong> running entirely on synthetic{" "}
          <strong>DEMO DATA</strong>. Every publication, person, organisation and event is fictional.
          The pipeline (ingestion → clustering → claim extraction → evidence linking →
          corroboration / contradiction → Common Ground Index) is real and runs with a deterministic
          mock intelligence provider; production deployments can plug in a real model provider.
        </p>
        <p className="mt-3 ui text-[13px] text-ink-3">
          See <Link href="/methodology" className="underline">Methodology</Link> for how each number is
          produced, and <Link href="/api/health" className="underline">/api/health</Link> for system
          status.
        </p>
      </div>
    </div>
  );
}
