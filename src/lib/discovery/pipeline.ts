/**
 * Coverage-discovery pipeline for ONE cluster.
 *
 *   eligibility → event graph → structured queries → providers → candidates
 *   → canonicalise + dedupe → SAME-EVENT identity (frozen engine)
 *   → independence resolution → ClusterDiscovery
 *
 * Deterministic given (cluster, articles, corpus, provider outputs / fixtures).
 * The brief / media-landscape layers never call this — they read the committed
 * `discovery.json`.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { publisherByName } from "@/data/publishers";
import { FEED_SOURCES } from "@/data/feeds";
import { eligibleForAutoResearch, priorityTier } from "@/lib/editorial/priority-tier";
import { buildDiscoveryEvent, buildDiscoveryQueries } from "./event-query";
import { dedupeCandidates, isOpaqueRedirect } from "./dedupe";
import { buildSeedContext, verifyCandidate } from "./match";
import { resolveDiscoveredReports } from "./resolve";
import type {
  CandidateMatch,
  ClusterDiscovery,
  DiscoveryCandidate,
  DiscoveryProvider,
  DiscoveryProviderContext,
  RejectedCandidate,
} from "./types";

const feedOwnershipGroup = new Map<string, string>();
for (const f of FEED_SOURCES) if (f.ownershipGroup) feedOwnershipGroup.set(f.publisher, f.ownershipGroup);

/** Family key for a publisher already on the story. */
function seedFamilyKey(publisher: string): string {
  const p = publisherByName(publisher);
  if (p) return p.familyKey;
  const og = feedOwnershipGroup.get(publisher);
  if (og) return `og:${og}`;
  return `pub:${publisher}`;
}

const RETENTION_DAYS = 21;

export interface DiscoverOptions {
  now: number;
  /** Genuine independent families already on the story (frozen resolver output). */
  familiesBefore: number;
  /** Force discovery even for a multi-family story (gold-set / manual runs). */
  force?: boolean;
}

export function discoveryEligibility(
  cluster: LiveCluster,
  opts: DiscoverOptions,
): { eligible: boolean; reason?: string } {
  if (opts.force) return { eligible: true };
  if (!cluster.slug) return { eligible: false, reason: "no slug" };
  if ((cluster.trendData?.geoTier ?? "out") === "out") return { eligible: false, reason: "out of scope" };
  if (opts.familiesBefore >= 2) return { eligible: false, reason: "already ≥2 independent families" };
  if (!eligibleForAutoResearch(cluster)) return { eligible: false, reason: `priority tier ${priorityTier(cluster)} — no discovery budget` };
  const first = Date.parse(cluster.trendData?.firstSeenAt ?? cluster.updatedAt);
  if (Number.isFinite(first) && (opts.now - first) / 86_400_000 > RETENTION_DAYS) {
    return { eligible: false, reason: "outside retention window" };
  }
  return { eligible: true };
}

export async function discoverForCluster(
  cluster: LiveCluster,
  articles: LiveArticle[],
  corpusArticles: LiveArticle[],
  providers: DiscoveryProvider[],
  opts: DiscoverOptions,
): Promise<ClusterDiscovery> {
  const generatedAt = new Date(opts.now).toISOString();
  const gate = discoveryEligibility(cluster, opts);
  const base: ClusterDiscovery = {
    slug: cluster.slug,
    generatedAt,
    attempted: false,
    skippedReason: gate.reason,
    queriesRun: 0,
    providersRun: [],
    candidatesFound: 0,
    candidatesAdmitted: 0,
    candidatesRejected: 0,
    reports: [],
    rejected: [],
    familiesBefore: opts.familiesBefore,
    familiesAfter: opts.familiesBefore,
    rescued: false,
    rescueLanguages: [],
    notes: [],
  };
  if (!gate.eligible) return base;

  const event = buildDiscoveryEvent(cluster, articles);
  const queries = buildDiscoveryQueries(event);
  if (queries.length === 0) {
    return { ...base, skippedReason: "no usable query could be built from the event graph" };
  }

  const ctx: DiscoveryProviderContext = {
    offline: process.env.DISCOVERY_OFFLINE === "1" || false,
    fixtureDir: process.env.DISCOVERY_FIXTURE_DIR ?? "src/data/fixtures/discovery",
    now: opts.now,
    corpusArticles,
  };

  const rawCandidates: DiscoveryCandidate[] = [];
  const notes: string[] = [];
  const providersRun: string[] = [];
  for (const p of providers) {
    if (p.network && ctx.offline) {
      // offline: only replay if the provider has a fixture path convention — the
      // provider itself decides (gdelt does); still record that it "ran"
    }
    try {
      const { candidates, notes: n } = await p.discover(event, queries, ctx);
      rawCandidates.push(...candidates);
      notes.push(...n);
      providersRun.push(p.id);
    } catch (err) {
      notes.push(`${p.id}: ${err instanceof Error ? err.message : "provider threw"}`);
    }
  }

  const rejected: RejectedCandidate[] = [];

  // canonicalise + dedupe
  const { kept, dropped } = dedupeCandidates(rawCandidates);
  for (const d of dropped) {
    rejected.push({ canonicalUrl: d.candidate.canonicalUrl, title: d.candidate.title, source: d.candidate.source, stage: "dedupe", reason: d.reason });
  }

  // drop opaque redirects + candidates from publishers already on the story
  const known = new Set(event.knownPublishers.map((p) => p.toLowerCase()));
  const resolvable: DiscoveryCandidate[] = [];
  for (const c of kept) {
    if (isOpaqueRedirect(c.canonicalUrl)) {
      rejected.push({ canonicalUrl: c.canonicalUrl, title: c.title, source: c.source, stage: "canonicalise", reason: "opaque redirect URL — publisher cannot be resolved without a fetch" });
      continue;
    }
    if (known.has((c.source || "").toLowerCase())) {
      rejected.push({ canonicalUrl: c.canonicalUrl, title: c.title, source: c.source, stage: "dedupe", reason: "publisher already on the story" });
      continue;
    }
    resolvable.push(c);
  }

  // SAME-EVENT identity — the safety gate
  const seedCtx = buildSeedContext(event, articles);
  const matched: { candidate: DiscoveryCandidate; match: CandidateMatch }[] = [];
  for (const c of resolvable) {
    const m = verifyCandidate(seedCtx, c);
    if (m.verdict === "MATCH") {
      matched.push({ candidate: c, match: m });
    } else {
      rejected.push({
        canonicalUrl: c.canonicalUrl,
        title: c.title,
        source: c.source,
        stage: "identity",
        verdict: m.verdict,
        reason: m.verdict === "UNCERTAIN" ? `uncertain same-event (${m.relation}/${m.confidence}) — kept separate` : `not the same event (${m.relation}): ${m.blockers[0] ?? m.reasons[0] ?? ""}`,
      });
    }
  }

  // independence resolution
  const seedFamilyKeys = new Set(event.knownPublishers.map(seedFamilyKey));
  const resolved = resolveDiscoveredReports(matched, articles, seedFamilyKeys, opts.familiesBefore);

  for (const r of resolved.reports) {
    if (r.sourceType !== "independent") {
      rejected.push({
        canonicalUrl: r.canonicalUrl,
        title: r.title,
        source: r.publisher,
        stage: "independence",
        reason:
          r.sourceType === "wire"
            ? "carries a wire-agency credit — one dispatch, not an independent newsroom"
            : r.sourceType === "same-family"
              ? "same corporate family as a publisher already on the story"
              : r.sourceType === "syndication"
                ? "verbatim repost of another discovered report"
                : r.sourceType === "official-primary"
                  ? "official / primary record — a valid anchor, not independent journalism"
                  : "outlet not in IFFA's registry — independence unresolved",
      });
    }
  }

  return {
    slug: cluster.slug,
    generatedAt,
    attempted: true,
    queriesRun: queries.length,
    providersRun,
    candidatesFound: rawCandidates.length,
    candidatesAdmitted: resolved.reports.filter((r) => r.sourceType === "independent").length,
    candidatesRejected: rejected.length,
    reports: resolved.reports,
    rejected,
    familiesBefore: resolved.familiesBefore,
    familiesAfter: resolved.familiesAfter,
    rescued: resolved.rescued,
    rescueLanguages: resolved.rescueLanguages,
    notes: [...new Set(notes)],
  };
}
