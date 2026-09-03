/**
 * Milestone B — research-on-demand.
 *
 * §B.1 (this commit): the hardened source-family resolver. Sits outside the
 * frozen v0.6 engine; the brief withholding gate uses it to decide whether an
 * event has genuinely independent coverage.
 *
 * §B.2+ (not started — awaiting go): primary-record adapters, the research
 * trigger, replayable fixtures.
 */
export {
  resolveSourceFamilies,
  type SourceFamilyResolution,
  type ResolvedFamily,
  type FamilyKind,
} from "./independence";
