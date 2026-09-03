import Link from "next/link";
import type { LandscapeSummary } from "@/lib/media-landscape/dashboard";

function Bars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, n]) => n), 1);
  return (
    <ul className="flex flex-col gap-1.5">
      {entries.map(([k, n]) => (
        <li key={k} className="ui text-[12px]">
          <div className="flex items-center justify-between text-ink-2">
            <span className="capitalize">{k.replace(/_/g, " ").toLowerCase()}</span>
            <span className="mono text-ink-3">{n}</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-rule">
            <div className="h-full rounded-full bg-accent/60" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function List({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="label mb-1.5 text-[10px]">{title}</div>
      {children}
    </section>
  );
}

export function LandscapeDashboard({ s, scope }: { s: LandscapeSummary; scope: "India / Tamil Nadu" | "Tamil Nadu" }) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            ["Articles ingested", s.articles],
            ["Event clusters", s.clusters],
            ["Unique publishers", s.uniquePublishers],
            ["Independent families", s.independentSourceFamilies],
            ["Tamil articles", s.tamilArticles],
            ["English articles", s.englishArticles],
            ["Tamil share", `${Math.round((s.tamilArticles / Math.max(s.tamilArticles + s.englishArticles, 1)) * 100)}%`],
            ["Most-covered entity", s.topEntities[0]?.name ?? "—"],
          ].map(([k, v]) => (
            <div key={k as string} className="card p-3">
              <div className="mono text-[17px] font-semibold text-ink">{v as React.ReactNode}</div>
              <div className="ui text-[10.5px] leading-snug text-ink-3">{k as string}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <List title="Coverage by owning-entity category">
          <Bars data={s.ownershipDistribution} />
          <p className="ui mt-1.5 text-[10.5px] text-ink-3">Ownership is metadata — this is not a bias reading.</p>
        </List>
        <List title="Coverage by news domain">
          <Bars data={s.categoryDistribution} />
        </List>
      </div>

      <List title={`Most covered political entities (${scope})`}>
        {s.topEntities.length ? (
          <ul className="flex flex-wrap gap-2 ui text-[12.5px] text-ink-2">
            {s.topEntities.map((e) => (
              <li key={e.name} className="pill bg-surface-2">
                {e.name} <span className="mono text-ink-3">{e.stories}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ui text-[12.5px] text-ink-3">No political entity has enough coverage in this snapshot.</p>
        )}
      </List>

      <div className="grid gap-6 sm:grid-cols-2">
        <List title="Most asymmetrically covered stories">
          {s.mostAsymmetric.length ? (
            <ul className="flex flex-col gap-1.5">
              {s.mostAsymmetric.map((x) => (
                <li key={x.slug} className="ui text-[12.5px]">
                  <Link href={`/story/${x.slug}`} className="text-ink hover:text-accent">{x.title}</Link>
                  <span className="ml-1 text-caution">— {x.types.join(", ").toLowerCase().replace(/_/g, " ")} ({x.ratio}×)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ui text-[12.5px] text-ink-3">No significant coverage asymmetry in this snapshot.</p>
          )}
        </List>
        <List title="Most disputed stories">
          {s.mostDisputed.length ? (
            <ul className="flex flex-col gap-1.5">
              {s.mostDisputed.map((x) => (
                <li key={x.slug} className="ui text-[12.5px]">
                  <Link href={`/story/${x.slug}`} className="text-ink hover:text-accent">{x.title}</Link>
                  <span className="ml-1 mono text-dispute">{x.disputed} disputed claim(s)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ui text-[12.5px] text-ink-3">No story has a disputed claim in this snapshot.</p>
          )}
        </List>
        <List title="Most corroborated stories">
          {s.mostCorroborated.length ? (
            <ul className="flex flex-col gap-1.5">
              {s.mostCorroborated.map((x) => (
                <li key={x.slug} className="ui text-[12.5px]">
                  <Link href={`/story/${x.slug}`} className="text-ink hover:text-accent">{x.title}</Link>
                  <span className="ml-1 mono text-agree">{x.corroborated} corroborated · {x.families} families</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ui text-[12.5px] text-ink-3">—</p>
          )}
        </List>
        <List title="Publishers with the most stories">
          <ul className="flex flex-col gap-1">
            {s.topPublishers.map((p) => (
              <li key={p.id} className="ui text-[12.5px] text-ink-2">
                <Link href={`/source/${p.id}`} className="hover:text-accent">{p.name}</Link>{" "}
                <span className="mono text-ink-3">{p.articles}</span>
              </li>
            ))}
          </ul>
        </List>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <List title="Largest story-selection divergence">
          {s.selectionDivergence.length ? (
            <ul className="flex flex-col gap-1 ui text-[12px] text-ink-2">
              {s.selectionDivergence.map((x) => (
                <li key={x.id}>
                  <Link href={`/source/${x.id}`} className="hover:text-accent">{x.name}</Link>{" "}
                  {x.deviation > 0 ? "over-covers" : "under-covers"} <span className="capitalize">{x.subject}</span>{" "}
                  <span className="mono text-ink-3">({x.deviation > 0 ? "+" : ""}{Math.round(x.deviation * 100)}pp vs corpus)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ui text-[12px] text-ink-3">No publisher shows a large selection divergence in this snapshot.</p>
          )}
        </List>
        <List title="Publishers with insufficient alignment data">
          <ul className="flex flex-wrap gap-1.5 ui text-[11.5px] text-ink-3">
            {s.insufficientAlignment.map((x) => (
              <li key={x.id} className="pill bg-surface-2">
                <Link href={`/source/${x.id}`} className="hover:text-accent">{x.name}</Link> n={x.n}
              </li>
            ))}
          </ul>
          <p className="ui mt-1.5 text-[10.5px] text-ink-3">
            Below n=20 political stories, IFFA does not report a coverage alignment. A rolling window will
            build this up over time.
          </p>
        </List>
      </div>

      <p className="ui text-[11px] text-ink-3">
        Snapshot {new Date(s.generatedAt).toISOString()}. Straight counts, no political scoreboard. See the{" "}
        <Link href="/methodology" className="text-accent hover:underline">methodology</Link>.
      </p>
    </div>
  );
}
