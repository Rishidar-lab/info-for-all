/**
 * §B.2.4 — the research trigger + per-cluster orchestration.
 *
 * Runs only for the script (scripts/research-pass.ts). Deterministic given
 * (cluster, articles, adapters, fixtures). The brief layer never calls this — it
 * reads the committed `ClusterResearch` result.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { AdapterContext, ClaimMatch, ClusterResearch, PrimaryRecord, RecordAdapter, RecordCandidate, ResearchQuery } from "./types";
import { buildResearchQuery } from "./query";
import { matchClaimToRecord } from "./match";
import { isJunkFact } from "@/lib/brief/select";

const CHECKABLE_TYPES = new Set(["weather_event", "court", "scheme_allocation", "casualty_count", "appointment", "electoral", "official_action", "quantity"]);

/** §B.2.4 trigger: withheld + 1 newsroom + no anchor + < 72h + ≥1 checkable claim. */
export function researchTriggerFires(
  cluster: LiveCluster,
  articles: LiveArticle[],
  opts: { now: number; genuineFamilies: number; hasPrimaryAnchor: boolean },
): boolean {
  if (opts.genuineFamilies >= 2 || opts.hasPrimaryAnchor) return false;
  const firstSeen = Date.parse(cluster.trendData?.firstSeenAt ?? cluster.updatedAt);
  if (Number.isFinite(firstSeen) && (opts.now - firstSeen) / 3.6e6 > 72) return false;
  return checkableClaims(cluster).length > 0 || CHECKABLE_TYPES.has(queryTypeOfTitle(cluster.title));
}

function queryTypeOfTitle(title: string): string {
  const t = title.toLowerCase();
  if (/\b(rain|cyclone|flood|imd|alert|warning)\b/.test(t)) return "weather_event";
  if (/\b(court|bench|plea|petition|verdict)\b/.test(t)) return "court";
  if (/₹|crore|lakh|allocat|sanction/.test(t)) return "scheme_allocation";
  if (/\b(government|minister|announce|launch|resolution|order)\b/.test(t)) return "official_action";
  return "other";
}

function checkableClaims(cluster: LiveCluster) {
  return (cluster.claims?.claims ?? [])
    .filter((c) => c.type !== "opinion" && c.canonicalText.length > 10 && !isJunkFact(c.canonicalText))
    .filter((c) => /\d/.test(c.canonicalText) || c.subjects.length > 0 || /\b(court|government|minister|imd|rbi|announce|order|reject|sanction|appoint)\b/i.test(c.canonicalText))
    .slice(0, 4);
}

export async function runResearch(
  cluster: LiveCluster,
  articles: LiveArticle[],
  adapters: RecordAdapter[],
  ctx: AdapterContext,
): Promise<ClusterResearch> {
  const claims = checkableClaims(cluster);
  const queries = claims.map((c) => ({ claim: c, q: buildResearchQuery(c, cluster.title) }));
  // if no structured claim, still form one query from the title so the trail is honest
  if (queries.length === 0) {
    const synthetic = {
      id: `${cluster.id}:title`,
      canonicalText: cluster.title,
      subjects: [] as string[],
      objects: [] as string[],
      predicates: [] as string[],
      provenance: [],
    } as unknown as (typeof queries)[number]["claim"];
    queries.push({ claim: synthetic, q: buildResearchQuery(synthetic, cluster.title) });
  }

  const records: PrimaryRecord[] = [];
  const matches: ClaimMatch[] = [];
  const checkedAdapters = new Set<string>();
  const checkedSources = new Set<string>();
  const seenRecordIds = new Set<string>();

  for (const { claim, q } of queries) {
    // route: cap at 3 adapters per claim (§B.2.4)
    const routed = adapters.filter((ad) => routeAdapter(ad, q)).slice(0, 3);
    for (const ad of routed) {
      checkedAdapters.add(ad.id);
      if (ad.network && ctx.offline && !hasFixture(ad, ctx)) continue;
      let candidates: RecordCandidate[];
      try {
        candidates = await ad.search(q, ctx);
      } catch {
        candidates = [];
      }
      for (const cand of candidates.slice(0, 2)) {
        let raw;
        try {
          raw = await ad.fetch(cand.externalId, ctx);
        } catch {
          raw = null;
        }
        if (!raw) continue;
        const rec = ad.parse(raw);
        if (!rec) continue;
        checkedSources.add(rec.authority);
        if (!seenRecordIds.has(rec.id)) {
          records.push(rec);
          seenRecordIds.add(rec.id);
        }
        const m = matchClaimToRecord(claim, q, rec);
        matches.push(m);
      }
    }
  }

  // an adapter that was routed but found nothing still counts as "checked"
  for (const ad of adapters) {
    for (const { q } of queries) if (routeAdapter(ad, q)) checkedAdapters.add(ad.id);
  }

  const claimTypes = new Set(queries.map((x) => x.q.claimType));
  const named = sourcesFor(adapters, queries.map((x) => x.q), ctx, [...claimTypes]);
  for (const n of named) checkedSources.add(n);

  const corroborated = matches.some((m) => m.outcome === "corroborated");
  return {
    slug: cluster.slug,
    generatedAt: new Date(ctx.now).toISOString(),
    checkedAdapters: [...checkedAdapters].sort(),
    checkedSources: [...checkedSources],
    records,
    matches,
    exhausted: !corroborated,
  };
}

function routeAdapter(ad: RecordAdapter, q: ResearchQuery): boolean {
  if (ad.id === "corpus_official") return q.claimType !== "sports" && q.claimType !== "entertainment";
  if (ad.id === "pib_rss") return ["official_action", "appointment", "scheme_allocation"].includes(q.claimType);
  if (ad.id === "tn_dipr_listing") return q.places.some((p) => /tamil nadu|chennai|madurai|coimbatore|salem|trichy|erode|cuddalore/i.test(p)) || (q.authority ?? "").includes("Tamil Nadu");
  return false;
}

/** Which corpus publishers are the right kind of source for this claim (may be empty). */
function relevantCorpusPublishers(publishers: string[], claimType: string): string[] {
  return publishers.filter((p) => {
    const l = p.toLowerCase();
    if (/reserve bank|rbi|sebi/.test(l)) return claimType === "quantity";
    if (/sachet|ndma|meteorolog|imd/.test(l)) return claimType === "weather_event" || claimType === "casualty_count";
    if (/pib|press information/.test(l)) return ["official_action", "appointment", "scheme_allocation"].includes(claimType);
    return true;
  });
}

function hasFixture(ad: RecordAdapter, ctx: AdapterContext): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    return fs.existsSync(`${ctx.fixtureDir}/${ad.id}`);
  } catch {
    return false;
  }
}

function sourcesFor(adapters: RecordAdapter[], queries: ResearchQuery[], ctx: AdapterContext, claimTypes: string[]): string[] {
  const names: string[] = [];
  for (const ad of adapters) {
    if (!queries.some((q) => routeAdapter(ad, q))) continue;
    if (ad.id === "corpus_official") {
      const all = [...new Set(ctx.corpusOfficialArticles.map((a) => a.publisher))].sort();
      const pubs = [...new Set(claimTypes.flatMap((t) => relevantCorpusPublishers(all, t)))].sort();
      if (pubs.length) names.push(...pubs.map((p) => `${p} (releases held in IFFA's corpus)`));
      else if (claimTypes.some((t) => ["official_action", "appointment", "scheme_allocation", "electoral", "court"].includes(t)))
        names.push("no press-release feed for this authority is in IFFA's corpus yet");
    }
    if (ad.id === "pib_rss") names.push("Press Information Bureau (release index)");
    if (ad.id === "tn_dipr_listing") names.push("Tamil Nadu DIPR (press-release index)");
  }
  return names;
}
