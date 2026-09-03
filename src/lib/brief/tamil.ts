/**
 * Tamil IFFA Brief.
 *
 * IFFA has no fluent EN→TA translation layer (see src/lib/language/translation.ts
 * — it produces a rough gloss only). So the Tamil brief is NOT a translation of
 * the English prose. It is generated from the SAME selected facts:
 *
 *   1. a fact whose claim has Tamil source text  → use that Tamil text, cleaned
 *   2. a structured fact (a figure, a closure, an alert) → a Tamil template
 *   3. anything else → the Tamil sentence is DROPPED (never fabricated)
 *
 * Every Tamil sentence keeps the English sentence's id and citations, so the two
 * briefs are provably about the same claims and the verifier (./verify.ts) runs
 * on both unchanged. If too little survives in Tamil the Tamil brief is withheld.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Claim } from "@/lib/claims/types";
import { cleanClaimText } from "./text";
import type { BriefSentence, BriefUncertainty, IFFABrief } from "./types";

const TA = {
  killed: (n: string) => `${n} பேர் உயிரிழந்ததாக தகவல்.`,
  injured: (n: string) => `${n} பேர் காயமடைந்ததாக தகவல்.`,
  missing: (n: string) => `${n} பேர் காணாமல் போனதாக தகவல்.`,
  rescued: (n: string) => `${n} பேர் மீட்கப்பட்டனர் / பாதுகாப்பான இடங்களுக்கு மாற்றப்பட்டனர்.`,
  rain: (n: string) => `${n} மி.மீ மழை பதிவாகியுள்ளது.`,
  wind: (n: string) => `மணிக்கு ${n} கி.மீ வேகத்தில் காற்று வீசும் என எதிர்பார்க்கப்படுகிறது.`,
  schoolsClosed: () => `பள்ளிகள் / கல்லூரிகளுக்கு விடுமுறை அறிவிக்கப்பட்டுள்ளது.`,
  transportSuspended: () => `போக்குவரத்து சேவைகள் நிறுத்தப்பட்டுள்ளன.`,
  section144: () => `தடை உத்தரவு (பிரிவு 144) பிறப்பிக்கப்பட்டுள்ளது.`,
  redAlert: () => `கனமழைக்கான சிவப்பு எச்சரிக்கை பிறப்பிக்கப்பட்டுள்ளது.`,
  holiday: () => `பொது விடுமுறை அறிவிக்கப்பட்டுள்ளது.`,
};

function tamilFromClaim(c: Claim): string | undefined {
  if (c.canonicalTextOriginal && /[஀-௿]/.test(c.canonicalTextOriginal)) {
    return cleanClaimText(c.canonicalTextOriginal);
  }
  const taProv = c.provenance.find((p) => (p.sourceTextOriginal && /[஀-௿]/.test(p.sourceTextOriginal)) || (p.language === "ta" && p.sourceText && /[஀-௿]/.test(p.sourceText)));
  if (taProv) return cleanClaimText((taProv.sourceTextOriginal ?? taProv.sourceText)!);
  return undefined;
}

function tamilTemplate(c: Claim): string | undefined {
  const t = c.canonicalText.toLowerCase();
  const num = (c.objects.find((o) => /^\d/.test(o)) ?? (t.match(/\b([\d,]+)\b/)?.[1] ?? "")).replace(/,/g, "");
  if (num) {
    if (/killed|dead|died/.test(t)) return TA.killed(num);
    if (/injured|hurt/.test(t)) return TA.injured(num);
    if (/missing/.test(t)) return TA.missing(num);
    if (/rescued|evacuat/.test(t)) return TA.rescued(num);
    if (/mm of rainfall|rain/.test(t)) return TA.rain(num);
    if (/kmph|km per hour|winds of/.test(t)) return TA.wind(num);
  }
  if (/schools?.*(closed|holiday)|holiday.*schools?/.test(t)) return TA.schoolsClosed();
  if (/(train|bus|metro|flight|rail).*(suspend|cancel)/.test(t)) return TA.transportSuspended();
  if (/section\s*144|prohibitory order/.test(t)) return TA.section144();
  if (/red\s+alert/.test(t)) return TA.redAlert();
  if (/public holiday|holiday was declared/.test(t)) return TA.holiday();
  return undefined;
}

function tamilSentence(s: BriefSentence, claimById: Map<string, Claim>): BriefSentence | null {
  const claims = s.citations.claimIds.map((id) => claimById.get(id)).filter((c): c is Claim => !!c);
  for (const c of claims) {
    const fromSrc = tamilFromClaim(c);
    if (fromSrc && /[஀-௿]/.test(fromSrc)) return { ...s, text: fromSrc };
  }
  for (const c of claims) {
    const tmpl = tamilTemplate(c);
    if (tmpl) return { ...s, text: tmpl };
  }
  return null;
}

/** Build the Tamil brief from the (already verified) English brief. */
export function toTamilBrief(en: IFFABrief, cluster: LiveCluster, articles: LiveArticle[]): IFFABrief {
  const claimById = new Map((cluster.claims?.claims ?? []).map((c) => [c.id, c]));
  const map = (group: BriefSentence[]) => group.map((s) => tamilSentence(s, claimById)).filter((s): s is BriefSentence => !!s);

  // Tamil-source uncertainties only
  const uncertainties: BriefUncertainty[] = en.uncertainties.filter((u) => /[஀-௿]/.test(u.text));

  const shortVersion = map(en.shortVersion);
  const keyFacts = map(en.keyFacts);

  const ta: IFFABrief = {
    ...en,
    language: "ta",
    shortVersion,
    keyFacts,
    whyItMatters: map(en.whyItMatters),
    whatChanged: map(en.whatChanged),
    uncertainties,
    // disagreements are structured (topic + values) — keep as-is, values are numeric/short
    verification: { sentencesConsidered: 0, sentencesDropped: 0, dropReasons: [] },
  };

  if (shortVersion.length === 0) {
    ta.withheldReason = "NO_VERIFIABLE_SENTENCE";
    ta.withheldDetail =
      "தமிழ் மூலத்திலிருந்து இந்த நிகழ்வுக்கான சுருக்கத்தை உருவாக்க போதிய தகவல் இல்லை. ஆங்கிலச் சுருக்கத்தையும் மூலச் செய்திகளையும் கீழே காணலாம்.";
  } else {
    ta.withheldReason = undefined;
    ta.withheldDetail = undefined;
  }
  void articles;
  return ta;
}
