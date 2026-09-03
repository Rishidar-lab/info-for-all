/**
 * Media Landscape Intelligence (v0.10).
 *
 * WHO reports a story · WHO doesn't · WHO owns them · HOW their framing differs ·
 * WHICH claims agree · WHICH are disputed · WHICH have primary evidence.
 *
 * See docs/METHODOLOGY.md. Non-negotiables: ownership is metadata (never a bias
 * determinant, always provenance-backed, UNKNOWN allowed, never inferred);
 * no single bias score; external ratings and IFFA-observed metrics stay
 * separate; bias ≠ falsehood; sample size is always exposed.
 */
export * from "./types";
export {
  describePublisher,
  allPublisherProfiles,
  buildSourceFamilies,
  familyIndex,
  OWNERSHIP_CATEGORIES,
} from "./publishers";
export { SAMPLE_BANDS, sampleBand } from "./alignment";
