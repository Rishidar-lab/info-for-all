/**
 * SAME-EVENT verification — the critical safety gate.
 *
 * A discovered article does NOT join a story because a search returned it. It
 * joins only when it would MERGE onto that story under IFFA's own clustering
 * standard: the same lexical + structured test `scripts/ingest-feeds.ts` uses
 * (`scorePair`), the same hard-blocker veto from the FROZEN event-identity
 * engine (`decideIdentity`), and the same domain split guards (`specialistVeto`)
 * — anchored on the articles already on the story.
 *
 * Discovery must never raise apparent corroboration by lowering identity
 * standards. UNCERTAIN stays out.
 */
import type { GeoClassification, LiveArticle } from "@/lib/live/types";
import {
  buildLexSig,
  scorePair,
  specialistVeto,
  CLUSTER_WINDOW_MS,
  type Sig,
} from "@/lib/live/cluster";
import { classifyGeo } from "@/lib/live/geo";
import { detectCrisisType } from "@/lib/live/crisis";
import { extractEntities, stripHeadlinePrefix } from "@/lib/live/entities";
import { buildSignature, decideIdentity, type EventSignature } from "@/lib/event-identity";
import { detectLanguage, stableId } from "@/lib/live/text";
import { PERSON_ENTITIES } from "@/lib/live/entities";
import type { CandidateMatch, DiscoveryCandidate, DiscoveryEvent, MatchVerdict } from "./types";

export interface SeedContext {
  event: DiscoveryEvent;
  articles: LiveArticle[];
  lexSigs: Map<string, Sig>;
  eventSigs: Map<string, EventSignature>;
  df: Map<string, number>;
  batchSize: number;
}

/** Precompute the seed side once per cluster. */
export function buildSeedContext(event: DiscoveryEvent, articles: LiveArticle[]): SeedContext {
  const df = new Map<string, number>();
  // seed + a generous headroom so a shared entity across two seed articles is
  // still "rare" relative to the (seed + candidates) batch it will be tested in
  const batchSize = Math.max(6, articles.length + 12);
  for (const a of articles) {
    for (const e of extractEntities(stripHeadlinePrefix(a.title) + " " + (a.excerpt ?? ""))) {
      df.set(e, (df.get(e) ?? 0) + 1);
    }
  }
  const lexSigs = new Map<string, Sig>();
  const eventSigs = new Map<string, EventSignature>();
  for (const a of articles) {
    lexSigs.set(a.id, buildLexSig(a, df, batchSize));
    eventSigs.set(
      a.id,
      buildSignature({
        title: stripHeadlinePrefix(a.title),
        excerpt: a.excerpt,
        publishedAt: a.publishedAt,
        language: a.language,
        districts: a.districts,
        crisisType: a.crisisType,
      }),
    );
  }
  return { event, articles, lexSigs, eventSigs, df, batchSize };
}

/** Synthesise a LiveArticle-shaped object from a discovery candidate. */
export function candidateArticle(cand: DiscoveryCandidate, event: DiscoveryEvent): LiveArticle {
  const text = `${cand.title} ${cand.snippet ?? ""}`.trim();
  const language = cand.language ?? detectLanguage(text);
  const geo: GeoClassification = classifyGeo({ title: cand.title, excerpt: cand.snippet });
  const crisis = detectCrisisType({ title: cand.title, excerpt: cand.snippet });
  const publishedAt = cand.publishedAt || `${event.anchorDate}T12:00:00.000Z`;
  return {
    id: `disc-${stableId(cand.canonicalUrl, cand.title)}`,
    title: cand.title,
    url: cand.canonicalUrl,
    sourceId: `discovery:${cand.provider}`,
    sourceName: cand.source || cand.provider,
    publisher: cand.source || cand.domain || cand.provider,
    role: "independent",
    sourceUrl: cand.canonicalUrl,
    publishedAt,
    fetchedAt: cand.discoveredAt,
    language,
    scope: geo.scope,
    state: geo.state,
    districts: geo.districts,
    geo,
    evidenceRole: "independent-report",
    verificationStatus: "single-source",
    excerpt: cand.snippet,
    crisisType: crisis.type,
    crisisPriority: 0,
    isCrisis: !!crisis.type,
    lifecycle: "developing",
  };
}

const RELATION_SCORE: Record<string, number> = { same: 1, "follow-up": 0.85, "part-of": 0.5, related: 0.3, uncertain: 0.2, different: 0 };
const CONF_WEIGHT: Record<string, number> = { high: 1, moderate: 0.75, low: 0.5 };

function overlapCountFigures(a: { figures: Set<string> }, b: { figures: Set<string> }): number {
  let n = 0;
  for (const f of a.figures) if (b.figures.has(f)) n++;
  return n;
}

export function verifyCandidate(ctx: SeedContext, cand: DiscoveryCandidate): CandidateMatch {
  const candArt = candidateArticle(cand, ctx.event);
  const df = new Map(ctx.df);
  for (const e of extractEntities(stripHeadlinePrefix(candArt.title) + " " + (candArt.excerpt ?? ""))) {
    df.set(e, (df.get(e) ?? 0) + 1);
  }
  const candLex = buildLexSig(candArt, df, ctx.batchSize);
  const candSig = buildSignature({
    title: stripHeadlinePrefix(candArt.title),
    excerpt: candArt.excerpt,
    publishedAt: candArt.publishedAt,
    language: candArt.language,
    districts: candArt.districts,
    crisisType: candArt.crisisType,
  });

  let best: CandidateMatch = {
    verdict: "NO_MATCH",
    relation: "different",
    confidence: "low",
    score: 0,
    reasons: ["no article on the story produced a same-event decision"],
    blockers: [],
    crossLanguage: false,
  };

  for (const seed of ctx.articles) {
    const seedLex = ctx.lexSigs.get(seed.id)!;
    const seedSig = ctx.eventSigs.get(seed.id)!;
    const identity = decideIdentity(seedSig, candSig);

    // ── lexical + structured edge (IFFA's clustering standard) ──
    let lexEdge = scorePair(seed, candArt, seedLex, candLex, CLUSTER_WINDOW_MS);
    if (lexEdge && lexEdge.confidence !== "weak") {
      if (identity.relation === "different" && identity.blockers.length > 0) {
        lexEdge = { confidence: "weak", reason: `headline overlap, but ${identity.blockers[0]}` };
      } else {
        const sv = specialistVeto(seed, candArt);
        if (sv) lexEdge = { confidence: "weak", reason: `headline overlap, but ${sv}` };
      }
    }
    // MATCH under discovery rules is decided below (lexMatch); the bare ingest
    // edge is kept only to route ungrounded lexical overlap to UNCERTAIN.
    const lexMatchBare = lexEdge != null && lexEdge.confidence !== "weak";

    // ── semantic edge (frozen identity engine, positive) ──
    const semMatch =
      (identity.relation === "same" || identity.relation === "follow-up") &&
      identity.confidence !== "low" &&
      !specialistVeto(seed, candArt);

    // ── discovery corroboration bar (RAISED vs ingest, never lowered) ──
    // Ingest clustering may join on district + modest headline overlap. A
    // discovered URL must clear a higher bar before it counts as independent
    // corroboration: the lexical edge must rest on a NON-district specific
    // reference (a named place/entity/figure beyond the district itself), a
    // near-identical headline (≥50%), or an independent semantic confirmation.
    // District-only + ~20% overlap (e.g. a crash vs a depot opening in the same
    // district) stays UNCERTAIN, never MATCH. The frozen engines are untouched.
    const districtNames = new Set(
      [...seed.districts, ...candArt.districts].map((d) => d.toLowerCase()),
    );
    const sharedNonDistrict = [...seedLex.rareEntities].filter(
      (e) => candLex.rareEntities.has(e) && !PERSON_ENTITIES.has(e) && !districtNames.has(e.toLowerCase()),
    );
    const overlapPct = Number(lexEdge?.reason.match(/(\d+)%/)?.[1] ?? 0);
    const lexStrongGrounded =
      lexEdge?.confidence === "strong" &&
      (sharedNonDistrict.length > 0 || overlapPct >= 50 || overlapCountFigures(seedLex, candLex) > 0);
    const lexProbableGrounded = lexEdge?.confidence === "probable" && semMatch;
    const lexMatch = lexStrongGrounded || lexProbableGrounded || semMatch;

    const relScore = (RELATION_SCORE[identity.relation] ?? 0) * (CONF_WEIGHT[identity.confidence] ?? 0.5);
    const score = Math.max(lexMatch ? (lexEdge!.confidence === "strong" ? 1 : 0.7) : 0, relScore);
    if (score <= best.score && (lexMatch || semMatch) === (best.verdict === "MATCH")) continue;

    let verdict: MatchVerdict;
    if (lexMatch) {
      verdict = "MATCH";
    } else if (
      lexMatchBare ||
      identity.relation === "same" ||
      identity.relation === "follow-up" ||
      identity.relation === "uncertain" ||
      identity.relation === "part-of" ||
      (lexEdge?.confidence === "weak" && identity.crossLanguage)
    ) {
      verdict = "UNCERTAIN";
    } else {
      verdict = "NO_MATCH";
    }

    if (score > best.score || (verdict === "MATCH" && best.verdict !== "MATCH")) {
      best = {
        verdict,
        relation: lexMatch ? "same" : identity.relation,
        confidence: lexMatch ? (lexEdge!.confidence === "strong" ? "high" : "moderate") : identity.confidence,
        score: Math.round(score * 100) / 100,
        reasons: lexMatch ? [lexEdge!.reason] : identity.reasons,
        blockers: identity.blockers,
        againstArticleId: seed.id,
        crossLanguage: identity.crossLanguage,
      };
    }
    if (best.verdict === "MATCH") break;
  }

  return best;
}

/** Convenience for one-shot use / tests. */
export function verifySameEvent(event: DiscoveryEvent, candidate: DiscoveryCandidate, seed: LiveArticle[]): CandidateMatch {
  return verifyCandidate(buildSeedContext(event, seed), candidate);
}
