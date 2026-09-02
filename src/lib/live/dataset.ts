import raw from "@/data/generated/live-feed.json";
import type {
  AlertLifecycle,
  EvidenceRole,
  LiveArticle,
  LiveCluster,
  LiveDataset,
  VerificationStatus,
} from "./types";

/** The generated snapshot, typed. The UI never touches the network. */
export const dataset = raw as unknown as LiveDataset;

export const EVIDENCE_ROLE_LABEL: Record<EvidenceRole, string> = {
  "official-alert": "Official alert",
  "primary-document": "Primary document",
  "government-statement": "Government statement",
  "on-ground-report": "On-ground report",
  "independent-report": "Independent report",
  "expert-analysis": "Expert analysis",
  "developing-unverified": "Developing / unverified",
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  official: "Official primary source",
  corroborated: "Independently corroborated",
  "single-source": "Single-source report",
  developing: "Developing",
  disputed: "Disputed",
  unverified: "Unverified",
};

/** v0.8 source-health 5-state → label + tone. */
export const FEED_HEALTH_LABEL: Record<string, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  stale: "Stale",
  failed: "Failed",
  disabled: "Disabled",
};
export const FEED_HEALTH_TONE: Record<string, string> = {
  healthy: "text-agree",
  degraded: "text-caution",
  stale: "text-caution",
  failed: "text-dispute",
  disabled: "text-ink-3",
};

export const LIFECYCLE_LABEL: Record<AlertLifecycle, string> = {
  active: "Active",
  update: "Update",
  "all-clear": "All clear / expired",
  developing: "Developing",
  archived: "Archived",
};

/** Design-system classes (tokens defined in globals.css). */
export const EVIDENCE_ROLE_STYLE: Record<EvidenceRole, { text: string; bg: string }> = {
  "official-alert": { text: "text-dispute", bg: "bg-dispute-bg" },
  "primary-document": { text: "text-evidence", bg: "bg-evidence-bg" },
  "government-statement": { text: "text-evidence", bg: "bg-evidence-bg" },
  "on-ground-report": { text: "text-ink-2", bg: "bg-surface-2" },
  "independent-report": { text: "text-ink-2", bg: "bg-surface-2" },
  "expert-analysis": { text: "text-ink-2", bg: "bg-surface-2" },
  "developing-unverified": { text: "text-caution", bg: "bg-caution-bg" },
};

export const VERIFICATION_STYLE: Record<VerificationStatus, { text: string; bg: string }> = {
  official: { text: "text-agree", bg: "bg-agree-bg" },
  corroborated: { text: "text-agree", bg: "bg-agree-bg" },
  "single-source": { text: "text-caution", bg: "bg-caution-bg" },
  developing: { text: "text-caution", bg: "bg-caution-bg" },
  disputed: { text: "text-dispute", bg: "bg-dispute-bg" },
  unverified: { text: "text-unknown", bg: "bg-surface-2" },
};

const activeStates: AlertLifecycle[] = ["active", "update"];

export type ClusterKind = "single-report" | "official-alert" | "coverage-comparison";

export interface ClusterLabel {
  kind: ClusterKind;
  /** Short badge text. */
  tag: string;
  /** Call-to-action text for the card / detail link. A single report is not a comparison. */
  cta: string;
}

/**
 * A single article — or a weak cross-publisher match — is not a meaningful
 * "coverage comparison". Label a cluster by what its evidence actually supports.
 */
export function clusterLabel(
  cluster: Pick<
    LiveCluster,
    "distinctPublishers" | "officialCount" | "independentCount" | "isVerifiedComparison" | "isCrisis" | "articleIds"
  >,
): ClusterLabel {
  if (cluster.isVerifiedComparison) {
    return { kind: "coverage-comparison", tag: "Coverage comparison", cta: "Compare coverage" };
  }
  const officialOnly = cluster.officialCount >= 1 && cluster.independentCount === 0;
  if (officialOnly) {
    return { kind: "official-alert", tag: "Official alert", cta: "View official alert" };
  }
  return { kind: "single-report", tag: "Single report", cta: "Inspect report" };
}

export function articleById(id: string): LiveArticle | undefined {
  return dataset.articles.find((a) => a.id === id);
}

export function clusterBySlug(slug: string): LiveCluster | undefined {
  return dataset.clusters.find((c) => c.slug === slug);
}

export function clusterArticles(cluster: LiveCluster): LiveArticle[] {
  return cluster.articleIds.map((id) => articleById(id)).filter((a): a is LiveArticle => !!a);
}

export function activeCrisisClusters(): LiveCluster[] {
  return dataset.clusters
    .filter((c) => c.isCrisis && activeStates.includes(c.lifecycle))
    .sort((a, b) => b.crisisPriority - a.crisisPriority);
}

export function developingCrisisClusters(): LiveCluster[] {
  return dataset.clusters
    .filter((c) => c.isCrisis && c.lifecycle === "developing")
    .sort((a, b) => b.crisisPriority - a.crisisPriority);
}

export function recentlyClearedClusters(): LiveCluster[] {
  return dataset.clusters
    .filter((c) => c.isCrisis && (c.lifecycle === "all-clear" || c.lifecycle === "archived"))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 6);
}

export function tamilNaduClusters(limit = 12): LiveCluster[] {
  return dataset.clusters
    .filter(
      (c) =>
        c.scope === "tamil-nadu" &&
        !c.isVerifiedComparison &&
        !(c.isCrisis && activeStates.includes(c.lifecycle)),
    )
    .sort((a, b) => b.crisisPriority - a.crisisPriority || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

export function indiaClusters(limit = 12): LiveCluster[] {
  return dataset.clusters
    .filter(
      (c) =>
        (c.scope === "india" || c.scope === "india-relevant") &&
        !c.isVerifiedComparison &&
        !(c.isCrisis && activeStates.includes(c.lifecycle)),
    )
    .sort((a, b) => b.crisisPriority - a.crisisPriority || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

/** Verified multi-source comparisons only: 2+ distinct publishers, strong/probable confidence. */
export function comparisonClusters(limit = 12): LiveCluster[] {
  return dataset.clusters
    .filter((c) => c.isVerifiedComparison)
    .sort(
      (a, b) =>
        b.distinctPublishers - a.distinctPublishers ||
        (a.confidence === b.confidence ? 0 : a.confidence === "strong" ? -1 : 1) ||
        b.crisisPriority - a.crisisPriority,
    )
    .slice(0, limit);
}

/** Everything that is NOT an active alert and NOT a verified comparison. */
export function singleReportClusters(limit = 30): LiveCluster[] {
  return dataset.clusters
    .filter(
      (c) =>
        !c.isVerifiedComparison &&
        !(c.isCrisis && activeStates.includes(c.lifecycle)) &&
        c.lifecycle !== "developing",
    )
    .sort((a, b) => b.crisisPriority - a.crisisPriority || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

/** All clusters that get their own static page. */
export function routableClusters(): LiveCluster[] {
  const wanted = new Set<string>();
  for (const c of [
    ...activeCrisisClusters(),
    ...developingCrisisClusters(),
    ...recentlyClearedClusters(),
    ...tamilNaduClusters(20),
    ...indiaClusters(20),
    ...comparisonClusters(20),
    ...singleReportClusters(30),
  ]) {
    wanted.add(c.slug);
  }
  return dataset.clusters.filter((c) => wanted.has(c.slug));
}

export function allDistricts(): string[] {
  const set = new Set<string>();
  for (const c of dataset.clusters) for (const d of c.districts) set.add(d);
  return [...set].sort();
}

export function istTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso)) + " IST";
}

export function relativeIST(iso: string | null): string {
  if (!iso) return "unknown";
  const diff = Date.now() - Date.parse(iso);
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
