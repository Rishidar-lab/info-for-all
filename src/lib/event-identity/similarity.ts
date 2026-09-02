/**
 * Multi-signal event similarity (v0.5, Phase 4).
 *
 * Each signal is computed INDEPENDENTLY and reported, so a decision can be
 * explained ("matched on: same district + same action; low lexical overlap").
 * The signals are NOT collapsed here — `decide.ts` applies the decision function.
 */
import type { EventSignature } from "./signature";
import { placeRelation, type PlaceRelation } from "@/lib/language/locations";
import { actionRelation, type ActionRelation } from "@/lib/semantic/actions";
import { conceptOverlap } from "@/lib/semantic/concepts";
import { cosine } from "@/lib/semantic/embeddings";

export interface SignalScores {
  /** Strong canonical-entity overlap (0–1). */
  entityScore: number;
  /** From placeRelation: same=1, nested=0.6, sibling=0.1, different=0, unknown=0.3. */
  locationScore: number;
  placeRelation: PlaceRelation;
  /** Crisis / event-type category agreement (0–1). */
  eventTypeScore: number;
  /** From actionRelation: same=1, compatible=0.6, unknown=0.3, unrelated=0.15, conflicting=0. */
  actionScore: number;
  actionRelation: ActionRelation;
  /** Concept-token overlap with near-synonyms (0–1). */
  conceptScore: number;
  sharedConcepts: string[];
  /** Days between publication of the two reports. */
  temporalDistanceDays: number;
  /** Event-date compatibility (0–1); 1 when both cite the same day, 0 when they conflict. */
  temporalScore: number;
  /** Stemmed headline-token Jaccard (0–1). */
  lexicalScore: number;
  /** Embedding cosine (0–1-ish). */
  semanticScore: number;
  /** > 0 when the actions conflict or numbers of the same kind clash without time ordering. */
  contradictionPenalty: number;
  /** > 0 for sibling districts / different states. */
  geographyPenalty: number;
  /** 1 when both cite the SAME distinctive quantity (same dimension, ~equal value). */
  quantityMatch: number;
  /** true when a SPECIFIC place (a dam, river, landmark, city) is named in both. */
  exactPlace: boolean;
}

const LOC_SCORE: Record<PlaceRelation, number> = {
  same: 1,
  "same-region-only": 0.4,
  nested: 0.6,
  sibling: 0.1,
  different: 0,
  unknown: 0.3,
};
const ACT_SCORE: Record<ActionRelation, number> = { same: 1, compatible: 0.6, unknown: 0.3, unrelated: 0.15, conflicting: 0 };

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function overlapFraction(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / Math.min(a.size, b.size);
}

export function computeSignals(a: EventSignature, b: EventSignature): SignalScores {
  const pr = placeRelation(a.places, b.places);
  const ar = actionRelation(a.actions, b.actions);
  const { shared, score: conceptScore } = conceptOverlap(a.concepts, b.concepts);

  const eventTypeScore =
    a.crisisType && b.crisisType
      ? a.crisisType === b.crisisType
        ? 1
        : 0
      : overlapFraction(
          new Set([...a.concepts].filter((c) => EVENT_TYPE_CONCEPTS.has(c))),
          new Set([...b.concepts].filter((c) => EVENT_TYPE_CONCEPTS.has(c))),
        );

  const dtMs = Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  const temporalDistanceDays = dtMs / 86_400_000;
  let temporalScore = 0.5;
  if (a.eventDate && b.eventDate) {
    temporalScore = a.eventDate === b.eventDate ? 1 : Math.abs(Date.parse(a.eventDate) - Date.parse(b.eventDate)) <= 86_400_000 ? 0.7 : 0;
  } else if (temporalDistanceDays <= 1.25) {
    temporalScore = 0.8;
  } else if (temporalDistanceDays <= 2.5) {
    temporalScore = 0.5;
  } else {
    temporalScore = 0.2;
  }

  const lexicalScore = jaccard(a.lexicalTerms, b.lexicalTerms);
  const semanticScore = Math.max(0, cosine(a.embedding, b.embedding));

  let contradictionPenalty = 0;
  if (ar === "conflicting") contradictionPenalty += 0.6;
  contradictionPenalty += numericConflictPenalty(a, b);

  let geographyPenalty = 0;
  if (pr === "sibling") geographyPenalty += 0.6;
  if (pr === "different") geographyPenalty += 1;

  let quantityMatch = 0;
  for (const qa of a.quantities) {
    for (const qb of b.quantities) {
      if (qa.dimension !== qb.dimension || qa.dimension === "unknown") continue;
      const hi = Math.max(Math.abs(qa.value), Math.abs(qb.value)) || 1;
      if (Math.abs(qa.value - qb.value) / hi <= 0.02) quantityMatch = 1;
    }
  }

  const specificTypes = new Set(["water-body", "landmark", "city"]);
  const specificA = new Set(a.places.filter((p) => specificTypes.has(p.place.type)).map((p) => p.place.canonical));
  const exactPlace = b.places.some((p) => specificTypes.has(p.place.type) && specificA.has(p.place.canonical));

  return {
    entityScore: overlapFraction(a.entities, b.entities),
    locationScore: LOC_SCORE[pr],
    placeRelation: pr,
    eventTypeScore,
    actionScore: ACT_SCORE[ar],
    actionRelation: ar,
    conceptScore,
    sharedConcepts: shared,
    temporalDistanceDays,
    temporalScore,
    lexicalScore,
    semanticScore,
    contradictionPenalty,
    geographyPenalty,
    quantityMatch,
    exactPlace,
  };
}

const EVENT_TYPE_CONCEPTS = new Set([
  "rain", "heavy-rain", "flood", "cyclone", "dam", "coast", "earthquake", "landslide",
  "thunderstorm", "heatwave", "closure", "evacuation", "section-144", "power-cut",
]);

function numericConflictPenalty(a: EventSignature, b: EventSignature): number {
  for (const qa of a.quantities) {
    for (const qb of b.quantities) {
      if (qa.dimension !== qb.dimension || qa.dimension === "unknown") continue;
      const hi = Math.max(Math.abs(qa.value), Math.abs(qb.value)) || 1;
      const rel = Math.abs(qa.value - qb.value) / hi;
      // same dimension, materially different magnitude, reports within a day
      if (rel > 0.35 && rel < 5 && Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt)) < 86_400_000) {
        return 0.25;
      }
    }
  }
  return 0;
}
