import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  clusterBySlug,
  clusterArticles,
  routableClusters,
  allRoutableClusters,
  istTimestamp,
  clusterLabel,
  EVIDENCE_ROLE_LABEL,
  LIFECYCLE_LABEL,
  VERIFICATION_LABEL,
} from "@/lib/live/dataset";
import { briefsForCluster, perspectiveForCluster } from "@/lib/live/brief-view";
import { CRISIS_TYPE_LABEL } from "@/lib/live/crisis";
import { trendRoutableSlugs } from "@/lib/live/trends-view";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { StoryTimeline } from "@/components/iffa/story-timeline";
import { TrendWhy } from "@/components/iffa/trend-why";
import { VerificationBadge, LifecycleBadge } from "@/components/live/badges";
import { ClaimsPanel, type ArticleRef } from "@/components/live/claims-panel";
import { cn } from "@/lib/format";
import { Brief } from "@/components/media/brief";
import { StoryTabs, type StoryTab } from "@/components/media/story-tabs";
import { CoverageLandscapePanel } from "@/components/media/coverage-landscape";
import { BlindspotPanel, BlindspotBadge } from "@/components/media/blindspot-panel";
import { HeadlineComparison } from "@/components/media/headline-comparison";
import { EvidenceMatrix, EvidenceProfilePanel } from "@/components/media/evidence-matrix";
import { FullCoverage, type FullCoverageRow } from "@/components/media/full-coverage";
import { DiscoursePanel } from "@/components/media/discourse-panel";
import { PerspectivePanel } from "@/components/media/perspective";
import { ReferencesPanel } from "@/components/media/references-panel";
import { AlignmentBar } from "@/components/media/alignment-bar";
import { publisherByName, publisherSlug } from "@/data/publishers";
import { readStance } from "@/lib/media-landscape/stance";
import { primaryEntity } from "@/lib/media-landscape/entities";
import { familyIndex } from "@/lib/media-landscape/publishers";

export const dynamicParams = false;

export function generateStaticParams() {
  // Every in-scope cluster gets a page. On a static site any surface that links
  // a `/story/<slug>` — the media-landscape "most disputed" list, the quality
  // dashboard's top-events table, the situation bar — must resolve, so the
  // routable set is simply "has a slug and is not out-of-scope" rather than a
  // hand-maintained union of the feed queries.
  const slugs = new Set<string>();
  for (const c of routableClusters()) slugs.add(c.slug);
  for (const s of trendRoutableSlugs()) slugs.add(s);
  for (const c of allRoutableClusters()) slugs.add(c.slug);
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = clusterBySlug(slug);
  if (!c) return { title: "Story not found" };
  const { en } = briefsForCluster(c);
  const lead = en.shortVersion[0]?.text;
  const cov = c.trendData?.mediaLandscape?.coverage;
  return {
    title: c.title,
    description:
      lead ??
      (cov
        ? `${cov.uniquePublishers} sources · ${cov.independentSourceFamilies} independent families · Tamil ${cov.tamilCount} / English ${cov.englishCount}.`
        : `${clusterLabel(c).tag} — ${c.distinctPublishers} publisher(s).`),
  };
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
  const ml = cluster.trendData?.mediaLandscape;

  const { en: brief, ta: tamilBrief } = briefsForCluster(cluster);
  const perspective = perspectiveForCluster(cluster);

  const articleRefs: ArticleRef[] = articles.map((a) => ({
    id: a.id,
    publisher: a.publisher,
    sourceName: a.sourceName,
    url: a.url,
    title: a.title,
    publishedAt: a.publishedAt,
  }));
  const articlePub: Record<string, string> = Object.fromEntries(articles.map((a) => [a.id, a.publisher]));
  const fams = familyIndex();
  const entity = primaryEntity(articles.map((a) => a.title));

  const rows: FullCoverageRow[] = articles.map((a) => {
    const p = publisherByName(a.publisher);
    const s = readStance(`${a.title}. ${a.excerpt ?? ""}`, entity);
    return {
      articleId: a.id,
      publisher: a.publisher,
      publisherSlug: publisherSlug(a.publisher),
      headline: a.title,
      publishedAt: a.publishedAt,
      language: a.language,
      locality: a.districts[0] ?? (a.scope === "tamil-nadu" ? "Tamil Nadu" : a.scope === "india" ? "India" : "—"),
      sourceFamily: fams.get(a.publisher) ?? "unaffiliated",
      ownership: p?.ownership.category ?? "UNKNOWN",
      externalFactuality: p?.externalRatings?.[0]?.factuality ?? "no rating on record",
      observedAlignment: "insufficient data",
      stance: s.stance,
      role: a.role,
      url: a.url,
    };
  });

  // ── coverage-at-a-glance (always visible, under the brief) ────────────
  const coverageGlance = ml ? (
    <div className="card p-4">
      <div className="label mb-1.5 text-[10px]">Coverage at a glance</div>
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 ui text-[13px] text-ink-2">
        <span><span className="mono text-ink">{ml.coverage.uniquePublishers}</span> sources</span>
        <span><span className="mono text-ink">{ml.coverage.independentSourceFamilies}</span> independent families</span>
        <span>Tamil <span className="mono text-ink">{ml.coverage.tamilCount}</span> · English <span className="mono text-ink">{ml.coverage.englishCount}</span></span>
        <span><span className="mono text-ink">{ml.coverage.officialCount}</span> official</span>
        <span><span className="mono text-ink">{ml.evidenceProfile.primaryDocumentSupported}</span> primary-doc backed</span>
      </div>
      <div className="mt-3">
        <div className="label mb-1 text-[10px]">Coverage alignment</div>
        <AlignmentBar groups={ml.coverage.alignment} reason={ml.coverage.alignmentUnavailableReason} />
      </div>
      <div className="mt-3">
        <BlindspotBadge blindspots={ml.blindspots} />
      </div>
    </div>
  ) : (
    <div className="card p-4 ui text-[13px] text-ink-2">
      <span className="mono text-ink">{cluster.distinctPublishers}</span> publisher{cluster.distinctPublishers === 1 ? "" : "s"} ·{" "}
      {articles.filter((a) => a.language === "ta").length} Tamil · {articles.filter((a) => a.language === "en").length} English
    </div>
  );

  const capBox = cluster.cap ? (
    <div>
      <div className="label mb-2">Official alert — as issued</div>
      <div className="card grid grid-cols-1 gap-x-6 gap-y-1.5 bg-surface-2 p-4 ui text-[13px] sm:grid-cols-2">
        {cluster.cap.event && <Field k="Event" v={cluster.cap.event} />}
        {cluster.cap.senderName && <Field k="Issuing authority" v={cluster.cap.senderName} />}
        {cluster.cap.severity && <Field k="Severity" v={cluster.cap.severity} />}
        {cluster.cap.certainty && <Field k="Certainty" v={cluster.cap.certainty} />}
        {cluster.cap.effectiveFrom && <Field k="Effective from" v={fmtIST(cluster.cap.effectiveFrom)} />}
        {cluster.cap.effectiveUntil && <Field k="Effective until" v={fmtIST(cluster.cap.effectiveUntil)} />}
        {cluster.cap.areaDescription && <Field k="Stated area" v={cluster.cap.areaDescription} span />}
      </div>
      <p className="ui mt-2 text-[11.5px] text-ink-3">Reproduced from the issuing authority&rsquo;s alert, unmodified by IFFA.</p>
    </div>
  ) : null;

  // ── tabs ─────────────────────────────────────────────────────────────
  const evidenceTab = (
    <div className="flex flex-col gap-5">
      {ml && <EvidenceProfilePanel profile={ml.evidenceProfile} strength={ml.evidenceStrength} />}
      {ml && ml.evidence.length > 0 ? (
        <EvidenceMatrix matrix={ml.evidence} articlePub={articlePub} />
      ) : ec && ec.claims.length > 0 ? (
        <ClaimsPanel ec={ec} articles={articleRefs} />
      ) : (
        <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
          IFFA did not extract a structured claim for this story — usually a single short report.
        </p>
      )}
      {ec && ec.evidence.length > 0 && (
        <div>
          <div className="label mb-2">Primary records retrieved ({ec.evidence.length})</div>
          <ul className="flex flex-col gap-2.5">
            {ec.evidence.map((e) => (
              <li key={e.id} className="card bg-evidence-bg p-4 ui text-[13px]">
                <p className="font-semibold text-ink">{e.title}</p>
                <p className="mt-0.5 text-ink-3">
                  {e.publisher}
                  {e.publishedAt ? ` · ${fmtIST(e.publishedAt)}` : ""}
                </p>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                  Open the record ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const tabs: StoryTab[] = [];
  if (perspective.hasContrast || perspective.sharedFactualCore.length > 0) {
    tabs.push({ id: "perspectives", label: "Perspectives", content: <PerspectivePanel pc={perspective} /> });
  }
  tabs.push({
    id: "evidence",
    label: "Evidence",
    count: ml?.evidenceProfile.substantiveClaims,
    content: evidenceTab,
  });
  if (ml) {
    tabs.push({
      id: "headlines",
      label: "Headlines",
      content: <HeadlineComparison framing={ml.framing} articlePub={articlePub} />,
    });
    tabs.push({
      id: "landscape",
      label: "Media landscape",
      content: (
        <div className="flex flex-col gap-8">
          <CoverageLandscapePanel cov={ml.coverage} />
          <BlindspotPanel blindspots={ml.blindspots} />
        </div>
      ),
    });
  }
  tabs.push({ id: "coverage", label: "Full coverage", count: articles.length, content: <FullCoverage rows={rows} /> });
  tabs.push({ id: "timeline", label: "Timeline", content: <StoryTimeline cluster={cluster} articles={articles} /> });
  tabs.push({ id: "references", label: "References", count: brief.references.length, content: <ReferencesPanel references={brief.references} /> });
  if (ml && ml.discourse.length > 0) {
    tabs.push({
      id: "discourse",
      label: "Public discourse",
      count: ml.discourse.length,
      content: <DiscoursePanel mentions={ml.discourse} />,
    });
  }

  return (
    <article className="min-w-0 pb-6 [overflow-wrap:anywhere]">
      <AnalyticsBeacon
        event="story_open"
        payload={{
          slug: cluster.slug,
          category: cluster.trendData?.category ?? null,
          scope: cluster.scope,
          briefState: brief.withheldReason ? "withheld" : "delivered",
          genuineFamilies: ml?.coverage.independentSourceFamilies ?? 0,
        }}
      />
      <nav className="ui mb-4 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
        <Link href="/" className="link-quiet hover:text-accent">Home</Link>
        <span aria-hidden>/</span>
        <span className="text-ink-2">{scopeLabel}</span>
        <span aria-hidden>/</span>
        <span className="text-ink-2">{kind}</span>
      </nav>

      <header className="border-b-2 border-ink/80 pb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ui text-[12px] text-ink-3">
          <span className="label">{kind}</span>
          <span>{scopeLabel}</span>
          {brief.place && <><span className="text-rule-strong">·</span><span>{brief.place}</span></>}
          <span className="text-rule-strong">·</span>
          <span>Updated {istTimestamp(cluster.updatedAt)}</span>
        </div>
        <h1 className="mt-2.5 max-w-4xl break-words font-serif text-[24px] font-semibold leading-[1.18] tracking-tight sm:text-[31px]">
          {cluster.title}
        </h1>

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
          {ml && (
            <span className="ui text-[12px] text-ink-2">
              <strong className="mono text-ink">{ml.coverage.uniquePublishers}</strong> sources ·{" "}
              <strong className="mono text-ink">{ml.coverage.independentSourceFamilies}</strong> independent families
            </span>
          )}
        </div>

        {cluster.districts.length > 0 && (
          <p className="mt-2 ui text-[12.5px] text-ink-2">Districts referenced: {cluster.districts.join(", ")}</p>
        )}
      </header>

      <div className="mt-5 flex flex-col gap-5">
        <Brief brief={brief} tamil={tamilBrief ?? null} />
        {coverageGlance}
        {capBox}

        {cluster.trendData?.trend && (
          <details className="max-w-2xl">
            <summary className="ui cursor-pointer text-[12px] font-semibold text-ink-3 hover:text-accent">
              Why is this story prominent? — editorial ranking
            </summary>
            <div className="mt-2">
              <TrendWhy cluster={cluster} open />
            </div>
          </details>
        )}
      </div>

      <div className="mt-6 min-w-0">
        <StoryTabs tabs={tabs} />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
        <Link href="/" className="ui text-[13px] font-semibold text-accent hover:underline">
          <span aria-hidden>←</span> Back to top stories
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

function Field({ k, v, span }: { k: string; v: string; span?: boolean }) {
  return (
    <div className={cn("break-words", span && "sm:col-span-2")}>
      <span className="text-ink-3">{k}: </span>
      <span className="text-ink">{v}</span>
    </div>
  );
}

export { EVIDENCE_ROLE_LABEL, LIFECYCLE_LABEL, VERIFICATION_LABEL };
