import type {
  AlertLifecycle,
  ClusterConfidence,
  ClusterDifferenceRow,
  LiveArticle,
  LiveCluster,
} from "./types";
import { slugify, stableId, titleTokens } from "./text";
import { crisisPriority, capWeight, detectCrisisType, verificationFor } from "./crisis";
import {
  extractEntities,
  extractFigures,
  isDigestHeadline,
  overlapCount,
  stripHeadlinePrefix,
  PERSON_ENTITIES,
} from "./entities";
import {
  buildSignature,
  decideIdentity,
  candidatePairs,
  type EventSignature,
} from "@/lib/event-identity";
import { detectFixture, sameSportsFixture } from "@/lib/domain/sports";
import { parseMarketMoves } from "@/lib/domain/finance";
import { detectPoliticalEvent, samePoliticalEvent } from "@/lib/domain/politics";
import { classifyEvent } from "@/lib/domain/classify";

/**
 * v0.8 — domain-specialist SPLIT guard. Runs AFTER the generic identity engine
 * says "same" and can only PREVENT a merge (improve precision), never create
 * one. Same design as the existing semantic veto.
 *
 * - sports: two DIFFERENT fixtures (different date, competition, or men's vs
 *   women's) are never one event, however similar the headlines.
 * - finance: two INCOMPATIBLE market moves for the same instrument (opposite
 *   direction, or the same unit with a very different magnitude) are not one
 *   event.
 */
export function specialistVeto(a: LiveArticle, b: LiveArticle): string | null {
  const ta = stripHeadlinePrefix(a.title) + " " + (a.excerpt ?? "");
  const tb = stripHeadlinePrefix(b.title) + " " + (b.excerpt ?? "");

  // ── sports ── only an EXPLICIT date in the text splits on date; otherwise
  // rely on competition / teams / men's-vs-women's / junior-vs-senior.
  const explicitDate = (t: string) =>
    t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)?.[0] ??
    t.match(/\b(IPL|world cup|test)\s?20\d{2}\b/i)?.[0];
  const fa = detectFixture(ta, explicitDate(ta));
  const fb = detectFixture(tb, explicitDate(tb));
  // Only act when BOTH sides clearly describe a fixture (a competition, or an
  // explicit season/date). Bare country names are not enough.
  const bothFixtures =
    (fa.competition || fa.date) && (fb.competition || fb.date) && fa.teams.length >= 1 && fb.teams.length >= 1;
  if (bothFixtures && !sameSportsFixture(fa, fb)) {
    if (fa.competition !== fb.competition || fa.women !== fb.women || fa.junior !== fb.junior || (fa.date && fb.date && fa.date !== fb.date)) {
      return "different sports fixture (competition / season / category / date)";
    }
  }

  // ── finance ──
  const ma = parseMarketMoves(ta);
  const mb = parseMarketMoves(tb);
  if (ma.length && mb.length) {
    const compatible = ma.some((x) =>
      mb.some((y) => {
        if (x.instrument && y.instrument && x.instrument !== y.instrument) return false;
        if (x.direction !== "flat" && y.direction !== "flat" && x.direction !== y.direction) return false;
        if (x.unit === y.unit) {
          const big = Math.max(Math.abs(x.value), Math.abs(y.value)) || 1;
          if (Math.abs(x.value - y.value) / big > 0.5) return false;
        }
        return true;
      }),
    );
    if (!compatible) return "incompatible market move (instrument / direction / magnitude)";
  }

  // ── politics ── different political actions / speech acts are different
  // developments, however much the entities overlap.
  const catA = classifyEvent({ title: a.title, excerpt: a.excerpt }).primaryCategory;
  const catB = classifyEvent({ title: b.title, excerpt: b.excerpt }).primaryCategory;
  if (catA === "politics" && catB === "politics") {
    const pa = detectPoliticalEvent(ta);
    const pb = detectPoliticalEvent(tb);
    if (pa.action !== "other" && pb.action !== "other" && !samePoliticalEvent(pa, pb)) {
      return `different political development (${pa.action} vs ${pb.action})`;
    }
  }

  return null;
}

/** Jaccard similarity of two token sets. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function districtOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const bs = new Set(b);
  return a.some((d) => bs.has(d));
}

const OTHER_STATE_TOKENS = [
  "kerala", "karnataka", "andhra pradesh", "telangana", "maharashtra", "gujarat", "rajasthan",
  "punjab", "haryana", "uttar pradesh", "uttarakhand", "bihar", "west bengal", "odisha", "assam",
  "madhya pradesh", "chhattisgarh", "jharkhand", "himachal pradesh", "goa", "delhi", "jammu",
  "kashmir", "manipur", "meghalaya", "nagaland", "tripura", "mizoram", "sikkim", "arunachal",
  "puducherry",
];

export function statesMentioned(text: string): Set<string> {
  const t = " " + text.toLowerCase() + " ";
  const out = new Set<string>();
  for (const s of OTHER_STATE_TOKENS) if (t.includes(" " + s)) out.add(s);
  return out;
}

export const CLUSTER_WINDOW_MS = 30 * 3600 * 1000;

export interface Sig {
  tokens: Set<string>;
  entities: Set<string>;
  /** Entities that appear in fewer than ~6% of this batch's articles — the ones that carry signal. */
  rareEntities: Set<string>;
  figures: Set<string>;
  states: Set<string>;
}

/**
 * Build the lexical signature `scorePair` needs for one article. `df` is the
 * document-frequency map over the batch (entity → count); `batchSize` scales the
 * "rare entity" cutoff. Exported for the discovery matcher, which anchors on a
 * story's existing articles rather than a full ingest batch.
 */
export function buildLexSig(a: LiveArticle, df: Map<string, number>, batchSize: number): Sig {
  const ents = extractEntities(stripHeadlinePrefix(a.title) + " " + (a.excerpt ?? ""));
  const rareCutoff = Math.max(3, Math.ceil(batchSize * 0.05));
  return {
    tokens: new Set(titleTokens(stripHeadlinePrefix(a.title))),
    entities: ents,
    rareEntities: new Set([...ents].filter((e) => (df.get(e) ?? 1) <= rareCutoff)),
    figures: extractFigures(a.title + " " + (a.excerpt ?? "")),
    states: statesMentioned(a.title + " " + (a.excerpt ?? "") + " " + (a.cap?.areaDescription ?? "")),
  };
}

export interface Edge {
  confidence: ClusterConfidence;
  reason: string;
}

/**
 * Score a candidate pair. Returns null when they should NOT be joined.
 *
 * Never joins merely because two articles share "Tamil Nadu", "India", "rain",
 * "government", "minister", "flood" or a broad category — those are all stripped
 * or down-weighted. A join needs concrete shared evidence: the same official
 * alert ID, the same named place, or a strong overlap of named entities and
 * headline tokens within a tight time window. A detected geographic
 * contradiction blocks the join outright.
 */
export function scorePair(a: LiveArticle, b: LiveArticle, sa: Sig, sb: Sig, sameWindowMs: number): Edge | null {
  if (Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt)) > sameWindowMs) return null;
  // Block only a genuine hazard contradiction (flood vs cyclone). One report
  // naming the hazard and the other not ("Chennai floods: schools shut" vs
  // "Chennai schools declared holiday") is still the same event.
  if (a.crisisType && b.crisisType && a.crisisType !== b.crisisType) return null;

  // Geographic contradiction — different named districts / states, no overlap.
  if (a.districts.length > 0 && b.districts.length > 0 && !districtOverlap(a.districts, b.districts)) {
    return null;
  }
  const stateContradiction =
    sa.states.size > 0 && sb.states.size > 0 && overlapCount(sa.states, sb.states) === 0;
  if (stateContradiction && !districtOverlap(a.districts, b.districts)) return null;
  if (a.scope === "tamil-nadu" && sb.states.size > 0 && !sb.states.has("puducherry")) return null;
  if (b.scope === "tamil-nadu" && sa.states.size > 0 && !sa.states.has("puducherry")) return null;

  const sameOfficialId = !!a.cap?.identifier && a.cap.identifier === b.cap?.identifier;
  const dOverlap = districtOverlap(a.districts, b.districts);
  const titleSim = jaccard(sa.tokens, sb.tokens);
  const figN = overlapCount(sa.figures, sb.figures);

  // Shared entities that are RARE in this batch AND not a bare person name.
  // Sharing "Vijay" / "BJP" is not evidence of the same event; sharing "Mettur
  // Dam", "Freedom Park" or "Birbhum" is.
  const sharedRare = [...sa.rareEntities].filter((e) => sb.rareEntities.has(e));
  const sharedKey = sharedRare.filter((e) => !PERSON_ENTITIES.has(e));
  // A shared NAMED district is itself a specific shared reference (the same
  // signal class as sharing "Freedom Park" or "Birbhum"). It only counts when
  // the districts genuinely overlap — different districts still block the join.
  const keyN = sharedKey.length + (dOverlap ? 1 : 0);
  const sharedTxt = sharedKey.length ? ` (${sharedKey.slice(0, 3).join(", ")})` : "";
  const dTxt = dOverlap ? a.districts.filter((d) => b.districts.includes(d)).join(", ") : "";

  if (sameOfficialId) {
    return { confidence: "strong", reason: `Same official alert identifier (${a.cap!.identifier}).` };
  }
  // STRONG: same district + a specific non-person reference, or two+ such references.
  if ((dOverlap && keyN >= 1 && titleSim >= 0.15) || (keyN >= 2 && titleSim >= 0.2) || (keyN >= 1 && titleSim >= 0.5)) {
    return {
      confidence: "strong",
      reason: dOverlap
        ? `Same district (${dTxt}) and shared reference${sharedTxt}, headline overlap ${(titleSim * 100).toFixed(0)}%.`
        : `Shared specific reference${sharedTxt} and headline overlap ${(titleSim * 100).toFixed(0)}%.`,
    };
  }
  // PROBABLE: one specific reference + real headline overlap, or district + strong overlap,
  // or a shared figure alongside a specific reference.
  if (
    (dOverlap && titleSim >= 0.38) ||
    (keyN >= 1 && titleSim >= 0.28) ||
    (figN >= 1 && keyN >= 1)
  ) {
    return {
      confidence: "probable",
      reason:
        keyN >= 1
          ? `Shared specific reference${sharedTxt}, headline overlap ${(titleSim * 100).toFixed(0)}%.`
          : `Same district (${dTxt}), headline overlap ${(titleSim * 100).toFixed(0)}%.`,
    };
  }
  // Near-identical LONG headlines from two publishers: almost certainly one
  // story (syndicated wire copy or a shared brief). Still bounded by the time
  // window and the geographic-contradiction check above.
  if (titleSim >= 0.9 && sa.tokens.size >= 5 && sb.tokens.size >= 5) {
    return { confidence: "probable", reason: `Near-identical headline (${(titleSim * 100).toFixed(0)}%) — likely one source.` };
  }
  if (titleSim >= 0.5 || (keyN >= 1 && titleSim >= 0.2)) {
    return { confidence: "weak", reason: `Headline / entity similarity only (${(titleSim * 100).toFixed(0)}%).` };
  }
  return null;
}

const RANK: Record<ClusterConfidence, number> = { weak: 1, probable: 2, strong: 3 };

export function clusterArticles(
  articles: LiveArticle[],
  now = Date.now(),
  opts: { semantic?: boolean } = {},
): {
  clusters: LiveCluster[];
  weakMatchesRejected: number;
} {
  const useSemantic = opts.semantic !== false;
  const sorted = [...articles].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  // First pass: extract entities and count how many articles each appears in.
  const rawEntities = new Map<string, Set<string>>();
  const df = new Map<string, number>();
  for (const a of sorted) {
    const ents = extractEntities(stripHeadlinePrefix(a.title) + " " + (a.excerpt ?? ""));
    rawEntities.set(a.id, ents);
    for (const e of ents) df.set(e, (df.get(e) ?? 0) + 1);
  }
  // An entity is "rare" (carries linking signal) if it appears in at most this
  // many of the batch's articles. Sharing "Vijay" (hundreds of articles) is
  // noise; sharing "Freedom Park" (two articles) is signal. The floor of 3
  // keeps small batches (and the unit tests) working.
  const rareCutoff = Math.max(3, Math.ceil(sorted.length * 0.05));

  const sig = new Map<string, Sig>();
  const esig = new Map<string, EventSignature>();
  for (const a of sorted) {
    const ents = rawEntities.get(a.id)!;
    const rare = new Set([...ents].filter((e) => (df.get(e) ?? 0) <= rareCutoff));
    sig.set(a.id, {
      tokens: new Set(titleTokens(stripHeadlinePrefix(a.title))),
      entities: ents,
      rareEntities: rare,
      figures: extractFigures(a.title + " " + (a.excerpt ?? "")),
      states: statesMentioned(a.title + " " + (a.excerpt ?? "") + " " + (a.cap?.areaDescription ?? "")),
    });
    esig.set(
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

  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (x: string, y: string) => {
    parent.set(find(x), find(y));
  };
  for (const a of sorted) parent.set(a.id, a.id);

  // Record every qualifying edge; used later to derive per-cluster confidence + reason.
  const edges: { a: string; b: string; edge: Edge; crossPublisher: boolean }[] = [];
  const identityEdges = new Map<string, IdentityEdge>();
  const crossRelations: { a: string; b: string; relation: "part-of" | "follow-up" | "related"; reason: string }[] = [];
  let weakMatchesRejected = 0;

  const isDigest = new Map<string, boolean>();
  for (const a of sorted) isDigest.set(a.id, isDigestHeadline(a.title));

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      // Multi-topic digests / show segments never seed or join a cluster.
      if (isDigest.get(a.id) || isDigest.get(b.id)) continue;
      let edge = scorePair(a, b, sig.get(a.id)!, sig.get(b.id)!, CLUSTER_WINDOW_MS);
      if (!edge) continue;
      // Semantic VETO — the event-identity engine has a fuller location model
      // (it resolves "Karaikal" → Puducherry even when the geo classifier does
      // not). If it finds a hard geographic / hazard / date blocker, the lexical
      // headline overlap does not get to override it.
      if (useSemantic && edge.confidence !== "weak") {
        const veto = decideIdentity(esig.get(a.id)!, esig.get(b.id)!);
        if (veto.relation === "different" && veto.blockers.length > 0) {
          edge = { confidence: "weak", reason: `Headline overlap, but ${veto.blockers[0]}.` };
        }
      }
      // v0.8 domain-specialist split guard (sports fixture / finance move)
      if (useSemantic && edge.confidence !== "weak") {
        const sv = specialistVeto(a, b);
        if (sv) edge = { confidence: "weak", reason: `Headline overlap, but ${sv}.` };
      }
      const crossPublisher = a.publisher !== b.publisher;
      edges.push({ a: a.id, b: b.id, edge, crossPublisher });
      if (edge.confidence !== "weak" && crossPublisher) {
        identityEdges.set(pairKey(a.id, b.id), {
          a: a.id, b: b.id, relation: "same", confidence: edge.confidence === "strong" ? "high" : "moderate",
          via: "lexical", reason: edge.reason, blockers: [],
        });
      }

      // Merge rule — 'probable' or 'strong' only, in BOTH cases:
      //  - same publisher: consolidates one outlet's several takes on the same event,
      //    but a weak template/entity similarity ("BREAKING | …" segments) does not;
      //  - cross publisher: a weak match is recorded as rejected and stays separate.
      if (edge.confidence !== "weak") {
        union(a.id, b.id);
      } else if (crossPublisher) {
        weakMatchesRejected++;
      }
    }
  }

  // ── v0.5: semantic second pass ─────────────────────────────────────────
  // PERMISSIVE candidate generation (blocking by district / entity / place /
  // crisis-type) then the CONSERVATIVE identity gate. Recovers paraphrases and
  // Tamil pairs the lexical pass misses, without lowering the lexical bar.
  const sigList = sorted.map((a) => esig.get(a.id)!);
  for (const cand of useSemantic ? candidatePairs(sigList, { windowMs: CLUSTER_WINDOW_MS + 10 * 3600 * 1000 }) : []) {
    const a = sorted[cand.i];
    const b = sorted[cand.j];
    if (isDigest.get(a.id) || isDigest.get(b.id)) continue;
    if (find(a.id) === find(b.id)) continue; // already together
    const key = pairKey(a.id, b.id);
    if (identityEdges.has(key)) continue;
    const decision = decideIdentity(esig.get(a.id)!, esig.get(b.id)!);
    const crossPublisher = a.publisher !== b.publisher;

    if (decision.relation === "same") {
      const sv = specialistVeto(a, b);
      const mergeOk =
        !sv &&
        (decision.confidence === "high" ||
          decision.confidence === "moderate" ||
          (!crossPublisher && decision.confidence === "low"));
      if (mergeOk) {
        union(a.id, b.id);
        if (crossPublisher) {
          identityEdges.set(key, {
            a: a.id, b: b.id, relation: "same", confidence: decision.confidence,
            via: "semantic", reason: decision.reasons[0] ?? "semantic match", blockers: [],
          });
        }
      } else if (crossPublisher) {
        weakMatchesRejected++;
      }
    } else if (decision.relation === "part-of" || decision.relation === "follow-up" || decision.relation === "related") {
      crossRelations.push({ a: a.id, b: b.id, relation: decision.relation, reason: decision.reasons[0] ?? decision.relation });
    }
  }

  const groups = new Map<string, LiveArticle[]>();
  for (const a of sorted) {
    const root = find(a.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(a);
  }

  const rootOf = (id: string) => find(id);
  const clusters: LiveCluster[] = [];
  for (const members of groups.values()) {
    const memberIds = new Set(members.map((m) => m.id));
    // Best cross-publisher edge inside this group → the group's confidence + reason.
    let best: Edge | null = null;
    for (const e of edges) {
      if (!memberIds.has(e.a) || !memberIds.has(e.b)) continue;
      if (!e.crossPublisher) continue;
      if (!best || RANK[e.edge.confidence] > RANK[best.confidence]) best = e.edge;
    }
    // If the group has no lexical cross-edge, fall back to the best semantic one.
    let semanticBest: IdentityEdge | undefined;
    for (const ie of identityEdges.values()) {
      if (!memberIds.has(ie.a) || !memberIds.has(ie.b)) continue;
      if (!semanticBest || CONF_RANK[ie.confidence] > CONF_RANK[semanticBest.confidence]) semanticBest = ie;
    }
    if (!best && semanticBest) {
      best = {
        confidence: semanticBest.confidence === "high" ? "strong" : semanticBest.confidence === "moderate" ? "probable" : "weak",
        reason: `Semantic event-identity match — ${semanticBest.reason}.`,
      };
    }
    const cluster = buildCluster(members, now, best);
    const edgesForCluster = [...identityEdges.values()].filter((ie) => memberIds.has(ie.a) && memberIds.has(ie.b));
    const relatedForCluster = crossRelations
      .filter((r) => memberIds.has(r.a) !== memberIds.has(r.b))
      .map((r) => {
        const other = memberIds.has(r.a) ? r.b : r.a;
        return { otherClusterId: rootOf(other), relation: r.relation, reason: r.reason };
      });
    if (edgesForCluster.length || relatedForCluster.length) {
      cluster.identity = { edges: edgesForCluster, related: dedupeRelated(relatedForCluster) };
    }
    clusters.push(cluster);
  }

  clusters.sort((a, b) => b.crisisPriority - a.crisisPriority || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return { clusters, weakMatchesRejected };
}

interface IdentityEdge {
  a: string;
  b: string;
  relation: "same" | "related" | "part-of" | "follow-up" | "different" | "uncertain";
  confidence: "high" | "moderate" | "low";
  via: "lexical" | "semantic";
  reason: string;
  blockers: string[];
}

const CONF_RANK: Record<"high" | "moderate" | "low", number> = { low: 1, moderate: 2, high: 3 };

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function dedupeRelated<T extends { otherClusterId: string; relation: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = `${r.otherClusterId}:${r.relation}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best: T | undefined;
  let n = 0;
  for (const [v, c] of counts) {
    if (c > n) {
      best = v;
      n = c;
    }
  }
  return best;
}

function buildCluster(members: LiveArticle[], now: number, crossEdge: Edge | null): LiveCluster {
  const byRecency = [...members].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const official = members.filter(
    (m) => m.evidenceRole === "official-alert" || m.evidenceRole === "primary-document" || m.evidenceRole === "government-statement",
  );
  const independent = members.filter((m) => m.evidenceRole === "independent-report" || m.evidenceRole === "on-ground-report");

  const publishers = Array.from(new Set(members.map((m) => m.publisher))).sort();
  const distinctPublishers = publishers.length;
  const officialPublishers = new Set(official.map((m) => m.publisher)).size;
  const independentPublishers = new Set(independent.map((m) => m.publisher)).size;

  const crisisType = mostCommon(members.map((m) => m.crisisType).filter(Boolean) as string[]) as LiveCluster["crisisType"];
  const districts = Array.from(new Set(members.flatMap((m) => m.districts))).sort();
  const scope: LiveCluster["scope"] = (mostCommon(members.map((m) => m.scope)) as LiveCluster["scope"]) ?? "india";
  const state = members.find((m) => m.state)?.state;

  const isCrisis = members.some((m) => m.isCrisis);
  const alert = members.find((m) => m.evidenceRole === "official-alert" && m.cap);
  const lifecycle: AlertLifecycle = alert?.lifecycle ?? "developing";

  const title = alert?.cap?.event
    ? `${alert.cap.event}${districts.length ? ` — ${districts.slice(0, 3).join(", ")}${districts.length > 3 ? " +" : ""}` : ""}`
    : byRecency[0].title;

  const crisisWeight = detectCrisisType({ title, disasterType: alert?.cap?.event }).weight;
  const priority = isCrisis
    ? crisisPriority({
        isOfficialAlert: members.some((m) => m.evidenceRole === "official-alert"),
        scope,
        districtCount: districts.length,
        publishedAt: byRecency[0].publishedAt,
        crisisWeight,
        capWeight: capWeight(alert?.cap),
        corroboratingSources: Math.max(0, distinctPublishers - 1),
        hasPrimaryDoc: members.some((m) => m.evidenceRole === "primary-document"),
        lifecycle,
        now,
      })
    : Math.max(...members.map((m) => m.crisisPriority));

  const verificationStatus = verificationFor(
    official.length > 0 ? "official-alert" : byRecency[0].evidenceRole,
    Math.max(0, distinctPublishers - 1),
    official.length > 0,
  );

  // Cluster confidence + reason.
  let confidence: ClusterConfidence;
  let reason: string;
  if (members.length === 1) {
    confidence = "strong";
    reason = "Single report.";
  } else if (distinctPublishers === 1) {
    confidence = "weak";
    reason = `${members.length} headlines from ${publishers[0]} about the same event.`;
  } else if (crossEdge) {
    confidence = crossEdge.confidence;
    reason = crossEdge.reason;
  } else {
    confidence = "weak";
    reason = "Multiple publishers, but only a weak headline match.";
  }

  const isVerifiedComparison =
    distinctPublishers >= 2 && (confidence === "strong" || confidence === "probable");

  // Common ground — only explicit shared structured facts.
  const commonGround: string[] = [];
  if (alert?.cap) {
    if (alert.cap.event) commonGround.push(`Official alert type: ${alert.cap.event}.`);
    if (alert.cap.senderName) commonGround.push(`Issuing authority: ${alert.cap.senderName}.`);
    if (alert.cap.areaDescription) commonGround.push(`Stated area: ${alert.cap.areaDescription}.`);
    if (alert.cap.effectiveFrom && alert.cap.effectiveUntil)
      commonGround.push(`Stated effective window: ${fmtIST(alert.cap.effectiveFrom)} to ${fmtIST(alert.cap.effectiveUntil)} IST.`);
    if (alert.cap.severity) commonGround.push(`Alert severity as issued: ${alert.cap.severity}.`);
  }
  if (isVerifiedComparison && districts.length) {
    commonGround.push(`All reporting places this in: ${districts.join(", ")}.`);
  }
  const commonGroundPending = commonGround.length === 0;

  // Differences — structured metadata only.
  const differences: ClusterDifferenceRow[] = [];
  if (isVerifiedComparison) {
    const perPubDistricts = members
      .filter((m) => m.districts.length)
      .map((m) => ({ sourceName: m.publisher, value: m.districts.join(", ") }));
    if (new Set(perPubDistricts.map((d) => d.value)).size > 1) {
      differences.push({ field: "Reported locations / districts", observations: dedupeObs(perPubDistricts) });
    }
    const roles = members.map((m) => ({ sourceName: m.publisher, value: EVIDENCE_ROLE_SHORT[m.evidenceRole] }));
    if (new Set(roles.map((r) => r.value)).size > 1) {
      differences.push({ field: "Evidence role", observations: dedupeObs(roles) });
    }
    differences.push({
      field: "Reported / published time",
      observations: dedupeObs(members.map((m) => ({ sourceName: m.publisher, value: fmtIST(m.publishedAt) + " IST" }))),
    });
    const heads = members.map((m) => ({ sourceName: m.publisher, value: m.title }));
    differences.push({ field: "Headline emphasis", observations: dedupeObs(heads) });
    const sev = members.filter((m) => m.cap?.severity).map((m) => ({ sourceName: m.publisher, value: m.cap!.severity! }));
    if (new Set(sev.map((s) => s.value)).size > 1) {
      differences.push({ field: "Stated severity", observations: dedupeObs(sev) });
    }
  }

  const unknowns: string[] = [];
  if (isVerifiedComparison) {
    unknowns.push("Detailed claim-by-claim comparison awaits review — only structured metadata is compared above.");
  } else if (isCrisis) {
    if (independent.length === 0) unknowns.push("No independent on-ground report has corroborated this alert yet.");
    if (!alert?.cap?.effectiveUntil) unknowns.push("The alert does not state an expiry time.");
    unknowns.push("Casualty, damage and evacuation figures are not established from these sources.");
  } else if (distinctPublishers === 1 && members.length === 1) {
    unknowns.push("Single-source report — not yet corroborated by another publisher.");
  }

  const updatedAt = byRecency[0].publishedAt;
  const id = stableId(...members.map((m) => m.id).sort());

  return {
    id,
    slug: `${slugify(title, 56)}-${id.slice(0, 6)}`,
    title,
    scope,
    state,
    districts,
    crisisType,
    isCrisis,
    crisisPriority: priority,
    lifecycle,
    updatedAt,
    languages: Array.from(new Set(members.map((m) => m.language))),
    articleIds: byRecency.map((m) => m.id),
    distinctPublishers,
    publishers,
    sourceCount: distinctPublishers,
    officialCount: officialPublishers,
    independentCount: independentPublishers,
    verificationStatus,
    confidence,
    reason,
    isVerifiedComparison,
    commonGround,
    commonGroundPending,
    differences,
    unknowns,
    cap: alert?.cap,
  };
}

/** Keep one observation per publisher (the most recent article's value). */
function dedupeObs(obs: { sourceName: string; value: string }[]): { sourceName: string; value: string }[] {
  const seen = new Set<string>();
  const out: { sourceName: string; value: string }[] = [];
  for (const o of obs) {
    if (seen.has(o.sourceName)) continue;
    seen.add(o.sourceName);
    out.push(o);
  }
  return out;
}

const EVIDENCE_ROLE_SHORT: Record<string, string> = {
  "official-alert": "Official alert",
  "primary-document": "Primary document",
  "government-statement": "Government statement",
  "on-ground-report": "On-ground report",
  "independent-report": "Independent report",
  "expert-analysis": "Expert analysis",
  "developing-unverified": "Developing / unverified",
};

function fmtIST(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
