import Link from "next/link";
import type { LiveCluster } from "@/lib/live/types";
import { CRISIS_TYPE_LABEL } from "@/lib/live/crisis";
import { VERIFICATION_LABEL } from "@/lib/live/dataset";
import { CATEGORY_LABEL, type CategoryId } from "@/lib/domain/categories";
import { GEO_TIER_LABEL, type GeoTier } from "@/lib/domain/geo-tiers";
import { TREND_STATE_LABEL, type TrendState } from "@/lib/trends/types";
import { categoryOf, tierOf } from "@/lib/live/trends-view";
import { TrendWhy } from "./trend-why";
import { EditorialWhy } from "./editorial-why";
import { cn } from "@/lib/format";

function relative(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

const STATE_TONE: Record<TrendState, string> = {
  "fast-rising": "text-dispute bg-dispute-bg",
  rising: "text-caution bg-caution-bg",
  new: "text-accent bg-accent-soft",
  resurging: "text-caution bg-caution-bg",
  stable: "text-ink-2 bg-surface-2",
  fading: "text-ink-3 bg-surface-2",
};

const CAT_TONE: Record<CategoryId, string> = {
  crisis: "text-dispute",
  politics: "text-evidence",
  finance: "text-agree",
  sports: "text-accent",
  "other-relevant": "text-ink-2",
  entertainment: "text-ink-3",
  celebrity: "text-ink-3",
};

const BAND_TONE: Record<string, string> = {
  urgent: "text-dispute bg-dispute-bg",
  high: "text-caution bg-caution-bg",
  standard: "text-ink-2 bg-surface-2",
  background: "text-ink-3 bg-surface-2",
  suppressed: "text-ink-3 bg-surface-2",
};

export function EventCard({
  cluster,
  emphasis = false,
  showWhy = false,
  rank,
}: {
  cluster: LiveCluster;
  emphasis?: boolean;
  showWhy?: boolean;
  rank?: number;
}) {
  const cat = categoryOf(cluster);
  const ed = cluster.trendData?.editorial;
  const tier = tierOf(cluster) as GeoTier;
  const t = cluster.trendData?.trend;
  const ind = cluster.trendData?.independence;
  const state = (t?.state ?? "stable") as TrendState;
  const kind = cluster.crisisType ? CRISIS_TYPE_LABEL[cluster.crisisType] : cluster.trendData?.categoryReason;
  const districts = cluster.districts.slice(0, 4);
  const isActiveCrisis = cluster.isCrisis && (cluster.lifecycle === "active" || cluster.lifecycle === "update");

  return (
    <article
      className={cn(
        "card flex flex-col p-4",
        emphasis && "p-5",
        isActiveCrisis && "border-dispute/45",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 ui text-[11px]">
        {rank != null && <span className="mono text-ink-3">#{rank}</span>}
        {ed && (ed.band === "urgent" || ed.band === "high") && (
          <span className={cn("pill", BAND_TONE[ed.band])} title={`Editorial priority — ${ed.reasons.slice(0, 2).join("; ")}. A ranking score, not a probability of truth.`}>
            {ed.band}
          </span>
        )}
        {t && state !== "stable" && state !== "fading" && (
          <span className={cn("pill", STATE_TONE[state])}>
            {TREND_STATE_LABEL[state]}
          </span>
        )}
        {cluster.trendData?.severity && cluster.trendData.severity.level !== "informational" && (
          <span
            className={cn(
              "pill",
              cluster.trendData.severity.level === "critical" || cluster.trendData.severity.level === "severe"
                ? "text-dispute bg-dispute-bg"
                : cluster.trendData.severity.level === "significant"
                  ? "text-caution bg-caution-bg"
                  : "text-ink-2 bg-surface-2",
            )}
            title={`Event severity: ${cluster.trendData.severity.reason} — this is not a statement about whether the reports are true.`}
          >
            {cluster.trendData.severity.level}
          </span>
        )}
        <span className={cn("label", CAT_TONE[cat])}>{CATEGORY_LABEL[cat]}</span>
        {cluster.crisisType && (
          <>
            <span className="text-ink-3">·</span>
            <span className="text-ink-2">{CRISIS_TYPE_LABEL[cluster.crisisType]}</span>
          </>
        )}
        <span className="text-ink-3">·</span>
        <span className="text-ink-2">{GEO_TIER_LABEL[tier]}</span>
        <span className="grow" />
        {ed ? (
          <span className="mono text-ink-3" title="Editorial priority score (ranking, not a truth probability)">{ed.score.toFixed(0)}</span>
        ) : (
          t && <span className="mono text-ink-3" title="Trend score">{t.score.toFixed(0)}</span>
        )}
      </div>

      <h3 className={cn("mt-2 font-serif leading-snug", emphasis ? "text-[19px]" : "text-[16px]")}>
        <Link href={`/story/${cluster.slug}/`} className="link-quiet">
          {cluster.title}
        </Link>
      </h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 ui text-[11.5px] text-ink-3">
        {cluster.state && <span>{cluster.state}</span>}
        {districts.length > 0 && (
          <span>
            {districts.join(", ")}
            {cluster.districts.length > districts.length ? ` +${cluster.districts.length - districts.length}` : ""}
          </span>
        )}
        <span>·</span>
        <span>updated {relative(cluster.trendData?.lastMeaningfulUpdateAt ?? cluster.updatedAt)}</span>
        {(() => {
          const tp = cluster.trendData?.temporal;
          if (!tp) return null;
          if (tp.scheduledFor)
            return (
              <>
                <span>·</span>
                <span className="text-accent" title={`Scheduled: "${tp.scheduledFor.phrase}"`}>
                  scheduled {tp.scheduledFor.iso ?? tp.scheduledFor.phrase}
                </span>
              </>
            );
          if (tp.effectiveFrom || tp.effectiveUntil)
            return (
              <>
                <span>·</span>
                <span title="When the rule / order applies">
                  effective {tp.effectiveFrom?.iso ?? tp.effectiveFrom?.phrase ?? "now"}
                  {tp.effectiveUntil ? `–${tp.effectiveUntil.iso ?? tp.effectiveUntil.phrase}` : ""}
                </span>
              </>
            );
          if (tp.eventOccurredAt?.iso && tp.eventOccurredAt.iso !== (cluster.trendData?.firstSeenAt ?? "").slice(0, 10) && tp.eventOccurredAt.certainty !== "inferred")
            return (
              <>
                <span>·</span>
                <span title={`Event occurred: "${tp.eventOccurredAt.phrase}"`}>happened {tp.eventOccurredAt.iso}</span>
              </>
            );
          return null;
        })()}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 ui text-[11.5px] text-ink-2">
        {ind ? (
          <span title="Distinct newsrooms believed independent of each other">
            <strong className="mono text-ink">{ind.families}</strong> source famil{ind.families === 1 ? "y" : "ies"}
            {ind.reports !== ind.families ? ` · ${ind.reports} reports` : ""}
          </span>
        ) : (
          <span>
            <strong className="mono text-ink">{cluster.distinctPublishers}</strong> publisher{cluster.distinctPublishers === 1 ? "" : "s"}
          </span>
        )}
        {cluster.officialCount > 0 && (
          <>
            <span className="text-ink-3">·</span>
            <span className="text-agree">{cluster.officialCount} official</span>
          </>
        )}
        {ind && ind.syndicated > 0 && (
          <>
            <span className="text-ink-3">·</span>
            <span className="text-caution" title="Reports that appear to be syndicated copies of one origin">
              {ind.syndicated} syndicated
            </span>
          </>
        )}
        <span className="text-ink-3">·</span>
        <span className="text-ink-3">{VERIFICATION_LABEL[cluster.verificationStatus]}</span>
      </div>

      {kind && !cluster.crisisType && (
        <p className="mt-1.5 ui text-[11px] leading-snug text-ink-3">{kind}</p>
      )}

      {cluster.trendData?.novelty && cluster.trendData.novelty.updateKind !== "duplicate" && cluster.trendData.novelty.changes.length > 0 && (
        <p className="mt-1.5 ui text-[11px] leading-snug">
          <span className="font-semibold text-accent">What changed:</span>{" "}
          {cluster.trendData.novelty.updateSignificance &&
            !["none", "minor"].includes(cluster.trendData.novelty.updateSignificance) && (
              <span className="mr-1 rounded bg-accent/10 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-accent">
                {cluster.trendData.novelty.updateSignificance}
              </span>
            )}
          <span className="text-ink-2">{cluster.trendData.novelty.changes[0]}</span>
        </p>
      )}

      {showWhy && ed ? (
        <EditorialWhy cluster={cluster} />
      ) : showWhy ? (
        <TrendWhy cluster={cluster} />
      ) : ed ? (
        <p className="mt-2 ui text-[11px] leading-snug text-ink-3">
          {ed.reasons.slice(0, 2).join(" · ")}
        </p>
      ) : (
        t && (
          <p className="mt-2 ui text-[11px] leading-snug text-ink-3">
            {t.explanation.slice(0, 2).join(" · ")}
          </p>
        )
      )}

      <div className="mt-3 flex items-center gap-3 pt-1">
        <Link
          href={`/story/${cluster.slug}/`}
          className="ui inline-flex items-center gap-1 border border-rule-strong px-2.5 py-1 text-[11.5px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Open event <span aria-hidden>→</span>
        </Link>
        {cluster.trendData?.timeline && cluster.trendData.timeline.length > 1 && (
          <span className="ui text-[11px] text-ink-3">
            {cluster.trendData.timeline.filter((e) => e.addedNewFact).length} updates on the timeline
          </span>
        )}
      </div>
    </article>
  );
}
