import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  clusterBySlug,
  clusterArticles,
  routableClusters,
  istTimestamp,
  EVIDENCE_ROLE_LABEL,
  LIFECYCLE_LABEL,
  VERIFICATION_LABEL,
} from "@/lib/live/dataset";
import { CRISIS_TYPE_LABEL } from "@/lib/live/crisis";
import { EvidenceRoleBadge, VerificationBadge, LifecycleBadge } from "@/components/live/badges";
import { cn } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return routableClusters().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = clusterBySlug(slug);
  if (!c) return { title: "Story not found" };
  return { title: c.title, description: `Coverage comparison — ${c.sourceCount} source(s).` };
}

function fmtIST(iso: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso)) + " IST"
  );
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cluster = clusterBySlug(slug);
  if (!cluster) notFound();

  const articles = clusterArticles(cluster);
  const scopeLabel =
    cluster.scope === "tamil-nadu" ? "Tamil Nadu" : cluster.scope === "india-relevant" ? "India · Tamil Nadu-relevant" : "India";
  const kind = cluster.crisisType ? CRISIS_TYPE_LABEL[cluster.crisisType] : cluster.isCrisis ? "Public safety" : "Development";

  return (
    <article className="pb-6">
      <nav className="ui mb-4 flex items-center gap-2 text-[12px] text-ink-3">
        <Link href="/" className="link-quiet hover:text-accent">Live feed</Link>
        <span aria-hidden>/</span>
        <span className="text-ink-2">{scopeLabel}</span>
        <span aria-hidden>/</span>
        <span className="text-ink-2">{kind}</span>
      </nav>

      <header className="border-b-2 border-ink/80 pb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ui text-[12px] text-ink-3">
          <span className="label">{kind}</span>
          <span>{scopeLabel}</span>
          <span className="text-rule-strong">·</span>
          <span>Updated {istTimestamp(cluster.updatedAt)}</span>
        </div>
        <h1 className="mt-2.5 max-w-4xl font-serif text-[26px] font-semibold leading-[1.16] tracking-tight sm:text-[32px]">
          {cluster.title}
        </h1>
        <p className="ui mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-3">
          Working title generated from the sources below. IFA does not write its own prose account of the event.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cluster.isCrisis && <LifecycleBadge lifecycle={cluster.lifecycle} />}
          <VerificationBadge status={cluster.verificationStatus} />
          <span className="ui text-[12px] text-ink-2">
            <strong className="mono text-ink">{cluster.sourceCount}</strong> sources ·{" "}
            <strong className="mono text-ink">{cluster.officialCount}</strong> official ·{" "}
            <strong className="mono text-ink">{cluster.independentCount}</strong> independent
          </span>
        </div>

        {cluster.districts.length > 0 && (
          <p className="mt-2 ui text-[12.5px] text-ink-2">Districts referenced: {cluster.districts.join(", ")}</p>
        )}
      </header>

      <div className="mt-6 flex flex-col gap-10">
        {/* Official alert metadata, verbatim */}
        {cluster.cap && (
          <section>
            <div className="label mb-2">Official alert — as issued</div>
            <div className="card grid grid-cols-1 gap-x-6 gap-y-1.5 bg-surface-2 p-4 ui text-[13px] sm:grid-cols-2">
              {cluster.cap.event && <Field k="Event" v={cluster.cap.event} />}
              {cluster.cap.senderName && <Field k="Issuing authority" v={cluster.cap.senderName} />}
              {cluster.cap.severity && <Field k="Severity" v={cluster.cap.severity} />}
              {cluster.cap.certainty && <Field k="Certainty" v={cluster.cap.certainty} />}
              {cluster.cap.urgency && <Field k="Urgency" v={cluster.cap.urgency} />}
              {cluster.cap.effectiveFrom && <Field k="Effective from" v={fmtIST(cluster.cap.effectiveFrom)} />}
              {cluster.cap.effectiveUntil && <Field k="Effective until" v={fmtIST(cluster.cap.effectiveUntil)} />}
              {cluster.cap.areaDescription && <Field k="Stated area" v={cluster.cap.areaDescription} span />}
            </div>
            <p className="ui mt-2 text-[11.5px] text-ink-3">
              These values are reproduced from the issuing authority&rsquo;s alert and are not modified by IFA.
            </p>
          </section>
        )}

        {/* Common ground */}
        <section>
          <div className="mb-3 border-b border-rule-strong pb-2">
            <div className="label mb-1">What sources agree on</div>
            <h2 className="font-serif text-[19px] font-semibold text-ink">Common ground</h2>
          </div>
          {cluster.commonGroundPending ? (
            <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
              Common-ground extraction pending human review.
            </p>
          ) : (
            <ul className="card divide-y divide-rule">
              {cluster.commonGround.map((fact) => (
                <li key={fact} className="flex gap-3 px-4 py-2.5">
                  <span aria-hidden className="mt-0.5 font-semibold text-agree">✓</span>
                  <span className="text-[14px] leading-relaxed text-ink">{fact}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Where reporting differs */}
        <section>
          <div className="mb-3 border-b border-rule-strong pb-2">
            <div className="label mb-1">Where reporting differs</div>
            <h2 className="font-serif text-[19px] font-semibold text-ink">Structured metadata comparison</h2>
          </div>
          <p className="ui mb-3 text-[12px] leading-relaxed text-ink-3">
            IFA compares only structured metadata between reports — reported locations, times,
            evidence role and stated severity. It does not assert that any report contradicts
            another.
          </p>
          {cluster.differences.length === 0 ? (
            <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
              Only one source so far, or no metadata differences to show.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {cluster.differences.map((d) => (
                <div key={d.field} className="card overflow-hidden">
                  <div className="border-b border-rule bg-surface-2 px-4 py-2 ui text-[12.5px] font-semibold text-ink">
                    {d.field}
                  </div>
                  <ul className="divide-y divide-rule">
                    {d.observations.map((o, i) => (
                      <li key={i} className="grid grid-cols-1 gap-1 px-4 py-2.5 ui text-[13px] sm:grid-cols-[200px_1fr] sm:gap-4">
                        <span className="font-semibold text-ink-2">{o.sourceName}</span>
                        <span className="text-ink">{o.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* What remains unknown */}
        {cluster.unknowns.length > 0 && (
          <section>
            <div className="label mb-2">What remains unknown</div>
            <ul className="card divide-y divide-rule">
              {cluster.unknowns.map((u) => (
                <li key={u} className="flex gap-3 px-4 py-2.5">
                  <span aria-hidden className="mt-0.5 text-caution">?</span>
                  <span className="text-[13.5px] leading-relaxed text-ink-2">{u}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Every report */}
        <section>
          <div className="mb-3 border-b border-rule-strong pb-2">
            <div className="label mb-1">Source reporting</div>
            <h2 className="font-serif text-[19px] font-semibold text-ink">
              Every report in this cluster ({articles.length})
            </h2>
          </div>
          <p className="ui mb-4 text-[12px] leading-relaxed text-ink-3">
            Only the feed-provided headline, timestamp and short excerpt are stored. Follow the
            link to each publisher for the full report.
          </p>
          <div className="flex flex-col gap-3">
            {articles.map((a) => (
              <div key={a.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="ui text-[13.5px] font-semibold text-ink">{a.sourceName}</span>
                  {a.language !== "unknown" && (
                    <span className="ui text-[11px] text-ink-3">{a.language === "ta" ? "தமிழ்" : "English"}</span>
                  )}
                  <span className="grow" />
                  <EvidenceRoleBadge role={a.evidenceRole} />
                  <VerificationBadge status={a.verificationStatus} />
                </div>
                <h3 className="mt-2 font-serif text-[15.5px] leading-snug text-ink">{a.title}</h3>
                {a.excerpt && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{a.excerpt}</p>}
                <p className="mt-1.5 ui text-[11.5px] text-ink-3">
                  Geo: {a.geo.reason}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 ui text-[12px] text-ink-3">
                  <span>Published {fmtIST(a.publishedAt)}</span>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-accent hover:underline"
                  >
                    Open original source <span aria-hidden>↗</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology / limitations */}
        <section>
          <div className="label mb-2">Methodology &amp; limitations</div>
          <div className="card bg-surface-2 p-5 prose-measure">
            <p className="text-[14.5px] font-semibold text-ink">IFA does not claim algorithmic neutrality.</p>
            <ul className="mt-3 flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink-2">
              <li>Clustering is deterministic (title tokens + geography + event type + time window) and can group or split events incorrectly.</li>
              <li>Geographic classification is rule-based and explainable, but conservative — some Tamil Nadu items may be filed under India, and vice versa.</li>
              <li>Evidence role and verification status describe the <em>kind</em> and <em>corroboration</em> of a source, not its politics or its accuracy.</li>
              <li>CAP severity / urgency / certainty are the issuing authority&rsquo;s values, preserved verbatim.</li>
              <li>&ldquo;Common ground&rdquo; is only shown when it can be derived from explicit shared official facts.</li>
              <li>For any emergency, the issuing authority&rsquo;s own channel is the source of record — not IFA.</li>
            </ul>
            <p className="mt-4 ui text-[12px] text-ink-3">
              Full methodology: <Link href="/about" className="text-accent hover:underline">/about</Link>.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-10 border-t border-rule pt-4">
        <Link href="/" className="ui text-[13px] font-semibold text-accent hover:underline">
          <span aria-hidden>←</span> Back to the live feed
        </Link>
      </div>
    </article>
  );
}

function Field({ k, v, span }: { k: string; v: string; span?: boolean }) {
  return (
    <div className={cn(span && "sm:col-span-2")}>
      <span className="text-ink-3">{k}: </span>
      <span className="text-ink">{v}</span>
    </div>
  );
}

export { EVIDENCE_ROLE_LABEL, LIFECYCLE_LABEL, VERIFICATION_LABEL };
