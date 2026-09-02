import type { Metadata } from "next";
import Link from "next/link";
import { FEED_SOURCES, DESCRIBED_FEEDS, CANDIDATE_FEEDS } from "@/data/feeds";
import { CATEGORY_LABEL } from "@/lib/domain/categories";
import { dataset, istTimestamp } from "@/lib/live/dataset";

const AUTHORITY_LABEL: Record<string, string> = {
  "primary-authority": "Primary authority",
  "accredited-media": "Accredited media",
  specialist: "Specialist",
  aggregator: "Aggregator",
};

export const metadata: Metadata = {
  title: "Sources",
  description: "The public RSS / CAP feeds IFFA ingests for the India / Tamil Nadu live edition, with their current status.",
};

const KIND_LABEL: Record<string, string> = {
  rss: "RSS",
  atom: "Atom",
  "sachet-json": "CAP / JSON",
};

interface PublisherRow {
  publisher: string;
  domains: string[];
  official: boolean;
  languages: string[];
  scopes: string[];
  articleCount: number;
  comparisonCount: number;
  possibleSyndicated: number;
  lastIngested: string | null;
  feedStatuses: { name: string; status: string }[];
}

function publisherRows(): PublisherRow[] {
  const byPublisher = new Map<string, PublisherRow>();
  const feedsByPublisher = new Map<string, typeof FEED_SOURCES>();
  for (const f of FEED_SOURCES) {
    const list = feedsByPublisher.get(f.publisher) ?? [];
    list.push(f);
    feedsByPublisher.set(f.publisher, list);
  }
  const statusById = new Map(dataset.feeds.map((s) => [s.sourceId, s]));

  for (const [publisher, feeds] of feedsByPublisher) {
    const arts = dataset.articles.filter((a) => a.publisher === publisher);
    const enabledFeeds = feeds.filter((f) => f.enabled);
    // Only surface a publisher IFFA actually ingests.
    if (enabledFeeds.length === 0 && arts.length === 0) continue;
    const comparisons = dataset.clusters.filter(
      (c) => c.isVerifiedComparison && c.publishers.includes(publisher),
    );
    const syndicated = dataset.clusters
      .filter((c) => c.claims && c.publishers.includes(publisher))
      .reduce((n, c) => n + (c.claims?.independence.possibleSyndicated ?? 0), 0);
    const lastTimes = enabledFeeds
      .map((f) => statusById.get(f.id)?.lastSuccessAt)
      .filter(Boolean)
      .sort() as string[];

    byPublisher.set(publisher, {
      publisher,
      domains: [...new Set(feeds.map((f) => new URL(f.homepage).hostname))],
      official: feeds.some((f) => f.official),
      languages: [...new Set(arts.map((a) => (a.language === "ta" ? "Tamil" : a.language === "en" ? "English" : "—")).filter((x) => x !== "—"))],
      scopes: [...new Set(arts.map((a) => a.scope).filter((s) => s !== "excluded"))],
      articleCount: arts.length,
      comparisonCount: comparisons.length,
      possibleSyndicated: syndicated,
      lastIngested: lastTimes.length ? lastTimes[lastTimes.length - 1]! : null,
      feedStatuses: enabledFeeds.map((f) => ({ name: f.name, status: statusById.get(f.id)?.status ?? "not run" })),
    });
  }
  return [...byPublisher.values()].sort((a, b) => b.articleCount - a.articleCount);
}

export default function SourcesPage() {
  const statusById = new Map(dataset.feeds.map((f) => [f.sourceId, f]));
  const publishers = publisherRows();

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-rule-strong pb-5">
        <p className="label">Directory</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-tight sm:text-[36px]">Sources</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          IFFA ingests publicly accessible RSS / Atom / CAP feeds. It stores only the feed&rsquo;s
          own headline, timestamp, short excerpt, canonical URL and structured alert metadata,
          always attributes the publisher, and always links out to the original report. It does
          not copy full articles or bypass access controls.
        </p>
        <p className="mt-3 ui text-[12px] text-ink-3">
          Feed status as of the last run — {istTimestamp(dataset.generatedAt)}.
        </p>
      </header>

      <section>
        <div className="mb-3 border-b border-rule-strong pb-2">
          <div className="label mb-1">Publishers</div>
          <h2 className="font-serif text-[19px] font-semibold text-ink">Who IFFA ingests, and how much</h2>
          <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
            Verified metadata only — article counts, languages and comparison appearances are measured
            from the current snapshot. IFFA does not record ownership or political-orientation metadata.
          </p>
        </div>
        <div className="card w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Publisher</th>
                <th className="px-4 py-2.5 font-semibold">Kind</th>
                <th className="px-4 py-2.5 font-semibold">Languages</th>
                <th className="px-4 py-2.5 font-semibold">Articles</th>
                <th className="px-4 py-2.5 font-semibold">In comparisons</th>
                <th className="px-4 py-2.5 font-semibold">Poss. syndicated</th>
                <th className="px-4 py-2.5 font-semibold">Last ingested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {publishers.map((p) => (
                <tr key={p.publisher} className="align-top">
                  <td className="px-4 py-3">
                    <div className="ui text-[13.5px] font-semibold text-ink">{p.publisher}</div>
                    <div className="ui text-[11.5px] text-ink-3">{p.domains.join(", ")}</div>
                  </td>
                  <td className="px-4 py-3 ui text-[12.5px] text-ink-2">{p.official ? "Official / primary" : "Independent"}</td>
                  <td className="px-4 py-3 ui text-[12.5px] text-ink-2">{p.languages.join(", ") || "—"}</td>
                  <td className="px-4 py-3 mono text-[13px] text-ink">{p.articleCount}</td>
                  <td className="px-4 py-3 mono text-[13px] text-ink">{p.comparisonCount}</td>
                  <td className="px-4 py-3 mono text-[13px] text-ink-2">{p.possibleSyndicated}</td>
                  <td className="px-4 py-3 ui text-[11.5px] text-ink-3">{p.lastIngested ? istTimestamp(p.lastIngested) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 border-b border-rule-strong pb-2">
          <div className="label mb-1">Registry</div>
          <h2 className="font-serif text-[19px] font-semibold text-ink">Configured feeds</h2>
          <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
            Each feed is typed by <strong>authority class</strong> (primary authority vs accredited
            media vs specialist), <strong>source type</strong>, the news <strong>domains</strong> it
            covers and an advisory poll cadence. No numeric &ldquo;trust score&rdquo; is assigned to
            any publisher — reliability is contextual (evidence role + the independence engine).
          </p>
        </div>
        <div className="card w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule-strong bg-surface-2 ui text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Source</th>
                <th className="px-4 py-2.5 font-semibold">Authority</th>
                <th className="px-4 py-2.5 font-semibold">Kind</th>
                <th className="px-4 py-2.5 font-semibold">Covers</th>
                <th className="px-4 py-2.5 font-semibold">Poll</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {DESCRIBED_FEEDS.map((f) => {
                const st = statusById.get(f.id);
                const status = !f.enabled ? "disabled" : (st?.status ?? "not run");
                return (
                  <tr key={f.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="ui text-[13.5px] font-semibold text-ink">{f.name}</div>
                      <a
                        href={f.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ui text-[12px] text-accent hover:underline"
                      >
                        {new URL(f.homepage).hostname} <span aria-hidden>↗</span>
                      </a>
                      {f.note && <p className="mt-1 ui text-[11.5px] leading-snug text-ink-3">{f.note}</p>}
                    </td>
                    <td className="px-4 py-3 ui text-[12px] text-ink-2">
                      {AUTHORITY_LABEL[f.authorityClass]}
                      <div className="text-[11px] text-ink-3">{f.region}</div>
                    </td>
                    <td className="px-4 py-3 ui text-[12px] text-ink-2">{KIND_LABEL[f.kind] ?? f.kind}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {f.categorySupport.map((c) => (
                          <span key={c} className="pill text-ink-3">{CATEGORY_LABEL[c]}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 mono text-[12px] text-ink-3">{f.pollIntervalMinutes}m</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "ui text-[12px] font-semibold " +
                          (status === "ok"
                            ? "text-agree"
                            : status === "stale"
                              ? "text-caution"
                              : status === "disabled"
                                ? "text-ink-3"
                                : "text-dispute")
                        }
                      >
                        {status === "ok" ? "responding" : status}
                      </span>
                      {st?.error && status !== "ok" && (
                        <p className="mt-0.5 ui text-[11px] text-ink-3">{st.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 mono text-[13px] text-ink">{st?.itemCount ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 border-b border-rule-strong pb-2">
          <div className="label mb-1">Discovery</div>
          <h2 className="font-serif text-[19px] font-semibold text-ink">Feeds under investigation</h2>
          <p className="ui mt-1 text-[12px] leading-relaxed text-ink-3">
            Candidate public / official feeds for finance, politics and sports coverage. Enabled
            only after automated validation confirms a reachable, parseable document. IFFA never
            bypasses paywalls, CAPTCHAs, authentication or rate limits.
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {CANDIDATE_FEEDS.map((c) => (
            <li key={c.id} className="card flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
              <span className="ui text-[13px] font-semibold text-ink">{c.publisher}</span>
              <span className="pill text-ink-3">{CATEGORY_LABEL[c.category]}</span>
              <span
                className={
                  "ui text-[11.5px] font-semibold " +
                  (c.status === "to-validate" ? "text-caution" : "text-ink-3")
                }
              >
                {c.status}
              </span>
              <span className="ui w-full text-[11.5px] leading-snug text-ink-3">{c.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="ui text-[12.5px] text-ink-3">
        Evidence-role and verification labels are explained in the{" "}
        <Link href="/about" className="text-accent hover:underline">methodology</Link>. Synthetic
        publications used only in the{" "}
        <Link href="/methodology/examples" className="text-accent hover:underline">
          methodology demonstrations
        </Link>{" "}
        are listed there, not here.
      </p>
    </div>
  );
}
