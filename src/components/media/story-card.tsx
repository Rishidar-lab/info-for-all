import Link from "next/link";
import type { LiveCluster } from "@/lib/live/types";
import { cn } from "@/lib/format";
import { microBriefForCluster } from "@/lib/live/brief-view";
import { AlignmentBar } from "./alignment-bar";
import { BlindspotBadge } from "./blindspot-panel";

function istShort(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

/**
 * The v0.10 story card — built around MEDIA LANDSCAPE data, not a feed row.
 * The visual distinction from a normal news site should be obvious in seconds:
 * source count, independent families, a coverage-alignment bar, an evidence
 * profile, and a blindspot indicator.
 */
export function StoryCard({ cluster, rank }: { cluster: LiveCluster; rank?: number }) {
  const td = cluster.trendData;
  const ml = td?.mediaLandscape;
  const cat = td?.category ?? "other-relevant";
  const scope = cluster.scope === "tamil-nadu" ? "Tamil Nadu" : "India";
  const ep = ml?.evidenceProfile;
  const mb = microBriefForCluster(cluster);

  return (
    <article className="card min-w-0 p-4">
      <div className="flex items-start gap-3">
        {typeof rank === "number" && <span className="mono shrink-0 text-[13px] font-semibold text-ink-3">{String(rank).padStart(2, "0")}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 ui text-[11px] text-ink-3">
            <span className="uppercase tracking-wide">{scope}</span>
            <span aria-hidden>·</span>
            <span className="capitalize">{cat.replace(/-/g, " ")}</span>
            <span aria-hidden>·</span>
            <span>Updated {istShort(cluster.updatedAt)}</span>
          </div>

          <h3 className="mt-1 break-words font-serif text-[16px] font-semibold leading-snug text-ink">
            <Link href={`/story/${cluster.slug}`} className="hover:text-accent">
              {cluster.title}
            </Link>
          </h3>

          {mb.withheld ? (
            <p className="mt-1.5 ui text-[12px] italic leading-relaxed text-ink-3">
              IFFA Brief: collecting evidence — {mb.coverage.sources} publisher{mb.coverage.sources === 1 ? "" : "s"}, {mb.coverage.families} independent famil{mb.coverage.families === 1 ? "y" : "ies"}.
            </p>
          ) : (
            <p className="mt-1.5 ui text-[12.5px] leading-relaxed text-ink-2">
              {mb.text}{" "}
              <Link href={`/story/${cluster.slug}`} className="whitespace-nowrap font-semibold text-accent hover:underline">
                Read IFFA Brief →
              </Link>
            </p>
          )}

          {ml ? (
            <>
              <p className="mt-2 ui text-[13px] font-semibold text-ink">
                {ml.coverage.uniquePublishers} SOURCES
                <span className="ml-2 font-normal text-ink-3">{ml.coverage.independentSourceFamilies} independent families</span>
              </p>

              <div className="mt-2">
                <div className="label mb-1 text-[9px]">Coverage alignment</div>
                <AlignmentBar groups={ml.coverage.alignment} reason={ml.coverage.alignmentUnavailableReason} compact />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 ui text-[11.5px] text-ink-2">
                {ep && ep.substantiveClaims > 0 && (
                  <span>
                    <span className="label mr-1 text-[9px]">Evidence</span>
                    <span className="mono text-agree">{ep.byStatus.HIGHLY_CORROBORATED + ep.byStatus.CORROBORATED}</span> corroborated ·{" "}
                    <span className="mono text-dispute">{ep.byStatus.DISPUTED}</span> disputed ·{" "}
                    <span className="mono">{ep.byStatus.SINGLE_SOURCE + ep.byStatus.UNVERIFIED}</span> unresolved
                  </span>
                )}
                <span>Tamil {ml.coverage.tamilCount} · English {ml.coverage.englishCount}</span>
              </div>

              <div className="mt-2">
                <BlindspotBadge blindspots={ml.blindspots} />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 ui text-[12px] font-semibold">
                <Link href={`/story/${cluster.slug}#storytab-coverage`} className="text-accent hover:underline">
                  Compare {ml.coverage.uniquePublishers} sources →
                </Link>
                {ep && ep.substantiveClaims > 0 && (
                  <Link href={`/story/${cluster.slug}#storytab-evidence`} className="text-accent hover:underline">
                    Evidence
                  </Link>
                )}
                {ml.blindspots.length > 0 && (
                  <Link href={`/story/${cluster.slug}#storytab-landscape`} className="text-caution hover:underline">
                    Blindspot
                  </Link>
                )}
              </div>
            </>
          ) : (
            <p className="mt-2 ui text-[12px] text-ink-3">
              {cluster.distinctPublishers} publisher{cluster.distinctPublishers === 1 ? "" : "s"} ·{" "}
              <Link href={`/story/${cluster.slug}`} className="text-accent hover:underline">
                Open story
              </Link>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function StoryCardGrid({ clusters, ranked }: { clusters: LiveCluster[]; ranked?: boolean }) {
  return (
    <div className={cn("grid gap-3", "sm:grid-cols-2")}>
      {clusters.map((c, i) => (
        <StoryCard key={c.slug} cluster={c} rank={ranked ? i + 1 : undefined} />
      ))}
    </div>
  );
}
