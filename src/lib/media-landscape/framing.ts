/**
 * Headline framing comparison (v0.10, Phase 4).
 *
 * For one story, how does each source frame it? Deterministic: emphasis from
 * headline structure, stance toward the story's dominant political entity,
 * loaded-language detection, and which corroborated claims a headline leaves
 * out. IFFA never says which framing is "correct".
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { EventClaims } from "@/lib/claims/types";
import type { FramingComparison, FramingObservation, HeadlineEmphasis } from "./types";
import { publisherSlug } from "@/data/publishers";
import { primaryEntity } from "./entities";
import { readStance } from "./stance";

const EMPHASIS_RULES: [RegExp, HeadlineEmphasis][] = [
  [/\b(after|following|amid|amidst)\s+(opposition|protest|pressure|outrage|backlash|criticism|demand)/i, "opposition-pressure"],
  [/\b(after|following|because of|due to|driven by|thanks to)\b.*\b(pressure|demand|move|decision|order|ruling|verdict)\b/i, "political-causation"],
  [/^.{0,45}?\b(government|govt|centre|cabinet|cm|chief minister|minister|governor|assembly)\b.{0,30}?\b(announce\w*|release\w*|approv\w+|launch\w*|order\w*|sanction\w*|clear\w*|pass\w*|allocat\w+|hike\w*|cuts?|waiv\w+|withdraw\w*|unveil\w*|roll(?:s|ed)? out)\b/i, "government-action"],
  [/\b\d[\d,.]*\s*(cusecs|crore|lakh|mm|cm|per cent|%|points|runs|wickets|degrees|°c|km|mw|tmc)\b/i, "measurement-data"],
  [/\b(rises?|falls?|jumps?|drops?|climbs?|slips?|surges?|plunges?)\s+(to|by)\b/i, "measurement-data"],
  [/\b(\d+\s+(dead|killed|injured|missing|hurt|feared)|thousands?|hundreds?|lakhs?)\b.{0,30}\b(stranded|evacuat|marooned|affected|displaced|homeless|hit)/i, "human-impact"],
  [/\b(alleges?|accuses?|blames?|charges?|claims? that)\b/i, "accusation"],
  [/\b(slams?|blasts?|hits? out|flays?|mocks?|taunts?|rubbishes?|dismisses?|counters?|responds?|reacts?)\b/i, "reaction-quote"],
  [/\b(row|standoff|face-?off|clash|tussle|spat|war of words|rift|deadlock|impasse)\b/i, "conflict-dispute"],
  [/\b(assembly|court|committee|panel|house)\b.{0,20}\b(passes?|clears?|to hear|adjourn|reconvene|debates?|tables?|refers?)/i, "process-procedure"],
  [/\b(wins?|won|beat|beats|defeat|defeats|clinch\w*|lift\w* the (?:cup|title|trophy)|verdict|acquit\w*|convict\w*|sentenced?)\b/i, "outcome-result"],
];

const LOADED =
  /\b(shocking|shockingly|scandal\w*|expos[eé]d?|explosive|bombshell|slams?|blasts?|blistering|scathing|furious|fury|outrage\w*|storm|chaos|crisis|disaster|catastroph\w*|meltdown|debacle|fiasco|humiliat\w*|crushing|devastating|massive|huge|unprecedented|never before|completely|totally|utterly|absolute\w*|betrayal|traitor|shameful|disgrace\w*)\b/i;

function detectEmphasis(headline: string): HeadlineEmphasis[] {
  const hits = EMPHASIS_RULES.filter(([re]) => re.test(headline)).map(([, e]) => e);
  return hits.length ? [...new Set(hits)] : ["uncategorised"];
}

function loadedPhrases(headline: string): string[] {
  const out = new Set<string>();
  const re = new RegExp(LOADED.source, "ig");
  let m: RegExpExecArray | null;
  while ((m = re.exec(headline))) out.add(m[0]);
  return [...out];
}

/** The corroborated / partially-corroborated claims of a cluster, as short strings. */
function corroboratedClaims(claims: EventClaims | undefined): { id: string; text: string; articleIds: string[] }[] {
  if (!claims) return [];
  return claims.claims
    .filter((c) => c.status === "corroborated" || c.status === "partially-corroborated")
    .map((c) => ({ id: c.id, text: c.canonicalText, articleIds: c.supportingArticleIds }));
}

export function compareFraming(
  cluster: LiveCluster,
  articles: LiveArticle[],
  claims?: EventClaims,
): FramingComparison {
  const entity = primaryEntity(articles.map((a) => a.title));
  const core = corroboratedClaims(claims);

  const observations: FramingObservation[] = articles.map((a) => {
    const text = `${a.title}. ${a.excerpt ?? ""}`;
    const s = readStance(text, entity);
    const omitted = core
      .filter((c) => !c.articleIds.includes(a.id))
      .filter((c) => {
        // count it "omitted" only if the headline plausibly could have carried it
        const kw = c.text.toLowerCase().split(/\W+/).filter((w) => w.length > 4).slice(0, 4);
        return !kw.some((w) => a.title.toLowerCase().includes(w));
      })
      .map((c) => c.text)
      .slice(0, 3);
    return {
      articleId: a.id,
      publisherId: publisherSlug(a.publisher),
      headline: a.title,
      language: a.language,
      stance: s.stance,
      emphasis: detectEmphasis(a.title),
      loadedPhrases: loadedPhrases(a.title),
      omittedKeyClaims: omitted,
    };
  });

  // Framing differences: distinct emphasis clusters + stance spread.
  const emphSet = new Set(observations.flatMap((o) => o.emphasis).filter((e) => e !== "uncategorised"));
  const stanceSet = new Set(observations.map((o) => o.stance));
  const framingDifferences: string[] = [];
  if (emphSet.size > 1) framingDifferences.push(`Sources emphasise different aspects: ${[...emphSet].join(", ")}.`);
  if (stanceSet.has("supportive") && stanceSet.has("critical"))
    framingDifferences.push(`Coverage of ${entity?.name ?? "the main actor"} ranges from supportive to critical across sources.`);
  const loadedCount = observations.filter((o) => o.loadedPhrases.length > 0).length;
  if (loadedCount > 0)
    framingDifferences.push(`${loadedCount} of ${observations.length} headlines use loaded or absolute language.`);
  if (!framingDifferences.length) framingDifferences.push("Framing is broadly consistent across sources.");

  const uniqueClaims: FramingComparison["uniqueClaims"] = claims
    ? claims.claims
        .filter((c) => c.status === "single-source" && c.supportingPublisherIds.length === 1)
        .map((c) => ({ claim: c.canonicalText, publisherId: c.supportingPublisherIds[0] }))
        .slice(0, 6)
    : [];

  return {
    observations,
    sharedFactualCore: core.map((c) => c.text).slice(0, 8),
    framingDifferences,
    uniqueClaims,
  };
}
