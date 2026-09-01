import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Evidence } from "./types";
import { stableId } from "@/lib/live/text";

/**
 * Distinguish journalism from direct evidence.
 *
 * Right now the only primary evidence IFA retrieves is the NDMA / SACHET CAP
 * alert that some events originate from. It is NEVER invented — an Evidence
 * record is created only from a `cap` object actually present on an article.
 */
export function extractEvidence(cluster: LiveCluster, articles: LiveArticle[]): Evidence[] {
  const out: Evidence[] = [];
  const seen = new Set<string>();

  for (const a of articles) {
    if (!a.cap) continue;
    const key = a.cap.identifier ?? a.url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: stableId("evidence", cluster.id, key),
      type: "government-alert",
      title: a.cap.event ? `${a.cap.event} alert` : "Official CAP alert",
      publisher: a.cap.senderName ?? a.publisher ?? "NDMA SACHET",
      url: a.url,
      publishedAt: a.cap.effectiveFrom ?? a.publishedAt,
      supportsClaimIds: [],
      provenance: {
        source: "NDMA SACHET (Common Alerting Protocol)",
        identifier: a.cap.identifier ?? null,
        event: a.cap.event ?? null,
        severity: a.cap.severity ?? null,
        certainty: a.cap.certainty ?? null,
        urgency: a.cap.urgency ?? null,
        areaDescription: a.cap.areaDescription ?? null,
        effectiveFrom: a.cap.effectiveFrom ?? null,
        effectiveUntil: a.cap.effectiveUntil ?? null,
      },
    });
  }
  return out;
}
