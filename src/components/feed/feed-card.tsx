import Link from "next/link";
import { headlineEcho, type FeedItem } from "@/lib/live/feed-item";
import { CATEGORY_LABEL, type CategoryId } from "@/lib/domain/categories";
import { GEO_TIER_LABEL } from "@/lib/domain/geo-tiers";
import { CRISIS_TYPE_LABEL } from "@/lib/live/crisis";
import { cn } from "@/lib/format";

function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(m) || m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

const STATE_LABEL: Record<string, string> = {
  "fast-rising": "Fast rising",
  rising: "Rising",
  new: "New",
  resurging: "Resurging",
};

const CAT_TONE: Record<string, string> = {
  crisis: "text-dispute",
  politics: "text-evidence",
  finance: "text-agree",
  sports: "text-accent",
  "other-relevant": "text-ink-3",
};

/**
 * The one IFFA card. Hierarchy: what · headline · IFFA brief · what changed ·
 * who reported it & how independent · evidence · one action. Model reasoning,
 * factor tables and raw tokens live on the story page, never here.
 */
export function FeedCard({ item, rank }: { item: FeedItem; rank?: number }) {
  const cat = (item.category ?? "other-relevant") as CategoryId;
  const cov = item.coverage;
  const isActiveCrisis = item.isCrisis && (item.severity === "severe" || item.severity === "critical");
  const showBrief =
    !item.brief.withheld && item.brief.text.length > 0 && !headlineEcho(item.title, item.brief.text);

  // How to describe who reported it.
  const familyLine =
    cov.genuineFamilies >= 1
      ? `${cov.sources} source${cov.sources === 1 ? "" : "s"} · ${cov.genuineFamilies} independent famil${cov.genuineFamilies === 1 ? "y" : "ies"}`
      : cov.official > 0
        ? `${cov.sources} source${cov.sources === 1 ? "" : "s"} · official record · not independently confirmed`
        : `${cov.sources} source${cov.sources === 1 ? "" : "s"} · not independently confirmed`;

  return (
    <article
      className={cn(
        "card flex min-w-0 flex-col gap-2 p-4",
        isActiveCrisis && "border-dispute/45",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 ui text-[11px] text-ink-3">
        {rank != null && <span className="mono text-ink-3">{String(rank).padStart(2, "0")}</span>}
        {(item.editorialBand === "urgent" || item.editorialBand === "high") && (
          <span
            className={cn(
              "pill",
              item.editorialBand === "urgent" ? "bg-dispute-bg text-dispute" : "bg-caution-bg text-caution",
            )}
          >
            {item.editorialBand === "urgent" ? "Urgent" : "High priority"}
          </span>
        )}
        {item.trendState && STATE_LABEL[item.trendState] && (
          <span className="pill bg-accent-soft text-accent">{STATE_LABEL[item.trendState]}</span>
        )}
        {(item.severity === "significant" || item.severity === "severe" || item.severity === "critical") && (
          <span
            className={cn(
              "pill",
              item.severity === "significant" ? "bg-caution-bg text-caution" : "bg-dispute-bg text-dispute",
            )}
          >
            {item.severity}
          </span>
        )}
        <span className={cn("label", CAT_TONE[cat])}>{CATEGORY_LABEL[cat]}</span>
        {item.crisisType && CRISIS_TYPE_LABEL[item.crisisType as keyof typeof CRISIS_TYPE_LABEL] && (
          <>
            <span aria-hidden>·</span>
            <span>{CRISIS_TYPE_LABEL[item.crisisType as keyof typeof CRISIS_TYPE_LABEL]}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>{GEO_TIER_LABEL[item.geoTier]}</span>
        <span aria-hidden>·</span>
        <span>updated {ago(item.updatedAt)}</span>
      </div>

      <h3 className={cn("font-serif leading-snug", rank != null ? "text-[17px]" : "text-[16px]")}>
        <Link href={`/story/${item.slug}/`} prefetch={false} className="link-quiet">
          {item.title}
        </Link>
      </h3>

      {item.brief.withheld ? (
        <p className="ui text-[12.5px] leading-relaxed text-ink-3">
          <span className="font-semibold">No IFFA brief yet</span> — {item.brief.familyLabel.toLowerCase()}.
          The reporting and every source are on the story page.
        </p>
      ) : showBrief ? (
        <p className="ui text-[12.5px] leading-relaxed text-ink-2">{item.brief.text}</p>
      ) : null}

      {item.whatChanged && (
        <p className="ui text-[11.5px] leading-snug">
          <span className="font-semibold text-accent">What changed: </span>
          <span className="text-ink-2">{item.whatChanged}</span>
        </p>
      )}

      {item.onGround && (
        <p className="ui text-[11.5px] leading-snug">
          <span className="font-semibold text-ink-3">On the ground: </span>
          <span className="text-ink-2">{item.onGround}</span>
        </p>
      )}

      {item.oneSided && (
        <p className="ui text-[11px] leading-snug text-caution">
          One side only so far — no response on record yet.
        </p>
      )}

      <div className="mt-1 flex flex-col gap-1.5 border-t border-rule pt-2">
        <p className="ui text-[11.5px] text-ink-2">
          {item.districts.length > 0 && <span className="text-ink-3">{item.districts.join(", ")} · </span>}
          <span className="text-ink">{familyLine}</span>
          {cov.genuineFamilies >= 1 && cov.official > 0 && <span className="text-agree"> · {cov.official} official</span>}
          {(cov.tamil > 0 || cov.english > 0) && (
            <span className="text-ink-3"> · Tamil {cov.tamil} / English {cov.english}</span>
          )}
        </p>

        {(item.evidence || item.blindspotCount > 0) && (
          <p className="ui flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
            {item.evidence && (
              <span>
                <span className="label mr-1 text-[9px]">Evidence</span>
                <span className="mono text-agree">{item.evidence.corroborated}</span> corroborated ·{" "}
                <span className="mono text-dispute">{item.evidence.disputed}</span> disputed ·{" "}
                <span className="mono">{item.evidence.unresolved}</span> unresolved
              </span>
            )}
            {item.blindspotCount > 0 && (
              <span className="text-caution">
                {item.blindspotCount} coverage blindspot{item.blindspotCount === 1 ? "" : "s"}
              </span>
            )}
          </p>
        )}

        <Link
          href={`/story/${item.slug}/`}
          prefetch={false}
          className="ui mt-1 inline-flex w-fit items-center gap-1 border border-rule-strong px-2.5 py-1.5 text-[11.5px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Open story <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
