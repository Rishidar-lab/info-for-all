import Link from "next/link";
import type { LiveCluster } from "@/lib/live/types";
import { CRISIS_TYPE_LABEL } from "@/lib/live/crisis";
import { EVIDENCE_ROLE_LABEL, LIFECYCLE_LABEL, VERIFICATION_LABEL, clusterLabel } from "@/lib/live/dataset";
import { cn } from "@/lib/format";

function fmtIST(iso: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso)) + " IST"
  );
}

export function ClusterCard({ cluster, emphasis = false }: { cluster: LiveCluster; emphasis?: boolean }) {
  const scopeLabel =
    cluster.scope === "tamil-nadu"
      ? "Tamil Nadu"
      : cluster.scope === "india-relevant"
        ? "India · TN-relevant"
        : "India";
  const kind = cluster.crisisType ? CRISIS_TYPE_LABEL[cluster.crisisType] : cluster.isCrisis ? "Public safety" : "Development";
  const label = clusterLabel(cluster);

  return (
    <article
      className={cn(
        "card flex flex-col p-4",
        emphasis && cluster.lifecycle === "active" && "border-dispute/50",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 ui text-[11px]">
        <span
          className={cn(
            "pill",
            label.kind === "coverage-comparison"
              ? "text-agree bg-agree-bg"
              : label.kind === "official-alert"
                ? "text-dispute bg-dispute-bg"
                : "text-ink-3 bg-surface-2",
          )}
        >
          {label.tag}
        </span>
        <span className="label">{kind}</span>
        <span className="text-ink-3">·</span>
        <span className="text-ink-2">{scopeLabel}</span>
        {cluster.isCrisis && (
          <>
            <span className="text-ink-3">·</span>
            <span
              className={cn(
                "font-semibold",
                cluster.lifecycle === "active"
                  ? "text-dispute"
                  : cluster.lifecycle === "update" || cluster.lifecycle === "developing"
                    ? "text-caution"
                    : "text-ink-3",
              )}
            >
              {LIFECYCLE_LABEL[cluster.lifecycle]}
            </span>
          </>
        )}
        <span className="grow" />
        <span className="mono text-ink-3">updated {fmtIST(cluster.updatedAt)}</span>
      </div>

      <h3 className={cn("mt-2 font-serif leading-snug", emphasis ? "text-[18px]" : "text-[16px]")}>
        <Link href={`/story/${cluster.slug}`} className="link-quiet">
          {cluster.title}
        </Link>
      </h3>

      {cluster.districts.length > 0 && (
        <p className="mt-1.5 ui text-[12px] text-ink-3">
          Districts: {cluster.districts.slice(0, 6).join(", ")}
          {cluster.districts.length > 6 ? ` +${cluster.districts.length - 6}` : ""}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 ui text-[11.5px] text-ink-2">
        <span>
          <strong className="mono text-ink">{cluster.distinctPublishers}</strong> publisher{cluster.distinctPublishers === 1 ? "" : "s"}
        </span>
        {cluster.officialCount > 0 && (
          <>
            <span className="text-ink-3">·</span>
            <span><strong className="mono text-ink">{cluster.officialCount}</strong> official</span>
          </>
        )}
        {cluster.independentCount > 0 && (
          <>
            <span className="text-ink-3">·</span>
            <span><strong className="mono text-ink">{cluster.independentCount}</strong> independent</span>
          </>
        )}
        <span className="text-ink-3">·</span>
        <span className="text-ink-3">{VERIFICATION_LABEL[cluster.verificationStatus]}</span>
      </div>

      {cluster.isVerifiedComparison && (
        <p className="mt-1.5 ui text-[11px] leading-snug text-ink-3">
          <span className={cn("font-semibold", cluster.confidence === "strong" ? "text-agree" : "text-caution")}>
            {cluster.confidence === "strong" ? "Strong match" : "Probable match"}
          </span>{" "}
          — {cluster.reason} {cluster.publishers.join(" · ")}
        </p>
      )}

      {cluster.cap?.severity && (
        <p className="mt-2 ui text-[11.5px] text-ink-3">
          Alert as issued: severity <strong className="text-ink-2">{cluster.cap.severity}</strong>
          {cluster.cap.certainty ? `, ${cluster.cap.certainty}` : ""}
          {cluster.cap.senderName ? ` — ${cluster.cap.senderName}` : ""}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3 pt-1">
        <Link
          href={`/story/${cluster.slug}`}
          className="ui inline-flex items-center gap-1 border border-rule-strong px-2.5 py-1 text-[11.5px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {label.cta} <span aria-hidden>→</span>
        </Link>
        {cluster.commonGroundPending ? (
          <span className="ui text-[11px] text-ink-3">Common-ground extraction pending review</span>
        ) : (
          <span className="ui text-[11px] text-agree">
            {cluster.commonGround.length} shared official fact{cluster.commonGround.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </article>
  );
}

export { EVIDENCE_ROLE_LABEL };
