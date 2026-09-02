/**
 * "Current Situation" bar (v0.7, Phase F).
 *
 * A concise Normal / Watch / Elevated / Crisis reading for Tamil Nadu and for
 * India — DERIVED FROM ACTIVE EVENT SIGNALS ONLY. IFFA never fabricates a
 * state-of-alert; the bar always carries the events it was derived from.
 */
import type { LiveCluster } from "@/lib/live/types";
import type { GeoTier } from "@/lib/domain/geo-tiers";
import type { SituationBar, SituationLevel } from "./types";

const ACTIVE = new Set(["active", "update", "developing"]);
const RANK: Record<SituationLevel, number> = { normal: 0, watch: 1, elevated: 2, crisis: 3 };

export interface ClusterView {
  slug: string;
  title: string;
  tier: GeoTier;
  isCrisis: boolean;
  crisisPriority: number;
  lifecycle: LiveCluster["lifecycle"];
  officialCount: number;
  /** Independent newsrooms reporting it — a routine CAP watch has 0–1. */
  independentFamilies: number;
  districtCount: number;
  /** CAP severity as issued, lowercased ("extreme" / "severe" / "moderate" / …). */
  capSeverity?: string;
  /** v0.8 event severity — informational | watch | significant | severe | critical. */
  severity?: string;
}

/** A genuine escalation: SEVERE/CRITICAL event severity, or a wide corroborated crisis. */
function isEscalating(c: ClusterView): boolean {
  if (c.severity === "critical" || c.severity === "severe") return true;
  if (c.severity === "significant" && (c.independentFamilies >= 3 || c.districtCount >= 4)) return true;
  if (c.severity) return false; // v0.8 severity present and below the bar
  // fallback (pre-v0.8 snapshot)
  if (c.crisisPriority < 60) return false;
  const sev = (c.capSeverity ?? "").toLowerCase();
  return c.independentFamilies >= 2 || sev.includes("extreme") || sev.includes("severe") || c.districtCount >= 4 || c.crisisPriority >= 80;
}

function levelForTier(clusters: ClusterView[]): { level: SituationLevel; drivers: ClusterView[] } {
  const active = clusters.filter((c) => c.isCrisis && ACTIVE.has(c.lifecycle));
  if (active.length === 0) return { level: "normal", drivers: [] };

  // Weight by severity, not raw count — a national CAP feed always carries a
  // dozen routine flash-flood watches, and that alone is not "Crisis".
  const escalating = active.filter(isEscalating);
  const severe = active.filter((c) => c.crisisPriority >= 60);
  const strong = active.filter((c) => c.crisisPriority >= 48);

  let level: SituationLevel = "watch";
  if (escalating.some((c) => c.severity === "critical") || escalating.length >= 2 || escalating.some((c) => c.crisisPriority >= 82)) level = "crisis";
  else if (escalating.length >= 1 || severe.length >= 3 || strong.length >= 5) level = "elevated";

  const drivers = [...active]
    .sort((a, b) => Number(isEscalating(b)) - Number(isEscalating(a)) || b.crisisPriority - a.crisisPriority)
    .slice(0, 4);
  return { level, drivers };
}

export function buildSituation(
  clusters: ClusterView[],
  generatedAt: string,
): SituationBar {
  const tn = levelForTier(clusters.filter((c) => c.tier === "P0"));
  const india = levelForTier(clusters.filter((c) => c.tier === "P0" || c.tier === "P1"));

  const seen = new Set<string>();
  const derivedFrom: SituationBar["derivedFrom"] = [];
  for (const [level, list] of [
    [tn.level, tn.drivers],
    [india.level, india.drivers],
  ] as const) {
    for (const c of list) {
      if (seen.has(c.slug)) continue;
      seen.add(c.slug);
      derivedFrom.push({ slug: c.slug, title: c.title, tier: c.tier, level });
    }
  }

  return {
    tamilNadu: tn.level,
    india: RANK[india.level] < RANK[tn.level] ? tn.level : india.level,
    derivedFrom,
    generatedAt,
  };
}
