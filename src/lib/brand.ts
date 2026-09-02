/**
 * IFFA brand constants — single source of truth for the visible product identity.
 *
 * The project began as "Info For All (IFA)". From v0.7 the visible identity is
 * "IFFA — Info Free For All". The repository, the GitHub Pages base path
 * (`/info-for-all`), every route, and every feed id are UNCHANGED — renaming any
 * of them would break the live deployment. Only copy, `<title>`s and the web
 * manifest carry the new name.
 */

export const BRAND = {
  /** Short mark used in chrome and badges. */
  name: "IFFA",
  /** Expansion. */
  full: "Info Free For All",
  /** What it was called through v0.6 — kept visible for one release for continuity. */
  legacy: "Info For All",
  legacyShort: "IFA",
  /** Primary positioning line. Use sparingly. */
  tagline: "See what matters. See what changed. See the evidence.",
  /** One-line description of what IFFA is. */
  blurb:
    "A Tamil Nadu-first, India-aware real-time news and current-trend intelligence platform. " +
    "IFFA groups reporting into events, ranks them by what is actually changing, and shows " +
    "how reliable each claim is and how Tamil and English sources describe the same story.",
  region: "Tamil Nadu & India",
  version: "0.7",
  versionLabel: "v0.7 — Trend Intelligence",
  repoUrl: "https://github.com/Rishidar-lab/info-for-all",
  siteUrl: "https://rishidar-lab.github.io/info-for-all",
} as const;

/** "IFFA — Info Free For All" */
export const BRAND_TITLE = `${BRAND.name} — ${BRAND.full}`;
