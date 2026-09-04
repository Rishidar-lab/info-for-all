/**
 * FeedItem — the single shape every IFFA card renders from.
 *
 * v0.12 productization: the site used to carry two different card components
 * (`iffa/EventCard`, `media/StoryCard`) that each read a full `LiveCluster` and
 * serialised large `trendData` sub-objects into the initial HTML of every list
 * page (≈1 MB on `/india`). `FeedItem` is a small, flat, display-only
 * projection. It is produced two ways — from a `LiveCluster` at build time,
 * and from the `/data/index/latest.json` shard on the client for "load more" —
 * so one `<FeedCard>` serves both.
 */
import type { CategoryId } from "@/lib/domain/categories";
import type { LiveArticle, LiveCluster } from "./types";
import type { MicroBrief } from "@/lib/brief/types";
import { cleanHeadline, fold } from "@/lib/brief/text";

export interface FeedItem {
  slug: string;
  title: string;
  scope: string;
  geoTier: "P0" | "P1" | "P2" | "out";
  category: CategoryId | null;
  districts: string[];
  updatedAt: string;
  /** For the editorial-order tiebreak; matches `byEditorial`. */
  sortAt: string;
  editorialScore: number;
  editorialBand: "urgent" | "high" | "standard" | "background" | "suppressed" | null;
  trendState: "fast-rising" | "rising" | "new" | "resurging" | "stable" | "fading" | null;
  severity: "informational" | "watch" | "significant" | "severe" | "critical" | null;
  isCrisis: boolean;
  crisisType: string | null;
  /** Passes the default-feed category + tier gate (used to reproduce list filters client-side). */
  defaultVisible: boolean;
  brief:
    | { withheld: true; reason: string | null; familyLabel: string }
    | { withheld: false; text: string; citations: number };
  coverage: {
    sources: number;
    genuineFamilies: number;
    tamil: number;
    english: number;
    official: number;
  };
  evidence: { corroborated: number; disputed: number; unresolved: number } | null;
  blindspotCount: number;
  /** Reader-facing, token-free. `null` when nothing meaningful changed. */
  whatChanged: string | null;
  /** Political criticism / allegation with no response on record yet. */
  oneSided: boolean;
  /** Short on-the-ground impact phrase for a Tamil Nadu story, else `null`. */
  onGround: string | null;
}

const NON_EVENTS = [
  /^no new report/i,
  /^duplicate/i,
  /^rephras/i,
  /^first observation/i,
  /^not matched/i,
  /same facts$/i,
  /no new (fact|information)/i,
];

const TOKEN_RE = /\b[a-z]{1,6}:[a-z0-9:._-]+/i;

/** Strip clustering tokens and drop non-events. Returns a reader-safe phrase or null. */
export function prettyChange(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (NON_EVENTS.some((re) => re.test(s))) return null;

  // "new figure(s): a, b, c" / "new affected area(s): x, y" — clean the list.
  const listy = s.match(/^(new (?:figure|affected area)\(s\)):\s*(.+)$/i);
  if (listy) {
    const items = listy[2]
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x && !TOKEN_RE.test(x));
    if (items.length === 0) {
      return listy[1].toLowerCase().includes("figure") ? "A new figure was reported" : "A new area was affected";
    }
    return `${listy[1].charAt(0).toUpperCase() + listy[1].slice(1)}: ${items.slice(0, 3).join(", ")}`;
  }

  const out = s.replace(new RegExp(TOKEN_RE, "gi"), "").replace(/\s{2,}/g, " ").replace(/[:,]\s*$/, "").trim();
  if (out.length < 4) return null;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** True when a micro-brief just restates the headline — then a card shows no brief line. */
export function headlineEcho(title: string, briefText: string): boolean {
  const t = fold(title).replace(/[.\s]+$/, "");
  const b = fold(briefText).replace(/[.\s]+$/, "");
  if (!t || !b) return false;
  if (b === t || b.startsWith(t) || t.startsWith(b)) return true;
  // token overlap ≥ 85%
  const tt = new Set(t.split(" ").filter((w) => w.length > 2));
  const bt = b.split(" ").filter((w) => w.length > 2);
  if (bt.length === 0) return false;
  const hit = bt.filter((w) => tt.has(w)).length;
  return hit / bt.length >= 0.85 && Math.abs(bt.length - tt.size) <= 3;
}

function onGroundPhrase(c: LiveCluster): string | null {
  const li = c.trendData?.localImpact;
  if (!li || li.statements.length === 0 || li.scale === "none") return null;
  const parts = [
    li.impactKinds?.join(" / "),
    li.affectedInfrastructure?.slice(0, 2).join(", "),
  ].filter(Boolean);
  const body = parts.join(" — ");
  if (!body) return null;
  const where = li.affectedDistricts?.slice(0, 3).join(", ");
  return where ? `${body} · ${where}` : body;
}

function evidenceCounts(c: LiveCluster): FeedItem["evidence"] {
  const ep = c.trendData?.mediaLandscape?.evidenceProfile;
  if (!ep || ep.substantiveClaims === 0) return null;
  const b = ep.byStatus;
  const corroborated = b.HIGHLY_CORROBORATED + b.CORROBORATED;
  const disputed = b.DISPUTED + b.RETRACTED;
  const unresolved = b.SINGLE_SOURCE + b.UNVERIFIED + b.PARTIALLY_CORROBORATED;
  if (corroborated + disputed + unresolved === 0) return null;
  return { corroborated, disputed, unresolved };
}

/** Build a FeedItem from a live cluster. `mb` is the cluster's micro-brief. */
export function toFeedItem(cluster: LiveCluster, _articles: LiveArticle[], mb: MicroBrief): FeedItem {
  const td = cluster.trendData;
  const geoTier =
    (td?.geoTier as FeedItem["geoTier"]) ??
    (cluster.scope === "tamil-nadu" ? "P0" : cluster.scope === "excluded" ? "out" : "P1");
  const band = (td?.editorial?.band as FeedItem["editorialBand"]) ?? null;
  const cov = mb.coverage;

  return {
    slug: cluster.slug,
    title: cleanHeadline(cluster.title),
    scope: cluster.scope,
    geoTier,
    category: (td?.category as CategoryId) ?? null,
    districts: cluster.districts.slice(0, 4),
    updatedAt: cluster.updatedAt,
    sortAt: td?.lastMeaningfulUpdateAt ?? cluster.updatedAt,
    editorialScore: td?.editorial?.score ?? td?.trend?.score ?? 0,
    editorialBand: band,
    trendState: (td?.trend?.state as FeedItem["trendState"]) ?? null,
    severity: (td?.severity?.level as FeedItem["severity"]) ?? null,
    isCrisis: cluster.isCrisis,
    crisisType: cluster.crisisType ?? null,
    defaultVisible:
      geoTier !== "out" &&
      band !== "suppressed" &&
      td?.category !== "entertainment" &&
      td?.category !== "celebrity",
    brief: mb.withheld
      ? { withheld: true, reason: mb.withheldReason ?? null, familyLabel: cov.familyLabel }
      : { withheld: false, text: mb.text, citations: mb.citationCount },
    coverage: {
      sources: cov.sources,
      genuineFamilies: cov.genuineFamilies,
      tamil: cov.tamil,
      english: cov.english,
      official: cov.official,
    },
    evidence: evidenceCounts(cluster),
    blindspotCount: td?.mediaLandscape?.blindspots.length ?? 0,
    whatChanged:
      td?.novelty && td.novelty.updateKind !== "duplicate"
        ? prettyChange(td.novelty.changes[0])
        : null,
    oneSided: !!td?.politicalCoverage?.unanswered,
    onGround: geoTier === "P0" ? onGroundPhrase(cluster) : null,
  };
}
