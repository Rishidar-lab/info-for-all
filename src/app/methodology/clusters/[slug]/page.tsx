import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dataset, clusterBySlug, clusterArticles, istTimestamp } from "@/lib/live/dataset";
import { cn } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  // every cluster that carries an identity record OR is a verified comparison
  return dataset.clusters
    .filter((c) => c.identity || c.isVerifiedComparison || c.articleIds.length >= 2)
    .map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = clusterBySlug(slug);
  return { title: c ? `Cluster audit — ${c.title}` : "Cluster audit" };
}

const CONF_STYLE: Record<string, string> = {
  high: "text-agree",
  moderate: "text-caution",
  low: "text-ink-3",
};

export default async function ClusterAudit({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = clusterBySlug(slug);
  if (!c) notFound();
  const articles = clusterArticles(c);
  const byId = new Map(dataset.articles.map((a) => [a.id, a]));

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Methodology · cluster audit</p>
        <h1 className="mt-2 break-words font-serif text-[24px] font-semibold leading-tight tracking-tight sm:text-[30px]">
          {c.title}
        </h1>
        <p className="ui mt-2 text-[12px] text-ink-3">
          <code>{c.slug}</code> · {c.scope} · {c.isCrisis ? c.crisisType ?? "crisis" : "development"} ·{" "}
          {c.languages.join(", ")} · updated {istTimestamp(c.updatedAt)}
        </p>
        <p className="mt-2 ui text-[13px] text-ink-2">
          <span
            className={cn(
              "font-semibold",
              c.confidence === "strong" ? "text-agree" : c.confidence === "probable" ? "text-caution" : "text-ink-3",
            )}
          >
            {c.confidence} match
          </span>{" "}
          — {c.reason}
        </p>
      </header>

      <section>
        <div className="label mb-2">Articles grouped ({articles.length})</div>
        <div className="flex flex-col gap-2">
          {articles.map((a) => (
            <div key={a.id} className="card p-3 ui text-[13px]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-ink">{a.sourceName}</span>
                <span className="text-ink-3">{a.language === "ta" ? "தமிழ்" : a.language === "en" ? "English" : "—"}</span>
                <span className="text-ink-3">· {istTimestamp(a.publishedAt)}</span>
                {a.districts.length > 0 && <span className="text-ink-3">· {a.districts.join(", ")}</span>}
              </div>
              <p className="mt-1 break-words text-ink-2">{a.title}</p>
              <p className="mt-1 ui text-[11px] text-ink-3">Geo: {a.geo.reason}</p>
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="ui text-[11.5px] text-accent hover:underline">
                Open source ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      {c.identity && c.identity.edges.length > 0 && (
        <section>
          <div className="label mb-2">Why these were grouped</div>
          <div className="card divide-y divide-rule">
            {c.identity.edges.map((e, i) => (
              <div key={i} className="px-4 py-3 ui text-[12.5px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("font-semibold", CONF_STYLE[e.confidence])}>{e.confidence}</span>
                  <span className="pill text-ink-3">{e.via === "semantic" ? "semantic event-identity" : "lexical headline match"}</span>
                </div>
                <p className="mt-1 text-ink-2">{e.reason}</p>
                <p className="mt-0.5 ui text-[11px] text-ink-3">
                  {byId.get(e.a)?.sourceName ?? e.a} ↔ {byId.get(e.b)?.sourceName ?? e.b}
                </p>
                {e.blockers.length > 0 && (
                  <p className="mt-0.5 ui text-[11px] text-dispute">Blockers noted: {e.blockers.join("; ")}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {c.identity && c.identity.related.length > 0 && (
        <section>
          <div className="label mb-2">Related events (NOT merged)</div>
          <div className="card divide-y divide-rule">
            {c.identity.related.map((r, i) => {
              const other = dataset.clusters.find((x) => x.id === r.otherClusterId);
              return (
                <div key={i} className="px-4 py-3 ui text-[12.5px]">
                  <span className="pill text-ink-2">{r.relation}</span>{" "}
                  <span className="text-ink-2">{r.reason}</span>
                  {other && (
                    <div className="mt-1">
                      <Link href={`/methodology/clusters/${other.slug}`} className="text-accent hover:underline">
                        {other.title}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!c.identity && (
        <section className="card bg-surface-2 p-4 ui text-[12.5px] text-ink-3">
          This cluster carries no cross-publisher identity edge — it is a single report, one
          publisher&rsquo;s several takes, or an official alert with no independent coverage yet.
        </section>
      )}

      <div className="border-t border-rule pt-4">
        <Link href={`/story/${c.slug}`} className="ui text-[13px] font-semibold text-accent hover:underline">
          View the reader-facing comparison →
        </Link>
      </div>
    </div>
  );
}
