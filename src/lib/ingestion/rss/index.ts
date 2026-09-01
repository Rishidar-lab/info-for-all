import { assertSafeUrl } from "../ssrf";
import { env } from "../../env";
import { upstreamError } from "../../errors";
import { stripHtml } from "../../text";
import type { FeedResult, IngestionAdapter, RawFeedItem } from "../types";

/**
 * RSS 2.0 / Atom adapter.
 *
 * Uses a focused tag extractor rather than a full XML parser — it handles the
 * common feed shapes (CDATA, Atom `link[rel=alternate]`, Dublin Core dates).
 * It is intentionally swappable: implement `IngestionAdapter` with a hardened
 * XML parser without touching the pipeline. Respects robots/terms is the
 * operator's responsibility — see docs/METHODOLOGY.md.
 */

function decodeCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function firstTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = re.exec(block);
  return match ? decodeCdata(match[1]).trim() : undefined;
}

function attr(block: string, tag: string, name: string): string | undefined {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"[^>]*/?>`, "i");
  const match = re.exec(block);
  return match ? match[1].trim() : undefined;
}

function extractBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) out.push(match[1]);
  return out;
}

export function parseFeed(xml: string): RawFeedItem[] {
  const channelTitle = firstTag(xml, "title");
  const rawItems = [...extractBlocks(xml, "item"), ...extractBlocks(xml, "entry")];

  return rawItems
    .map((block): RawFeedItem | null => {
      const link =
        firstTag(block, "link") ||
        attr(block, "link", "href") ||
        firstTag(block, "guid") ||
        firstTag(block, "id");
      const title = firstTag(block, "title");
      if (!link || !title || !/^https?:\/\//i.test(link)) return null;

      const summaryRaw =
        firstTag(block, "description") ||
        firstTag(block, "summary") ||
        firstTag(block, "media:description");
      const contentRaw = firstTag(block, "content:encoded") || firstTag(block, "content");

      return {
        url: link,
        title: stripHtml(title),
        summary: summaryRaw ? stripHtml(summaryRaw) : undefined,
        content: contentRaw ? stripHtml(contentRaw) : undefined,
        author:
          firstTag(block, "dc:creator") ||
          firstTag(block, "author") ||
          firstTag(block, "name"),
        publishedAt:
          firstTag(block, "pubDate") ||
          firstTag(block, "published") ||
          firstTag(block, "updated") ||
          firstTag(block, "dc:date"),
        imageUrl: attr(block, "enclosure", "url") || attr(block, "media:content", "url"),
        publication: channelTitle,
        guid: firstTag(block, "guid") || firstTag(block, "id"),
      };
    })
    .filter((item): item is RawFeedItem => item !== null);
}

export interface RssInput {
  feedUrl: string;
  /** Injected for tests / offline use — skips the network fetch. */
  xml?: string;
}

export const rssAdapter: IngestionAdapter<RssInput> = {
  name: "rss",
  async fetch(input: RssInput): Promise<FeedResult> {
    let xml = input.xml;
    let host = "offline";
    if (xml === undefined) {
      const { url } = await assertSafeUrl(input.feedUrl);
      host = url.hostname;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          redirect: "error",
          headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
        });
        if (!response.ok) throw upstreamError(`Feed responded ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > env.INGEST_MAX_BYTES) throw upstreamError("Feed exceeds size limit");
        xml = new TextDecoder().decode(buffer);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw upstreamError("Feed fetch timed out");
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    }

    return {
      adapter: "rss",
      sourceHint: { name: firstTag(xml, "title"), domain: host === "offline" ? undefined : host },
      items: parseFeed(xml),
    };
  },
};
