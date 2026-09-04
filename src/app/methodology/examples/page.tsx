import type { Metadata } from "next";
import Link from "next/link";
import { STORIES } from "@/data/demo";
import { CoverageBar } from "@/components/iffa/coverage-bar";
import { publicationCount } from "@/lib/ifa";

export const metadata: Metadata = {
  title: "Methodology demonstrations",
  description:
    "Synthetic comparison stories that demonstrate IFFA's model. Not current events and not live reporting.",
};

export default function ExamplesIndex() {
  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Methodology demonstrations</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight sm:text-[36px]">
          How IFFA&rsquo;s comparison model works
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          These are <strong>synthetic</strong> comparison stories. Every publication, quote,
          figure and event is invented to demonstrate the model — one event, several sources,
          what they agree on, how framing differs, and where each claim came from. They are not
          current events and are never shown in the live feed.
        </p>
      </header>

      <aside className="card border-caution/40 bg-caution-bg px-3 py-2.5 ui text-[12.5px] leading-snug text-ink-2" role="note">
        <span className="label !text-caution">Demonstration dataset</span>
        <span className="mt-1 block">
          Source metadata and story examples are synthetic and are provided to demonstrate IFFA&rsquo;s
          comparison model. They should not be interpreted as live reporting. Publication links point
          to reserved <span className="mono">.example</span> domains.
        </span>
      </aside>

      <div className="grid gap-4 md:grid-cols-2">
        {STORIES.map((s) => (
          <article key={s.id} className="card flex flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="label">{s.category}</span>
              <span className="ui text-[11px] text-ink-3">
                {publicationCount(s)} publications · {s.articles.length} reports
              </span>
            </div>
            <h2 className="mt-2 font-serif text-[17px] leading-snug">
              <Link href={`/methodology/examples/${s.slug}`} className="link-quiet">
                {s.title}
              </Link>
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{s.summary}</p>
            <div className="mt-3">
              <div className="label mb-1.5">Coverage perspectives (demonstration)</div>
              <CoverageBar story={s} size="sm" />
            </div>
            <div className="mt-4 pt-1">
              <Link
                href={`/methodology/examples/${s.slug}`}
                className="ui inline-flex items-center gap-1 border border-rule-strong px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
              >
                Open demonstration <span aria-hidden>→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>

      <p className="ui text-[12.5px] text-ink-3">
        Back to the <Link href="/" className="text-accent hover:underline">live feed</Link> ·{" "}
        <Link href="/about" className="text-accent hover:underline">methodology</Link>
      </p>
    </div>
  );
}
