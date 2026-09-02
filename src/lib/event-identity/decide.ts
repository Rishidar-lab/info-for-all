/**
 * Semantic identity decision engine (v0.5, Phase 18).
 *
 * No hidden merge score. Given two event signatures, return an explainable
 * `IdentityDecision`: the relation, a confidence band, every signal, and the
 * blockers that prevented (or capped) a "same" verdict.
 *
 * Philosophy: a fabricated consensus is worse than a missed one. The gate that
 * produces `relation: "same"` is deliberately strict; permissiveness lives in
 * candidate generation, not here.
 */
import type { EventSignature } from "./signature";
import { computeSignals, type SignalScores } from "./similarity";

export type EventRelation = "same" | "related" | "part-of" | "follow-up" | "different" | "uncertain";

export interface IdentityDecision {
  relation: EventRelation;
  confidence: "high" | "moderate" | "low";
  signals: SignalScores;
  blockers: string[];
  reasons: string[];
  crossLanguage: boolean;
}

const DEVELOPING = /\b(toll|rises|climbs|mounts|updated|revised|latest|so far|now at|death toll|as many as)\b/i;

export function decideIdentity(a: EventSignature, b: EventSignature): IdentityDecision {
  const s = computeSignals(a, b);
  const crossLanguage = a.language !== b.language && (a.language === "ta" || b.language === "ta");
  const blockers: string[] = [];
  const reasons: string[] = [];

  // ── hard blockers → "different" ─────────────────────────────────────
  if (s.placeRelation === "different") blockers.push("different states / regions named");
  if (s.placeRelation === "sibling") blockers.push(`different districts, no overlap`);
  if (s.actionRelation === "conflicting") blockers.push("the reported actions conflict (e.g. approve vs discuss)");
  if (a.incidentType && b.incidentType && a.incidentType !== b.incidentType) {
    blockers.push(`different incident types (${a.incidentType} vs ${b.incidentType})`);
  }
  if (a.crisisType && b.crisisType && a.crisisType !== b.crisisType) blockers.push(`different hazard types (${a.crisisType} vs ${b.crisisType})`);
  const bothDated = !!a.eventDate && !!b.eventDate;
  const developing = DEVELOPING.test(a.headline + " " + b.headline);
  if (bothDated && s.temporalScore === 0 && !developing) blockers.push(`incompatible event dates (${a.eventDate} vs ${b.eventDate})`);
  if (s.temporalDistanceDays > 5 && !developing) blockers.push(`reports ${s.temporalDistanceDays.toFixed(1)} days apart`);

  if (blockers.length > 0) {
    return { relation: "different", confidence: "high", signals: s, blockers, reasons: ["blocked: " + blockers.join("; ")], crossLanguage };
  }

  // ── reaction vs event — a "welcome"/"protest" headline is not the event ──
  if (a.isReaction !== b.isReaction) {
    reasons.push("one report is a reaction (welcome / oppose / protest), the other the event itself");
    return { relation: "related", confidence: "low", signals: s, blockers, reasons, crossLanguage };
  }

  // ── part-of: a wide event that contains a local one ─────────────────
  if (s.placeRelation === "nested" && (s.conceptScore >= 0.34 || s.actionScore >= 0.6)) {
    reasons.push("one report is regional / state-level, the other a local incident within it");
    return { relation: "part-of", confidence: s.conceptScore >= 0.5 ? "moderate" : "low", signals: s, blockers, reasons, crossLanguage };
  }

  // ── follow-up: same place + same action, clearly separated in time ──
  if (
    (s.placeRelation === "same") &&
    s.actionRelation === "same" &&
    s.temporalDistanceDays > 1.5 &&
    developing
  ) {
    reasons.push("same place and action, reported well apart in time — a developing update");
    return { relation: "follow-up", confidence: "moderate", signals: s, blockers, reasons, crossLanguage };
  }

  const strongEntity = s.entityScore > 0;
  const sameLoc = s.placeRelation === "same"; // shared DISTRICT or specific place
  const regionOnly = s.placeRelation === "same-region-only"; // just the state / a broad region
  const nestedLoc = s.placeRelation === "nested";
  const conceptGood = s.conceptScore >= 0.5;
  const conceptOk = s.conceptScore >= 0.34;
  const actionSame = s.actionRelation === "same";
  const actionOk = s.actionScore >= 0.6;
  const semanticGood = s.semanticScore >= 0.55;
  const noPenalty = s.contradictionPenalty === 0;
  const sharedSpecificConcepts = s.sharedConcepts.length;

  // ── cross-language: require STRONG structured agreement (Phase 16) ──
  // A shared state / broad region is NOT enough — need a shared district or a
  // shared specific place, compatible date, and a shared core entity or action.
  if (crossLanguage) {
    const bothDatedSame = !!a.eventDate && a.eventDate === b.eventDate;
    const dateOk = s.temporalScore >= 0.7 || (!a.eventDate && !b.eventDate && s.temporalDistanceDays <= 1.25);
    const coreAgree =
      (strongEntity && actionSame) ||
      (actionSame && sharedSpecificConcepts >= 1) ||
      (strongEntity && sharedSpecificConcepts >= 2) ||
      (bothDatedSame && sharedSpecificConcepts >= 1) ||
      sharedSpecificConcepts >= 2;
    if (sameLoc && dateOk && coreAgree && noPenalty) {
      reasons.push("cross-language: shared district/place, compatible date, and " + (strongEntity ? "shared core entity + action/topic" : actionSame ? "same action + shared specific topic" : "shared specific topics" + (bothDatedSame ? " on the same date" : "")));
      return { relation: "same", confidence: "moderate", signals: s, blockers, reasons, crossLanguage };
    }
    reasons.push("cross-language pair without the structured agreement required for a merge");
    return { relation: "uncertain", confidence: "low", signals: s, blockers, reasons, crossLanguage };
  }

  // high confidence
  if (
    sameLoc &&
    noPenalty &&
    ((strongEntity && (actionSame || conceptOk)) ||
      (actionSame && conceptGood) ||
      (s.exactPlace && actionSame))
  ) {
    reasons.push(
      strongEntity
        ? "same place, shared named entity, matching action/topic"
        : s.exactPlace
          ? "same specific place (a named dam / river / town) and same action"
          : "same place, same action, high topic overlap",
    );
    return { relation: "same", confidence: "high", signals: s, blockers, reasons, crossLanguage };
  }
  // moderate confidence
  if (sameLoc && noPenalty && ((actionSame && conceptOk) || (conceptGood && (actionOk || semanticGood)) || (strongEntity && conceptOk))) {
    reasons.push("same place with matching topic and " + (actionSame ? "action" : semanticGood ? "semantic similarity" : "overlap"));
    return { relation: "same", confidence: "moderate", signals: s, blockers, reasons, crossLanguage };
  }
  // a strong shared NAMED entity (a specific org / body) + same action + topic,
  // even when neither headline carries a place (e.g. "Anna University postpones exams").
  if (
    strongEntity &&
    actionSame &&
    conceptOk &&
    noPenalty &&
    s.placeRelation !== "sibling" &&
    s.placeRelation !== "different"
  ) {
    reasons.push("shared named entity with the same action and topic");
    return { relation: "same", confidence: "moderate", signals: s, blockers, reasons, crossLanguage };
  }
  // low-confidence same (embedding-recovered paraphrase, still same place)
  if (sameLoc && noPenalty && semanticGood && conceptOk && (actionOk || s.actionRelation === "unknown")) {
    reasons.push("same place, strong semantic similarity, compatible topic");
    return { relation: "same", confidence: "low", signals: s, blockers, reasons, crossLanguage };
  }

  // ── same-REGION-only: needs a strong distinctive anchor, not just topic ──
  // "Tamil Nadu rain toll rises to 6" vs "6 rain-related deaths across Tamil
  // Nadu" — legitimate; "Tamil Nadu weather" vs "Tamil Nadu Assembly" — not.
  if (regionOnly && noPenalty) {
    const anchoredByQuantity = s.quantityMatch === 1 && sharedSpecificConcepts >= 1 && (actionSame || s.actionRelation === "unknown");
    const anchoredByEntityAction = strongEntity && actionSame && sharedSpecificConcepts >= 1;
    const anchoredByActionConcepts = actionSame && sharedSpecificConcepts >= 2 && conceptGood;
    if (anchoredByQuantity || anchoredByEntityAction || anchoredByActionConcepts) {
      reasons.push(
        anchoredByQuantity
          ? "same region, same distinctive figure and topic"
          : "same region, shared entity/action and multiple specific topics",
      );
      return { relation: "same", confidence: "moderate", signals: s, blockers, reasons, crossLanguage };
    }
  }

  // same distinctive quantity + high topic overlap when location is genuinely
  // absent on both sides (e.g. "90 kmph winds" forecasts with no place named)
  if (
    s.quantityMatch === 1 &&
    conceptGood &&
    sharedSpecificConcepts >= 1 &&
    noPenalty &&
    s.geographyPenalty === 0 &&
    s.placeRelation === "unknown" &&
    (actionOk || s.actionRelation === "unknown")
  ) {
    reasons.push("both cite the same distinctive figure with high topic overlap");
    return { relation: "same", confidence: "moderate", signals: s, blockers, reasons, crossLanguage };
  }

  // related (same place, weak topical link) — NOT merged
  if ((sameLoc || nestedLoc) && (conceptOk || s.actionRelation === "compatible")) {
    reasons.push("same place, loosely related topic — not the same claim");
    return { relation: "related", confidence: "low", signals: s, blockers, reasons, crossLanguage };
  }

  reasons.push("insufficient shared structure");
  return { relation: "different", confidence: "moderate", signals: s, blockers, reasons, crossLanguage };
}
