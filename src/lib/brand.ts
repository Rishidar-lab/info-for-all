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
    "A Tamil Nadu-first, India-aware news-comparison and media-landscape platform. For every " +
    "story IFFA shows who is reporting it, who is not, who owns those sources, how their framing " +
    "differs, which claims agree, which are disputed, and which have primary-document evidence.",
  region: "Tamil Nadu & India",
  version: "0.12",
  versionLabel: "v0.12 — Productization Release Candidate",
  repoUrl: "https://github.com/Rishidar-lab/info-for-all",
  siteUrl: "https://rishidar-lab.github.io/info-for-all",
} as const;

/** "IFFA — Info Free For All" */
export const BRAND_TITLE = `${BRAND.name} — ${BRAND.full}`;
