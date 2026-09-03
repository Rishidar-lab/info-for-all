/**
 * Public discourse layer (v0.10, Phase 9).
 *
 * A SEPARATE ingestion path from news. Public, provider-rules-compliant
 * endpoints only (Reddit RSS today; YouTube metadata/captions and podcasts are
 * designed in docs/rfcs/001-video-integrity-lab.md but not built here). No
 * CAPTCHA / paywall / auth / anti-bot bypass, no media download or re-hosting.
 *
 * HARD RULE: discourse NEVER counts as factual corroboration. A claim seen only
 * in discourse is surfaced as an EMERGING / UNVERIFIED PUBLIC CLAIM.
 */
import type { LiveCluster } from "@/lib/live/types";
import type { DiscourseMention, EmergingClaim } from "@/lib/media-landscape/types";
import { entitiesIn } from "@/lib/media-landscape/entities";
import { readStance } from "@/lib/media-landscape/stance";

export type { DiscourseMention, EmergingClaim };

export interface DiscourseDataset {
  generatedAt: string;
  mentions: DiscourseMention[];
  sources: { platform: string; channel: string; url: string; status: string; itemsSeen: number }[];
}

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "are", "was", "will",
  "tamil", "nadu", "india", "indian", "news", "today", "will", "over", "into", "after",
]);

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOP.has(w)),
  );
}

/** Match discourse mentions to the clusters they most likely discuss. */
export function matchDiscourse(clusters: LiveCluster[], mentions: DiscourseMention[]): Map<string, DiscourseMention[]> {
  const byCluster = new Map<string, DiscourseMention[]>();
  const clusterKw = clusters.map((c) => ({
    c,
    kw: keywords(`${c.title} ${c.districts.join(" ")}`),
    ents: new Set(entitiesIn(c.title).map((e) => e.id)),
  }));

  for (const m of mentions) {
    const mkw = keywords(`${m.title} ${m.text ?? ""}`);
    const ments = new Set(entitiesIn(`${m.title} ${m.text ?? ""}`).map((e) => e.id));
    let best: { slug: string; score: number } | null = null;
    for (const { c, kw, ents } of clusterKw) {
      let overlap = 0;
      for (const k of mkw) if (kw.has(k)) overlap++;
      for (const e of ments) if (ents.has(e)) overlap += 2;
      if (overlap >= 3 && (!best || overlap > best.score)) best = { slug: c.slug, score: overlap };
    }
    if (best) {
      m.matchedEventSlug = best.slug;
      const list = byCluster.get(best.slug) ?? [];
      list.push(m);
      byCluster.set(best.slug, list);
    }
  }
  return byCluster;
}

/**
 * Claims seen repeatedly across discourse but NOT matched to a news cluster.
 * Surfaced as emerging / unverified — never promoted.
 */
export function detectEmergingClaims(
  mentions: DiscourseMention[],
  matched: Set<string>,
): EmergingClaim[] {
  const unmatched = mentions.filter((m) => !matched.has(m.id));
  const byKw = new Map<string, { channels: Set<string>; count: number; first: string; sample: string }>();

  for (const m of unmatched) {
    const kw = [...keywords(m.title)].sort().slice(0, 4).join(" ");
    if (kw.split(" ").length < 2) continue;
    const rec = byKw.get(kw) ?? { channels: new Set<string>(), count: 0, first: m.publishedAt, sample: m.title };
    rec.channels.add(m.channel);
    rec.count++;
    if (m.publishedAt < rec.first) rec.first = m.publishedAt;
    byKw.set(kw, rec);
  }

  return [...byKw.values()]
    .filter((r) => r.count >= 3 && r.channels.size >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((r) => ({
      claim: r.sample,
      discourseMentions: r.count,
      distinctChannels: r.channels.size,
      newsReports: 0,
      primarySources: 0,
      independentVerifiedReports: 0,
      firstSeenAt: r.first,
      label: "EMERGING_UNVERIFIED" as const,
    }));
}

export { keywords as _discourseKeywords };
export { readStance as _readStance };
