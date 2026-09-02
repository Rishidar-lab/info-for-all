/**
 * Consequence model (v0.9, Phase I).
 *
 * "How consequential is this event?" — as a set of interpretable, evidence-backed
 * signals, NOT an emotional-intensity reading of the headline.
 *
 * Design intent (from the spec): a gruesome single-victim crime headline must
 * not outrank a statewide cyclone warning merely because its wording is more
 * vivid. Emotional-intensity words (`brutal`, `horrific`, `chilling`) therefore
 * carry ZERO weight here. Consequence comes from what is reported to be
 * affected — people, services, institutions, the economy, the legal/electoral
 * order — and from official emergency action.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";

const OFFICIAL_PRIMARY = new Set(["official-alert", "primary-document"]);

export interface ConsequenceSignal {
  name:
    | "humanSafety"
    | "serviceDisruption"
    | "displacement"
    | "officialEmergencyAction"
    | "scale"
    | "economicImpact"
    | "legalElectoralWeight"
    | "sportsSignificance";
  value: number; // 0–1
  evidence: string;
}

export interface Consequence {
  /** 0–1, the max-with-diminishing-returns combination of the signals below. */
  score: number;
  signals: ConsequenceSignal[];
  /** true when the ONLY signal is a single-victim crime — kept low on purpose. */
  isolatedIncident: boolean;
}

const RE = {
  deathsInjuries:
    /\b(\d[\d,]*)\s+(?:killed|dead|died|feared dead|bodies|charred|drowned|electrocuted|injured|hurt|hospitalised|missing|feared trapped)\b/i,
  safetyWords:
    /\b(killed|dead|died|casualties|fatalities|injured|hospitalised|missing|feared trapped|rescue operation|search and rescue|mass casualty)\b/i,
  serviceDisruption:
    /\b(schools?\s+(?:closed|shut)|holiday declared|bus services?\s+(?:suspended|withdrawn|hit)|train services?\s+(?:cancell?ed|suspended|disrupted)|flights?\s+(?:cancell?ed|delayed|diverted)|power (?:cut|outage|shutdown)|water supply (?:cut|disrupted|affected)|highway (?:blocked|closed|cut off)|metro services?\s+(?:hit|suspended))\b/i,
  displacement:
    /\b(evacuat\w+|relief camps?|shifted to (?:safety|camps?|shelters?)|rendered homeless|marooned|stranded (?:passengers|residents|families))\b/i,
  officialEmergency:
    /\b(evacuation order|ordered? (?:an )?evacuation|section 144|prohibitory orders?|disaster declared|declared (?:a )?(?:calamity|emergency)|ndrf (?:deployed|teams?)|army (?:called in|deployed)|red alert|orange alert|state of emergency|relief operations? launched)\b/i,
  scalePeople:
    /\b(lakh|lakhs|crore|thousands?|hundreds?|tens of thousands)\s+(?:of\s+)?(?:people|residents|families|passengers|voters|farmers|workers|commuters|students)\b/i,
  economic:
    /\b(₹|rs\.?\s?)\s?\d[\d,]*\s?(?:crore|lakh|billion|trillion)\b|\b(?:sensex|nifty)\s+(?:crash\w*|plunge\w*|tank\w*|slump\w*|surge\w*|rally\w*|jump\w*)|\b(?:gdp|inflation|repo rate|fiscal deficit|gst collections?)\b|\bcrop (?:loss|damage)\b|\b(?:factory|unit) (?:shut|closure)\b/i,
  legalElectoral:
    /\b(supreme court|high court|verdict|judg[e]?ment|struck down|upheld|set aside|quashed|ordinance|bill passed|passed the bill|assembly (?:passes|clears)|election results?|by-?election result|vote count|majority|no-confidence|floor test|disqualified?)\b/i,
  sportsSignificant:
    /\b(final|semi-?final|knockout|title decider|series decider|do-or-die|world cup|asia cup|olympic|record[- ]breaking|clinch\w*|qualif\w+ for the (?:final|knockout))\b/i,
  isolatedCrime:
    /\b(murder|killed|stabbed|hacked to death|found dead|body found|honour killing|suicide|dowry death|assault|robbery|kidnap\w*)\b/i,
  crimeScale:
    /\b(serial|spree|riot\w*|mass|communal|caste (?:clash|violence)|mob|lynch\w*|\d+\s+(?:killed|injured|arrested))\b/i,
};

const has = (re: RegExp, s: string) => re.test(s);

export function assessConsequence(cluster: LiveCluster, articles: LiveArticle[]): Consequence {
  const text = [cluster.title, ...articles.map((a) => `${a.title}. ${a.excerpt ?? ""}`)].join("  ·  ");
  const signals: ConsequenceSignal[] = [];
  const push = (name: ConsequenceSignal["name"], value: number, evidence: string) => {
    if (value > 0) signals.push({ name, value: Math.round(value * 100) / 100, evidence });
  };

  // ── human safety — count-scaled, not word-scaled ──
  const dm = RE.deathsInjuries.exec(text);
  if (dm) {
    const n = parseInt(dm[1].replace(/,/g, ""), 10) || 1;
    const dead = /killed|dead|died|bodies|drowned|charred|electrocuted/i.test(dm[0]);
    push("humanSafety", Math.min(1, (dead ? 0.5 : 0.3) + Math.min(n, 20) * (dead ? 0.035 : 0.02)), dm[0].trim());
  } else if (has(RE.safetyWords, text)) {
    push("humanSafety", 0.42, (RE.safetyWords.exec(text) ?? [""])[0].trim());
  }

  const sd = RE.serviceDisruption.exec(text);
  if (sd) push("serviceDisruption", 0.6, sd[0].trim());

  const dp = RE.displacement.exec(text);
  if (dp) push("displacement", 0.7, dp[0].trim());

  const oe = RE.officialEmergency.exec(text);
  if (oe) push("officialEmergencyAction", 0.78, oe[0].trim());
  else if (articles.some((a) => OFFICIAL_PRIMARY.has(a.evidenceRole)) && cluster.isCrisis) {
    push("officialEmergencyAction", 0.5, "an official alert / primary source for an active crisis");
  }

  // ── scale — a single district is NOT "scale"; needs ≥2 districts, an explicit
  //    people count, or a state-wide phrase ──
  const districts = cluster.districts.length;
  const sp = RE.scalePeople.exec(text);
  const stateWide = /\b(state-?wide|across (?:the )?state|all districts|throughout tamil nadu)\b/i.test(text);
  let scaleV = 0;
  if (districts >= 2) scaleV = Math.min(0.7, districts * 0.12);
  if (sp) scaleV = Math.max(scaleV, 0.62);
  if (stateWide) scaleV = Math.max(scaleV, 0.8);
  if (scaleV > 0) push("scale", scaleV, sp ? sp[0].trim() : stateWide ? "state-wide" : `${districts} districts named`);

  const ec = RE.economic.exec(text);
  if (ec) push("economicImpact", 0.55, ec[0].trim());

  const le = RE.legalElectoral.exec(text);
  if (le) push("legalElectoralWeight", 0.5, le[0].trim());

  const sig = RE.sportsSignificant.exec(text);
  if (sig && cluster.trendData?.category === "sports") push("sportsSignificance", 0.5, sig[0].trim());

  // ── an isolated single-victim crime, and nothing else ──
  const crimeContext = has(RE.isolatedCrime, text);
  const crimeAtScale = has(RE.crimeScale, text);
  const nonCrimeSignals = signals.filter(
    (s) => s.name !== "legalElectoralWeight" && !(s.name === "humanSafety" && crimeContext && !crimeAtScale),
  );
  const isolatedIncident = crimeContext && !crimeAtScale && nonCrimeSignals.length === 0;
  if (isolatedIncident) {
    // keep it firmly low — one incident, however it is worded
    return {
      score: signals.length ? 0.2 : 0.12,
      signals,
      isolatedIncident: true,
    };
  }

  // ── combine: strongest signal dominates, others add with diminishing returns ──
  const sorted = [...signals].sort((a, b) => b.value - a.value);
  let score = 0;
  for (let i = 0; i < sorted.length; i++) score = Math.max(score, sorted[i].value) + (i === 0 ? 0 : sorted[i].value * 0.25);
  score = Math.min(1, score);

  return { score: Math.round(score * 100) / 100, signals: sorted, isolatedIncident: false };
}
