import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { runSearch } from "@/lib/domain/search";
import { labelize } from "@/lib/ui";
import { SectionHeading } from "@/components/primitives";
import { SearchBox } from "@/components/search-box";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };

const TYPE_TONE: Record<string, string> = {
  event: "text-accent",
  claim: "text-ink",
  source: "text-ink",
  article: "text-ink-2",
  entity: "text-ink-2",
  topic: "text-ink-2",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const result = q ? await runSearch(db, q, { limit: 40 }) : null;

  return (
    <div className="space-y-6">
      <SectionHeading
        label="Search"
        title={q ? `Results for “${q}”` : "Search"}
        note={result ? `${result.results.length} results · ${result.method}` : undefined}
      />

      <div className="max-w-xl">
        <SearchBox size="lg" initialQuery={q} autoFocus={!q} />
      </div>

      {result && result.results.length === 0 && (
        <p className="ui text-[13px] text-ink-3">
          Nothing matched. Search runs across events, claims, articles, sources, entities and topics.
        </p>
      )}

      {result && result.results.length > 0 && (
        <ul className="divide-y divide-rule">
          {result.results.map((r) => (
            <li key={`${r.type}:${r.id}`} className="py-3">
              <div className="flex items-baseline gap-2">
                <span className="label">{labelize(r.type)}</span>
                <span className="mono text-[10.5px] text-ink-3">score {r.score.toFixed(1)}</span>
              </div>
              {r.url.startsWith("/") ? (
                <Link href={r.url} className={`link-quiet font-serif text-[16px] ${TYPE_TONE[r.type]}`}>
                  {r.title}
                </Link>
              ) : (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`link-quiet font-serif text-[16px] ${TYPE_TONE[r.type]}`}
                >
                  {r.title}
                </a>
              )}
              {r.snippet && <p className="prose-measure mt-0.5 ui text-[13px] text-ink-2">{r.snippet}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
