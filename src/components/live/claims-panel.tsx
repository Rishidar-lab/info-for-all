"use client";

import { useState } from "react";
import type { Claim, EventClaims } from "@/lib/claims/types";
import {
  CLAIM_STATUS_LABEL,
  CLAIM_STATUS_STYLE,
  CONFIDENCE_BAND_LABEL,
  corroborationSummary,
  epistemicView,
} from "@/lib/claims/present";
import { CONFIDENCE_LABEL } from "@/lib/claims/confidence";
import { provenanceChain } from "@/lib/claims/provenance";
import { cn } from "@/lib/format";

export interface ArticleRef {
  id: string;
  publisher: string;
  sourceName: string;
  url: string;
  title: string;
  publishedAt: string;
}

function fmtIST(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d) + " IST"
  );
}

function StatusPill({ claim }: { claim: Claim }) {
  const s = CLAIM_STATUS_STYLE[claim.status];
  return <span className={cn("pill", s.text, s.bg)}>{CLAIM_STATUS_LABEL[claim.status]}</span>;
}

function ClaimRow({ claim, onOpen }: { claim: Claim; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <span className="flex flex-wrap items-center gap-2">
          <StatusPill claim={claim} />
          <span className="ui text-[11px] text-ink-3">
            {CONFIDENCE_LABEL[claim.confidenceBand]} confidence
          </span>
        </span>
        <span className="text-[14.5px] leading-snug text-ink group-hover:text-accent">
          {claim.canonicalText}
        </span>
        {claim.canonicalTextOriginal && (
          <span className="text-[13px] leading-snug text-ink-3">{claim.canonicalTextOriginal}</span>
        )}
        <span className="ui text-[11.5px] text-ink-3">{corroborationSummary(claim)} · Details →</span>
      </button>
    </li>
  );
}

function Section({
  label,
  title,
  note,
  claims,
  onOpen,
  tone = "default",
}: {
  label: string;
  title: string;
  note: string;
  claims: Claim[];
  onOpen: (c: Claim) => void;
  tone?: "default" | "agree" | "caution" | "dispute";
}) {
  if (claims.length === 0) return null;
  const bar =
    tone === "agree"
      ? "border-agree"
      : tone === "dispute"
        ? "border-dispute"
        : tone === "caution"
          ? "border-caution"
          : "border-rule-strong";
  return (
    <section>
      <div className={cn("mb-2 border-l-2 pl-3", bar)}>
        <div className="label">{label}</div>
        <h3 className="font-serif text-[17px] font-semibold text-ink">{title}</h3>
        <p className="ui mt-0.5 text-[12px] leading-snug text-ink-3">{note}</p>
      </div>
      <ul className="card divide-y divide-rule">
        {claims.map((c) => (
          <ClaimRow key={c.id} claim={c} onOpen={() => onOpen(c)} />
        ))}
      </ul>
    </section>
  );
}

function ClaimModal({
  claim,
  ec,
  articles,
  onClose,
}: {
  claim: Claim;
  ec: EventClaims;
  articles: Map<string, ArticleRef>;
  onClose: () => void;
}) {
  const dispute = ec.disputes.find(
    (d) => d.field === claim.predicates[0]?.replace(/_/g, " "),
  );
  const evidence = ec.evidence.filter((e) => claim.primaryEvidenceIds.includes(e.id));
  const chain = provenanceChain(claim);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Claim detail"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl bg-surface p-0 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule-strong p-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <StatusPill claim={claim} />
              <span className="ui text-[11px] text-ink-3">
                {CONFIDENCE_BAND_LABEL[claim.confidenceBand]} · score {claim.confidence}/100
              </span>
            </div>
            <p className="font-serif text-[17px] leading-snug text-ink">{claim.canonicalText}</p>
            {claim.canonicalTextOriginal && (
              <p className="mt-1 text-[14px] leading-snug text-ink-3">{claim.canonicalTextOriginal}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ui shrink-0 border border-rule-strong px-2 py-0.5 text-[13px] text-ink-2 hover:border-accent hover:text-accent"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <Block label="At a glance">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 ui text-[12px]">
              <Fact k="Reported by" v={`${claim.supportingPublisherIds.length} publisher${claim.supportingPublisherIds.length === 1 ? "" : "s"}`} />
              <Fact k="Independent groups" v={`${claim.independentSourceGroups.length}`} />
              <Fact
                k="Possible syndication"
                v={`${Math.max(0, claim.supportingPublisherIds.length - claim.independentSourceGroups.length)} copy(ies)`}
              />
              <Fact k="Primary evidence" v={claim.primaryEvidenceIds.length ? `${claim.primaryEvidenceIds.length} record(s)` : "none"} />
              <Fact k="Original language" v={claim.canonicalLanguage === "ta" ? "Tamil (kept as-is)" : "English"} />
              <Fact
                k="Attribution"
                v={claim.provenance.find((p) => p.attribution)?.attribution ?? "— (direct)"}
              />
              <Fact k="First seen" v={fmtIST(claim.firstSeenAt)} />
              <Fact k="Latest update" v={fmtIST(claim.lastSeenAt)} />
            </dl>
          </Block>

          <Block label="Why this status">
            <ul className="flex flex-col gap-1 text-[13px] leading-relaxed text-ink-2">
              {claim.rationale.map((r) => (
                <li key={r} className="flex gap-2">
                  <span aria-hidden className="text-ink-3">
                    ·
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Block>

          <Block label={`Supporting sources (${claim.supportingArticleIds.length})`}>
            <ul className="flex flex-col gap-2">
              {claim.provenance.map((p, i) => {
                const a = articles.get(p.articleId);
                return (
                  <li key={i} className="ui text-[12.5px] leading-snug">
                    <span className="font-semibold text-ink">{a?.sourceName ?? p.publisherId}</span>
                    {p.attribution && (
                      <span className="text-ink-3"> — attributes this to {p.attribution}</span>
                    )}
                    <span className="text-ink-3"> · {fmtIST(p.seenAt)}</span>
                    {p.sourceText && (
                      <span className="mt-0.5 block text-ink-2">“{p.sourceText}”</span>
                    )}
                    <a
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      Open source ↗
                    </a>
                  </li>
                );
              })}
            </ul>
          </Block>

          {dispute && (
            <Block label="Where sources disagree">
              <div className="card bg-dispute-bg p-3 ui text-[12.5px] text-ink-2">
                <p>
                  <span className="font-semibold text-ink">{dispute.a.value}</span> (
                  {dispute.a.publisherIds.join(", ") || "—"}, {fmtIST(dispute.a.at)}) vs{" "}
                  <span className="font-semibold text-ink">{dispute.b.value}</span> (
                  {dispute.b.publisherIds.join(", ") || "—"}, {fmtIST(dispute.b.at)})
                </p>
                <p className="mt-1">{dispute.reason}</p>
                {dispute.possiblyTemporalUpdate && (
                  <p className="mt-1 text-ink-3">
                    Chronology suggests this may be a later update rather than a contradiction.
                  </p>
                )}
              </div>
            </Block>
          )}

          {evidence.length > 0 && (
            <Block label="Primary evidence">
              <ul className="flex flex-col gap-2">
                {evidence.map((e) => (
                  <li key={e.id} className="card bg-evidence-bg p-3 ui text-[12.5px]">
                    <p className="font-semibold text-ink">{e.title}</p>
                    <p className="text-ink-3">
                      {e.publisher}
                      {e.publishedAt ? ` · ${fmtIST(e.publishedAt)}` : ""}
                    </p>
                    {typeof e.provenance.areaDescription === "string" && (
                      <p className="text-ink-2">Stated area: {e.provenance.areaDescription}</p>
                    )}
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      Open the alert ↗
                    </a>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {claim.updates.length > 0 && (
            <Block label="How this claim changed">
              <ul className="flex flex-col gap-1 ui text-[12.5px] text-ink-2">
                {claim.updates.map((u, i) => (
                  <li key={i}>
                    {fmtIST(u.at)} — {articles.get(u.articleId)?.sourceName ?? u.publisherId}:{" "}
                    <span className="text-ink">{u.change}</span>
                    {u.supersedes && <span className="text-ink-3"> (supersedes earlier figure)</span>}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {claim.corrections.length > 0 && (
            <Block label="Corrections">
              <ul className="flex flex-col gap-1 ui text-[12.5px] text-ink-2">
                {claim.corrections.map((c, i) => (
                  <li key={i}>
                    {articles.get(c.articleId)?.sourceName ?? c.publisherId}: {c.original} → {c.corrected}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          <Block label="Provenance trace">
            <ol className="flex flex-col gap-1 ui text-[12px] text-ink-3">
              {chain.map((step, i) => (
                <li key={i}>
                  <span className="font-semibold text-ink-2">{step.label}:</span> {step.detail}
                </li>
              ))}
            </ol>
          </Block>

          <div className="ui flex flex-wrap gap-x-4 gap-y-1 border-t border-rule pt-2 text-[11.5px] text-ink-3">
            <span>First reported {fmtIST(claim.firstSeenAt)}</span>
            <span>Latest update {fmtIST(claim.lastSeenAt)}</span>
            <span>
              Extraction: {claim.provenance[0]?.extractionMethod ?? "rule"} · classification is
              structured data, not a model&rsquo;s hidden reasoning
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-ink-3">{k}</dt>
      <dd className="font-medium text-ink">{v}</dd>
    </div>
  );
}

export function ClaimsPanel({
  ec,
  articles,
}: {
  ec: EventClaims;
  articles: ArticleRef[];
}) {
  const [open, setOpen] = useState<Claim | null>(null);
  const view = epistemicView(ec);
  const byId = new Map(articles.map((a) => [a.id, a]));

  return (
    <div className="flex flex-col gap-6">
      <Section
        label="What we know"
        title="Corroborated across independent sources"
        note="Reported by more than one source group that IFA believes are independent of each other."
        claims={view.known}
        onOpen={setOpen}
        tone="agree"
      />
      <Section
        label="Reported, not yet verified"
        title="One source, or one speaker"
        note="Stated by a single publisher or attributed to a single speaker. Not independently confirmed."
        claims={view.reported}
        onOpen={setOpen}
        tone="caution"
      />
      <Section
        label="Sources disagree"
        title="Genuine conflicts between reports"
        note="A real semantic conflict — not a wording difference. IFA does not resolve it for you."
        claims={view.disputed}
        onOpen={setOpen}
        tone="dispute"
      />
      <Section
        label="Earlier information"
        title="Outdated or retracted"
        note="Kept visible rather than deleted, so the record of what was said stays intact."
        claims={view.historical}
        onOpen={setOpen}
      />

      {ec.unknowns.length > 0 && (
        <section>
          <div className="mb-2 border-l-2 border-unknown pl-3">
            <div className="label">What we don&rsquo;t know</div>
            <h3 className="font-serif text-[17px] font-semibold text-ink">Open questions</h3>
          </div>
          <ul className="card divide-y divide-rule">
            {ec.unknowns.map((u) => (
              <li key={u} className="flex gap-3 px-4 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
                <span aria-hidden className="text-unknown">
                  ?
                </span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open && (
        <ClaimModal claim={open} ec={ec} articles={byId} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
