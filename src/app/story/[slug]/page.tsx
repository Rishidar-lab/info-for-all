import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { STORIES, storyForSlug, sourceFor } from "@/data/demo";
import { PERSPECTIVE_NOTE, RELIABILITY_NOTE } from "@/data/demo";
import {
  PERSPECTIVE_LABEL,
  coverageSegments,
  fmtDate,
  fmtDateTime,
  hostname,
  publicationCount,
} from "@/lib/ifa";
import { CoverageBar } from "@/components/ifa/coverage-bar";
import { PerspectiveBadge, ReliabilityBadge } from "@/components/ifa/badges";
import { DemoNotice } from "@/components/ifa/demo-notice";

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.slug }));
}

// The demonstration dataset is fixed: any slug outside it is a genuine 404.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = storyForSlug(slug);
  if (!story) return { title: "Story not found" };
  return { title: story.title, description: story.summary };
}

function SectionHeading({
  n,
  label,
  title,
  id,
}: {
  n: string;
  label: string;
  title: string;
  id: string;
}) {
  return (
    <div id={id} className="mb-3 scroll-mt-4 border-b border-rule-strong pb-2">
      <div className="label mb-1">
        <span className="mono text-ink-3">{n}</span> · {label}
      </div>
      <h2 className="font-serif text-[21px] font-semibold text-ink">{title}</h2>
    </div>
  );
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = storyForSlug(slug);
  if (!story) notFound();

  const sources = publicationCount(story);
  const segments = coverageSegments(story);
  const articles = [...story.articles].sort(
    (a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt),
  );

  return (
    <article className="pb-6">
      {/* 1 · Breadcrumb / back navigation */}
      <nav className="ui mb-4 flex items-center gap-2 text-[12px] text-ink-3">
        <Link href="/" className="link-quiet hover:text-accent">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span>Story clusters</span>
        <span aria-hidden>/</span>
        <span className="text-ink-2">{story.category}</span>
      </nav>

      {/* 2 · Category + date  ·  3 · Title  ·  4 · Synopsis  ·  5 · Sources represented */}
      <header className="border-b-2 border-ink/80 pb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ui text-[12px] text-ink-3">
          <span className="label">{story.category}</span>
          <span>Published {fmtDate(story.publishedAt)}</span>
          <span className="text-rule-strong">·</span>
          <span>Updated {fmtDate(story.updatedAt)}</span>
        </div>

        <h1 className="mt-2.5 max-w-4xl font-serif text-[30px] font-semibold leading-[1.14] tracking-tight sm:text-[37px]">
          {story.title}
        </h1>

        <p className="mt-3 max-w-3xl font-serif text-[17.5px] leading-relaxed text-ink-2">
          {story.summary}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 ui text-[13px] text-ink-2">
          <span>
            Sources represented:{" "}
            <strong className="mono text-ink">{sources} publications</strong>
          </span>
          <span>
            <strong className="mono text-ink">{story.articles.length}</strong> reports compared
          </span>
        </div>
      </header>

      {/* Section jump nav */}
      <nav className="ui sticky top-0 z-20 -mx-4 mb-6 flex gap-x-4 overflow-x-auto border-b border-rule bg-paper/95 px-4 py-2 text-[12px] whitespace-nowrap backdrop-blur">
        {[
          ["coverage", "Coverage overview"],
          ["common-ground", "Common ground"],
          ["differs", "Where coverage differs"],
          ["reporting", "Source reporting"],
          ["methodology", "Methodology & limitations"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 text-ink-2 hover:text-accent">
            {label}
          </a>
        ))}
      </nav>

      <DemoNotice className="mb-8" />

      <div className="flex flex-col gap-10">
        {/* 6 · Coverage overview */}
        <section>
          <SectionHeading
            n="06"
            label="Coverage overview"
            title="How the reporting is distributed by editorial perspective"
            id="coverage"
          />
          <div className="card max-w-xl p-4">
            <div className="label mb-2">Coverage perspectives</div>
            <CoverageBar story={story} />
          </div>
          <ul className="mt-3 ui text-[12px] leading-relaxed text-ink-3">
            <li>
              {segments
                .map((s) => `${PERSPECTIVE_LABEL[s.key]} ${s.pct}%`)
                .join("  ·  ")}{" "}
              of {story.articles.length} demonstration reports.
            </li>
            <li className="mt-1">{PERSPECTIVE_NOTE}</li>
            <li className="mt-1">
              A larger centre share does not imply that centre coverage is more accurate.
            </li>
          </ul>
        </section>

        {/* 7 · What sources agree on */}
        <section>
          <SectionHeading
            n="07"
            label="What sources agree on"
            title="Common ground"
            id="common-ground"
          />
          <p className="ui mb-3 text-[12.5px] text-ink-3">
            Factual points supported by multiple reports in this cluster. These are
            demonstration facts tied to the demonstration story.
          </p>
          <ul className="card divide-y divide-rule">
            {story.commonFacts.map((fact) => (
              <li key={fact} className="flex gap-3 px-4 py-3">
                <span aria-hidden className="mt-0.5 font-semibold text-agree">
                  ✓
                </span>
                <span className="text-[15px] leading-relaxed text-ink">{fact}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 8 · Where coverage differs */}
        <section>
          <SectionHeading
            n="08"
            label="Where coverage differs"
            title="Differences in emphasis and framing"
            id="differs"
          />
          <p className="ui mb-4 text-[12.5px] leading-relaxed text-ink-3">
            These are differences in what each report emphasises or how it frames the event —
            not automatic contradictions. Publications can all be accurate and still choose
            different angles, sources and context.
          </p>
          <div className="flex flex-col gap-4">
            {story.coverageDifferences.map((diff) => (
              <div key={diff.topic} className="card overflow-hidden">
                <div className="border-b border-rule bg-surface-2 px-4 py-2">
                  <h3 className="ui text-[13px] font-semibold tracking-wide text-ink">
                    {diff.topic}
                  </h3>
                </div>
                <ul className="divide-y divide-rule">
                  {diff.observations.map((obs) => (
                    <li
                      key={obs.publication}
                      className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4"
                    >
                      <span className="ui text-[13px] font-semibold text-ink-2">
                        {obs.publication}
                      </span>
                      <span className="text-[14.5px] leading-relaxed text-ink">
                        {obs.emphasis}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 9 · Source reporting */}
        <section>
          <SectionHeading
            n="09"
            label="Source reporting"
            title={`Every report in this cluster (${story.articles.length})`}
            id="reporting"
          />
          <p className="ui mb-4 text-[12.5px] leading-relaxed text-ink-3">
            {RELIABILITY_NOTE} Links open each publication&rsquo;s homepage — demonstration data
            does not link to specific articles.
          </p>
          <div className="flex flex-col gap-3">
            {articles.map((a) => {
              const src = sourceFor(a.publication);
              return (
                <div key={a.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="ui text-[14px] font-semibold text-ink">
                      {a.publication}
                    </span>
                    {src && (
                      <span className="ui text-[11px] text-ink-3">{src.region}</span>
                    )}
                    <span className="grow" />
                    <PerspectiveBadge perspective={a.perspective} />
                    <ReliabilityBadge reliability={a.reliability} />
                  </div>

                  <h3 className="mt-2 font-serif text-[16.5px] leading-snug text-ink">
                    {a.headline}
                  </h3>

                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                    &ldquo;{a.excerpt}&rdquo;
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 ui text-[12px] text-ink-3">
                    <span>Published {fmtDateTime(a.publishedAt)}</span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-accent hover:underline"
                    >
                      Open original source ({hostname(a.url)}) <span aria-hidden>↗</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 10 · Methodology / limitations */}
        <section>
          <SectionHeading
            n="10"
            label="Methodology & limitations"
            title="How to read this comparison"
            id="methodology"
          />
          <div className="card bg-surface-2 p-5 prose-measure">
            <p className="text-[15px] font-semibold text-ink">
              IFA does not claim algorithmic neutrality.
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-[14px] leading-relaxed text-ink-2">
              <li>
                Perspective classifications are contestable and describe broad editorial
                orientation, not factual accuracy.
              </li>
              <li>
                Political orientation and factual reliability are separate dimensions and are
                shown separately here.
              </li>
              <li>
                Neutral synopses and &ldquo;common ground&rdquo; summaries can omit nuance
                present in the full reports.
              </li>
              <li>
                Grouping reports into one story can produce clustering errors — a report may
                belong to a different event, or an event may deserve to be split.
              </li>
              <li>
                &ldquo;Where coverage differs&rdquo; describes emphasis and framing. It is not a
                claim that any report is wrong.
              </li>
              <li>
                You should treat this as a starting point and inspect the primary and original
                sources yourself.
              </li>
            </ul>
            <p className="mt-4 text-[13px] text-ink-3">
              Read the full{" "}
              <Link href="/about" className="text-accent hover:underline">
                methodology
              </Link>
              .
            </p>
          </div>
        </section>
      </div>

      <div className="mt-10 border-t border-rule pt-4">
        <Link href="/" className="ui text-[13px] font-semibold text-accent hover:underline">
          <span aria-hidden>←</span> Back to all story clusters
        </Link>
      </div>
    </article>
  );
}
