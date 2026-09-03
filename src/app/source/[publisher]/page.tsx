import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { dataset, istTimestamp } from "@/lib/live/dataset";
import { PUBLISHERS, publisherByName } from "@/data/publishers";
import { describePublisher, buildSourceFamilies } from "@/lib/media-landscape/publishers";
import { computePublisherObserved } from "@/lib/media-landscape/observed";
import { sampleBandLabel } from "@/lib/media-landscape/alignment";
import { cn } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHERS.map((p) => ({ publisher: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ publisher: string }> }): Promise<Metadata> {
  const { publisher } = await params;
  const entry = PUBLISHERS.find((p) => p.id === publisher);
  if (!entry) return { title: "Source not found" };
  return {
    title: `${entry.name} — source profile`,
    description: `Ownership, funding, and IFFA-observed coverage metrics for ${entry.name}.`,
  };
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2 ui text-[13px] sm:grid-cols-[190px_1fr] sm:gap-4">
      <span className="font-semibold text-ink-3">{k}</span>
      <span className="break-words text-ink">{v}</span>
    </div>
  );
}

export default async function SourceProfile({ params }: { params: Promise<{ publisher: string }> }) {
  const { publisher } = await params;
  const entry = PUBLISHERS.find((p) => p.id === publisher);
  if (!entry) notFound();

  const profile = describePublisher(entry.name, dataset);
  const observed = computePublisherObserved(entry.name, dataset, "all");
  const family = buildSourceFamilies(dataset).find((f) => f.id === profile.sourceFamilyId);
  const familyMembers = (family?.publisherIds ?? [])
    .map((id) => PUBLISHERS.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n && n !== entry.name);

  const own = entry.ownership;
  const methodologyLink = (
    <Link href="/methodology" className="text-accent hover:underline">
      methodology
    </Link>
  );

  return (
    <article className="min-w-0 pb-8 [overflow-wrap:anywhere]">
      <nav className="ui mb-4 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
        <Link href="/sources" className="link-quiet hover:text-accent">Sources</Link>
        <span aria-hidden>/</span>
        <span className="text-ink-2">{entry.name}</span>
      </nav>

      <header className="border-b-2 border-ink/80 pb-4">
        <h1 className="font-serif text-[27px] font-semibold leading-tight sm:text-[32px]">{entry.name}</h1>
        <p className="ui mt-1 text-[13px] text-ink-3">
          {entry.domain} · {profile.languages.map((l) => (l === "ta" ? "Tamil" : l === "en" ? "English" : l)).join(", ")} ·{" "}
          {profile.regions.join(", ")}
          {profile.firstSeenAt && ` · first seen ${istTimestamp(profile.firstSeenAt)}`}
        </p>
        <p className="ui mt-1 text-[12px] text-ink-3">
          <span className="mono text-ink">{profile.articleCount}</span> articles in the current snapshot
        </p>
      </header>

      {/* ── Ownership ─────────────────────────────────────────────── */}
      <section className="mt-6">
        <div className="label mb-1">Ownership</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">Who owns {entry.name}</h2>
        <div className="mt-3 card divide-y divide-rule px-4">
          <Row k="Category" v={<span className="font-semibold">{own.category.replace(/_/g, " ")}</span>} />
          {own.owner && <Row k="Owner" v={own.owner} />}
          {own.parent && <Row k="Parent" v={own.parent} />}
          {own.ultimateParent && <Row k="Ultimate parent" v={own.ultimateParent} />}
          <Row k="Funding" v={own.fundingType.replace(/-/g, " ")} />
          <Row
            k="Source"
            v={
              <>
                {own.provenance.source}
                {own.provenance.url && (
                  <>
                    {" "}
                    <a href={own.provenance.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      ↗
                    </a>
                  </>
                )}
                <span className="ml-1 text-ink-3">
                  (verified {own.provenance.verifiedAt}, confidence: {own.provenance.confidence})
                </span>
                {own.provenance.note && <span className="block mt-0.5 text-ink-3">{own.provenance.note}</span>}
              </>
            }
          />
        </div>
        <p className="ui mt-2 text-[11.5px] text-ink-3">
          Ownership is metadata. IFFA does not use it to determine a publisher&rsquo;s alignment or reliability,
          and never infers it — see {methodologyLink}.
        </p>
      </section>

      {/* ── Source family ────────────────────────────────────────── */}
      {familyMembers.length > 0 && (
        <section className="mt-6">
          <div className="label mb-1">Source family</div>
          <p className="ui text-[13px] text-ink-2">
            Shares a corporate owner with{" "}
            {familyMembers.map((m, i) => (
              <span key={m}>
                {i > 0 && ", "}
                <Link href={`/source/${publisherByName(m)?.id}`} className="text-accent hover:underline">
                  {m}
                </Link>
              </span>
            ))}
            . IFFA counts publishers in one family as a single independent source.
          </p>
        </section>
      )}

      {/* ── External ratings ─────────────────────────────────────── */}
      <section className="mt-6">
        <div className="label mb-1">External ratings</div>
        {entry.externalRatings.length === 0 ? (
          <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
            No external bias / factuality rating is on record for {entry.name}. IFFA has not integrated an
            external rating provider for this publisher — it shows &ldquo;no rating on record&rdquo; rather than a guess.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entry.externalRatings.map((r, i) => (
              <li key={i} className="card p-4 ui text-[13px]">
                <p className="font-semibold text-ink">
                  {r.provider}: {r.rating}
                  {r.factuality && ` · factuality ${r.factuality}`}
                </p>
                {r.scale && <p className="mt-0.5 text-ink-3">Scale: {r.scale}</p>}
                <p className="mt-0.5 text-ink-3">
                  Recorded {r.recordedAt}
                  {r.methodologyUrl && (
                    <>
                      {" · "}
                      <a href={r.methodologyUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        provider methodology ↗
                      </a>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="ui mt-2 text-[11.5px] text-ink-3">
          External ratings are kept separate from IFFA&rsquo;s own observed metrics below — they are never blended.
        </p>
      </section>

      {/* ── IFFA observed metrics ────────────────────────────────── */}
      <section className="mt-6">
        <div className="label mb-1">IFFA observed metrics</div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">What {entry.name}&rsquo;s published coverage shows</h2>
        <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
          Window: <strong>current snapshot</strong> ({istTimestamp(observed.computedAt)}) · sample:{" "}
          <strong>n = {observed.politicalArticles}</strong> evaluable political stories (
          {sampleBandLabel(observed.sample.band)}) · {methodologyLink}. {observed.note}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Articles (snapshot)" v={observed.totalArticles} />
          <Stat label="Political stories" v={observed.politicalArticles} />
          <Stat
            label="Headline sensationalism"
            v={observed.sensationalismRate == null ? "—" : `${Math.round(observed.sensationalismRate * 100)}%`}
          />
          <Stat
            label="Primary-source usage"
            v={observed.primarySourceUsage == null ? "—" : `${Math.round(observed.primarySourceUsage * 100)}%`}
          />
        </div>

        {observed.entityStance.length > 0 ? (
          <div className="mt-4 card w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <caption className="px-4 pt-3 text-left label text-[10px]">
                Coverage stance by political entity — observed published coverage, not a claim about motive
              </caption>
              <thead>
                <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                  <th className="px-3 py-2 font-semibold">Entity</th>
                  <th className="px-3 py-2 font-semibold">n</th>
                  <th className="px-3 py-2 font-semibold">Supportive</th>
                  <th className="px-3 py-2 font-semibold">Neutral</th>
                  <th className="px-3 py-2 font-semibold">Critical</th>
                  <th className="px-3 py-2 font-semibold">Mixed / unclear</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {observed.entityStance.map((e) => {
                  const pct = (x: number) => (e.n ? `${Math.round((x / e.n) * 100)}%` : "—");
                  return (
                    <tr key={e.entityId} className={cn(e.n < 5 && "text-ink-3")}>
                      <td className="px-3 py-2 ui text-[12.5px] font-semibold">{e.entityName}</td>
                      <td className="px-3 py-2 mono text-[12px]">{e.n}</td>
                      <td className="px-3 py-2 mono text-[12px]">{pct(e.supportive)}</td>
                      <td className="px-3 py-2 mono text-[12px]">{pct(e.neutralDescriptive)}</td>
                      <td className="px-3 py-2 mono text-[12px]">{pct(e.critical)}</td>
                      <td className="px-3 py-2 mono text-[12px]">{pct(e.mixed + e.unclear)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">
            Insufficient data — {entry.name} has too few political stories in the current snapshot to observe a
            coverage stance.
          </p>
        )}

        {Object.keys(observed.topics).length > 0 && (
          <div className="mt-4">
            <div className="label mb-1 text-[10px]">Topics covered (snapshot)</div>
            <p className="ui text-[12.5px] text-ink-2">
              {Object.entries(observed.topics)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k} ${v}`)
                .join(" · ")}
            </p>
          </div>
        )}
      </section>

      <div className="mt-8 border-t border-rule pt-4">
        <Link href="/source/compare" className="ui text-[13px] font-semibold text-accent hover:underline">
          Compare sources →
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div className="card p-3">
      <div className="mono text-[17px] font-semibold text-ink">{v}</div>
      <div className="ui text-[10.5px] leading-snug text-ink-3">{label}</div>
    </div>
  );
}
