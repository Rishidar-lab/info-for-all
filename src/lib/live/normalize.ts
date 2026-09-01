import type { FeedSource } from "@/data/feeds";
import type { RawItem } from "./parse";
import type { CapMeta, EvidenceRole, LiveArticle } from "./types";
import {
  cleanExcerpt,
  cleanTitle,
  detectLanguage,
  safeDate,
  safeUrl,
  stableId,
} from "./text";
import { classifyGeo, isIndiaRelevantToTN } from "./geo";
import {
  capWeight,
  detectCrisisType,
  editorialPriority,
  lifecycleFromCap,
  verificationFor,
} from "./crisis";

/** Refine the feed's default evidence role using the item's own signals. */
function evidenceRole(feed: FeedSource, item: RawItem): EvidenceRole {
  if (feed.kind === "sachet-json" || feed.id === "ndma-sachet-rss") return "official-alert";
  const author = (item.author || "").toLowerCase();
  const title = (item.title || "").toLowerCase();
  if (feed.official) {
    if (/order|notification|circular|gazette|advisory|sitrep|situation report/.test(title)) return "primary-document";
    return "government-statement";
  }
  if (/imd|met department|meteorolog|ndrf|sdrf|collector|district administration|govt|government|minister|cm |chief minister/.test(author + " " + title)) {
    return "government-statement";
  }
  if (/analysis|explained|explainer|why |how |what to know/.test(title)) return "expert-analysis";
  return feed.defaultEvidenceRole;
}

export interface NormalizeResult {
  article: LiveArticle | null;
  rejectReason?: string;
}

export function normalizeItem(feed: FeedSource, item: RawItem, fetchedAt: string, now = Date.now()): NormalizeResult {
  const url = safeUrl(item.link);
  if (!url) return { article: null, rejectReason: "no valid source URL" };

  const title = cleanTitle(item.title);
  if (!title || title.length < 8) return { article: null, rejectReason: "missing / too-short title" };

  const publishedIso = safeDate(item.published, now) ?? safeDate(item.cap?.effectiveFrom, now);
  if (!publishedIso) return { article: null, rejectReason: "unparseable / absent publication date" };

  const excerpt = cleanExcerpt(item.summary) || undefined;

  const cap: CapMeta | undefined = item.cap
    ? {
        severity: item.cap.severity,
        urgency: item.cap.urgency,
        certainty: item.cap.certainty,
        severityColour: item.cap.severityColour,
        event: item.cap.event,
        senderName: item.cap.senderName,
        effectiveFrom: safeDate(item.cap.effectiveFrom, now) ?? undefined,
        effectiveUntil: safeDate(item.cap.effectiveUntil, now) ?? undefined,
        areaDescription: item.cap.areaDescription ? cleanExcerpt(item.cap.areaDescription) : undefined,
        centroid: item.cap.centroid,
        identifier: item.cap.identifier,
      }
    : undefined;

  const geo = classifyGeo({
    title,
    excerpt,
    areaDescription: cap?.areaDescription,
    feedFocus: feed.focus === "india-disaster" ? "india" : feed.focus,
  });

  let scope = geo.scope;
  if (scope === "india" && isIndiaRelevantToTN({ title, excerpt })) scope = "india-relevant";

  const role = evidenceRole(feed, item);
  const isOfficialAlert = role === "official-alert";

  const crisis = detectCrisisType({
    title,
    excerpt,
    capEvent: cap?.event,
    disasterType: cap?.event,
  });

  const ageHours = (now - Date.parse(publishedIso)) / 3_600_000;
  const lifecycle = cap
    ? lifecycleFromCap(cap, now)
    : isOfficialAlert
      ? ageHours < 18
        ? "active"
        : ageHours < 72
          ? "update"
          : "archived"
      : "developing";

  const language = detectLanguage([title, excerpt].filter(Boolean).join(" "));

  // Crisis if: an official alert with a crisis type, OR strong crisis-type match in TN/India.
  const isCrisis =
    (isOfficialAlert && !!crisis.type && lifecycle !== "archived") ||
    (!!crisis.type && crisis.weight >= 24 && scope !== "excluded" && lifecycle !== "all-clear");

  const priority = isCrisis
    ? // crisis priority is finalised in the orchestrator once corroboration is known;
      // seed it here with single-source assumptions
      Math.min(
        100,
        (isOfficialAlert ? 18 : 0) +
          Math.min(crisis.weight, 38) +
          Math.min(capWeight(cap), 36) +
          (scope === "tamil-nadu" ? 16 : scope === "india-relevant" ? 6 : 0) +
          Math.min(geo.districts.length * 2, 12),
      )
    : editorialPriority({
        scope,
        districtCount: geo.districts.length,
        publishedAt: publishedIso,
        corroboratingSources: 0,
        hasPrimaryDoc: role === "primary-document",
        evidenceRole: role,
        now,
      });

  const verificationStatus = verificationFor(role, 0, isOfficialAlert);

  const id = stableId(feed.id, item.guid || url, title);

  const article: LiveArticle = {
    id,
    title,
    url,
    sourceId: feed.id,
    sourceName: feed.name,
    sourceUrl: feed.homepage,
    publishedAt: publishedIso,
    fetchedAt,
    language: language === "unknown" && feed.language !== "mixed" ? feed.language : language,
    scope,
    state: geo.state,
    districts: geo.districts,
    geo,
    evidenceRole: role,
    verificationStatus,
    excerpt,
    crisisType: crisis.type,
    crisisPriority: Math.round(priority),
    isCrisis,
    lifecycle: isCrisis ? lifecycle : "developing",
    cap,
  };

  return { article };
}
