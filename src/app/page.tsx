import Link from "next/link";
import { STORIES } from "@/data/demo";
import { PERSPECTIVE_NOTE } from "@/data/demo";
import { StoryClusterCard } from "@/components/ifa/story-card";
import { DemoNotice } from "@/components/ifa/demo-notice";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="border-b border-rule-strong pb-8">
        <p className="label">Info For All · IFA</p>
        <h1 className="mt-2 max-w-3xl font-serif text-[34px] leading-[1.12] tracking-tight sm:text-[44px]">
          See the story. Compare the coverage.
        </h1>
        <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-ink-2">
          IFA groups reporting around the same event so you can inspect what sources agree on,
          where their framing differs, and where each claim came from.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 ui text-[13px]">
          <a
            href="#stories"
            className="inline-flex items-center gap-1 border border-rule-strong px-3.5 py-2 font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Browse story clusters <span aria-hidden>↓</span>
          </a>
          <Link
            href="/about"
            className="inline-flex items-center gap-1 px-1 py-2 font-semibold text-accent"
          >
            How IFA works <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <DemoNotice />

      {/* Story clusters */}
      <section id="stories" className="scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-strong pb-2">
          <div>
            <div className="label mb-1">Story clusters</div>
            <h2 className="font-serif text-[22px] font-semibold">
              One event, seen through multiple newsrooms
            </h2>
          </div>
          <p className="ui text-[12px] text-ink-3">
            {STORIES.length} demonstration stories
          </p>
        </div>

        <p className="ui mb-5 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">
          {PERSPECTIVE_NOTE}
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STORIES.map((story) => (
            <StoryClusterCard key={story.id} story={story} />
          ))}
        </div>
      </section>

      {/* Model explainer strip */}
      <section className="card bg-surface-2 p-5">
        <div className="label mb-2">The comparison model</div>
        <ol className="grid grid-cols-1 gap-3 ui text-[13px] text-ink-2 sm:grid-cols-2 lg:grid-cols-4">
          <li>
            <span className="mono text-ink-3">01</span>
            <p className="mt-0.5 font-semibold text-ink">Multiple sources per story</p>
            <p className="mt-0.5 leading-snug">
              Reporting on one underlying event is collected into a single cluster.
            </p>
          </li>
          <li>
            <span className="mono text-ink-3">02</span>
            <p className="mt-0.5 font-semibold text-ink">Common ground</p>
            <p className="mt-0.5 leading-snug">
              Factual points that several independent reports support.
            </p>
          </li>
          <li>
            <span className="mono text-ink-3">03</span>
            <p className="mt-0.5 font-semibold text-ink">Where coverage differs</p>
            <p className="mt-0.5 leading-snug">
              Differences in emphasis and framing, aspect by aspect — not automatic
              contradictions.
            </p>
          </li>
          <li>
            <span className="mono text-ink-3">04</span>
            <p className="mt-0.5 font-semibold text-ink">Source provenance</p>
            <p className="mt-0.5 leading-snug">
              Perspective and reliability shown separately, with a link out to each publication.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
