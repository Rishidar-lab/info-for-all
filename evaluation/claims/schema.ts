/**
 * IFA claim gold corpus — machine-readable schema.
 *
 * Each case is a small, human-auditable comparison: one or two short pieces of
 * source text (a headline or an excerpt clause, exactly what IFA's rule engine
 * actually sees) plus the relation a careful human reviewer would assign.
 *
 * The corpus deliberately over-weights the cases IFA must NOT get wrong:
 * fabricated corroboration, an attributed quote promoted to fact, a rising toll
 * mislabelled a contradiction, syndicated wire copy counted as independent
 * confirmation.
 */

/** Relation between inputA and inputB (or, for one-input cases, of inputA to "a bare fact"). */
export type EvalRelation =
  /** A and B assert the same thing — they should corroborate each other. */
  | "same"
  /** A and B are about different things — they must stay separate. */
  | "different"
  /** B is primary evidence that supports the claim in A. */
  | "supports"
  /** A and B genuinely conflict, with no time ordering to explain it. */
  | "contradicts"
  /** B is a later revision of A (developing story) — an update, not a conflict. */
  | "supersedes"
  /** A is an attributed statement / allegation / prediction — never a bare fact. */
  | "attributed"
  /** The right answer is "not enough to decide" (e.g. cross-language without translation). */
  | "uncertain";

export type EvalCategory =
  | "A-same-fact-different-wording"
  | "B-related-but-different"
  | "C-numeric-agreement"
  | "D-numeric-contradiction"
  | "E-temporal-update"
  | "F-attributed-statement"
  | "G-allegation"
  | "H-prediction"
  | "I-primary-evidence"
  | "J-syndication"
  | "K-tamil-tamil"
  | "L-tamil-english"
  | "M-same-people-different-story"
  | "N-same-location-different-date"
  | "O-neighbouring-districts";

export type EvalLanguage = "en" | "ta" | "unknown";

/** The broad claim-type buckets the corpus asserts against (maps onto ClaimType). */
export type EvalClaimType =
  | "fact"
  | "event"
  | "statistic"
  | "attribution"
  | "official-statement"
  | "allegation"
  | "prediction"
  | "opinion";

export interface EvalCapRecord {
  event: string;
  severity?: string;
  area?: string;
  identifier?: string;
}

export interface EvalInput {
  /** Exactly the text IFA's extractor sees — a headline or one excerpt clause. */
  text: string;
  language: EvalLanguage;
  /** ISO timestamp. Relative offsets in the corpus are pre-resolved against a fixed NOW. */
  timestamp?: string;
  /** Publisher name. */
  source?: string;
  /** A wire credit actually present in the copy ("PTI", "Reuters", "ANI", …). */
  wire?: string;
  /** Present only for category I — a retrieved official CAP/SACHET record. */
  cap?: EvalCapRecord;
}

export interface EvalExpectation {
  relation: EvalRelation;
  /** Expected claim type(s) for inputA (extraction check). */
  claimType?: EvalClaimType | EvalClaimType[];
  /** True ⇒ the extracted claim MUST retain a speaker and must not be a bare fact. */
  attributionRequired?: boolean;
  /** Substring the retained attribution should contain (lower-case), when known. */
  attributionSpeaker?: string;
  /** For category J / independence: are A and B genuinely independent reports? */
  independent?: boolean;
  /** For category C: A and B state the same magnitude in different units. */
  quantityEquivalent?: boolean;
  /**
   * How specific the expected match is:
   *  - "specific" (default): A and B must land in the SAME extracted claim about a
   *    particular fact (a closure, a figure, an order) — not merely the same event.
   *  - "event": it is enough that they are recognised as the same event.
   */
  matchLevel?: "specific" | "event";
  /** Reviewer note — kept short and understandable. */
  notes?: string;
}

export interface ClaimEvalCase {
  id: string;
  category: EvalCategory;
  inputA: EvalInput;
  inputB?: EvalInput;
  expected: EvalExpectation;
}

const RELATIONS = new Set<EvalRelation>([
  "same",
  "different",
  "supports",
  "contradicts",
  "supersedes",
  "attributed",
  "uncertain",
]);

/** Structural validation — the eval harness refuses to run a malformed corpus. */
export function validateCorpus(cases: ClaimEvalCase[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const c of cases) {
    if (ids.has(c.id)) problems.push(`duplicate id ${c.id}`);
    ids.add(c.id);
    if (!c.inputA?.text || c.inputA.text.length < 6) problems.push(`${c.id}: inputA.text too short`);
    if (!RELATIONS.has(c.expected?.relation)) problems.push(`${c.id}: bad relation ${c.expected?.relation}`);
    const twoInputRelations: EvalRelation[] = ["same", "different", "supports", "contradicts", "supersedes"];
    if (twoInputRelations.includes(c.expected.relation) && !c.inputB) {
      problems.push(`${c.id}: relation '${c.expected.relation}' needs inputB`);
    }
    if (c.expected.relation === "supports" && !c.inputB?.cap) {
      problems.push(`${c.id}: 'supports' needs inputB.cap`);
    }
  }
  return problems;
}

export const EVAL_CATEGORY_LABEL: Record<EvalCategory, string> = {
  "A-same-fact-different-wording": "Same fact, different wording",
  "B-related-but-different": "Related but different fact",
  "C-numeric-agreement": "Numeric agreement (unit normalisation)",
  "D-numeric-contradiction": "Numeric contradiction",
  "E-temporal-update": "Temporal update (supersedes)",
  "F-attributed-statement": "Attributed statement",
  "G-allegation": "Allegation",
  "H-prediction": "Prediction",
  "I-primary-evidence": "Primary evidence support",
  "J-syndication": "Syndication vs independence",
  "K-tamil-tamil": "Tamil ↔ Tamil",
  "L-tamil-english": "Tamil ↔ English",
  "M-same-people-different-story": "Same people, different story",
  "N-same-location-different-date": "Same location, different date",
  "O-neighbouring-districts": "Neighbouring districts",
};
