import type { Metadata } from "next";
import { Search } from "@/components/media/search";

export const metadata: Metadata = {
  title: "Search",
  description: "Search IFFA stories by headline, topic, politician, party, district or publisher — or paste a news URL to find its cross-source comparison.",
};

// v0.11 Phase N — the search index (one compact row per cluster, ≈340 KB) is no
// longer inlined into this page's payload. It is a served shard
// (`public/data/search/index.json`, written by `npm run shard`) that <Search>
// fetches on mount. `PAGES_BASE_PATH` is set by the Pages workflow / the E2E
// build; unset locally (site served at root).
const SEARCH_INDEX_URL = `${process.env.PAGES_BASE_PATH ?? ""}/data/search/index.json`;

export default function SearchPage() {
  return (
    <div className="min-w-0 pb-8">
      <header className="border-b-2 border-ink/80 pb-4">
        <div className="label">Search</div>
        <h1 className="mt-1 font-serif text-[27px] font-semibold leading-tight sm:text-[33px]">Find a story</h1>
      </header>
      <div className="mt-6 max-w-2xl">
        <Search src={SEARCH_INDEX_URL} />
      </div>
    </div>
  );
}
