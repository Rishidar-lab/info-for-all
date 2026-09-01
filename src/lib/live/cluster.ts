import type {
  AlertLifecycle,
  ClusterDifferenceRow,
  LiveArticle,
  LiveCluster,
} from "./types";
import { normalisedTitleKey, slugify, stableId, titleTokens } from "./text";
import { crisisPriority, capWeight, detectCrisisType, verificationFor } from "./crisis";

/** Jaccard similarity of two token multisets (as sets). */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function districtOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const bs = new Set(b);
  return a.some((d) => bs.has(d));
}

const CLUSTER_WINDOW_MS = 36 * 3600 * 1000;

/**
 * Deterministic clustering for the MVP.
 *
 * Two articles join the same cluster when ALL hold:
 *  - published within a bounded time window;
 *  - same crisis type (or both non-crisis);
 *  - geography overlaps (shared district, or both state-level Tamil Nadu, or
 *    both India-scope with no district detail);
 *  - normalised-title token Jaccard >= 0.34, OR one is an official alert whose
 *    key terms are contained in the other's title.
 *
 * Unrelated events are NOT merged just because both mention "rain" or "Tamil Nadu".
 */
export function clusterArticles(articles: LiveArticle[], now = Date.now()): LiveCluster[] {
  const sorted = [...articles].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const tokenSets = new Map<string, Set<string>>();
  for (const a of sorted) tokenSets.set(a.id, new Set(titleTokens(a.title)));

  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (x: string, y: string) => {
    parent.set(find(x), find(y));
  };
  for (const a of sorted) parent.set(a.id, a.id);

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt)) > CLUSTER_WINDOW_MS) continue;
      if ((a.crisisType || null) !== (b.crisisType || null)) continue;

      const geoOk =
        districtOverlap(a.districts, b.districts) ||
        (a.districts.length === 0 && b.districts.length === 0 && a.scope === b.scope) ||
        (a.scope === "tamil-nadu" && b.scope === "tamil-nadu" && a.districts.length === 0 && b.districts.length === 0);
      if (!geoOk) continue;

      const sim = jaccard(tokenSets.get(a.id)!, tokenSets.get(b.id)!);
      let join = sim >= 0.34;

      if (!join && (a.evidenceRole === "official-alert" || b.evidenceRole === "official-alert")) {
        const alert = a.evidenceRole === "official-alert" ? a : b;
        const other = alert === a ? b : a;
        const alertTokens = [...tokenSets.get(alert.id)!].filter((t) => t.length > 4);
        const otherKey = normalisedTitleKey(other.title);
        const contained = alertTokens.filter((t) => otherKey.includes(t)).length;
        join = alertTokens.length > 0 && contained / alertTokens.length >= 0.5 && districtOverlap(alert.districts, other.districts);
      }

      if (join) union(a.id, b.id);
    }
  }

  const groups = new Map<string, LiveArticle[]>();
  for (const a of sorted) {
    const root = find(a.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(a);
  }

  const clusters: LiveCluster[] = [];
  for (const members of groups.values()) {
    clusters.push(buildCluster(members, now));
  }

  return clusters.sort((a, b) => b.crisisPriority - a.crisisPriority || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best: T | undefined;
  let n = 0;
  for (const [v, c] of counts) {
    if (c > n) {
      best = v;
      n = c;
    }
  }
  return best;
}

function buildCluster(members: LiveArticle[], now: number): LiveCluster {
  const byRecency = [...members].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const official = members.filter((m) => m.evidenceRole === "official-alert" || m.evidenceRole === "primary-document" || m.evidenceRole === "government-statement");
  const independent = members.filter((m) => m.evidenceRole === "independent-report" || m.evidenceRole === "on-ground-report");
  const distinctSources = new Set(members.map((m) => m.sourceId)).size;

  const crisisType = mostCommon(members.map((m) => m.crisisType).filter(Boolean) as string[]) as LiveCluster["crisisType"];
  const districts = Array.from(new Set(members.flatMap((m) => m.districts))).sort();
  const scope: LiveCluster["scope"] =
    (mostCommon(members.map((m) => m.scope)) as LiveCluster["scope"]) ?? "india";
  const state = members.find((m) => m.state)?.state;

  const isCrisis = members.some((m) => m.isCrisis);
  const alert = members.find((m) => m.evidenceRole === "official-alert" && m.cap);
  const lifecycle: AlertLifecycle = alert?.lifecycle ?? (isCrisis ? "developing" : "developing");

  // Working title: prefer an official alert's event; else the most recent headline.
  const title =
    alert?.cap?.event
      ? `${alert.cap.event}${districts.length ? ` — ${districts.slice(0, 3).join(", ")}${districts.length > 3 ? " +" : ""}` : ""}`
      : byRecency[0].title;

  const crisisWeight = detectCrisisType({ title, disasterType: alert?.cap?.event }).weight;
  const priority = isCrisis
    ? crisisPriority({
        isOfficialAlert: official.length > 0 && members.some((m) => m.evidenceRole === "official-alert"),
        scope,
        districtCount: districts.length,
        publishedAt: byRecency[0].publishedAt,
        crisisWeight,
        capWeight: capWeight(alert?.cap),
        corroboratingSources: Math.max(0, distinctSources - 1),
        hasPrimaryDoc: members.some((m) => m.evidenceRole === "primary-document"),
        lifecycle,
        now,
      })
    : Math.max(...members.map((m) => m.crisisPriority));

  const verificationStatus = verificationFor(
    isCrisis ? "official-alert" : byRecency[0].evidenceRole,
    Math.max(0, distinctSources - 1),
    official.length > 0,
  );

  // Common ground: only explicit shared structured facts (from CAP), else pending.
  const commonGround: string[] = [];
  if (alert?.cap) {
    if (alert.cap.event) commonGround.push(`Official alert type: ${alert.cap.event}.`);
    if (alert.cap.senderName) commonGround.push(`Issuing authority: ${alert.cap.senderName}.`);
    if (alert.cap.areaDescription) commonGround.push(`Stated area: ${alert.cap.areaDescription}.`);
    if (alert.cap.effectiveFrom && alert.cap.effectiveUntil)
      commonGround.push(`Stated effective window: ${fmtIST(alert.cap.effectiveFrom)} to ${fmtIST(alert.cap.effectiveUntil)} IST.`);
    if (alert.cap.severity) commonGround.push(`Alert severity as issued: ${alert.cap.severity}.`);
  }
  const commonGroundPending = commonGround.length === 0;

  // Differences: structured metadata only, no semantic claims.
  const differences: ClusterDifferenceRow[] = [];
  if (members.length > 1) {
    const perSourceDistricts = members
      .filter((m) => m.districts.length)
      .map((m) => ({ sourceName: m.sourceName, value: m.districts.join(", ") }));
    if (new Set(perSourceDistricts.map((d) => d.value)).size > 1) {
      differences.push({ field: "Reported locations / districts", observations: perSourceDistricts });
    }

    const roles = members.map((m) => ({ sourceName: m.sourceName, value: EVIDENCE_ROLE_SHORT[m.evidenceRole] }));
    if (new Set(roles.map((r) => r.value)).size > 1) {
      differences.push({ field: "Evidence role of each report", observations: roles });
    }

    const times = members.map((m) => ({ sourceName: m.sourceName, value: fmtIST(m.publishedAt) + " IST" }));
    differences.push({ field: "Reported / published time", observations: times });

    const severities = members
      .filter((m) => m.cap?.severity)
      .map((m) => ({ sourceName: m.sourceName, value: m.cap!.severity! }));
    if (new Set(severities.map((s) => s.value)).size > 1) {
      differences.push({ field: "Stated severity", observations: severities });
    }
  }

  const unknowns: string[] = [];
  if (isCrisis) {
    if (independent.length === 0) unknowns.push("No independent on-ground report has corroborated this alert yet.");
    if (!alert?.cap?.effectiveUntil) unknowns.push("The alert does not state an expiry time.");
    unknowns.push("Casualty, damage and evacuation figures are not established from these sources.");
  } else if (distinctSources === 1) {
    unknowns.push("Single-source report — not yet corroborated by another outlet.");
  }

  const updatedAt = byRecency[0].publishedAt;
  const id = stableId(...members.map((m) => m.id).sort());

  return {
    id,
    slug: `${slugify(title, 56)}-${id.slice(0, 6)}`,
    title,
    scope,
    state,
    districts,
    crisisType,
    isCrisis,
    crisisPriority: priority,
    lifecycle,
    updatedAt,
    languages: Array.from(new Set(members.map((m) => m.language))),
    articleIds: byRecency.map((m) => m.id),
    sourceCount: distinctSources,
    officialCount: new Set(official.map((m) => m.sourceId)).size,
    independentCount: new Set(independent.map((m) => m.sourceId)).size,
    verificationStatus,
    commonGround,
    commonGroundPending,
    differences,
    unknowns,
    cap: alert?.cap,
  };
}

const EVIDENCE_ROLE_SHORT: Record<string, string> = {
  "official-alert": "Official alert",
  "primary-document": "Primary document",
  "government-statement": "Government statement",
  "on-ground-report": "On-ground report",
  "independent-report": "Independent report",
  "expert-analysis": "Expert analysis",
  "developing-unverified": "Developing / unverified",
};

function fmtIST(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
