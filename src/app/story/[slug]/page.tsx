import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  clusterBySlug,
  clusterArticles,
  routableClusters,
  istTimestamp,
  clusterLabel,
  EVIDENCE_ROLE_LABEL,
  LIFECYCLE_LABEL,
  VERIFICATION_LABEL,
} from "@/lib/live/dataset";
import { CRISIS_TYPE_LABEL } from "@/lib/live/crisis";
import { EvidenceRoleBadge, VerificationBadge, LifecycleBadge } from "@/components/live/badges";
import { ClaimsPanel, type ArticleRef } from "@/components/live/claims-panel";
import { CONFIDENCE_LABEL } from "@/lib/claims/confidence";
import { cn } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return routableClusters().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = clusterBySlug(slug);
  if (!c) return { title: "Story not found" };
  return { title: c.title, description: `${clusterLabel(c).tag} — ${c.distinctPublishers} publisher(s).` };
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
  const label = clusterLabel(cluster);
  const ec = cluster.claims;
  const articleRefs: ArticleRef[] = articles.map((a) => ({
    id: a.id,
    publisher: a.publisher,
    sourceName: a.sourceName,
    url: a.url,
    title: a.title,
    publishedAt: a.publishedAt,
  }));

  return (
    <article className="min-w-0 pb-6 [overflow-wrap:anywhere]">
      <nav className="ui mb-4 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
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
        <h1 className="mt-2.5 max-w-4xl break-words font-serif text-[24px] font-semibold leading-[1.18] tracking-tight sm:text-[31px]">
          {cluster.title}
        </h1>
        <p className="ui mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-3">
          Working title taken from the sources below. IFFA does not write its own prose account of the event —
          it structures what the sources say and shows where each claim came from.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "pill",
              label.kind === "coverage-comparison"
                ? "text-agree bg-agree-bg"
                : label.kind === "official-alert"
                  ? "text-dispute bg-dispute-bg"
                  : "text-ink-3 bg-surface-2",
            )}
          >
            {label.tag}
          </span>
          {cluster.isCrisis && <LifecycleBadge lifecycle={cluster.lifecycle} />}
          <VerificationBadge status={cluster.verificationStatus} />
          <span className="ui text-[12px] text-ink-2">
            <strong className="mono text-ink">{cluster.distinctPublishers}</strong> publishers ·{" "}
            <strong className="mono text-ink">{cluster.officialCount}</strong> official ·{" "}
            <strong className="mono text-ink">{cluster.independentCount}</strong> independent
          </span>
        </div>

        {cluster.districts.length > 0 && (
          <p className="mt-2 ui text-[12.5px] text-ink-2">Districts referenced: {cluster.districts.join(", ")}</p>
        )}

        {cluster.distinctPublishers > 1 && (
          <p className="mt-2 ui text-[12px] leading-snug text-ink-3">
            <span className={cn("font-semibold", cluster.confidence === "strong" ? "text-agree" : cluster.confidence === "probable" ? "text-caution" : "text-ink-3")}>
              {cluster.isVerifiedComparison ? `${cluster.confidence === "strong" ? "Strong" : "Probable"} match` : "Weak match"}
            </span>{" "}
            — {cluster.reason}
            {!cluster.isVerifiedComparison && " These reports are shown separately below rather than as a verified comparison."}
          </p>
        )}
      </header>

      <div className="mt-6 flex min-w-0 flex-col gap-10">
        {/* ── Epistemic status — the claim layer ─────────────────────── */}
        {ec && ec.claims.length > 0 ? (
          <section>
            <div className="mb-4 border-b border-rule-strong pb-2">
              <div className="label mb-1">Grounded claim intelligence</div>
              <h2 className="font-serif text-[20px] font-semibold text-ink">What the reporting establishes</h2>
              <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
                Each statement below is a structured claim, not a quote lifted as fact. Tap any claim
                for its sources, corroboration, primary evidence and the reason for its status.
              </p>
            </div>
            <ClaimsPanel ec={ec} articles={articleRefs} />
          </section>
        ) : (
          <section>
            <div className="label mb-2">Claim analysis</div>
            <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
              IFFA did not extract a structured claim for this event — usually because it is a single
              short report. The source reporting is listed below.
            </p>
          </section>
        )}

        {/* ── Primary evidence ───────────────────────────────────────── */}
        {ec && ec.evidence.length > 0 && (
          <section>
            <div className="mb-3 border-b border-rule-strong pb-2">
              <div className="label mb-1">Primary evidence</div>
              <h2 className="font-serif text-[19px] font-semibold text-ink">
                Official records retrieved for this event ({ec.evidence.length})
              </h2>
              <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
                Direct evidence — not journalism about it. Only records actually retrieved are shown;
                IFFA never invents a government source.
              </p>
            </div>
            <ul className="flex flex-col gap-2.5">
              {ec.evidence.map((e) => (
                <li key={e.id} className="card bg-evidence-bg p-4 ui text-[13px]">
                  <p className="font-semibold text-ink">{e.title}</p>
                  <p className="mt-0.5 text-ink-3">
                    {e.publisher}
                    {e.publishedAt ? ` · ${fmtIST(e.publishedAt)}` : ""} ·{" "}
                    {e.supportsClaimIds.length} linked claim{e.supportsClaimIds.length === 1 ? "" : "s"}
                  </p>
                  {typeof e.provenance.areaDescription === "string" && (
                    <p className="mt-1 text-ink-2">Stated area: {e.provenance.areaDescription}</p>
                  )}
                  {typeof e.provenance.severity === "string" && (
                    <p className="text-ink-2">
                      Severity {String(e.provenance.severity)}
                      {typeof e.provenance.certainty === "string" ? `, ${e.provenance.certainty}` : ""} — as issued
                    </p>
                  )}
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-accent hover:underline"
                  >
                    Open the record ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Common Ground Index (experimental) ─────────────────────── */}
        {ec?.cgi && (
          <section>
            <div className="mb-3 border-b border-rule-strong pb-2">
              <div className="label mb-1">Common Ground Index · experimental</div>
              <h2 className="font-serif text-[19px] font-semibold text-ink">
                How much the reporting agrees — {ec.cgi.score}/100
              </h2>
            </div>
            <div className="card bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      ec.cgi.band === "high" ? "bg-agree" : ec.cgi.band === "moderate" ? "bg-caution" : "bg-dispute",
                    )}
                    style={{ width: `${ec.cgi.score}%` }}
                  />
                </div>
                <span className="ui text-[12px] font-semibold text-ink-2">
                  {CONFIDENCE_LABEL[ec.cgi.band]}
                </span>
              </div>
              <p className="ui mt-2 text-[11.5px] leading-relaxed text-ink-3">
                A summary of the <em>structured evidence</em> — corroboration, primary records,
                disagreements — not of headline similarity, and never a verdict on the event itself.
                It does not use any political orientation label.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="label mb-1 text-agree">Raises agreement</div>
                  <ul className="flex flex-col gap-1 ui text-[12px] text-ink-2">
                    {ec.cgi.drivers.positive.length ? (
                      ec.cgi.drivers.positive.map((d) => <li key={d}>+ {d}</li>)
                    ) : (
                      <li className="text-ink-3">—</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="label mb-1 text-dispute">Lowers agreement</div>
                  <ul className="flex flex-col gap-1 ui text-[12px] text-ink-2">
                    {ec.cgi.drivers.negative.length ? (
                      ec.cgi.drivers.negative.map((d) => <li key={d}>– {d}</li>)
                    ) : (
                      <li className="text-ink-3">—</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Coverage / independence ────────────────────────────────── */}
        <section>
          <div className="mb-3 border-b border-rule-strong pb-2">
            <div className="label mb-1">Coverage</div>
            <h2 className="font-serif text-[19px] font-semibold text-ink">
              Publication count is not corroboration count
            </h2>
          </div>
          {ec ? (
            <div className="flex flex-col gap-3">
              {(ec.independence.label || (ec.independence.wireCredits?.length ?? 0) > 0) && (
                <p className="ui text-[12.5px] text-ink-2">
                  {ec.independence.label && (
                    <span className="font-semibold text-ink">{ec.independence.label}.</span>
                  )}{" "}
                  {(ec.independence.wireCredits?.length ?? 0) > 0 && (
                    <span>
                      Wire copy credited: {ec.independence.wireCredits!.join(", ")} — counted once, not
                      once per publication.
                    </span>
                  )}
                  {(ec.independence.unknownPairs ?? 0) > 0 && (
                    <span className="text-ink-3">
                      {" "}
                      {ec.independence.unknownPairs} source pair(s) could not be classified as
                      independent or syndicated; treated as not independent.
                    </span>
                  )}
                </p>
              )}
              <div className="card grid grid-cols-2 gap-x-4 gap-y-3 bg-surface-2 p-4 sm:grid-cols-3">
                <Metric n={ec.independence.reports} label="Reports ingested" />
                <Metric n={ec.independence.distinctPublishers} label="Distinct publishers" />
                <Metric n={ec.independence.independentGroups} label="Likely independent groups" />
                <Metric n={ec.independence.possibleSyndicated} label="Possible syndicated copies" />
                <Metric n={ec.independence.primarySources} label="Primary sources" />
              </div>
            </div>
          ) : (
            <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
              {articles.length} report{articles.length === 1 ? "" : "s"} from {cluster.distinctPublishers}{" "}
              publisher{cluster.distinctPublishers === 1 ? "" : "s"}.
            </p>
          )}

          {cluster.differences.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="ui text-[12px] leading-relaxed text-ink-3">
                Structured metadata that differs between reports — reported locations, times, headline
                emphasis, stated severity. A wording difference is not a contradiction.
              </p>
              {cluster.differences.map((d) => (
                <div key={d.field} className="card overflow-hidden">
                  <div className="border-b border-rule bg-surface-2 px-4 py-2 ui text-[12.5px] font-semibold text-ink">
                    {d.field}
                  </div>
                  <ul className="divide-y divide-rule">
                    {d.observations.map((o, i) => (
                      <li key={i} className="grid grid-cols-1 gap-0.5 px-4 py-2.5 ui text-[13px] sm:grid-cols-[180px_1fr] sm:gap-4">
                        <span className="font-semibold text-ink-2">{o.sourceName}</span>
                        <span className="break-words text-ink">{o.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Official alert metadata, verbatim ──────────────────────── */}
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
              These values are reproduced from the issuing authority&rsquo;s alert and are not modified by IFFA.
            </p>
          </section>
        )}

        {/* ── Every report ──────────────────────────────────────────── */}
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
              <div key={a.id} className="card min-w-0 p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="ui text-[13.5px] font-semibold text-ink">{a.sourceName}</span>
                  {a.language !== "unknown" && (
                    <span className="ui text-[11px] text-ink-3">{a.language === "ta" ? "தமிழ்" : "English"}</span>
                  )}
                  <span className="grow" />
                  <EvidenceRoleBadge role={a.evidenceRole} />
                  <VerificationBadge status={a.verificationStatus} />
                </div>
                <h3 className="mt-2 break-words font-serif text-[15.5px] leading-snug text-ink">{a.title}</h3>
                {a.excerpt && <p className="mt-1.5 break-words text-[13px] leading-relaxed text-ink-2">{a.excerpt}</p>}
                <p className="mt-1.5 ui text-[11.5px] text-ink-3">Geo: {a.geo.reason}</p>
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

        {/* ── Methodology / limitations ─────────────────────────────── */}
        <section>
          <div className="label mb-2">Methodology &amp; limitations</div>
          <div className="card bg-surface-2 p-5 prose-measure">
            <p className="text-[14.5px] font-semibold text-ink">IFFA does not claim algorithmic neutrality.</p>
            <ul className="mt-3 flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink-2">
              <li>Claims are extracted by deterministic rules, not a language model. Wording may not be exact — the original source text is always linked.</li>
              <li>Clustering is deterministic (entity + geography + event type + time window) and can group or split events incorrectly.</li>
              <li>An attributed statement (&ldquo;the minister said &hellip;&rdquo;) is kept as an attributed claim. Its underlying facts are only promoted if separate evidence supports them.</li>
              <li>&ldquo;Independent source groups&rdquo; is an estimate — near-identical headlines and shared verbatim passages are treated as one upstream source.</li>
              <li>Confidence is <Link href="/about" className="text-accent hover:underline">a documented formula</Link>, reported as High / Moderate / Low with a score. It is not a truth rating.</li>
              <li>The Common Ground Index is experimental and describes the state of <em>reporting</em>, not the event.</li>
              <li>For any emergency, the issuing authority&rsquo;s own channel is the source of record — not IFFA.</li>
            </ul>
          </div>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
        <Link href="/" className="ui text-[13px] font-semibold text-accent hover:underline">
          <span aria-hidden>←</span> Back to the live feed
        </Link>
        {(cluster.identity || articles.length >= 2) && (
          <Link href={`/methodology/clusters/${cluster.slug}`} className="ui text-[12px] text-ink-3 hover:text-accent">
            Why were these grouped? — cluster audit
          </Link>
        )}
      </div>
    </article>
  );
}

function Metric({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="mono text-[20px] font-semibold text-ink">{n}</div>
      <div className="ui text-[11.5px] leading-snug text-ink-3">{label}</div>
    </div>
  );
}

function Field({ k, v, span }: { k: string; v: string; span?: boolean }) {
  return (
    <div className={cn("break-words", span && "sm:col-span-2")}>
      <span className="text-ink-3">{k}: </span>
      <span className="text-ink">{v}</span>
    </div>
  );
}

export { EVIDENCE_ROLE_LABEL, LIFECYCLE_LABEL, VERIFICATION_LABEL };
