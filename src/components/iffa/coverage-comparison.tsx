import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { cn } from "@/lib/format";

const OFFICIAL_ROLES = new Set(["official-alert", "primary-document", "government-statement"]);

function Group({
  title,
  tone,
  articles,
}: {
  title: string;
  tone: string;
  articles: LiveArticle[];
}) {
  if (articles.length === 0) return null;
  return (
    <div className="card p-3.5">
      <div className={cn("label mb-1.5", tone)}>{title} · {articles.length}</div>
      <ul className="flex flex-col gap-2">
        {articles.slice(0, 6).map((a) => (
          <li key={a.id} className="ui text-[12.5px] leading-snug text-ink-2">
            <span className="font-semibold text-ink">{a.publisher}</span>
            {a.language === "ta" && <span className="ml-1 text-ink-3">· தமிழ்</span>}
            <span className="mt-0.5 block text-ink-2">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline">
                {a.title}
              </a>
            </span>
            {a.excerpt && <span className="mt-0.5 block text-[11.5px] text-ink-3">{a.excerpt.slice(0, 180)}{a.excerpt.length > 180 ? "…" : ""}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Descriptive cross-source comparison. It reports what each family EMPHASISES —
 * it never infers "bias" from a difference in coverage.
 */
export function CoverageComparison({ cluster, articles }: { cluster: LiveCluster; articles: LiveArticle[] }) {
  if (articles.length < 2) return null;

  const official = articles.filter((a) => OFFICIAL_ROLES.has(a.evidenceRole));
  const tamil = articles.filter((a) => a.language === "ta" && !OFFICIAL_ROLES.has(a.evidenceRole));
  const english = articles.filter((a) => a.language === "en" && !OFFICIAL_ROLES.has(a.evidenceRole));
  const other = articles.filter(
    (a) => !OFFICIAL_ROLES.has(a.evidenceRole) && a.language !== "ta" && a.language !== "en",
  );

  const agreement = cluster.commonGround ?? [];
  const differences = cluster.differences ?? [];
  const unknowns = cluster.unknowns ?? [];

  // information appearing in only one source family
  const families = cluster.trendData?.independence?.families ?? cluster.distinctPublishers;
  const singleFamilyNote =
    families <= 1
      ? "All reporting so far traces to a single newsroom / one upstream dispatch."
      : cluster.trendData?.independence?.syndicated
        ? `${cluster.trendData.independence.syndicated} of these reports appear to be syndicated copies, not independent confirmation.`
        : null;

  return (
    <section>
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">Compare coverage</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">How the sources describe this event</h2>
        <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
          Descriptive only. A difference in emphasis between outlets is not evidence of bias, and
          IFFA does not label it as such.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Group title="Official / primary sources" tone="text-agree" articles={official} />
        <Group title="English outlets" tone="text-ink-2" articles={english} />
        <Group title="Tamil outlets" tone="text-ink-2" articles={tamil} />
        <Group title="Other" tone="text-ink-3" articles={other} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-3.5">
          <div className="label mb-1.5 text-agree">Points of agreement</div>
          {agreement.length > 0 ? (
            <ul className="flex flex-col gap-1 ui text-[12.5px] leading-snug text-ink-2">
              {agreement.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          ) : (
            <p className="ui text-[12px] text-ink-3">No structured shared fact has been extracted yet.</p>
          )}
        </div>
        <div className="card p-3.5">
          <div className="label mb-1.5 text-caution">Where coverage differs</div>
          {differences.length > 0 ? (
            <ul className="flex flex-col gap-1.5 ui text-[12px] leading-snug text-ink-2">
              {differences.map((d, i) => (
                <li key={i}>
                  <span className="font-semibold text-ink">{d.field}:</span>{" "}
                  {d.observations.map((o) => `${o.sourceName} — ${o.value}`).join(" · ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ui text-[12px] text-ink-3">No material metadata difference between reports.</p>
          )}
        </div>
      </div>

      {(unknowns.length > 0 || singleFamilyNote) && (
        <div className="card mt-3 bg-surface-2 p-3.5">
          <div className="label mb-1.5">Not established</div>
          <ul className="flex flex-col gap-1 ui text-[12px] leading-snug text-ink-2">
            {singleFamilyNote && <li className="text-caution">{singleFamilyNote}</li>}
            {unknowns.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
