/**
 * Event timeline (v0.7, Phase I).
 *
 * Orders a cluster's reports by time and marks the ones that introduced a fact
 * not present earlier — so a reader sees "what changed", not six near-identical
 * articles. Deterministic: token + figure + district novelty, no model.
 */
import type { LiveArticle } from "@/lib/live/types";
import { titleTokens } from "@/lib/live/text";
import { extractFigures, stripHeadlinePrefix } from "@/lib/live/entities";
import type { TimelineEntry } from "./types";

const OFFICIAL_ROLES = new Set(["official-alert", "primary-document", "government-statement"]);

export function buildTimeline(articles: LiveArticle[]): TimelineEntry[] {
  const ordered = [...articles].sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  const knownTokens = new Set<string>();
  const knownFigures = new Set<string>();
  const knownDistricts = new Set<string>();
  const out: TimelineEntry[] = [];

  ordered.forEach((a, idx) => {
    const text = stripHeadlinePrefix(a.title) + " " + (a.excerpt ?? "");
    const toks = titleTokens(text);
    const figs = extractFigures(text);
    const newToks = toks.filter((t) => !knownTokens.has(t));
    const newFigs = [...figs].filter((f) => !knownFigures.has(f));
    const newDistricts = a.districts.filter((d) => !knownDistricts.has(d));

    const addedNewFact =
      idx === 0 || newFigs.length > 0 || newDistricts.length > 0 || newToks.length >= 2;

    for (const t of toks) knownTokens.add(t);
    for (const f of figs) knownFigures.add(f);
    for (const d of a.districts) knownDistricts.add(d);

    out.push({
      at: a.publishedAt,
      sourceName: a.sourceName,
      publisher: a.publisher,
      language: a.language,
      headline: a.title,
      addedNewFact,
      official: OFFICIAL_ROLES.has(a.evidenceRole),
    });
  });

  return out;
}

/** ISO of the most recent entry that added a new fact (falls back to the latest entry). */
export function lastMeaningfulUpdate(timeline: TimelineEntry[]): string {
  const meaningful = timeline.filter((e) => e.addedNewFact);
  const pick = (meaningful.length ? meaningful : timeline).at(-1);
  return pick?.at ?? new Date(0).toISOString();
}
