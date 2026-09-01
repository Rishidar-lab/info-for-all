import { eq, inArray, or } from "drizzle-orm";
import type { Db } from "../db";
import { schema } from "../db";
import { createId } from "../db/id";
import {
  CGI_FORMULA_VERSION,
  computeCgi,
  type CgiInput,
  type CgiKeyClaim,
} from "../cgi";
import { computeIndependence, type IndependenceArticle } from "../independence";
import { contentTokens, jaccard } from "../text";
import { logger } from "../logger";
import type { ClaimStatus } from "./types";

const log = logger.child({ module: "analyze" });

const PRESERVED_STATUSES: ReadonlySet<ClaimStatus> = new Set(["RETRACTED", "OUTDATED"]);

class ClaimUnionFind {
  private parent = new Map<string, string>();
  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }
  find(id: string): string {
    this.add(id);
    let root = id;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    this.parent.set(id, root);
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function deriveStatus(
  current: ClaimStatus,
  corroboration: number,
  contradiction: number,
  hasStrongPrimarySupport: boolean,
): ClaimStatus {
  if (PRESERVED_STATUSES.has(current)) return current;
  if (contradiction > 0 && corroboration >= 1) return "DISPUTED";
  // A direct, uncontradicted primary record is itself confirmation.
  if (hasStrongPrimarySupport && corroboration >= 1) return "CONFIRMED";
  if (corroboration >= 3) return "CORROBORATED";
  if (corroboration === 2) return "PARTIALLY_CORROBORATED";
  if (corroboration <= 1 && current === "DEVELOPING") return "DEVELOPING";
  return "UNVERIFIED";
}

export interface AnalyzeResult {
  eventId: string;
  cgi: ReturnType<typeof computeCgi>;
  claimsUpdated: number;
  contradictionPairs: number;
  independentSourceCount: number;
}

/**
 * Recompute the derived intelligence for one event: source independence,
 * per-claim corroboration / contradiction counts, information status, evidence
 * status, and the Common Ground Index (persisted with its component breakdown).
 *
 * Deterministic and idempotent — safe to re-run after every ingest.
 */
export async function analyzeEvent(db: Db, eventId: string): Promise<AnalyzeResult> {
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
  if (!event) throw new Error(`analyzeEvent: event ${eventId} not found`);

  const links = await db
    .select()
    .from(schema.eventArticles)
    .where(eq(schema.eventArticles.eventId, eventId));
  const articleIds = links.map((l) => l.articleId);

  const articleRows = articleIds.length
    ? await db.select().from(schema.articles).where(inArray(schema.articles.id, articleIds))
    : [];
  const sourceIds = [...new Set(articleRows.map((a) => a.sourceId))];
  const sourceRows = sourceIds.length
    ? await db.select().from(schema.sources).where(inArray(schema.sources.id, sourceIds))
    : [];
  const sourceById = new Map(sourceRows.map((s) => [s.id, s]));

  // ---- 1. Source independence ----------------------------------------------
  const independenceArticles: IndependenceArticle[] = articleRows.map((a) => {
    const source = sourceById.get(a.sourceId);
    return {
      id: a.id,
      publication: a.publication,
      sourceDomain: source?.domain ?? a.publication,
      ownershipGroup: source?.ownershipGroup ?? null,
      parentCompany: source?.parentCompany ?? null,
      wireService: a.wireService,
      syndicatedFromSourceId: a.syndicatedFromSourceId,
      text: a.contentExcerpt ?? a.description,
      publishedAt: a.publishedAt,
    };
  });
  const independence = computeIndependence(independenceArticles);
  const clusterOfArticle = new Map<string, number>();
  independence.clusters.forEach((cluster, index) => {
    for (const id of cluster.articleIds) clusterOfArticle.set(id, index);
  });

  // Token bag per article body — used for lexical corroboration ("N sources
  // report this fact") independent of whether each source produced its own claim.
  const articleTokenSet = new Map<string, Set<string>>();
  for (const a of articleRows) {
    articleTokenSet.set(
      a.id,
      new Set(contentTokens(`${a.title}. ${a.contentExcerpt ?? a.description ?? ""}`)),
    );
  }

  // ---- 2. Claim groups (corroboration) ------------------------------------
  const claimRows = await db.select().from(schema.claims).where(eq(schema.claims.eventId, eventId));
  const claimIds = claimRows.map((c) => c.id);
  const relRows = claimIds.length
    ? await db
        .select()
        .from(schema.claimRelationships)
        .where(
          or(
            inArray(schema.claimRelationships.fromClaimId, claimIds),
            inArray(schema.claimRelationships.toClaimId, claimIds),
          ),
        )
    : [];

  // "Same claim" grouping — used for corroboration and to attribute
  // contradictions. Only near-identical claims merge: high lexical similarity or
  // an explicit DUPLICATES edge. SUPPORTS / REFINES describe how two *distinct*
  // claims relate and must NOT merge them (otherwise a contradiction against one
  // claim would contaminate everything that supports it).
  const uf = new ClaimUnionFind();
  for (const c of claimRows) uf.add(c.id);

  for (let i = 0; i < claimRows.length; i += 1) {
    for (let j = i + 1; j < claimRows.length; j += 1) {
      const a = claimRows[i];
      const b = claimRows[j];
      const sim = jaccard(
        (a.normalizedMeaning ?? a.canonicalText).toLowerCase().split(/\s+/),
        (b.normalizedMeaning ?? b.canonicalText).toLowerCase().split(/\s+/),
      );
      if (sim >= 0.6) uf.union(a.id, b.id);
    }
  }
  for (const rel of relRows) {
    if (rel.type === "DUPLICATES" && rel.confidence >= 0.5) {
      uf.union(rel.fromClaimId, rel.toClaimId);
    }
  }

  const groupMembers = new Map<string, string[]>();
  for (const c of claimRows) {
    const root = uf.find(c.id);
    if (!groupMembers.has(root)) groupMembers.set(root, []);
    groupMembers.get(root)!.push(c.id);
  }

  const articleOfClaim = new Map(claimRows.map((c) => [c.id, c.sourceArticleId]));
  const claimById = new Map(claimRows.map((c) => [c.id, c]));
  const groupIndependentSources = new Map<string, number>();

  for (const [root, members] of groupMembers) {
    const clusters = new Set<number>();

    // (a) independent clusters that authored a claim in this group
    for (const claimId of members) {
      const artId = articleOfClaim.get(claimId);
      const cluster = artId ? clusterOfArticle.get(artId) : undefined;
      if (cluster !== undefined) clusters.add(cluster);
    }

    // (b) independent clusters whose article text lexically entails the group's
    // strongest claim (>= 62% of the claim's content tokens present in the body)
    const anchor = members
      .map((id) => claimById.get(id)!)
      .sort((x, y) => y.extractionConfidence - x.extractionConfidence)[0];
    const LEXICAL_TYPES = new Set(["observation", "official_statement", "statistic"]);
    const anchorTokens = new Set(contentTokens(anchor.canonicalText));
    if (anchorTokens.size >= 3 && LEXICAL_TYPES.has(anchor.type)) {
      for (const article of articleRows) {
        const cluster = clusterOfArticle.get(article.id);
        if (cluster === undefined || clusters.has(cluster)) continue;
        const bag = articleTokenSet.get(article.id);
        if (!bag) continue;
        let hit = 0;
        for (const token of anchorTokens) if (bag.has(token)) hit += 1;
        if (hit / anchorTokens.size >= 0.7) clusters.add(cluster);
      }
    }

    groupIndependentSources.set(root, clusters.size);
  }

  // ---- 3. Contradictions -------------------------------------------------
  const contradictionEdges = relRows.filter((r) => r.type === "CONTRADICTS");
  const groupContradictions = new Map<string, number>();
  for (const edge of contradictionEdges) {
    for (const side of [edge.fromClaimId, edge.toClaimId]) {
      const root = uf.find(side);
      groupContradictions.set(root, (groupContradictions.get(root) ?? 0) + 1);
    }
  }
  const contradictionPairs = new Set(
    contradictionEdges.map((e) => [uf.find(e.fromClaimId), uf.find(e.toClaimId)].sort().join("::")),
  ).size;
  const keyClaimIdSet = new Set(claimRows.filter((c) => c.isKeyClaim).map((c) => c.id));
  const keyContradictionPairs = new Set(
    contradictionEdges
      .filter((e) => keyClaimIdSet.has(e.fromClaimId) || keyClaimIdSet.has(e.toClaimId))
      .map((e) => [uf.find(e.fromClaimId), uf.find(e.toClaimId)].sort().join("::")),
  ).size;

  // ---- 4. Evidence status ---------------------------------------------------
  const claimEvidenceRows = claimRows.length
    ? await db
        .select()
        .from(schema.claimEvidence)
        .where(
          inArray(
            schema.claimEvidence.claimId,
            claimRows.map((c) => c.id),
          ),
        )
    : [];
  const evidenceIds = [...new Set(claimEvidenceRows.map((e) => e.evidenceId))];
  const evidenceRows = evidenceIds.length
    ? await db.select().from(schema.evidence).where(inArray(schema.evidence.id, evidenceIds))
    : [];
  const evidenceById = new Map(evidenceRows.map((e) => [e.id, e]));

  // "Strong" primary evidence for CGI purposes — authoritative records only.
  // A not-yet-peer-reviewed research paper is primary provenance but not
  // authoritative confirmation, so it is excluded here (still shown in the UI).
  const STRONG_PRIMARY = new Set([
    "primary_document",
    "official_statement",
    "public_record",
    "dataset",
    "transcript",
  ]);

  const evidenceStatusOfClaim = new Map<string, string>();
  const primarySupportClaims = new Set<string>();
  const strongPrimaryClaims = new Set<string>();
  for (const claim of claimRows) {
    const links = claimEvidenceRows.filter((e) => e.claimId === claim.id);
    let hasPrimarySupport = false;
    let hasPrimaryContra = false;
    let hasSecondary = false;
    for (const link of links) {
      const ev = evidenceById.get(link.evidenceId);
      if (!ev) continue;
      if (ev.isPrimary && link.stance === "supports") {
        hasPrimarySupport = true;
        if (STRONG_PRIMARY.has(ev.type)) strongPrimaryClaims.add(claim.id);
      } else if (ev.isPrimary && link.stance === "contradicts") hasPrimaryContra = true;
      else if (link.stance === "supports") hasSecondary = true;
    }
    let status = "none";
    if (hasPrimarySupport && hasPrimaryContra) status = "primary_mixed";
    else if (hasPrimarySupport) status = "primary_supported";
    else if (hasPrimaryContra) status = "primary_contradicted";
    else if (hasSecondary) status = "secondary_only";
    evidenceStatusOfClaim.set(claim.id, status);
    if (hasPrimarySupport) primarySupportClaims.add(claim.id);
  }

  // ---- 5. Persist per-claim derived values --------------------------------
  const now = new Date();
  let claimsUpdated = 0;
  const keyClaimInputs: CgiKeyClaim[] = [];

  for (const claim of claimRows) {
    const root = uf.find(claim.id);
    const corroboration = groupIndependentSources.get(root) ?? 0;
    const contradiction = groupContradictions.get(root) ?? 0;
    const evidenceStatus = evidenceStatusOfClaim.get(claim.id) ?? "none";
    const status = deriveStatus(
      claim.status as ClaimStatus,
      corroboration,
      contradiction,
      strongPrimaryClaims.has(claim.id),
    );

    await db
      .update(schema.claims)
      .set({
        corroborationCount: corroboration,
        contradictionCount: contradiction,
        evidenceStatus,
        status,
        updatedAt: now,
      })
      .where(eq(schema.claims.id, claim.id));
    claimsUpdated += 1;

    if (claim.isKeyClaim) {
      keyClaimInputs.push({
        independentCorroboratingSources: corroboration,
        hasPrimaryEvidence: strongPrimaryClaims.has(claim.id),
        status,
        contradictionCount: contradiction,
        singleAnonymousSource: /anonymous|unnamed source|person familiar/i.test(claim.originalText),
      });
    }
  }

  // ---- 6. Common Ground Index --------------------------------------------
  const countries = new Set(
    articleRows.map((a) => sourceById.get(a.sourceId)?.country).filter(Boolean) as string[],
  );
  const categories = new Set(
    articleRows.map((a) => sourceById.get(a.sourceId)?.orgType).filter(Boolean) as string[],
  );
  const primaryEvidenceCount = evidenceRows.filter((e) => e.isPrimary).length;

  const cgiInput: CgiInput = {
    keyClaims: keyClaimInputs,
    totalArticles: articleRows.length,
    independentSourceCount: independence.independentCount,
    ownershipGroupCount: independence.ownershipGroups.length,
    sourceCategoryCount: categories.size,
    countryCount: countries.size,
    primaryEvidenceCount,
    contradictionPairs: keyContradictionPairs,
    latestUpdateAt: event.latestUpdateAt,
    now,
  };
  const cgi = computeCgi(cgiInput);

  const scoreId = createId("cgi");
  await db.insert(schema.commonGroundScores).values({
    id: scoreId,
    eventId,
    score: cgi.score,
    band: cgi.band,
    formulaVersion: CGI_FORMULA_VERSION,
    inputsSnapshot: cgi.inputs,
    computedAt: now,
  });
  if (cgi.components.length) {
    await db.insert(schema.cgiComponents).values(
      cgi.components.map((c) => ({
        id: createId("cmp"),
        scoreId,
        key: c.key,
        label: c.label,
        rawValue: c.rawValue,
        weight: c.weight,
        contribution: c.contribution,
        direction: c.direction,
        explanation: c.explanation,
      })),
    );
  }

  log.info("analyze.completed", {
    eventId,
    score: cgi.score,
    band: cgi.band,
    claimsUpdated,
    contradictionPairs,
  });

  return {
    eventId,
    cgi,
    claimsUpdated,
    contradictionPairs,
    independentSourceCount: independence.independentCount,
  };
}

export async function analyzeAllEvents(db: Db): Promise<AnalyzeResult[]> {
  const events = await db.select({ id: schema.events.id }).from(schema.events);
  const results: AnalyzeResult[] = [];
  for (const { id } of events) results.push(await analyzeEvent(db, id));
  return results;
}

export const _internal = { deriveStatus, ClaimUnionFind };
