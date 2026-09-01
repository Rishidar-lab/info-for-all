import { badRequest } from "../errors";
import { normalizeWhitespace, stripHtml, truncate } from "../text";
import type { NormalizedArticle, RawFeedItem } from "./types";

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|ref_src$|s$|__twitter)/i;

export function canonicalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw badRequest(`Invalid article URL: ${rawUrl}`);
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const kept = [...url.searchParams.entries()].filter(([key]) => !TRACKING_PARAMS.test(key));
  url.search = "";
  kept.sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of kept) url.searchParams.append(key, value);
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  return url.toString();
}

export function domainFromUrl(rawUrl: string): string {
  return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
}

function parsePublishedAt(input: string | undefined): Date {
  if (!input) return new Date();
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return new Date();
  // Reject implausible future timestamps (> 2 days ahead) — treat as "now".
  if (parsed.getTime() - Date.now() > 2 * 24 * 60 * 60 * 1000) return new Date();
  return parsed;
}

export interface NormalizeOptions {
  fallbackPublication?: string;
  defaultLanguage?: string;
}

export function normalizeItem(item: RawFeedItem, options: NormalizeOptions = {}): NormalizedArticle {
  const title = normalizeWhitespace(stripHtml(item.title ?? ""));
  if (!title) throw badRequest("Article is missing a title");
  if (!item.url) throw badRequest("Article is missing a URL");

  const canonicalUrl = canonicalizeUrl(item.url);
  const sourceDomain = domainFromUrl(canonicalUrl);
  const description = item.summary ? truncate(stripHtml(item.summary), 400) : null;
  const contentText = item.content ? stripHtml(item.content) : item.summary ? stripHtml(item.summary) : "";
  const contentExcerpt = contentText ? truncate(contentText, 1200) : null;

  return {
    url: item.url,
    canonicalUrl,
    title: truncate(title, 300),
    description,
    contentExcerpt,
    publication: normalizeWhitespace(item.publication ?? options.fallbackPublication ?? sourceDomain),
    author: item.author ? truncate(normalizeWhitespace(stripHtml(item.author)), 120) : null,
    publishedAt: parsePublishedAt(item.publishedAt),
    language: (item.language ?? options.defaultLanguage ?? "en").slice(0, 5).toLowerCase(),
    imageUrl: item.imageUrl && /^https?:\/\//i.test(item.imageUrl) ? item.imageUrl : null,
    wireService: item.wireService ? normalizeWhitespace(item.wireService) : null,
    sourceDomain,
    dedupeKey: canonicalUrl,
    metadata: {
      guid: item.guid ?? null,
      ingestedVia: "normalizer/v1",
    },
  };
}
