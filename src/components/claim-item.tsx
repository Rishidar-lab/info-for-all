import type { ClaimView } from "@/lib/domain/view";
import { CLAIM_TYPE_LABEL, EVIDENCE_TYPE_LABEL } from "@/lib/ui";
import { Disclosure } from "./disclosure";
import { EvidenceMark, StatusPill } from "./primitives";

export function ClaimItem({ claim }: { claim: ClaimView }) {
  const hasDetail =
    claim.evidence.length > 0 ||
    claim.relationships.length > 0 ||
    claim.sourceArticle !== null;

  return (
    <div className="py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="prose-measure font-serif text-[15.5px] leading-snug text-ink">
          {claim.canonicalText}
        </p>
        <StatusPill status={claim.status} />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 ui text-[11.5px] text-ink-3">
        <span className="pill">{CLAIM_TYPE_LABEL[claim.type]}</span>
        <span className="mono">
          {claim.corroborationCount} independent source{claim.corroborationCount === 1 ? "" : "s"}
        </span>
        {claim.contradictionCount > 0 && (
          <span className="mono text-dispute">{claim.contradictionCount} contradiction(s)</span>
        )}
        <span className="mono" title="Extraction confidence (mock provider)">
          extraction {Math.round(claim.extractionConfidence * 100)}%
        </span>
      </div>

      {hasDetail && (
        <div className="mt-2">
          <Disclosure summary="Show evidence, sources and provenance">
            <div className="space-y-3 border-l-2 border-rule pl-3 ui text-[12.5px]">
              {claim.sourceArticle && (
                <div>
                  <div className="label">Extracted from</div>
                  <a href={claim.sourceArticle.url} target="_blank" rel="noreferrer" className="link-quiet">
                    {claim.sourceArticle.publication} — {claim.sourceArticle.title}
                  </a>
                  {claim.sourceParagraph !== null && (
                    <span className="text-ink-3"> · paragraph {claim.sourceParagraph + 1}</span>
                  )}
                </div>
              )}

              {claim.evidence.length > 0 && (
                <div>
                  <div className="label mb-1">Linked evidence</div>
                  <ul className="space-y-1.5">
                    {claim.evidence.map((ev) => (
                      <li key={ev.id} className="flex flex-wrap items-center gap-2">
                        <EvidenceMark primary={ev.isPrimary} />
                        <a href={ev.url} target="_blank" rel="noreferrer" className="link-quiet">
                          {ev.title}
                        </a>
                        <span className="text-ink-3">
                          {EVIDENCE_TYPE_LABEL[ev.type] ?? ev.type}
                          {ev.linkedClaims[0]?.stance ? ` · ${ev.linkedClaims[0].stance}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {claim.relationships.length > 0 && (
                <div>
                  <div className="label mb-1">Relationships to other claims</div>
                  <ul className="space-y-1">
                    {claim.relationships.map((rel) => (
                      <li key={rel.id} className="text-ink-2">
                        <span
                          className={
                            rel.type === "CONTRADICTS"
                              ? "text-dispute font-semibold"
                              : rel.type === "SUPPORTS"
                                ? "text-agree font-semibold"
                                : "text-ink-3 font-semibold"
                          }
                        >
                          {rel.type}
                        </span>{" "}
                        {rel.direction === "from" ? "→" : "←"} “{rel.otherClaimText}”
                        {rel.rationale && <span className="text-ink-3"> — {rel.rationale}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Disclosure>
        </div>
      )}
    </div>
  );
}

export function ClaimList({ claims }: { claims: ClaimView[] }) {
  if (claims.length === 0) return <p className="ui text-[13px] text-ink-3">No claims.</p>;
  return (
    <div className="divide-y divide-rule">
      {claims.map((c) => (
        <ClaimItem key={c.id} claim={c} />
      ))}
    </div>
  );
}
