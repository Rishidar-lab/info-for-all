/**
 * IFA live ingestion.
 *
 *   npx tsx scripts/ingest-feeds.ts
 *
 * Fetches configured India / Tamil Nadu feeds, normalises + geo-classifies +
 * ranks + clusters them deterministically, and writes:
 *
 *   src/data/generated/live-feed.json
 *
 * Guarantees:
 *  - each feed fetch times out cleanly;
 *  - one failing feed never aborts the run;
 *  - on feed failure the previous run's items for that feed are retained
 *    (last-known-good) and the feed is marked `stale`;
 *  - no LLM / paid API is used;
 *  - only headline, source, canonical URL, timestamp, short excerpt and
 *    structured alert metadata are stored.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEED_SOURCES, type FeedSource } from "../src/data/feeds";
import { parseFeed, parseSachetJson, type RawItem } from "../src/lib/live/parse";
import { normalizeItem } from "../src/lib/live/normalize";
import { clusterArticles } from "../src/lib/live/cluster";
import { buildEventClaims } from "../src/lib/claims";
import { crisisPriority, capWeight, detectCrisisType, verificationFor } from "../src/lib/live/crisis";
import { normalisedTitleKey } from "../src/lib/live/text";
import type { FeedStatus, LiveArticle, LiveDataset, FeedHealth } from "../src/lib/live/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/data/generated/live-feed.json");
const USER_AGENT =
  "IFA-ingest/0.4 (+https://github.com/Rishidar-lab/info-for-all; Tamil Nadu / India public-safety aggregation; contact via repo issues)";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_ITEMS_PER_FEED = 60;
const MAX_ARTICLE_AGE_DAYS = 7;

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    if (body.length < 20) throw new Error("empty response body");
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function loadPrevious(): LiveDataset | null {
  if (!existsSync(OUT)) return null;
  try {
    return JSON.parse(readFileSync(OUT, "utf8")) as LiveDataset;
  } catch {
    return null;
  }
}

async function ingestFeed(feed: FeedSource, fetchedAt: string, now: number): Promise<{ status: FeedStatus; articles: LiveArticle[] }> {
  const status: FeedStatus = {
    sourceId: feed.id,
    sourceName: feed.name,
    lastAttemptAt: fetchedAt,
    status: "failed",
    itemCount: 0,
  };
  try {
    const body = await fetchText(feed.url);
    let raw: RawItem[];
    if (feed.kind === "sachet-json") raw = parseSachetJson(body);
    else raw = parseFeed(body).items;

    const articles: LiveArticle[] = [];
    let rejected = 0;
    for (const item of raw.slice(0, MAX_ITEMS_PER_FEED)) {
      const { article } = normalizeItem(feed, item, fetchedAt, now);
      if (!article) {
        rejected++;
        continue;
      }
      if (article.scope === "excluded") continue;
      const ageDays = (now - Date.parse(article.publishedAt)) / 86_400_000;
      if (ageDays > MAX_ARTICLE_AGE_DAYS) continue;
      articles.push(article);
    }

    status.status = "ok";
    status.lastSuccessAt = fetchedAt;
    status.itemCount = articles.length;
    if (rejected > 0) status.error = `${rejected} malformed item(s) rejected`;
    return { status, articles };
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
    return { status, articles: [] };
  }
}

/** Merge SACHET RSS canonical links into SACHET JSON alerts (same identifier). */
function mergeSachetLinks(articles: LiveArticle[]): LiveArticle[] {
  const rssById = new Map<string, LiveArticle>();
  for (const a of articles) {
    if (a.sourceId === "ndma-sachet-rss") {
      const m = a.url.match(/identifier=(\d+)/);
      if (m) rssById.set(m[1], a);
    }
  }
  const out: LiveArticle[] = [];
  const seenIdentifier = new Set<string>();
  for (const a of articles) {
    if (a.sourceId === "ndma-sachet-json" && a.cap?.identifier) {
      seenIdentifier.add(a.cap.identifier);
    }
  }
  for (const a of articles) {
    // Drop the RSS twin when the JSON alert already covers that identifier.
    if (a.sourceId === "ndma-sachet-rss") {
      const m = a.url.match(/identifier=(\d+)/);
      if (m && seenIdentifier.has(m[1])) continue;
    }
    out.push(a);
  }
  return out;
}

function dedupe(articles: LiveArticle[]): LiveArticle[] {
  const byUrl = new Map<string, LiveArticle>();
  const byTitleKey = new Map<string, LiveArticle>();
  const keep: LiveArticle[] = [];
  for (const a of articles.sort((x, y) => Date.parse(y.publishedAt) - Date.parse(x.publishedAt))) {
    const urlKey = a.url.replace(/\/$/, "").toLowerCase();
    // Same publisher + same normalised headline = the same article syndicated
    // across that publisher's desks (e.g. The Hindu National vs The Hindu TN).
    const titleKey = a.publisher + "|" + normalisedTitleKey(a.title);
    if (byUrl.has(urlKey)) continue;
    if (a.title.length > 12 && byTitleKey.has(titleKey)) continue;
    byUrl.set(urlKey, a);
    byTitleKey.set(titleKey, a);
    keep.push(a);
  }
  return keep;
}

/** Re-score crisis priority once corroboration across sources is known. */
function finaliseCrisisPriority(articles: LiveArticle[], now: number): LiveArticle[] {
  const crisisArticles = articles.filter((a) => a.isCrisis);
  for (const a of crisisArticles) {
    const peers = crisisArticles.filter(
      (b) =>
        b.id !== a.id &&
        b.publisher !== a.publisher &&
        (b.crisisType || null) === (a.crisisType || null) &&
        // Real district overlap only — "both India-scope, no district" is not corroboration.
        (b.districts.some((d) => a.districts.includes(d)) ||
          (a.scope === "tamil-nadu" && b.scope === "tamil-nadu" && a.districts.length === 0 && b.districts.length === 0)) &&
        Math.abs(Date.parse(b.publishedAt) - Date.parse(a.publishedAt)) < 30 * 3600 * 1000,
    );
    const corroborating = new Set(peers.map((p) => p.publisher)).size;
    const hasOfficial = a.evidenceRole === "official-alert" || peers.some((p) => p.evidenceRole === "official-alert");
    a.crisisPriority = crisisPriority({
      isOfficialAlert: a.evidenceRole === "official-alert",
      scope: a.scope,
      districtCount: a.districts.length,
      publishedAt: a.publishedAt,
      crisisWeight: detectCrisisType({ title: a.title, excerpt: a.excerpt, capEvent: a.cap?.event }).weight,
      capWeight: capWeight(a.cap),
      corroboratingSources: corroborating,
      hasPrimaryDoc: a.evidenceRole === "primary-document" || peers.some((p) => p.evidenceRole === "primary-document"),
      lifecycle: a.lifecycle,
      now,
    });
    a.verificationStatus = verificationFor(a.evidenceRole, corroborating, hasOfficial);
  }
  return articles;
}

function health(feeds: FeedStatus[], scopedItemCount: number): FeedHealth {
  // No valid Tamil Nadu / India item exists at all — distinct from "feeds are
  // failing"; this is "there is nothing to show", and must say so plainly.
  if (scopedItemCount === 0) return "empty";
  const enabled = feeds.length;
  const ok = feeds.filter((f) => f.status === "ok").length;
  if (ok === 0) return "stale";
  if (ok < enabled) return "degraded";
  return "live";
}

async function main() {
  const now = Date.now();
  const fetchedAt = new Date(now).toISOString();
  const previous = loadPrevious();
  const enabled = FEED_SOURCES.filter((f) => f.enabled);

  console.log(`IFA ingest — ${fetchedAt} — ${enabled.length} enabled feed(s)`);

  const results = await Promise.all(enabled.map((f) => ingestFeed(f, fetchedAt, now)));

  const feeds: FeedStatus[] = [];
  let articles: LiveArticle[] = [];

  for (let i = 0; i < enabled.length; i++) {
    const feed = enabled[i];
    const { status, articles: fresh } = results[i];

    if (status.status === "ok") {
      feeds.push(status);
      articles.push(...fresh);
      console.log(`  ok    ${feed.id.padEnd(20)} ${fresh.length} item(s)${status.error ? `  (${status.error})` : ""}`);
    } else {
      // last-known-good: reuse previous items for this feed, mark stale
      const prevForFeed = previous?.articles.filter((a) => a.sourceId === feed.id) ?? [];
      const prevSuccess = previous?.feeds.find((f) => f.sourceId === feed.id)?.lastSuccessAt;
      feeds.push({
        ...status,
        status: prevForFeed.length ? "stale" : "failed",
        lastSuccessAt: prevSuccess,
        itemCount: prevForFeed.length,
      });
      articles.push(...prevForFeed);
      console.log(`  FAIL  ${feed.id.padEnd(20)} ${status.error} — retained ${prevForFeed.length} last-known-good item(s)`);
    }
  }

  articles = mergeSachetLinks(articles);
  articles = dedupe(articles);
  articles = finaliseCrisisPriority(articles, now);
  articles.sort((a, b) => b.crisisPriority - a.crisisPriority || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const { clusters, weakMatchesRejected } = clusterArticles(articles, now);

  // ── v0.3: grounded claim intelligence for events where it is meaningful ──
  const articlesById = new Map(articles.map((a) => [a.id, a]));
  let claimEvents = 0;
  let totalClaims = 0;
  for (const c of clusters) {
    const meaningful = c.articleIds.length >= 2 || c.isCrisis || !!c.cap;
    if (!meaningful) continue;
    const arts = c.articleIds.map((id) => articlesById.get(id)).filter((a): a is LiveArticle => !!a);
    if (arts.length === 0) continue;
    const ec = buildEventClaims(c, arts, now);
    if (ec.claims.length === 0 && ec.evidence.length === 0) continue;
    c.claims = ec;
    claimEvents++;
    totalClaims += ec.claims.length;
  }

  const lastSuccessTimes = feeds.map((f) => f.lastSuccessAt).filter(Boolean).sort() as string[];
  const lastSuccessAt = lastSuccessTimes.length ? lastSuccessTimes[lastSuccessTimes.length - 1] : null;

  const activeCrisisClusters = clusters.filter(
    (c) => c.isCrisis && (c.lifecycle === "active" || c.lifecycle === "update" || c.lifecycle === "developing"),
  );

  const scopedItemCount = articles.filter((a) => a.scope === "tamil-nadu" || a.scope === "india" || a.scope === "india-relevant").length;

  const dataset: LiveDataset = {
    generatedAt: fetchedAt,
    lastSuccessAt,
    health: health(feeds, scopedItemCount),
    feeds,
    articles,
    clusters,
    counts: {
      activeCrisis: activeCrisisClusters.length,
      tamilNadu: articles.filter((a) => a.scope === "tamil-nadu").length,
      india: articles.filter((a) => a.scope === "india" || a.scope === "india-relevant").length,
      comparisons: clusters.filter((c) => c.isVerifiedComparison).length,
      singleReports: clusters.filter((c) => !c.isVerifiedComparison).length,
      weakMatchesRejected,
      distinctPublishers: new Set(articles.map((a) => a.publisher)).size,
      workingFeeds: feeds.filter((f) => f.status === "ok").length,
      failedFeeds: feeds.filter((f) => f.status !== "ok").length,
    },
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(dataset, null, 2) + "\n");

  console.log(
    `\nWrote ${OUT}\n  health=${dataset.health}  articles=${articles.length}  clusters=${clusters.length}  ` +
      `active-crisis=${dataset.counts.activeCrisis}  TN=${dataset.counts.tamilNadu}  India=${dataset.counts.india}  ` +
      `publishers=${dataset.counts.distinctPublishers}  verified-comparisons=${dataset.counts.comparisons}  ` +
      `weak-rejected=${dataset.counts.weakMatchesRejected}  feeds ok=${dataset.counts.workingFeeds}/${feeds.length}\n  ` +
      `claim-events=${claimEvents}  claims=${totalClaims}`,
  );

  // Never fail the run just because some feeds failed — that is expected and handled.
  if (dataset.counts.workingFeeds === 0 && !previous) {
    console.error("No feeds succeeded and no previous data exists.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Ingest crashed:", err);
  process.exit(1);
});
