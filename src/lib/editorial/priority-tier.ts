/**
 * Editorial priority tiers (Milestone B.3 Phase 1).
 *
 * IFFA's mission order: 1 CRISIS · 2 POLITICS · 3 FINANCE · 4 SPORTS. Tamil Nadu
 * first, India second. Celebrity / entertainment are LOW priority — they stay
 * searchable and in the corpus, but they do NOT consume front-door space, the
 * Situation Bar, Fast Rising, or the automatic coverage-research budget.
 *
 * This does not fabricate scarcity: nothing is deleted, and a P5 story can still
 * be opened, searched, and — if a reader asks — researched.
 */
import type { LiveCluster } from "@/lib/live/types";
import type { CategoryId } from "@/lib/domain/categories";

export type PriorityTier = "P0" | "P1" | "P2" | "P3" | "P5";

/** Base tier from the news domain. */
export const CATEGORY_TIER: Record<CategoryId, PriorityTier> = {
  crisis: "P0",
  politics: "P1",
  finance: "P1",
  sports: "P1",
  "other-relevant": "P3",
  entertainment: "P5",
  celebrity: "P5",
};

export const TIER_LABEL: Record<PriorityTier, string> = {
  P0: "Crisis / urgent",
  P1: "Politics · finance · sports",
  P2: "Tamil Nadu regional public impact",
  P3: "Other relevant",
  P5: "Celebrity / entertainment",
};

/** How much automatic coverage-discovery a cluster in this tier is allowed. */
export type ResearchBudget = "deep" | "standard" | "light" | "none";
export const TIER_BUDGET: Record<PriorityTier, ResearchBudget> = {
  P0: "deep",
  P1: "standard",
  P2: "standard",
  P3: "light",
  P5: "none",
};

function isTamilNadu(c: LiveCluster): boolean {
  return c.scope === "tamil-nadu" || c.trendData?.geoTier === "P0" || c.districts.length > 0;
}

/**
 * The effective tier for one cluster:
 *   - a crisis that is severe/critical or urgent-banded → stays P0
 *   - an `other-relevant` story with a demonstrated Tamil Nadu local impact → P2
 *   - otherwise the category base tier
 */
export function priorityTier(cluster: LiveCluster): PriorityTier {
  const cat = (cluster.trendData?.category ?? "other-relevant") as CategoryId;
  const base = CATEGORY_TIER[cat];

  if (base === "P0") return "P0";

  // A regional public-impact story (schools shut, transport hit, a district
  // notice) is P2 even when the classifier only reached "other-relevant".
  if (base === "P3" && isTamilNadu(cluster)) {
    const li = cluster.trendData?.localImpact;
    const sev = cluster.trendData?.severity?.level;
    if ((li && li.scale !== "none" && li.statements.length > 0) || sev === "significant" || sev === "severe" || sev === "critical") {
      return "P2";
    }
  }

  // A finance / sports story with no editorial traction at all drops to P3.
  if (base === "P1" && (cluster.trendData?.editorial?.band === "background" || cluster.trendData?.editorial?.band === "suppressed") && cat !== "politics") {
    return "P3";
  }

  return base;
}

export function researchBudgetFor(cluster: LiveCluster): ResearchBudget {
  return TIER_BUDGET[priorityTier(cluster)];
}

/** True when a cluster may enter the automatic coverage-discovery queue. */
export function eligibleForAutoResearch(cluster: LiveCluster): boolean {
  return researchBudgetFor(cluster) !== "none";
}
