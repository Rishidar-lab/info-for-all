/**
 * Provider-assisted claim extraction — orchestration (v0.4, Phase 7–9).
 *
 * PRODUCTION IS RULE-ONLY. This module exists so that, WHERE a provider is
 * explicitly configured, the deterministic rule output can be supplemented by a
 * model for linguistically harder sentences — but never at the cost of trust:
 *
 *   MODEL OUTPUT → SCHEMA VALIDATION → PROVENANCE CHECK → ENTAILMENT GUARD →
 *   CONFIDENCE GATE → IFA CLAIM
 *
 * The `next build` never requires any credential; `getClaimProvider()` returns
 * the NullProvider unless `IFA_CLAIM_PROVIDER` names a registered provider AND
 * its key is present.
 */
import type { ClaimCandidate } from "../extract";
import { validateModelResponse, type ModelClaim } from "./schema";
import { checkEntailment } from "./entailment";
import { scanForInjection, wrapAsData, INJECTION_SYSTEM_RULE } from "./sanitize";

export interface ProviderArticle {
  id: string;
  publisherId: string;
  url: string;
  title: string;
  excerpt?: string;
  language: "ta" | "en" | "unknown";
}

export interface ClaimExtractionProvider {
  readonly name: string;
  /** True when the provider is actually usable (credential present, etc.). */
  available(): boolean;
  /**
   * Return the provider's RAW response for one article. May be a JSON string or
   * an already-parsed object; it is validated by the caller. Implementations
   * MUST call `buildPrompt` so the untrusted-data wrapper + system rule are used.
   */
  extract(article: ProviderArticle): Promise<unknown>;
}

/** Build the (data-wrapped) user content + the system rule for a provider call. */
export function buildPrompt(article: ProviderArticle): { system: string; data: string } {
  return {
    system:
      INJECTION_SYSTEM_RULE +
      " Return JSON: {\"claims\":[{canonicalText,type,attribution,entities,quantities,temporalContext,supportingExcerpt,confidence}]}. " +
      "type ∈ fact|event|statistic|attribution|official-statement|allegation|prediction|opinion. " +
      "Use attribution (speaker string) for anything a person/body said, alleged, expects or warned — never type those as fact. " +
      "supportingExcerpt must be copied verbatim from the data.",
    data: wrapAsData({
      publisher: article.publisherId,
      title: article.title,
      excerpt: article.excerpt ?? "",
    }),
  };
}

/** The default: contributes nothing. Production runs on this. */
export class NullProvider implements ClaimExtractionProvider {
  readonly name = "null (rule-only)";
  available(): boolean {
    return false;
  }
  async extract(): Promise<unknown> {
    return { claims: [] };
  }
}

const REGISTRY = new Map<string, () => ClaimExtractionProvider>();
/** Register a concrete provider (called from an opt-in entrypoint, never at build). */
export function registerClaimProvider(id: string, make: () => ClaimExtractionProvider): void {
  REGISTRY.set(id, make);
}

export function getClaimProvider(): ClaimExtractionProvider {
  const id = process.env.IFA_CLAIM_PROVIDER;
  if (!id) return new NullProvider();
  const make = REGISTRY.get(id);
  if (!make) return new NullProvider();
  const p = make();
  return p.available() ? p : new NullProvider();
}

export interface RefineResult {
  admitted: ClaimCandidate[];
  rejected: { canonicalText: string; stage: string; reasons: string[] }[];
  usedProvider: string;
}

/**
 * Take a provider's raw output for one article and turn the SURVIVING claims
 * into `ClaimCandidate`s that flow through the same normalisation as the rule
 * output. Anything that fails a gate is dropped and recorded.
 */
export function refineFromResponse(
  article: ProviderArticle,
  raw: unknown,
  providerName: string,
): RefineResult {
  const rejected: RefineResult["rejected"] = [];
  const source = `${article.title} ${article.excerpt ?? ""}`;

  // gate 0 — the source we fed the model must itself be injection-scanned
  const srcScan = scanForInjection(source);

  // gate 1 — schema
  const validation = validateModelResponse(raw);
  if (!validation.ok || !validation.data) {
    return { admitted: [], rejected: [{ canonicalText: "(response)", stage: "schema", reasons: validation.errors }], usedProvider: providerName };
  }

  const admitted: ClaimCandidate[] = [];
  for (const claim of validation.data.claims) {
    // gate 2 — provenance + entailment
    const ent = checkEntailment({ sourceText: source, claim });
    if (ent.verdict === "reject") {
      rejected.push({ canonicalText: claim.canonicalText, stage: "entailment", reasons: ent.reasons });
      continue;
    }
    // gate 3 — confidence
    const modelConf = claim.confidence;
    if (modelConf < 0.55) {
      rejected.push({ canonicalText: claim.canonicalText, stage: "confidence", reasons: [`model confidence ${modelConf} < 0.55`] });
      continue;
    }
    admitted.push(toCandidate(article, claim, ent.verdict === "downgrade", srcScan.clean));
  }
  return { admitted, rejected, usedProvider: providerName };
}

function toCandidate(
  article: ProviderArticle,
  claim: ModelClaim,
  downgraded: boolean,
  cleanSource: boolean,
): ClaimCandidate {
  const attributed = !!claim.attribution;
  const type = attributed && claim.type === "fact" ? "attribution" : claim.type;
  return {
    matchKey: `model:${article.id}:${claim.canonicalText.slice(0, 24).toLowerCase().replace(/\s+/g, "-")}`,
    type,
    canonicalText: claim.canonicalText,
    subjects: claim.attribution ? [claim.attribution] : claim.entities.map((e) => e.text).slice(0, 3),
    predicates: [],
    objects: claim.quantities.map((q) => String(q.value)),
    attribution: claim.attribution ?? undefined,
    figure: claim.quantities[0] ? { kind: "model", value: claim.quantities[0].value, raw: claim.quantities[0].raw } : undefined,
    sourceText: claim.supportingExcerpt,
    sourceTextOriginal: claim.originalText,
    language: article.language,
    articleId: article.id,
    publisherId: article.publisherId,
    sourceUrl: article.url,
    // model-derived claims start LOW and only ever supplement rule output
    extractionConfidence: Math.min(0.55, claim.confidence) * (downgraded ? 0.6 : 1) * (cleanSource ? 1 : 0.5),
  };
}

export { validateModelResponse } from "./schema";
export { checkEntailment } from "./entailment";
export { scanForInjection, neutraliseDelimiters, wrapAsData } from "./sanitize";
