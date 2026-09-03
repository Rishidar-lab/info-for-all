/**
 * Dataset-coupled view helpers for the IFFA Brief (Ground-Parity Milestone A).
 *
 * The brief subsystem itself (src/lib/brief/) is pure — cluster + articles in,
 * brief out. This layer resolves a cluster's articles from the generated
 * snapshot so pages and cards can ask for a brief by cluster alone. Briefs are
 * computed at build time (static export); nothing is stored in the JSON.
 */
import { dataset } from "./dataset";
import type { LiveCluster } from "./types";
import { buildBriefs, microBrief as microBriefFor, type BuiltBriefs } from "@/lib/brief/build";
import { buildPerspectiveCompare } from "@/lib/brief/perspective";
import type { MicroBrief, PerspectiveCompare } from "@/lib/brief/types";
import type { ClusterResearch } from "@/lib/research/types";
import researchData from "@/data/generated/research.json";

const artById = new Map(dataset.articles.map((a) => [a.id, a]));

/** §B.2 — the committed research pass output (see scripts/research-pass.ts). */
const researchBySlug: Record<string, ClusterResearch> =
  (researchData as { bySlug?: Record<string, ClusterResearch> }).bySlug ?? {};

function researchFor(cluster: LiveCluster): ClusterResearch | null {
  return researchBySlug[cluster.slug] ?? null;
}

function articlesOf(cluster: LiveCluster) {
  return cluster.articleIds.map((id) => artById.get(id)).filter((a): a is NonNullable<typeof a> => !!a);
}

const briefCache = new Map<string, BuiltBriefs>();
const microCache = new Map<string, MicroBrief>();
const perspectiveCache = new Map<string, PerspectiveCompare>();

/** The English (+ Tamil when meaningful) brief for a cluster, verified. */
export function briefsForCluster(cluster: LiveCluster): BuiltBriefs {
  const hit = briefCache.get(cluster.slug);
  if (hit) return hit;
  const b = buildBriefs(cluster, articlesOf(cluster), { research: researchFor(cluster) });
  briefCache.set(cluster.slug, b);
  return b;
}

/** The ~30–60 word micro-brief for a home / list card. */
export function microBriefForCluster(cluster: LiveCluster): MicroBrief {
  const hit = microCache.get(cluster.slug);
  if (hit) return hit;
  const m = microBriefFor(cluster, articlesOf(cluster), { research: researchFor(cluster) });
  microCache.set(cluster.slug, m);
  return m;
}

export function perspectiveForCluster(cluster: LiveCluster): PerspectiveCompare {
  const hit = perspectiveCache.get(cluster.slug);
  if (hit) return hit;
  const p = buildPerspectiveCompare(cluster, articlesOf(cluster));
  perspectiveCache.set(cluster.slug, p);
  return p;
}
