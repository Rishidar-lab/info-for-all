import type { Metadata } from "next";
import { CGI_WEIGHTS_V0_1, CGI_FORMULA_VERSION } from "@/lib/cgi";
import { SectionHeading } from "@/components/primitives";

export const metadata: Metadata = { title: "Methodology" };

function Method({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="label mb-2 border-b border-rule pb-1">{title}</h2>
      <div className="prose-measure space-y-2 font-serif text-[15px] text-ink-2">{children}</div>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <div className="space-y-8">
      <SectionHeading label="Methodology" title="How IFA produces every number" />
      <p className="prose-measure font-serif text-[16px] text-ink-2">
        IFA is designed to encourage verification rather than demand trust. This page states the
        method — and its weaknesses — for each stage. The full document lives in{" "}
        <code className="mono text-[13px]">docs/METHODOLOGY.md</code>.
      </p>

      <Method title="Event clustering">
        <p>
          Articles are grouped into events by a transparent heuristic: a weighted blend of title
          token overlap (0.40), named-entity overlap (0.35), body-keyword similarity (0.15) and
          temporal proximity (0.10). An article joins the best-matching event above a 0.38 threshold
          when it also shares an entity or has a strong title match; otherwise a new event is created.
        </p>
        <p className="text-ink-3 text-[13px]">
          Weakness: lexical/heuristic clustering mislabels rewritten headlines and merges distinct
          sub-stories. It is a replaceable module — an embedding reranker is the planned upgrade.
        </p>
      </Method>

      <Method title="Claim extraction">
        <p>
          The demo runs a deterministic, rule-based provider: sentences are split, filtered for
          claim-like structure (a figure, a quote, an attribution cue or a named entity), classified
          by type, and assigned an extraction-confidence heuristic. Every claim keeps its provenance —
          the source article and paragraph index.
        </p>
        <p className="text-ink-3 text-[13px]">
          Weakness: the rule-based extractor misses paraphrase and implicit claims and cannot resolve
          coreference. A real model provider (configured via <code className="mono">AI_PROVIDER</code>)
          improves recall; its output is still validated and still carries provenance.
        </p>
      </Method>

      <Method title="Corroboration">
        <p>
          Near-identical claims are grouped (high token-overlap or an explicit DUPLICATES link). A
          claim group is credited with one point of corroboration per <em>independent source
          cluster</em> that either authored a matching claim or whose article text lexically entails
          the group&rsquo;s strongest factual claim.
        </p>
      </Method>

      <Method title="Contradiction detection">
        <p>
          Claims that share entities or wording are compared for negation mismatch, incompatible
          scope (&ldquo;all&rdquo; vs &ldquo;only / high-risk&rdquo;) and conflicting figures. Detected
          conflicts are stored as CONTRADICTS edges with a confidence and a rationale. IFA does{" "}
          <strong>not</strong> automatically decide which side is correct.
        </p>
      </Method>

      <Method title="Source independence">
        <p>
          Ten outlets reprinting one wire dispatch are not ten independent confirmations. Articles are
          collapsed into independent clusters when they share an ownership group, carry the same wire
          service, or have near-duplicate body text. The independence ratio and per-article discount
          weights feed the Common Ground Index.
        </p>
      </Method>

      <Method title="Evidence hierarchy">
        <p>
          Primary sources — legislation, official statements, transcripts, filings, datasets, public
          records — are marked and shown apart from journalism. For scoring, a not-yet-peer-reviewed
          research paper counts as primary <em>provenance</em> but not authoritative confirmation.
        </p>
      </Method>

      <Method title={`Common Ground Index (${CGI_FORMULA_VERSION})`}>
        <p>
          The CGI is an experimental 0–100 estimate of how far independently sourced reporting
          converges on an event&rsquo;s core factual claims. It is <strong>not</strong> a truth score
          and <strong>not</strong> a political-neutrality score. It starts from a baseline of{" "}
          {CGI_WEIGHTS_V0_1.base} and adds a signed, weighted contribution for each component:
        </p>
        <table className="mt-2 w-full ui text-[13px]">
          <thead>
            <tr className="label text-left">
              <th className="py-1 font-semibold">Component</th>
              <th className="py-1 text-right font-semibold">Weight</th>
              <th className="py-1 pl-3 font-semibold">Direction</th>
            </tr>
          </thead>
          <tbody>
            {CGI_WEIGHTS_V0_1.components.map((c) => (
              <tr key={c.key} className="border-t border-rule/60">
                <td className="py-1 pr-3">{c.label}</td>
                <td className="py-1 text-right mono">{c.weight}</td>
                <td className={`py-1 pl-3 ${c.direction === "negative" ? "text-dispute" : "text-agree"}`}>
                  {c.direction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2">
          The score is clamped to 0–100. Bands: 90–100 very high, 70–89 high, 50–69 mixed, 30–49
          substantial disagreement, 0–29 very low. Component values are stored per score, so the
          formula can change without losing history. Every event page shows its exact breakdown under
          &ldquo;How this was calculated&rdquo;.
        </p>
        <p className="text-ink-3 text-[13px]">
          Weakness: the weights are hand-set and unvalidated. The CGI is a starting point for
          discussion, not a settled measure.
        </p>
      </Method>

      <Method title="Uncertainty">
        <p>
          &ldquo;What we don&rsquo;t know yet&rdquo; is surfaced explicitly: missing primary
          documents, single-source or anonymous-source claims, active disputes and still-developing
          events. IFA never presents uncertain information with misleading certainty.
        </p>
      </Method>

      <Method title="AI limitations">
        <p>
          Any model-generated text (summaries, extracted claims, detected contradictions) retains
          references to the material it was produced from. IFA never stores a conclusion without its
          provenance. Model output is treated as a lead to verify, not as fact.
        </p>
      </Method>
    </div>
  );
}
