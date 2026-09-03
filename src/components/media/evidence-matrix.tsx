import { cn } from "@/lib/format";
import type { ClaimEvidence, ClaimEvidenceStatus, EvidenceProfile, EvidenceStrengthScore } from "@/lib/media-landscape/types";

const STATUS_LABEL: Record<ClaimEvidenceStatus, string> = {
  HIGHLY_CORROBORATED: "Highly corroborated",
  CORROBORATED: "Corroborated",
  PARTIALLY_CORROBORATED: "Partially corroborated",
  SINGLE_SOURCE: "Single source",
  DISPUTED: "Disputed",
  UNVERIFIED: "Unverified",
  CORRECTED: "Corrected",
  RETRACTED: "Retracted",
  SUPERSEDED: "Superseded",
};

function statusClass(s: ClaimEvidenceStatus): string {
  if (s === "HIGHLY_CORROBORATED" || s === "CORROBORATED") return "bg-agree-bg text-agree";
  if (s === "PARTIALLY_CORROBORATED") return "bg-surface-2 text-ink-2";
  if (s === "DISPUTED" || s === "RETRACTED") return "bg-dispute-bg text-dispute";
  if (s === "CORRECTED" || s === "SUPERSEDED") return "bg-caution-bg text-caution";
  return "bg-surface-2 text-ink-3";
}

export function EvidenceProfilePanel({
  profile,
  strength,
}: {
  profile: EvidenceProfile;
  strength: EvidenceStrengthScore | null;
}) {
  return (
    <div className="card bg-surface-2 p-4">
      <div className="label mb-1.5 text-[10px]">Evidence profile</div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 ui text-[12.5px] text-ink-2">
        <span><span className="mono text-ink">{profile.substantiveClaims}</span> substantive claims</span>
        <span><span className="mono text-ink">{profile.byStatus.HIGHLY_CORROBORATED + profile.byStatus.CORROBORATED}</span> corroborated</span>
        <span><span className="mono text-ink">{profile.byStatus.PARTIALLY_CORROBORATED}</span> partial</span>
        <span><span className="mono text-ink">{profile.byStatus.DISPUTED}</span> disputed</span>
        <span><span className="mono text-ink">{profile.byStatus.SINGLE_SOURCE + profile.byStatus.UNVERIFIED}</span> unresolved</span>
        <span><span className="mono text-ink">{profile.independentFamilies}</span> independent families</span>
        <span><span className="mono text-ink">{profile.primaryDocumentSupported}/{profile.substantiveClaims}</span> primary-document-supported</span>
        {profile.corrections > 0 && <span className="text-caution"><span className="mono">{profile.corrections}</span> corrections</span>}
      </div>
      <p className="ui mt-2 text-[11px] leading-relaxed text-ink-3">
        Counts, not a &ldquo;% true&rdquo;. A press release is evidence that an institution <em>stated</em> something —
        not automatic proof it is objectively true.
      </p>
      {strength && (
        <details className="mt-2">
          <summary className="ui text-[11.5px] text-ink-3 hover:text-accent cursor-pointer">
            Evidence strength (internal ranking): {strength.score}/100 — what this is
          </summary>
          <div className="mt-2 ui text-[11.5px] text-ink-3">
            <p className="mb-1.5">{strength.disclaimer}</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(strength.components).map(([k, v]) => (
                <li key={k}>
                  {k.replace(/([A-Z])/g, " $1").toLowerCase()}: <span className="mono">{v > 0 ? "+" : ""}{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}

export function EvidenceMatrix({
  matrix,
  articlePub,
}: {
  matrix: ClaimEvidence[];
  articlePub: Record<string, string>;
}) {
  if (!matrix.length) {
    return (
      <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
        IFFA did not extract a structured claim for this story — usually a single short report.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {matrix.map((c) => (
        <li key={c.claimId} className="card p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={cn("pill", statusClass(c.status))}>{STATUS_LABEL[c.status]}</span>
            <span className="ui text-[11px] text-ink-3">{c.claimType}</span>
            <span className="mono ui text-[11px] text-ink-3">
              {c.independentSupportCount} independent · {c.supportingArticles.length} report(s)
              {c.contradictingArticles.length > 0 && ` · ${c.contradictingArticles.length} contra`}
            </span>
          </div>
          <p className="mt-2 ui text-[13.5px] leading-relaxed text-ink">{c.canonicalClaim}</p>

          {(c.primaryEvidence.length > 0 || c.officialStatements.length > 0) && (
            <div className="mt-2 border-l-2 border-agree/40 pl-3">
              <div className="label mb-0.5 text-[10px] text-agree">Primary evidence</div>
              <ul className="flex flex-col gap-0.5 ui text-[12px] text-ink-2">
                {[...c.primaryEvidence, ...c.officialStatements].map((p, i) => (
                  <li key={i}>
                    <span className="text-ink-3">[{p.kind.replace(/-/g, " ")}]</span> {p.establishes}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-accent hover:underline">
                        ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.factChecks.length > 0 && (
            <div className="mt-2 border-l-2 border-accent/40 pl-3">
              <div className="label mb-0.5 text-[10px]">Fact checks</div>
              <ul className="flex flex-col gap-0.5 ui text-[12px] text-ink-2">
                {c.factChecks.map((f, i) => (
                  <li key={i}>
                    <span className="font-semibold">{f.factChecker}:</span> {f.verdict} ({f.matchConfidence} match)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 ui text-[11px] text-ink-3">
            Reported by: {[...new Set(c.supportingArticles.map((id) => articlePub[id]).filter(Boolean))].join(", ") || "—"}
          </div>
        </li>
      ))}
    </ul>
  );
}
