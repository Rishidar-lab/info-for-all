/**
 * The full labelled corpus = the frozen v0.4 set (`corpus.ts`, 148) + the v0.5
 * expansion (`corpus-v05.ts`). `FROZEN_CORPUS` is exported separately so the
 * v0.4-vs-v0.5 A/B comparison always runs on an identical, unchanged set.
 */
import { CORPUS } from "./corpus";
import { CORPUS_V05 } from "./corpus-v05";
import type { ClaimEvalCase } from "./schema";

/** The 148 cases as of v0.4 — never modified. */
export const FROZEN_CORPUS: ClaimEvalCase[] = CORPUS;

/** Everything, for the live evaluation + quality gate. */
export const FULL_CORPUS: ClaimEvalCase[] = [...CORPUS, ...CORPUS_V05];

export { EVAL_NOW } from "./corpus";
