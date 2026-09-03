/**
 * CoverageLandscape (v0.10, Phase 2).
 *
 * "WHO is covering this story?" — as counts and distributions, computed from one
 * snapshot. Every number is a straight count over the cluster's articles; where
 * a dimension needs data IFFA does not have (external ratings, alignment
 * history), it is reported honestly as "unrated" / null, never guessed.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { allPublisherProfiles, familyIndex } from "./publishers";
import type { CoverageLandscape, OwnershipCategory, PublisherProfile } from "./types";
import { OWNERSHIP_CATEGORIES } from "./publishers";

export interface CoverageContext {
  profiles: Map<string, PublisherProfile>;
  families: Map<string, string>;
}

export function coverageContext(dataset?: { articles: LiveArticle[] }): CoverageContext {
  const profiles = new Map<string, PublisherProfile>();
  for (const p of allPublisherProfiles(dataset as never)) profiles.set(p.name, p);
  return { profiles, families: familyIndex(dataset as never) };
}

function emptyOwnershipDist(): Record<OwnershipCategory, number> {
  return Object.fromEntries(OWNERSHIP_CATEGORIES.map((c) => [c, 0])) as Record<OwnershipCategory, number>;
}

/** External-factuality band for the reliability distribution. */
function factualityBand(p: PublisherProfile | undefined): string {
  const r = p?.externalRatings?.[0];
  if (!r || !r.factuality) return "unrated";
  return `${r.factuality} (${r.provider})`;
}

function localityOf(a: LiveArticle): string {
  if (a.districts.length === 1) return a.districts[0];
  if (a.districts.length > 1) return "multi-district";
  if (a.scope === "tamil-nadu") return "Tamil Nadu (statewide)";
  if (a.scope === "india") return "India (national)";
  return "unspecified";
}

export function buildCoverageLandscape(
  cluster: LiveCluster,
  articles: LiveArticle[],
  ctx: CoverageContext,
): CoverageLandscape {
  const byPublisher = new Map<string, LiveArticle[]>();
  for (const a of articles) {
    const list = byPublisher.get(a.publisher) ?? [];
    list.push(a);
    byPublisher.set(a.publisher, list);
  }

  const familyIds = new Set<string>();
  for (const pub of byPublisher.keys()) familyIds.add(ctx.families.get(pub) ?? "unaffiliated:" + pub);

  const ownershipDistribution = emptyOwnershipDist();
  const reliabilityDistribution: Record<string, number> = {};
  const languageDistribution: Record<string, number> = {};
  const localityDistribution: Record<string, number> = {};

  let tamilCount = 0;
  let englishCount = 0;
  let regionalCount = 0;
  let nationalCount = 0;
  let officialCount = 0;
  let alternativeMediaCount = 0;

  for (const a of articles) {
    const p = ctx.profiles.get(a.publisher);
    ownershipDistribution[p?.ownership.category ?? "UNKNOWN"]++;
    const fb = factualityBand(p);
    reliabilityDistribution[fb] = (reliabilityDistribution[fb] ?? 0) + 1;
    languageDistribution[a.language] = (languageDistribution[a.language] ?? 0) + 1;
    const loc = localityOf(a);
    localityDistribution[loc] = (localityDistribution[loc] ?? 0) + 1;

    if (a.language === "ta") tamilCount++;
    if (a.language === "en") englishCount++;

    const isRegional = a.districts.length > 0 || a.scope === "tamil-nadu" || (p?.regions.includes("tamil-nadu") ?? false);
    if (isRegional) regionalCount++;
    else nationalCount++;

    if (a.role === "official" || p?.official) officialCount++;
    // "alternative media" in v0.10 = digital-native independents (not a
    // conglomerate/corporation/official). Discourse (Reddit/YouTube) is counted
    // separately in the discourse layer, never here.
    if (
      p?.kind === "digital_native" &&
      !["MEDIA_CONGLOMERATE", "CORPORATION", "GOVERNMENT", "PUBLIC_BROADCASTER"].includes(p.ownership.category)
    ) {
      alternativeMediaCount++;
    }
  }

  return {
    totalArticles: articles.length,
    uniquePublishers: byPublisher.size,
    independentSourceFamilies: familyIds.size,
    languages: [...new Set(articles.map((a) => a.language))],
    tamilCount,
    englishCount,
    regionalCount,
    nationalCount,
    officialCount,
    alternativeMediaCount,
    ownershipDistribution,
    reliabilityDistribution,
    alignment: null,
    alignmentUnavailableReason:
      "Story-level alignment groups are computed from per-article stance (Phase 4) and publisher alignment history (Phase 5). Shown once both are available.",
    languageDistribution,
    localityDistribution,
  };
}
