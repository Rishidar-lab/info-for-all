import Link from "next/link";
import type { StoryCluster } from "@/data/demo";
import { fmtDate, publicationCount } from "@/lib/ifa";
import { CoverageBar } from "./coverage-bar";

export function StoryClusterCard({ story }: { story: StoryCluster }) {
  const previews = story.articles.slice(0, 3);
  const sources = publicationCount(story);

  return (
    <article className="card flex flex-col p-4 transition-colors hover:border-rule-strong">
      <div className="flex items-center justify-between gap-2">
        <span className="label">{story.category}</span>
        <span className="ui text-[11px] text-ink-3">
          Updated {fmtDate(story.updatedAt)}
        </span>
      </div>

      <h3 className="mt-2 font-serif text-[19px] leading-snug">
        <Link href={`/story/${story.slug}`} className="link-quiet">
          {story.title}
        </Link>
      </h3>

      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{story.summary}</p>

      <div className="mt-3 flex items-center gap-2 ui text-[12px] text-ink-3">
        <span className="mono font-semibold text-ink">{sources}</span>
        <span>publications</span>
        <span className="text-rule-strong">·</span>
        <span className="mono font-semibold text-ink">{story.articles.length}</span>
        <span>reports</span>
      </div>

      <div className="mt-3">
        <div className="label mb-1.5">Coverage perspectives</div>
        <CoverageBar story={story} size="sm" />
      </div>

      <ul className="mt-3 flex flex-col gap-1 border-t border-rule pt-3 ui text-[12px] text-ink-3">
        {previews.map((a) => (
          <li key={a.id} className="flex min-w-0 gap-2">
            <span className="shrink-0 font-semibold text-ink-2">{a.publication}</span>
            <span className="truncate">{a.headline}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 pt-1">
        <Link
          href={`/story/${story.slug}`}
          className="ui inline-flex items-center gap-1 border border-rule-strong px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Compare coverage <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
