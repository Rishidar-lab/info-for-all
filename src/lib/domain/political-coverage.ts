/**
 * Political coverage description (v0.9, Phase N).
 *
 * IFFA does NOT score political bias. There is no left/right, pro/anti, or
 * government/opposition axis anywhere in this file or the codebase.
 *
 * What it does instead: for a political event, describe — factually — how
 * COMPLETE the coverage is. Was there a claim? A response to it? An official
 * record? Independent reporting, or a single outlet? An allegation left
 * unanswered? That surfaces information asymmetry and lets the reader see what
 * is missing, without IFFA taking a side.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import { detectPoliticalEvent, type SpeechAct } from "./politics";

const OFFICIAL = new Set(["official-alert", "primary-document", "government-statement"]);
const RESPONSE_IN_TEXT =
  /\b(denies?|denied|rejects?|refutes?|responds?|hits? back|clarifi\w+|counters?|rebuts?|dismiss\w+ (?:as )?(?:baseless|false)|termed? .* baseless)\b/i;
const ACTOR_RE =
  /\b(minister|cm|chief minister|governor|mla|mp|dmk|aiadmk|bjp|congress|tvk|vck|pmk|ntk|mdmk|speaker|collector|mayor|secretary|leader of opposition|deputy cm|dy cm)\b/i;

export type CoverageSpeechAct = "allegation" | "criticism" | "denial" | "response" | "announcement" | "assertion" | "order";

export interface PoliticalCoverage {
  /** distinct political-actor terms named across the cluster's headlines */
  actors: string[];
  speechAct: CoverageSpeechAct;
  /** structured claims IFFA extracted for this event */
  claimCount: number;
  /** a response / denial exists — threaded to another event, or in this cluster */
  hasResponse: boolean;
  /** an official record / primary document / government statement is present */
  hasOfficialRecord: boolean;
  independentFamilies: number;
  /** an allegation or criticism with no response found anywhere in the snapshot */
  unanswered: boolean;
  /** plain-language description of what the coverage does and does not contain */
  note: string;
}

function speechToCoverage(s: SpeechAct): CoverageSpeechAct {
  if (s === "allegation" || s === "criticism" || s === "denial" || s === "response" || s === "announcement" || s === "order")
    return s;
  return "assertion";
}

export function assessPoliticalCoverage(cluster: LiveCluster, articles: LiveArticle[]): PoliticalCoverage {
  const heads = articles.map((a) => a.title);
  const blob = [cluster.title, ...heads].join("  ·  ");
  const ev = detectPoliticalEvent(blob);
  const speechAct = speechToCoverage(ev.speechAct);

  const actors = [
    ...new Set((blob.match(new RegExp(ACTOR_RE, "gi")) ?? []).map((s) => s.toLowerCase().replace(/\s+/g, " ").trim())),
  ].slice(0, 6);

  const claimCount = cluster.claims?.claims.length ?? 0;
  const hasOfficialRecord =
    (cluster.claims?.evidence.length ?? 0) > 0 || articles.some((a) => OFFICIAL.has(a.evidenceRole));
  const threadedResponse = (cluster.trendData?.politicalThread?.links ?? []).some(
    (l) => l.relation === "denies" || l.relation === "responds-to" || l.relation === "contradicts",
  );
  const inClusterResponse = RESPONSE_IN_TEXT.test(blob);
  const hasResponse = threadedResponse || inClusterResponse;

  const independentFamilies = cluster.trendData?.independence?.families ?? cluster.distinctPublishers;
  const unanswered = (speechAct === "allegation" || speechAct === "criticism") && !hasResponse;

  const parts: string[] = [];
  parts.push(
    speechAct === "allegation"
      ? "An allegation"
      : speechAct === "criticism"
        ? "A criticism"
        : speechAct === "denial"
          ? "A denial"
          : speechAct === "announcement"
            ? "An announcement"
            : speechAct === "order"
              ? "An official order"
              : "A statement",
  );
  parts.push(hasResponse ? "with a response on record" : unanswered ? "with no response on record" : "reported");
  parts.push(hasOfficialRecord ? "official record cited" : "no official record cited");
  parts.push(
    independentFamilies >= 3
      ? `${independentFamilies} independent source families`
      : independentFamilies === 2
        ? "2 source families"
        : "single source family",
  );

  return {
    actors,
    speechAct,
    claimCount,
    hasResponse,
    hasOfficialRecord,
    independentFamilies,
    unanswered,
    note: parts.join(" · "),
  };
}
