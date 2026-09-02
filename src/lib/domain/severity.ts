/**
 * Event severity (v0.8, Phase G).
 *
 *   INFORMATIONAL — a forecast / routine notice
 *   WATCH         — a warning is in effect, no confirmed impact yet
 *   SIGNIFICANT   — confirmed disruption / localised impact
 *   SEVERE        — widespread impact, casualties, or an official emergency order
 *   CRITICAL      — mass casualties / large-scale evacuation / multi-district disaster
 *
 * This is EVENT SEVERITY — how bad the event is — NOT a probability that the
 * reports are true. Provenance / corroboration is tracked separately
 * (`verificationStatus`, the independence engine). Deterministic, inspectable.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";

export type Severity = "informational" | "watch" | "significant" | "severe" | "critical";

export const SEVERITY_LABEL: Record<Severity, string> = {
  informational: "Informational",
  watch: "Watch",
  significant: "Significant",
  severe: "Severe",
  critical: "Critical",
};

export const SEVERITY_RANK: Record<Severity, number> = {
  informational: 0,
  watch: 1,
  significant: 2,
  severe: 3,
  critical: 4,
};

const IMPACT_RE = /\b(flood(?:ed|ing|s)?|inundat\w+|waterlogg\w+|submerged|derail\w+|capsiz\w+|collapse[sd]?|gutted|washed away|breach\w*|marooned|stranded|cut off|snapped|shut(?:down)?|suspend\w+|disrupt\w+|evacuat\w+|relief camp)\b/i;
const FORECAST_RE = /\b(forecast|likely to|expected to|may (?:receive|see)|predicted|outlook|to bring|chance of|probability of)\b/i;
const OFFICIAL_ORDER_RE = /\b(section 144|prohibitory order|holiday declared|schools closed|curfew|evacuation order|red alert|orange alert|no-fishing|ban on)\b/i;

/** Highest casualty / evacuation number stated across the cluster's reports. */
function peakCount(text: string): { deaths: number; injured: number; evacuated: number } {
  let deaths = 0;
  let injured = 0;
  let evacuated = 0;
  for (const m of text.matchAll(/\b([\d,]+)\s+(?:people|persons|residents|workers|passengers|fishermen|families)?\s*(killed|dead|died|feared dead|drowned)\b/gi)) {
    deaths = Math.max(deaths, Number(m[1].replace(/,/g, "")) || 0);
  }
  for (const m of text.matchAll(/\b([\d,]+)\s+(?:people|persons|others)?\s*(injured|hurt|wounded)\b/gi)) {
    injured = Math.max(injured, Number(m[1].replace(/,/g, "")) || 0);
  }
  for (const m of text.matchAll(/\b([\d,]+)\s+(?:people|persons|residents|families)?\s*(evacuated|shifted|moved to (?:safety|relief))\b/gi)) {
    evacuated = Math.max(evacuated, Number(m[1].replace(/,/g, "")) || 0);
  }
  return { deaths, injured, evacuated };
}

export interface SeverityResult {
  severity: Severity;
  reason: string;
  peak: { deaths: number; injured: number; evacuated: number };
}

export function assessSeverity(cluster: LiveCluster, articles: LiveArticle[]): SeverityResult {
  if (!cluster.isCrisis) {
    return { severity: "informational", reason: "not a public-safety event", peak: { deaths: 0, injured: 0, evacuated: 0 } };
  }
  const text = articles.map((a) => `${a.title} ${a.excerpt ?? ""}`).join("  ");
  const peak = peakCount(text);
  const capSev = (cluster.cap?.severity ?? "").toLowerCase();
  const districts = cluster.districts.length;
  const impact = IMPACT_RE.test(text);
  const forecastOnly = FORECAST_RE.test(text) && !impact && peak.deaths === 0;
  const officialOrder = OFFICIAL_ORDER_RE.test(text);
  const lifecycleActive = cluster.lifecycle === "active" || cluster.lifecycle === "update";

  // CRITICAL
  if (peak.deaths >= 10 || peak.evacuated >= 5000 || (districts >= 6 && impact && peak.deaths >= 3)) {
    return { severity: "critical", reason: `mass impact (deaths ${peak.deaths}, evacuated ${peak.evacuated}, ${districts} districts)`, peak };
  }
  // SEVERE
  if (
    peak.deaths >= 2 ||
    peak.evacuated >= 500 ||
    capSev.includes("extreme") ||
    capSev.includes("severe") ||
    (impact && officialOrder && lifecycleActive) ||
    (impact && districts >= 4)
  ) {
    return { severity: "severe", reason: `widespread impact / casualties / emergency order${peak.deaths ? ` (deaths ${peak.deaths})` : ""}`, peak };
  }
  // SIGNIFICANT
  if (peak.deaths >= 1 || peak.injured >= 3 || impact || officialOrder) {
    return { severity: "significant", reason: impact ? "confirmed disruption / localised impact" : "an official order is in effect", peak };
  }
  // WATCH
  if (lifecycleActive || capSev.includes("moderate") || /\b(warning|alert|advisory)\b/i.test(text)) {
    return { severity: "watch", reason: "a warning is in effect; no confirmed impact yet", peak };
  }
  // INFORMATIONAL
  return { severity: "informational", reason: forecastOnly ? "a forecast only" : "routine notice", peak };
}
