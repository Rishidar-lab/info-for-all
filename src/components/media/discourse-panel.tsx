import type { DiscourseMention, EmergingClaim } from "@/lib/media-landscape/types";
import { cn } from "@/lib/format";

function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) + " IST";
  } catch {
    return iso;
  }
}

export function DiscoursePanel({ mentions }: { mentions: DiscourseMention[] }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">Public discourse</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">What people are saying outside the news</h2>
        <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
          Public posts (Reddit today) that appear to discuss this story. <strong>This is not journalism and
          never counts as corroboration</strong> — engagement numbers are shown for context only and are never
          used in any score.
        </p>
      </div>
      {mentions.length === 0 ? (
        <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
          No matched public discussion for this story in the latest discourse pull.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {mentions.map((m) => (
            <li key={m.id} className="card p-3.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 ui text-[11px] text-ink-3">
                <span className="font-semibold text-ink-2">{m.channel}</span>
                <span aria-hidden>·</span>
                <span>{fmt(m.publishedAt)}</span>
                {m.stance !== "unclear" && (
                  <span className={cn("pill", m.stance === "critical" ? "bg-dispute-bg text-dispute" : m.stance === "supportive" ? "bg-caution-bg text-caution" : "bg-surface-2 text-ink-3")}>
                    {m.stance}
                  </span>
                )}
                {m.engagement?.score != null && <span>▲ {m.engagement.score}</span>}
              </div>
              <p className="mt-1.5 ui text-[13px] leading-snug text-ink">{m.title}</p>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block ui text-[11.5px] font-semibold text-accent hover:underline">
                Open the thread ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function EmergingClaimsPanel({ claims }: { claims: EmergingClaim[] }) {
  if (!claims.length) return null;
  return (
    <section className="min-w-0">
      <div className="label mb-1.5 text-[10px]">Emerging / unverified public claims</div>
      <p className="ui mb-2 text-[11.5px] leading-relaxed text-ink-3">
        Seen repeatedly in public discourse but <strong>not</strong> in news reports or primary sources. IFFA does
        <strong> not</strong> promote these to confirmed news.
      </p>
      <ul className="flex flex-col gap-2">
        {claims.map((c, i) => (
          <li key={i} className="card border-caution/40 p-3.5">
            <span className="pill bg-caution-bg text-caution">EMERGING / UNVERIFIED</span>
            <p className="mt-1.5 ui text-[13px] text-ink">{c.claim}</p>
            <p className="mt-1 ui text-[11px] text-ink-3">
              <span className="mono">{c.discourseMentions}</span> discourse mentions ·{" "}
              <span className="mono">{c.distinctChannels}</span> channels ·{" "}
              <span className="mono text-dispute">{c.newsReports}</span> news reports ·{" "}
              <span className="mono text-dispute">{c.primarySources}</span> primary sources
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
