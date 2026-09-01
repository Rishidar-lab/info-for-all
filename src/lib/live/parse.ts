import { XMLParser } from "fast-xml-parser";

/**
 * Minimal RSS / Atom / SACHET-JSON parsing into a common raw shape.
 * No network, no side effects — pure transforms over already-fetched text.
 */

export interface RawItem {
  title?: string;
  link?: string;
  summary?: string;
  published?: string;
  author?: string;
  category?: string;
  guid?: string;
  /** SACHET / CAP structured extras, when present. */
  cap?: {
    severity?: string;
    urgency?: string;
    certainty?: string;
    event?: string;
    senderName?: string;
    effectiveFrom?: string;
    effectiveUntil?: string;
    areaDescription?: string;
    severityColour?: string;
    centroid?: { lat: number; lon: number };
    identifier?: string;
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: false,
  processEntities: true,
  htmlEntities: true,
});

function arr<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function text(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["#text"] === "string") return o["#text"] as string;
    if (typeof o["@_href"] === "string") return o["@_href"] as string;
  }
  return undefined;
}

export function parseFeed(xml: string): { items: RawItem[]; kind: "rss" | "atom" | "unknown" } {
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return { items: [], kind: "unknown" };
  }

  // RSS 2.0
  const rss = doc.rss as Record<string, unknown> | undefined;
  if (rss) {
    const channel = rss.channel as Record<string, unknown> | undefined;
    const items = arr(channel?.item as Record<string, unknown> | Record<string, unknown>[]);
    return {
      kind: "rss",
      items: items.map((it) => ({
        title: text(it.title),
        link: text(it.link),
        summary: text(it.description) ?? text(it["content:encoded"]),
        published: text(it.pubDate) ?? text(it["dc:date"]),
        author: text(it.author) ?? text(it["dc:creator"]),
        category: Array.isArray(it.category)
          ? (it.category.map(text).filter(Boolean).join(", ") as string)
          : text(it.category),
        guid: text(it.guid),
      })),
    };
  }

  // RDF / RSS 1.0
  const rdf = doc["rdf:RDF"] as Record<string, unknown> | undefined;
  if (rdf) {
    const items = arr(rdf.item as Record<string, unknown> | Record<string, unknown>[]);
    return {
      kind: "rss",
      items: items.map((it) => ({
        title: text(it.title),
        link: text(it.link),
        summary: text(it.description),
        published: text(it["dc:date"]),
        author: text(it["dc:creator"]),
        category: text(it["dc:subject"]),
        guid: text(it.link),
      })),
    };
  }

  // Atom
  const feed = doc.feed as Record<string, unknown> | undefined;
  if (feed) {
    const entries = arr(feed.entry as Record<string, unknown> | Record<string, unknown>[]);
    return {
      kind: "atom",
      items: entries.map((e) => {
        const links = arr(e.link as Record<string, unknown> | Record<string, unknown>[]);
        const alt = links.find((l) => (l as Record<string, unknown>)["@_rel"] === "alternate") ?? links[0];
        return {
          title: text(e.title),
          link: text(alt) ?? text(e.id),
          summary: text(e.summary) ?? text(e.content),
          published: text(e.updated) ?? text(e.published),
          author: text((e.author as Record<string, unknown>)?.name) ?? text(e.author),
          category: Array.isArray(e.category)
            ? (e.category.map((c) => (c as Record<string, unknown>)["@_term"]).filter(Boolean).join(", ") as string)
            : text((e.category as Record<string, unknown>)?.["@_term"]),
          guid: text(e.id),
        };
      }),
    };
  }

  return { items: [], kind: "unknown" };
}

/** SACHET FetchAllAlertDetails JSON array -> RawItem[] (one per alert). */
export function parseSachetJson(jsonText: string): RawItem[] {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: RawItem[] = [];
  for (const row of data as Record<string, unknown>[]) {
    if (!row || typeof row !== "object") continue;
    const id = row.identifier != null ? String(row.identifier) : undefined;
    if (!id) continue;
    const centroidRaw = typeof row.centroid === "string" ? row.centroid.split(",").map(Number) : undefined;
    out.push({
      title: (row.warning_message as string) || (row.disaster_type as string) || "Disaster alert",
      link: `https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=${id}`,
      summary: [row.disaster_type, row.area_description].filter(Boolean).join(" — "),
      published: (row.effective_start_time as string) || undefined,
      author: (row.alert_source as string) || "NDMA SACHET",
      category: (row.disaster_type as string) || "Alert",
      guid: id,
      cap: {
        severity: (row.severity as string) || undefined,
        certainty: (row.severity_level as string) || undefined,
        event: (row.disaster_type as string) || undefined,
        senderName: (row.alert_source as string) || undefined,
        effectiveFrom: (row.effective_start_time as string) || undefined,
        effectiveUntil: (row.effective_end_time as string) || undefined,
        areaDescription: (row.area_description as string) || undefined,
        severityColour: (row.severity_color as string) || undefined,
        centroid:
          centroidRaw && centroidRaw.length === 2 && centroidRaw.every((n) => Number.isFinite(n))
            ? { lon: centroidRaw[0], lat: centroidRaw[1] }
            : undefined,
        identifier: id,
      },
    });
  }
  return out;
}
