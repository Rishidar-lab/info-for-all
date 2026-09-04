"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { track, queryLengthBucket } from "@/lib/analytics";

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

type LoadState = "loading" | "ready" | "error";

/**
 * v0.11 Phase N — <Search> loads its index from a served shard
 * (`/data/search/index.json`) instead of receiving ≈340 KB of entries inlined
 * into the /search page payload. The page ships an input box immediately; the
 * index streams in a moment later.
 */
export function Search({ src }: { src: string }) {
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<SearchEntry[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let live = true;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: { entries: SearchEntry[] }) => {
        if (!live) return;
        setIndex(Array.isArray(data.entries) ? data.entries : []);
        setState("ready");
      })
      .catch(() => {
        if (live) setState("error");
      });
    return () => {
      live = false;
    };
  }, [src]);

  const trackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const query = q.trim();
    if (query.length < 2 || index.length === 0) return [];
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

  // Debounced, content-free: query LENGTH bucket + url-ness + result count only.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    if (trackTimer.current) clearTimeout(trackTimer.current);
    trackTimer.current = setTimeout(() => {
      track("search_used", {
        path: typeof location === "undefined" ? "/search/" : location.pathname,
        queryLength: queryLengthBucket(query),
        looksLikeUrl: /^https?:\/\//i.test(query) || query.includes(".com/") || query.includes(".in/"),
        resultCount: results.length,
      });
    }, 900);
    return () => {
      if (trackTimer.current) clearTimeout(trackTimer.current);
    };
  }, [q, results.length]);

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
        {state === "loading" && "Loading the story index…"}
        {state === "error" && "Could not load the story index. Reload the page to try again."}
        {state === "ready" && "Paste a news article URL to find (or start) its cross-source comparison."}
      </p>

      {state === "ready" && q.trim().length >= 2 && (
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
