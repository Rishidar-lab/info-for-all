import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How IFFA clusters stories, counts independent sources, records ownership, observes editorial alignment, detects blindspots, and grades claim evidence — and where each method is weak.",
};

const REPO = "https://github.com/Rishidar-lab/info-for-all/blob/main/docs";

const DOCS: { href: string; title: string; blurb: string; external?: boolean }[] = [
  { href: `${REPO}/MEDIA-LANDSCAPE.md`, external: true, title: "Media Landscape Intelligence", blurb: "Ownership, external ratings, observed alignment, selection/framing/stance, blindspots, the claim evidence matrix, discourse handling — and the six things IFFA never conflates." },
  { href: `${REPO}/METHODOLOGY.md`, external: true, title: "Pipeline methodology", blurb: "Ingestion, geo-classification, crisis priority — the base pipeline and its weaknesses." },
  { href: `${REPO}/EDITORIAL-MODEL.md`, external: true, title: "Editorial priority model", blurb: "How stories are ranked for prominence. A ranking score — not a probability of truth." },
  { href: `${REPO}/EVENT-IDENTITY.md`, external: true, title: "Event identity", blurb: "How reports are grouped into one story, and split when they are different events." },
  { href: `${REPO}/CLAIM-CONFIDENCE-v2.md`, external: true, title: "Claim confidence", blurb: "The frozen claim engine — corroboration, contradiction, primary evidence, corrections." },
  { href: `${REPO}/TREND-MODEL.md`, external: true, title: "Trend model", blurb: "What is changing and consequential — the eight sub-scores." },
  { href: "/methodology/quality", title: "Quality dashboard", blurb: "Every evaluation IFFA runs, with its numbers — including the honest first-pass figures and known limits." },
  { href: "/methodology/examples", title: "Worked examples", blurb: "Real clusters annotated end-to-end." },
];

const NEVER = [
  ["Bias ≠ falsehood", "A politically aligned article can be accurate; a neutral-looking one can be wrong."],
  ["Coverage asymmetry ≠ falsehood", "A blindspot is a fact about coverage, not about whether the story is true."],
  ["Source reliability ≠ article truth", "A publisher's record does not decide any individual claim."],
  ["Official source ≠ automatic truth", "A press release is evidence that an institution stated X — not that X is true."],
  ["Forum consensus ≠ evidence", "Discourse is never counted as independent factual corroboration."],
  ["Correlation ≠ editorial motive", "Observed coverage describes what was published, not a newsroom's intent."],
];

export default function MethodologyIndex() {
  return (
    <div className="min-w-0 pb-8">
      <header className="border-b-2 border-ink/80 pb-4">
        <div className="label">Methodology</div>
        <h1 className="mt-1 font-serif text-[27px] font-semibold leading-tight sm:text-[33px]">
          How IFFA works, and where it is weak
        </h1>
        <p className="ui mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-3">
          IFFA is designed to encourage verification rather than demand trust. Nothing below is hidden or
          hand-waved. No language model runs in the deployed build.
        </p>
      </header>

      <section className="mt-6">
        <div className="label mb-2">Six things IFFA never conflates</div>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {NEVER.map(([k, v]) => (
            <li key={k} className="card p-3.5">
              <p className="ui text-[13px] font-semibold text-ink">{k}</p>
              <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">{v}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <div className="label mb-2">The documents</div>
        <ul className="flex flex-col gap-2.5">
          {DOCS.map((d) => (
            <li key={d.href} className="card p-4">
              {d.external ? (
                <a href={d.href} target="_blank" rel="noopener noreferrer" className="font-serif text-[15px] font-semibold text-ink hover:text-accent">
                  {d.title} <span aria-hidden>↗</span>
                </a>
              ) : (
                <Link href={d.href} className="font-serif text-[15px] font-semibold text-ink hover:text-accent">
                  {d.title}
                </Link>
              )}
              <p className="ui mt-1 text-[12.5px] leading-relaxed text-ink-3">{d.blurb}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
