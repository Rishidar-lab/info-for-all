/**
 * Reddit RSS discourse adapter (v0.10, Phase 9).
 *
 * Reads Reddit's PUBLIC RSS feeds (the same category of endpoint as every other
 * feed IFFA ingests). A descriptive User-Agent, one request per subreddit per
 * run, a courteous delay between requests, and graceful 429 handling — never a
 * bypass. Engagement metadata (score / comments) is captured for display only
 * and is NEVER used for scoring.
 */
import type { DiscourseMention } from "@/lib/media-landscape/types";
import { entitiesIn } from "@/lib/media-landscape/entities";
import { readStance } from "@/lib/media-landscape/stance";

/** Subreddits relevant to Tamil Nadu / India public discourse. */
export const DISCOURSE_SUBREDDITS = [
  "tamilnadu",
  "chennai",
  "india",
  "IndiaSpeaks",
  "Coimbatore",
  "Cricket",
  "IndianStreetBets",
];

const UA = "IFFA-discourse/0.10 (public-interest media-landscape research; +https://github.com/Rishidar-lab/info-for-all)";

interface RedditFetch {
  mentions: DiscourseMention[];
  status: string;
  itemsSeen: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stanceOf(text: string): DiscourseMention["stance"] {
  const ents = entitiesIn(text);
  return readStance(text, ents[0]).stance;
}

function langOf(text: string): "ta" | "en" | "unknown" {
  return /[஀-௿]/.test(text) ? "ta" : /[a-z]/i.test(text) ? "en" : "unknown";
}

/** Parse a Reddit Atom feed into DiscourseMentions. */
export function parseRedditRss(xml: string, subreddit: string): DiscourseMention[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const out: DiscourseMention[] = [];
  for (const e of entries) {
    const title = (e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const link = e.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? "";
    const published = e.match(/<(?:published|updated)>([^<]+)</)?.[1] ?? "";
    const content = (e.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? "").replace(/<[^>]+>|&[a-z]+;/g, " ").slice(0, 400);
    if (!title || !link) continue;
    const text = `${title}. ${content}`;
    out.push({
      id: `reddit:${subreddit}:${(link.match(/comments\/([a-z0-9]+)/i)?.[1] ?? Math.random().toString(36).slice(2))}`,
      platform: "reddit",
      channel: `r/${subreddit}`,
      url: link,
      publishedAt: published || new Date().toISOString(),
      title,
      text: content || undefined,
      claims: [],
      linkedEvidence: [],
      stance: stanceOf(text),
      language: langOf(text),
    });
  }
  return out;
}

export async function fetchSubreddit(subreddit: string): Promise<RedditFetch> {
  const url = `https://www.reddit.com/r/${subreddit}/hot/.rss?limit=25`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/atom+xml" }, signal: AbortSignal.timeout(20_000) });
      if (res.status === 429) {
        await sleep(8000);
        continue;
      }
      if (!res.ok) return { mentions: [], status: `HTTP ${res.status}`, itemsSeen: 0 };
      const xml = await res.text();
      const mentions = parseRedditRss(xml, subreddit);
      return { mentions, status: `HTTP 200`, itemsSeen: mentions.length };
    } catch (err) {
      return { mentions: [], status: `error: ${String(err).slice(0, 60)}`, itemsSeen: 0 };
    }
  }
  return { mentions: [], status: "HTTP 429 (rate-limited)", itemsSeen: 0 };
}

export interface DiscourseSourceStatus {
  platform: string;
  channel: string;
  url: string;
  status: string;
  itemsSeen: number;
}

export async function fetchAllSubreddits(): Promise<{ mentions: DiscourseMention[]; sources: DiscourseSourceStatus[] }> {
  const all: DiscourseMention[] = [];
  const sources: DiscourseSourceStatus[] = [];
  for (const sub of DISCOURSE_SUBREDDITS) {
    const r = await fetchSubreddit(sub);
    all.push(...r.mentions);
    sources.push({ platform: "reddit", channel: `r/${sub}`, url: `https://www.reddit.com/r/${sub}/`, status: r.status, itemsSeen: r.itemsSeen });
    await sleep(6000); // courteous delay between subreddits (Reddit rate-limits hard)
  }
  return { mentions: all, sources };
}
