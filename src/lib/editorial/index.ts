/**
 * IFFA Editorial Intelligence (v0.9).
 *
 *   computeEditorialPriority({ cluster, articles, now })  →  EditorialPriority
 *   buildSurfaces(clusters)                               →  home-page surfaces
 *
 * A ranking layer, not a truth layer. See docs/EDITORIAL-MODEL.md.
 */
export { computeEditorialPriority } from "./priority";
export type { EditorialInput } from "./priority";
export { buildSurfaces } from "./rank";
export type { EditorialSurfaces } from "./rank";
export {
  EDITORIAL_WEIGHTS,
  EDITORIAL_WEIGHT_SUM,
  BANDS,
  MAX_PER_PUBLISHER_TOP,
  GEO_RELEVANCE,
  CATEGORY_PRIORITY,
  INFO_GAIN,
} from "./weights";
export * from "./types";
