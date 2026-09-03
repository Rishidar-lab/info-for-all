/**
 * IFFA Brief subsystem (Ground-Parity Milestone A).
 *
 * Native, evidence-grounded story explanation:
 *   selectBriefInputs  — gather structured evidence + the withholding gate
 *   synthesizeBrief     — deterministic sentence synthesis, every fact cited
 *   verifyBrief         — the hallucination firewall (drops unsupported sentences)
 *   toTamilBrief        — the Tamil brief from the same facts (no MT)
 *   buildBrief/buildBriefs/microBrief — orchestration for pages + cards
 *   buildPerspectiveCompare — how coverage differs across language / locality / official
 *
 * No language model in the deployed path.
 */
export * from "./types";
export { selectBriefInputs, type BriefInputs } from "./select";
export { synthesizeBrief, type SynthesizeOptions } from "./synthesize";
export { verifyBrief } from "./verify";
export { toTamilBrief } from "./tamil";
export { buildBrief, buildBriefs, microBrief, type BuiltBriefs, type BuildBriefOptions } from "./build";
export { buildPerspectiveCompare } from "./perspective";
export { WITHHOLD_LABEL } from "./labels";
