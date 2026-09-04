/**
 * Candidate canonicalisation + dedupe.
 *
 * Runs BEFORE independence resolution so that "4 URLs" cannot become "4
 * sources": same canonical URL, same publisher + same normalised headline, and
 * near-verbatim reposts all collapse to one candidate here. Wire / corporate
 * collapse is independence's job (`resolve.ts`) — this stage removes only exact
 * and near-exact duplicates.
 */
import { detectWireCredit } from "@/lib/independence/wire";
import { normalisedTitleKey } from "@/lib/live/text";
import type { DiscoveryCandidate } from "./types";

const TRACKING_PARAMS =
  /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|cmpid$|CMP$|_hsenc$|_hsmi$|igshid$|spm$|at_|s_cid$|ns_|__twitter_impression$)/i;

/** Best-effort canonical URL — no network. Strips tracking params, AMP, hashes. */
export function canonicaliseUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.protocol = "https:";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^amp\./, "");
    // strip AMP path segments + query flags
    u.pathname = u.pathname.replace(/\/amp\/?$/i, "/").replace(/\.amp(\.html?)?$/i, "$1");
    const keep: [string, string][] = [];
    for (const [k, v] of u.searchParams) {
      if (TRACKING_PARAMS.test(k)) continue;
      if (/^amp$/i.test(k)) continue;
      keep.push([k, v]);
    }
    u.search = "";
    for (const [k, v] of keep.sort()) u.searchParams.append(k, v);
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

/** True for a URL IFFA cannot resolve to a real publisher page without a fetch. */
export function isOpaqueRedirect(url: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return (
      h === "news.google.com" ||
      h.endsWith("google.com") ||
      h === "t.co" ||
      h === "bit.ly" ||
      h.endsWith("feedproxy.google.com") ||
      h.endsWith("feedburner.com")
    );
  } catch {
    return false;
  }
}

function publisherKey(cand: DiscoveryCandidate): string {
  return (cand.domain || cand.source || "").toLowerCase().replace(/^www\./, "").trim();
}

/** Group + collapse exact / near-exact duplicate candidates. */
export function dedupeCandidates(cands: DiscoveryCandidate[]): {
  kept: DiscoveryCandidate[];
  dropped: { candidate: DiscoveryCandidate; reason: string }[];
} {
  const kept: DiscoveryCandidate[] = [];
  const dropped: { candidate: DiscoveryCandidate; reason: string }[] = [];
  const byUrl = new Map<string, DiscoveryCandidate>();
  const byPubTitle = new Map<string, DiscoveryCandidate>();

  // Prefer the earliest-published copy, then the one with a snippet.
  const ordered = [...cands].sort((a, b) => {
    const at = Date.parse(a.publishedAt ?? "") || Infinity;
    const bt = Date.parse(b.publishedAt ?? "") || Infinity;
    if (at !== bt) return at - bt;
    return (b.snippet?.length ?? 0) - (a.snippet?.length ?? 0);
  });

  for (const c of ordered) {
    const url = canonicaliseUrl(c.canonicalUrl || c.url);
    if (byUrl.has(url)) {
      dropped.push({ candidate: c, reason: `same canonical URL as ${byUrl.get(url)!.provider} result` });
      continue;
    }
    const titleKey = normalisedTitleKey(c.title);
    const pubTitleKey = `${publisherKey(c)}|${titleKey}`;
    if (titleKey.length > 8 && byPubTitle.has(pubTitleKey)) {
      dropped.push({ candidate: c, reason: "same publisher + same normalised headline" });
      continue;
    }
    byUrl.set(url, c);
    byPubTitle.set(pubTitleKey, c);
    kept.push({ ...c, canonicalUrl: url });
  }

  return { kept, dropped };
}

/** The wire agency a candidate carries, if any (from its title/snippet). */
export function candidateWire(cand: DiscoveryCandidate): string | undefined {
  return detectWireCredit(`${cand.title} ${cand.snippet ?? ""}`);
}
