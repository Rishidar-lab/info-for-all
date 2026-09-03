"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface SearchEntry {
  slug: string;
  title: string;
  category: string;
  scope: string;
  publishers: string[];
  districts: string[];
  urls: string[];
  sources: number;
  families: number;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "");
}

export function Search({ index }: { index: SearchEntry[] }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim();
    if (query.length < 2) return [];
    // paste-a-URL path
    if (/^https?:\/\//i.test(query) || query.includes(".com/") || query.includes(".in/")) {
      const nq = norm(query);
      const hit = index.filter((e) => e.urls.some((u) => norm(u) === nq || norm(u).startsWith(nq) || nq.startsWith(norm(u))));
      if (hit.length) return hit;
    }
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return index
      .map((e) => {
        const hay = `${e.title} ${e.category} ${e.scope} ${e.publishers.join(" ")} ${e.districts.join(" ")}`.toLowerCase();
        const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
        return { e, score };
      })
      .filter((x) => x.score === terms.length)
      .sort((a, b) => b.e.sources - a.e.sources)
      .slice(0, 40)
      .map((x) => x.e);
  }, [q, index]);

  return (
    <div className="min-w-0">
      <input
        type="search"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Headline, topic, politician, party, district, publisher — or paste a news URL"
        className="w-full rounded border border-rule-strong bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
      />
      <p className="ui mt-1.5 text-[11.5px] text-ink-3">
        Paste a news article URL to find (or start) its cross-source comparison.
      </p>

      {q.trim().length >= 2 && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="ui text-[13px] text-ink-3">No matching story in the current snapshot.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {results.map((e) => (
                <li key={e.slug} className="card p-3.5">
                  <Link href={`/story/${e.slug}`} className="font-serif text-[15px] font-semibold text-ink hover:text-accent">
                    {e.title}
                  </Link>
                  <p className="mt-1 ui text-[11.5px] text-ink-3">
                    {e.scope === "tamil-nadu" ? "Tamil Nadu" : "India"} · {e.category.replace(/-/g, " ")} ·{" "}
                    <span className="mono text-ink-2">{e.sources}</span> sources ·{" "}
                    <span className="mono text-ink-2">{e.families}</span> independent families
                    {e.districts.length > 0 && ` · ${e.districts.slice(0, 3).join(", ")}`}
                  </p>
                  <p className="mt-0.5 ui text-[11px] text-ink-3">{e.publishers.slice(0, 6).join(" · ")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
