/**
 * Base path the static site is served under.
 *
 * The GitHub Pages workflow sets `PAGES_BASE_PATH=/info-for-all`; it is unset
 * for local `out/` serving and root-domain hosts. This value is only correct in
 * a SERVER component / build script — client bundles do not receive
 * `process.env.PAGES_BASE_PATH`. Resolve a shard URL here and pass the string
 * into a client component as a prop (see `<Search src>` / `<LoadMore shardUrl>`).
 */
export const BASE_PATH = process.env.PAGES_BASE_PATH ?? "";

/** Absolute path to a file under `public/` (served verbatim by Next). */
export function assetPath(rel: string): string {
  return `${BASE_PATH}${rel.startsWith("/") ? "" : "/"}${rel}`;
}

export const INDEX_SHARD_URL = assetPath("/data/index/latest.json");
export const SEARCH_SHARD_URL = assetPath("/data/search/index.json");
