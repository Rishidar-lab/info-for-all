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
    .filter((c) => c.scope === "tamil-nadu" && !(c.isCrisis && activeStates.includes(c.lifecycle)))
    .sort((a, b) => b.crisisPriority - a.crisisPriority || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

export function indiaClusters(limit = 12): LiveCluster[] {
  return dataset.clusters
    .filter(
      (c) =>
        (c.scope === "india" || c.scope === "india-relevant") &&
        !(c.isCrisis && activeStates.includes(c.lifecycle)),
    )
    .sort((a, b) => b.crisisPriority - a.crisisPriority || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

export function comparisonClusters(limit = 10): LiveCluster[] {
  return dataset.clusters
    .filter((c) => c.sourceCount >= 2)
    .sort((a, b) => b.sourceCount - a.sourceCount || b.crisisPriority - a.crisisPriority)
    .slice(0, limit);
}

/** All clusters that get their own static page (crisis + multi-source + top TN/India). */
export function routableClusters(): LiveCluster[] {
  const wanted = new Set<string>();
  for (const c of [
    ...activeCrisisClusters(),
    ...developingCrisisClusters(),
    ...recentlyClearedClusters(),
    ...tamilNaduClusters(20),
    ...indiaClusters(20),
    ...comparisonClusters(20),
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
