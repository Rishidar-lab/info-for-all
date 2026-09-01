import type { TimelineEntryView } from "@/lib/domain/view";
import { labelize } from "@/lib/ui";
import { formatDateTime } from "@/lib/format";

const TYPE_TONE: Record<string, string> = {
  correction: "text-dispute",
  escalation: "text-caution",
  document_published: "text-evidence",
  confirmation: "text-agree",
};

export function Timeline({ entries }: { entries: TimelineEntryView[] }) {
  if (entries.length === 0) return <p className="ui text-[13px] text-ink-3">No timeline entries.</p>;

  return (
    <ol className="relative ml-2 border-l border-rule-strong">
      {entries.map((e) => (
        <li key={e.id} className="relative py-2.5 pl-5">
          <span className="absolute -left-[5px] top-4 h-2 w-2 rounded-full border border-rule-strong bg-surface" />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <time className="mono text-[11.5px] text-ink-3">{formatDateTime(e.occurredAt)}</time>
            <span className={`label ${TYPE_TONE[e.type] ?? "text-ink-3"}`}>{labelize(e.type)}</span>
            <span className="mono text-[10.5px] text-ink-3" title="Confidence in this entry">
              conf {Math.round(e.confidence * 100)}%
            </span>
          </div>
          <p className="mt-0.5 font-serif text-[14.5px] leading-snug text-ink">{e.headline}</p>
          {e.detail && <p className="mt-0.5 ui text-[12.5px] text-ink-2">{e.detail}</p>}
          {e.sourceArticle && (
            <a
              href={e.sourceArticle.url}
              target="_blank"
              rel="noreferrer"
              className="ui text-[11.5px] text-accent hover:underline"
            >
              source: {e.sourceArticle.title}
            </a>
          )}
        </li>
      ))}
    </ol>
  );
}
