import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { STORIES, storyForSlug, sourceFor } from "@/data/demo";
import { PERSPECTIVE_NOTE, RELIABILITY_NOTE } from "@/data/demo";
import { coverageSegments, fmtDateTime, hostname, publicationCount, PERSPECTIVE_LABEL } from "@/lib/ifa";
import { CoverageBar } from "@/components/ifa/coverage-bar";
import { PerspectiveBadge, ReliabilityBadge } from "@/components/ifa/badges";

export const dynamicParams = false;

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = storyForSlug(slug);
  if (!s) return { title: "Demonstration not found" };
  return { title: `${s.title} (demonstration)`, description: s.summary };
}

export default async function ExampleStory({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = storyForSlug(slug);
  if (!story) notFound();

  const sources = publicationCount(story);
  const segments = coverageSegments(story);
  const articles = [...story.articles].sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt));

  return (
    <article className="pb-6">
      <nav className="ui mb-4 flex items-center gap-2 text-[12px] text-ink-3">
        <Link href="/" className="link-quiet hover:text-accent">Live feed</Link>
        <span aria-hidden>/</span>
        <Link href="/methodology/examples" className="link-quiet hover:text-accent">Methodology demonstrations</Link>
        <span aria-hidden>/</span>
        <span className="text-ink-2">{story.category}</span>
      </nav>

      <aside className="card mb-6 border-caution/40 bg-caution-bg px-3 py-2.5 ui text-[12.5px] leading-snug text-ink-2" role="note">
        <span className="label !text-caution">Demonstration — not live reporting</span>
        <span className="mt-1 block">
          This is a synthetic comparison story. Publications, quotes and figures are invented to
          demonstrate IFFA&rsquo;s model. It is not a current event.
        </span>
      </aside>

      <header className="border-b-2 border-ink/80 pb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ui text-[12px] text-ink-3">
          <span className="label">{story.category}</span>
          <span>Demonstration story</span>
        </div>
        <h1 className="mt-2.5 max-w-4xl font-serif text-[28px] font-semibold leading-[1.16] tracking-tight sm:text-[34px]">
          {story.title}
        </h1>
        <p className="mt-3 max-w-3xl font-serif text-[16.5px] leading-relaxed text-ink-2">{story.summary}</p>
        <p className="mt-3 ui text-[13px] text-ink-2">
          Sources represented: <strong className="mono text-ink">{sources} publications</strong> ·{" "}
          <strong className="mono text-ink">{story.articles.length}</strong> reports compared
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-10">
        <section>
          <div className="label mb-2">Coverage overview</div>
          <div className="card max-w-xl p-4">
            <div className="label mb-2">Coverage perspectives (demonstration)</div>
            <CoverageBar story={story} />
          </div>
          <ul className="mt-3 ui text-[12px] leading-relaxed text-ink-3">
            <li>{segments.map((s) => `${PERSPECTIVE_LABEL[s.key]} ${s.pct}%`).join("  ·  ")}</li>
            <li className="mt-1">{PERSPECTIVE_NOTE}</li>
            <li className="mt-1">
              This Left/Center/Right view is used only for these demonstrations. The live feed uses
              evidence-role labels instead — see <Link href="/about" className="text-accent hover:underline">methodology</Link>.
            </li>
          </ul>
        </section>

        <section>
          <div className="mb-3 border-b border-rule-strong pb-2">
            <div className="label mb-1">What sources agree on</div>
            <h2 className="font-serif text-[19px] font-semibold text-ink">Common ground</h2>
          </div>
          <ul className="card divide-y divide-rule">
            {story.commonFacts.map((f) => (
              <li key={f} className="flex gap-3 px-4 py-3">
                <span aria-hidden className="mt-0.5 font-semibold text-agree">✓</span>
                <span className="text-[14.5px] leading-relaxed text-ink">{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-3 border-b border-rule-strong pb-2">
            <div className="label mb-1">Where coverage differs</div>
            <h2 className="font-serif text-[19px] font-semibold text-ink">Differences in emphasis and framing</h2>
          </div>
          <div className="flex flex-col gap-4">
            {story.coverageDifferences.map((d) => (
              <div key={d.topic} className="card overflow-hidden">
                <div className="border-b border-rule bg-surface-2 px-4 py-2">
                  <h3 className="ui text-[13px] font-semibold text-ink">{d.topic}</h3>
                </div>
                <ul className="divide-y divide-rule">
                  {d.observations.map((o) => (
                    <li key={o.publication} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                      <span className="ui text-[13px] font-semibold text-ink-2">{o.publication}</span>
                      <span className="text-[14px] leading-relaxed text-ink">{o.emphasis}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 border-b border-rule-strong pb-2">
            <div className="label mb-1">Source reporting</div>
            <h2 className="font-serif text-[19px] font-semibold text-ink">Every report ({story.articles.length})</h2>
          </div>
          <p className="ui mb-4 text-[12px] leading-relaxed text-ink-3">{RELIABILITY_NOTE}</p>
          <div className="flex flex-col gap-3">
            {articles.map((a) => {
              const src = sourceFor(a.publication);
              return (
                <div key={a.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="ui text-[14px] font-semibold text-ink">{a.publication}</span>
                    {src && <span className="ui text-[11px] text-ink-3">{src.region}</span>}
                    <span className="grow" />
                    <PerspectiveBadge perspective={a.perspective} />
                    <ReliabilityBadge reliability={a.reliability} />
                  </div>
                  <h3 className="mt-2 font-serif text-[16px] leading-snug text-ink">{a.headline}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">&ldquo;{a.excerpt}&rdquo;</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 ui text-[12px] text-ink-3">
                    <span>Published {fmtDateTime(a.publishedAt)}</span>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                      Open source ({hostname(a.url)}) <span aria-hidden>↗</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-10 border-t border-rule pt-4">
        <Link href="/methodology/examples" className="ui text-[13px] font-semibold text-accent hover:underline">
          <span aria-hidden>←</span> All demonstrations
        </Link>
      </div>
    </article>
  );
}
