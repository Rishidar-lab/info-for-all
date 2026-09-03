/**
 * Publisher profile assembly (v0.10).
 *
 * Merges: the hand-built registry (src/data/publishers.ts — ownership, funding,
 * family, external ratings), the feed registry (src/data/feeds.ts — languages,
 * region, kind, official), and observed data from a snapshot (article count,
 * first/last seen). Observed alignment + reliability are filled in later by
 * ./alignment.ts and ./reliability.ts from the historical store.
 */
import type { LiveDataset } from "@/lib/live/types";
import { FEED_SOURCES } from "@/data/feeds";
import { PUBLISHERS, publisherByName, publisherSlug, type PublisherRegistryEntry } from "@/data/publishers";
import type {
  PublisherProfile,
  PublisherOwnership,
  SourceFamily,
  FundingType,
  OwnershipCategory,
} from "./types";

function feedFor(publisher: string) {
  return FEED_SOURCES.filter((f) => f.publisher === publisher);
}

function ownershipOf(entry: PublisherRegistryEntry | undefined): PublisherOwnership {
  if (!entry) {
    return {
      category: "UNKNOWN",
      fundingType: "unknown",
      provenance: {
        source: "Not in the IFFA publisher registry",
        verifiedAt: new Date().toISOString().slice(0, 10),
        confidence: "low",
        note: "No ownership record. IFFA does not infer ownership.",
      },
    };
  }
  return {
    category: entry.ownership.category,
    owner: entry.ownership.owner,
    parent: entry.ownership.parent,
    ultimateParent: entry.ownership.ultimateParent,
    fundingType: entry.ownership.fundingType,
    provenance: entry.ownership.provenance,
  };
}

function kindOf(publisher: string): PublisherProfile["kind"] {
  const feeds = feedFor(publisher);
  if (!feeds.length) return "other";
  const f = feeds[0];
  if (f.kind === "sachet-json") return "data_feed";
  if (f.official) return "official";
  if (f.role === "specialist") return "digital_native";
  if (/BBC|Prasar Bharati/.test(publisher)) return "public_broadcaster";
  if (/News18|Puthiyathalaimurai/.test(publisher)) return "digital_native";
  return "newspaper";
}

/** Build a profile for one publisher from the registry + feeds + a snapshot. */
export function describePublisher(publisher: string, dataset?: LiveDataset): PublisherProfile {
  const entry = publisherByName(publisher);
  const feeds = feedFor(publisher);
  const articles = dataset?.articles.filter((a) => a.publisher === publisher) ?? [];

  const langSet = new Set<"ta" | "en" | "mixed">([
    ...feeds.map((f) => f.language),
    ...(entry?.languages ?? []),
  ]);
  const languages: ("ta" | "en" | "mixed")[] = langSet.size ? [...langSet] : ["en"];

  const regionSet = new Set<PublisherProfile["regions"][number]>([
    ...feeds.map((f) => (f.focus === "tamil-nadu" ? ("tamil-nadu" as const) : ("india" as const))),
    ...(entry?.regions ?? []),
  ]);
  const regions: PublisherProfile["regions"] = regionSet.size ? [...regionSet] : ["india"];

  const times = articles.map((a) => a.publishedAt).filter(Boolean).sort();

  return {
    id: entry?.id ?? publisherSlug(publisher),
    name: publisher,
    domain: entry?.domain ?? feeds[0]?.homepage?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "") ?? "",
    languages,
    regions,
    locality: entry?.locality,
    ownership: ownershipOf(entry),
    parentCompany: entry?.ownership.parent,
    owner: entry?.ownership.owner,
    fundingType: (entry?.ownership.fundingType ?? "unknown") as FundingType,
    externalRatings: entry?.externalRatings ?? [],
    observedAlignment: { "7d": null, "30d": null, "90d": null },
    reliabilityProfile: { externalFactuality: entry?.externalRatings ?? [], observed: null },
    sourceFamilyId: entry?.familyKey ?? "unaffiliated:" + publisherSlug(publisher),
    firstSeenAt: times[0] ?? null,
    lastSeenAt: times[times.length - 1] ?? null,
    articleCount: articles.length,
    kind: kindOf(publisher),
    official: feeds[0]?.official ?? false,
  };
}

/** Every publisher IFFA knows about (registry ∪ enabled feeds), profiled. */
export function allPublisherProfiles(dataset?: LiveDataset): PublisherProfile[] {
  const names = new Set<string>(PUBLISHERS.map((p) => p.name));
  for (const f of FEED_SOURCES) names.add(f.publisher);
  return [...names].sort().map((n) => describePublisher(n, dataset));
}

// ─────────────────────────────────────────────────────────────────────────────
// Source families
// ─────────────────────────────────────────────────────────────────────────────

const FAMILY_LABELS: Record<string, string> = {
  "kasturi-and-sons": "Kasturi & Sons Ltd (The Hindu Group)",
  "bccl-times-group": "Bennett, Coleman & Co. Ltd (The Times Group)",
  "ht-media": "HT Media Ltd",
  "network18-reliance": "Network18 / Reliance Industries",
  "ndtv-adani": "NDTV / Adani Group",
  "india-today-group": "India Today Group (Living Media)",
  "espn-disney": "ESPN Inc. / The Walt Disney Company",
  bbc: "BBC",
  mongabay: "Mongabay (non-profit)",
  "un-ocha": "UN OCHA",
};

/** Group publishers into corporate/newsroom families. Solo publishers → one-member families. */
export function buildSourceFamilies(dataset?: LiveDataset): SourceFamily[] {
  const profiles = allPublisherProfiles(dataset);
  const byKey = new Map<string, PublisherProfile[]>();
  for (const p of profiles) {
    const list = byKey.get(p.sourceFamilyId) ?? [];
    list.push(p);
    byKey.set(p.sourceFamilyId, list);
  }
  return [...byKey.entries()].map(([key, members]) => ({
    id: key,
    name:
      FAMILY_LABELS[key] ??
      (members.length === 1 ? members[0].name : members[0].ownership.parent ?? members[0].name),
    publisherIds: members.map((m) => m.id),
    reason: members.length > 1 ? "shared-owner" : "shared-newsroom",
  }));
}

/** Map publisher name → source-family id, for coverage-landscape family counting. */
export function familyIndex(dataset?: LiveDataset): Map<string, string> {
  const idx = new Map<string, string>();
  for (const p of allPublisherProfiles(dataset)) idx.set(p.name, p.sourceFamilyId);
  return idx;
}

export const OWNERSHIP_CATEGORIES: OwnershipCategory[] = [
  "INDEPENDENT",
  "MEDIA_CONGLOMERATE",
  "CORPORATION",
  "GOVERNMENT",
  "INDIVIDUAL",
  "TRUST_FOUNDATION",
  "POLITICAL_ORGANISATION",
  "PUBLIC_BROADCASTER",
  "OTHER",
  "UNKNOWN",
];
