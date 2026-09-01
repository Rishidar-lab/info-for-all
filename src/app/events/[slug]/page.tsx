import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getEventDetail } from "@/lib/domain/events";
import { CATEGORY_LABEL, labelize } from "@/lib/ui";
import { formatDateTime, relativeTime } from "@/lib/format";
import { CgiBadge, EvidenceMark, SectionHeading, Stat } from "@/components/primitives";
import { CgiExplainer } from "@/components/cgi-explainer";
import { ClaimItem, ClaimList } from "@/components/claim-item";
import { CoverageList } from "@/components/coverage-list";
import { Timeline } from "@/components/timeline";
import { EVIDENCE_TYPE_LABEL } from "@/lib/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventDetail(db, slug);
  if (!event) return { title: "Event not found" };
  return { title: event.title, description: event.summary };
}

const NAV = [
  ["overview", "Overview"],
  ["agreement", "Agreement"],
  ["disagreement", "Disagreement"],
  ["unknowns", "What we don't know"],
  ["evidence", "Evidence"],
  ["timeline", "Timeline"],
  ["coverage", "Coverage"],
  ["claims", "All claims"],
  ["cgi", "CGI"],
] as const;

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventDetail(db, slug);
  if (!event) notFound();

  return (
    <article className="space-y-10">
      {/* Header */}
      <header className="border-b border-rule-strong pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label">{CATEGORY_LABEL[event.category] ?? event.category}</span>
          <span className="pill">{labelize(event.status)}</span>
          {event.location && <span className="ui text-[12px] text-ink-3">· {event.location}</span>}
          {event.topics.map((t) => (
            <Link key={t.slug} href={`/topics/${t.slug}`} className="pill hover:border-accent">
              {t.name}
            </Link>
          ))}
        </div>

        <h1 className="mt-2 font-serif text-[30px] font-semibold leading-tight tracking-tight sm:text-[34px]">
          {event.title}
        </h1>
        <p className="prose-measure mt-3 font-serif text-[17px] text-ink-2">{event.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3">
          {event.cgi && <CgiBadge score={event.cgi.score} band={event.cgi.band} size="lg" href="#cgi" />}
          <Stat label="Sources" value={event.sourceCount} />
          <Stat label="Reports" value={event.articleCount} />
          <Stat label="Corroborated claims" value={event.corroboratedClaimCount} tone="agree" />
          <Stat label="Disputed claims" value={event.disputedClaimCount} tone="dispute" />
          <Stat label="Primary documents" value={event.primaryEvidence.length} tone="evidence" />
          <div className="flex flex-col">
            <span className="mono text-[13px] text-ink-2">{relativeTime(event.latestUpdateAt)}</span>
            <span className="label">Last update</span>
          </div>
        </div>
      </header>

      {/* Anchor nav */}
      <nav className="sticky top-0 z-10 -mx-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-rule bg-paper/95 px-4 py-2 ui text-[12px] backdrop-blur">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-ink-2 hover:text-accent">
            {label}
          </a>
        ))}
      </nav>

      {/* Overview / What we know */}
      <section id="overview" className="scroll-mt-14">
        <SectionHeading label="What we know" title="Overview" />
        <p className="prose-measure font-serif text-[16px] text-ink-2">{event.whatWeKnow}</p>
        {event.entities.length > 0 && (
          <div className="mt-4">
            <div className="label mb-1">Key entities</div>
            <div className="flex flex-wrap gap-1.5">
              {event.entities.map((e) => (
                <span key={e.id} className="pill" title={`${labelize(e.type)} · salience ${e.salience.toFixed(2)}`}>
                  {e.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Agreement */}
      <section id="agreement" className="scroll-mt-14">
        <SectionHeading
          label="What sources agree on"
          title="Independently corroborated claims"
          note={`${event.agreement.length} claim${event.agreement.length === 1 ? "" : "s"}`}
        />
        {event.agreement.length === 0 ? (
          <p className="ui text-[13px] text-ink-3">
            No claim is yet corroborated by two or more independent sources.
          </p>
        ) : (
          <ClaimList claims={event.agreement} />
        )}
      </section>

      {/* Disagreement */}
      <section id="disagreement" className="scroll-mt-14">
        <SectionHeading
          label="What sources disagree on"
          title="Conflicting claims"
          note={`${event.disagreement.contradiction.length} conflict${event.disagreement.contradiction.length === 1 ? "" : "s"}`}
        />
        {event.disagreement.contradiction.length === 0 ? (
          <p className="ui text-[13px] text-ink-3">No direct contradictions detected among extracted claims.</p>
        ) : (
          <div className="space-y-5">
            {event.disagreement.contradiction.map((pair) => (
              <div key={pair.id} className="card p-4">
                <div className="ui text-[11px] text-ink-3">
                  Conflict · model confidence {Math.round(pair.confidence * 100)}%
                  {pair.rationale && <> · {pair.rationale}</>}
                </div>
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  {[pair.claimA, pair.claimB].map((c, i) => (
                    <div key={c.id} className={i === 0 ? "md:border-r md:border-rule md:pr-4" : ""}>
                      <div className="label mb-1">Source group {i === 0 ? "A" : "B"}</div>
                      <ClaimItem claim={c} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 border-t border-rule pt-2 ui text-[11.5px] text-ink-3">
                  IFA does not adjudicate this conflict. Both statements and their evidence are shown so
                  you can judge which is better supported.
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* What we don't know */}
      <section id="unknowns" className="scroll-mt-14">
        <SectionHeading label="What we don't know yet" title="Open questions and uncertainty" />
        {event.uncertainties.length === 0 ? (
          <p className="ui text-[13px] text-ink-3">No outstanding uncertainties flagged.</p>
        ) : (
          <ul className="space-y-2.5">
            {event.uncertainties.map((u, i) => (
              <li key={i} className="border-l-2 border-caution pl-3">
                <div className="ui text-[13px] font-semibold text-ink">{u.label}</div>
                <div className="ui text-[13px] text-ink-2">{u.detail}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Primary evidence */}
      <section id="evidence" className="scroll-mt-14">
        <SectionHeading
          label="Primary evidence"
          title="Documents and records"
          note={<Link href="/evidence" className="hover:underline">all evidence →</Link>}
        />
        {event.primaryEvidence.length === 0 ? (
          <p className="ui text-[13px] text-ink-3">No primary documents located for this event.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {event.primaryEvidence.map((ev) => (
              <li key={ev.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceMark primary />
                  <a href={ev.url} target="_blank" rel="noreferrer" className="link-quiet font-serif text-[15px]">
                    {ev.title}
                  </a>
                </div>
                <div className="mt-1 ui text-[12px] text-ink-3">
                  {EVIDENCE_TYPE_LABEL[ev.type] ?? ev.type}
                  {ev.publisher && <> · {ev.publisher}</>}
                  {ev.publishedAt && <> · {formatDateTime(ev.publishedAt)}</>}
                  {ev.contentHash && <> · <span className="mono">{ev.contentHash}</span></>}
                  {ev.archiveUrl && (
                    <> · <a href={ev.archiveUrl} className="underline" target="_blank" rel="noreferrer">archived copy</a></>
                  )}
                </div>
                {ev.linkedClaims.length > 0 && (
                  <div className="mt-1 ui text-[11.5px] text-ink-3">
                    Linked to {ev.linkedClaims.length} claim(s):{" "}
                    {ev.linkedClaims.map((l) => l.stance).join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Timeline */}
      <section id="timeline" className="scroll-mt-14">
        <SectionHeading label="Latest developments" title="How the information evolved" />
        <Timeline entries={event.timeline} />
      </section>

      {/* Coverage */}
      <section id="coverage" className="scroll-mt-14">
        <SectionHeading
          label="Source coverage"
          title={`${event.coverage.length} reports from ${event.sourceCount} sources`}
          note={
            <span>
              {event.independence.independentCount} independent ·{" "}
              {event.independence.wireDependentArticles} wire/ownership-dependent
            </span>
          }
        />
        <p className="mb-3 prose-measure ui text-[12.5px] text-ink-3">
          The <strong>Ind.</strong> column groups reports that are not independent of each other —
          same ownership group, same wire dispatch, or near-duplicate text. Ownership groups present:{" "}
          {event.independence.ownershipGroups.join(", ") || "—"}.
        </p>
        <CoverageList articles={event.coverage} />
      </section>

      {/* All claims */}
      <section id="claims" className="scroll-mt-14">
        <SectionHeading label="Claim graph" title={`All ${event.claims.length} extracted claims`} />
        <ClaimList claims={event.claims} />
      </section>

      {/* Corrections */}
      {event.corrections.length > 0 && (
        <section id="corrections" className="scroll-mt-14">
          <SectionHeading label="Corrections" title="Correction history" />
          <ul className="space-y-3">
            {event.corrections.map((c) => (
              <li key={c.id} className="card p-3 ui text-[13px]">
                <div className="label mb-1">Corrected {formatDateTime(c.correctedAt)}</div>
                <p className="text-ink-3 line-through">{c.originalText}</p>
                <p className="mt-1 text-ink">{c.updatedText}</p>
                <p className="mt-1 text-[12px] text-ink-3">Reason: {c.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CGI */}
      <section id="cgi" className="scroll-mt-14">
        <SectionHeading label="How this was calculated" title="Common Ground Index" />
        {event.cgi ? (
          <CgiExplainer cgi={event.cgi} />
        ) : (
          <p className="ui text-[13px] text-ink-3">This event has not been scored yet.</p>
        )}
      </section>
    </article>
  );
}
