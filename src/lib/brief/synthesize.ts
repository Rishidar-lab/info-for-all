/**
 * DeterministicBriefSynthesizer (Ground-Parity Milestone A).
 *
 * Turns the structured evidence IFFA already has — canonical event identity,
 * extracted claims, evidence statuses, source-family independence, primary
 * records, current event state, novelty, temporal metadata, local impact,
 * political attribution, finance quantities, crisis state, sports state — into a
 * readable native brief. NO language model. Every factual sentence is bound to
 * the claims / sources / records that support it; ./verify.ts then drops any
 * sentence that does not survive structural checks.
 *
 * An optional LLM synthesiser may later be added behind `synthesizeBrief`'s
 * signature; the deterministic path is the product and must always work.
 */
import type { LiveArticle, LiveCluster } from "@/lib/live/types";
import type { Claim, ClaimDispute } from "@/lib/claims/types";
import { CRISIS_TYPE_LABEL } from "@/lib/live/crisis";
import { publisherByName } from "@/data/publishers";
import { familyIndex } from "@/lib/media-landscape/publishers";
import { isJunkFact, selectBriefInputs, type BriefInputs } from "./select";
import {
  cleanClaimText,
  cleanHeadline,
  clipWords,
  fmtISTWindow,
  isGenericActionStub,
  splitAttribution,
  titleCaseAuthority,
} from "./text";
import type {
  BriefDisagreement,
  BriefReference,
  BriefSentence,
  BriefSupport,
  BriefUncertainty,
  CitationBinding,
  IFFABrief,
} from "./types";

export interface SynthesizeOptions {
  language: "en" | "ta";
  now?: number;
}

const GENERIC_CHANGE =
  /^(no new report|a new event|not matched to a prior snapshot|reporting is|# ?new claim|new figure|\d+ new claim)/i;

function supportFor(c: Claim): BriefSupport {
  if (c.status === "disputed") return "DISPUTED";
  if (c.status === "corroborated" && c.independentSourceGroups.length >= 3) return "STRONG";
  if (c.status === "corroborated" || c.status === "partially-corroborated") return "MODERATE";
  if (c.status === "attributed") return c.supportingPublisherIds.length >= 2 ? "MODERATE" : "LIMITED";
  return "LIMITED";
}

class SentenceFactory {
  private n = 0;
  constructor(private slug: string) {}
  make(text: string, cite: CitationBinding, support: BriefSupport, attributedTo?: string): BriefSentence {
    return { id: `${this.slug}-s${++this.n}`, text: text.replace(/\s+/g, " ").trim(), citations: cite, support, attributedTo };
  }
}

function cite(claims: Claim[] = [], articleIds: string[] = [], evidenceIds: string[] = []): CitationBinding {
  const claimIds = [...new Set(claims.map((c) => c.id))];
  // prefer the claims' own supporters; extra article ids are a fallback only when
  // there is no claim (CAP lead, confirmed-facts). Never dump the whole cluster.
  const fromClaims = [...new Set(claims.flatMap((c) => c.supportingArticleIds))];
  const sourceIds = fromClaims.length > 0 ? fromClaims : [...new Set(articleIds)].slice(0, 6);
  const evIds = [...new Set([...evidenceIds, ...claims.flatMap((c) => c.primaryEvidenceIds)])];
  return { claimIds, sourceIds, evidenceIds: evIds };
}

/** The dominant place of an event. */
function placeOf(cluster: LiveCluster): string | undefined {
  if (cluster.districts.length === 1) return cluster.districts[0];
  if (cluster.districts.length > 1) return `${cluster.districts.slice(0, 2).join(" and ")}${cluster.districts.length > 2 ? " districts" : ""}`;
  const li = cluster.trendData?.localImpact;
  if (li?.affectedDistricts.length) return li.affectedDistricts.slice(0, 2).join(" and ");
  if (cluster.scope === "tamil-nadu") return "Tamil Nadu";
  if (cluster.cap?.areaDescription && cluster.cap.areaDescription.length < 60) return cluster.cap.areaDescription;
  return undefined;
}

// ── lead sentence ────────────────────────────────────────────────────────────

function leadSentences(inp: BriefInputs, F: SentenceFactory): BriefSentence[] {
  const { cluster, usableClaims } = inp;
  const td = cluster.trendData;
  const out: BriefSentence[] = [];

  // 1. Official CAP alert
  if (cluster.cap && (cluster.cap.event || cluster.cap.senderName)) {
    const cap = cluster.cap;
    const authority = cap.senderName ? cap.senderName : "The disaster-management authority";
    const evName = cap.event ?? (cluster.crisisType ? CRISIS_TYPE_LABEL[cluster.crisisType] : "weather");
    const sev = cap.severity && !/^alert$/i.test(cap.severity) ? `${cap.severity.toLowerCase()} ` : "";
    const area = cap.areaDescription && cap.areaDescription.length < 80 ? ` for ${cap.areaDescription}` : cluster.districts.length ? ` for ${cluster.districts.slice(0, 3).join(", ")}` : "";
    const win = fmtISTWindow(cap.effectiveFrom, cap.effectiveUntil);
    const text = `${authority} has issued a ${sev}${evName} alert${area}${win ? `, in effect ${win}` : ""}.`;
    const evidenceIds = inp.primaryEvidence.map((e) => e.id);
    out.push(F.make(text, cite([], inp.officialArticles.map((a) => a.id), evidenceIds), "MODERATE"));
  }

  // 2. Finance policy decision
  const fin = td?.financeEvent?.policy;
  if (!out.length && fin) {
    const decision =
      fin.decision === "hold" ? "left unchanged" : fin.decision === "cut" ? "cut" : fin.decision === "hike" ? "raised" : "changed";
    const val =
      fin.newValue && fin.previousValue
        ? `, to ${fin.newValue} from ${fin.previousValue}`
        : fin.newValue
          ? `, to ${fin.newValue}`
          : fin.changeBps
            ? ` by ${fin.changeBps} bps`
            : "";
    const eff = fin.effectiveFrom ? `, effective ${fin.effectiveFrom}` : "";
    const anchor = usableClaims.filter((c) => /rate|repo|policy|gst|tariff|bps/i.test(c.canonicalText)).slice(0, 2);
    out.push(
      F.make(
        `${fin.authority} ${decision} its ${fin.instrument || "policy rate"}${val}${eff}.`,
        cite(anchor, inp.newsArticles.map((a) => a.id)),
        anchor.length ? supportFor(anchor[0]) : "LIMITED",
      ),
    );
  }

  // 3. Sports fixture — needs two teams or a result to phrase safely
  const sp = td?.sportsEvent;
  if (!out.length && sp && (sp.teams.length >= 2 || sp.result?.winner)) {
    const comp = [sp.competition, sp.round].filter(Boolean).join(" ");
    let text: string;
    if (sp.result?.winner) {
      text = `${sp.result.winner} won${sp.result.margin ? ` by ${sp.result.margin}` : ""}${comp ? ` in the ${comp}` : ""}${sp.teams.length === 2 ? `, beating ${sp.teams.find((t) => t !== sp.result!.winner) ?? "their opponents"}` : ""}.`;
    } else if (sp.status === "scheduled" || sp.status === "live") {
      text = `${sp.teams.join(" and ")}${sp.teams.length ? " are" : "Teams are"} ${sp.status === "live" ? "playing" : "set to play"}${comp ? ` in the ${comp}` : ""}${sp.date ? ` on ${sp.date}` : ""}.`;
    } else {
      text = `${comp || "The fixture"}${sp.teams.length ? `: ${sp.teams.join(" v ")}` : ""} — ${sp.status}.`;
    }
    const anchor = usableClaims.slice(0, 1);
    out.push(F.make(text, cite(anchor, inp.articles.map((a) => a.id)), "MODERATE"));
  }

  const enTitle =
    /[஀-௿]/.test(cluster.title) && inp.articles.some((a) => a.language === "en")
      ? inp.articles.find((a) => a.language === "en")!.title
      : cluster.title;
  const headline = cleanHeadline(enTitle);
  const eventClaims = usableClaims.filter((c) => c.type === "event" && !isGenericActionStub(c.canonicalText));
  const cleanEventClaim =
    eventClaims.find((c) => c.canonicalLanguage !== "ta" && (c.status === "corroborated" || c.status === "partially-corroborated")) ??
    eventClaims.find((c) => c.canonicalLanguage !== "ta") ??
    eventClaims.find((c) => c.status === "corroborated" || c.status === "partially-corroborated") ??
    eventClaims[0] ??
    usableClaims.find((c) => c.type === "event");

  // 4. Court ruling
  const rulingRe = /\b(supreme court|high court|madras (?:high )?court|bench|court|tribunal)\b/i;
  const verdictRe = /\b(reject\w*|dismiss\w*|rule[sd]?|ruling|uphold\w*|upheld|quash\w*|stay\w*|grant\w*|allow\w*|refus\w*|declin\w*|strike[sd]? down|acquit\w*|convict\w*|order\w*)\b/i;
  if (!out.length && rulingRe.test(headline) && verdictRe.test(`${headline} ${cleanEventClaim?.canonicalText ?? ""}`)) {
    const anchor = cleanEventClaim ? [cleanEventClaim] : [];
    out.push(F.make(headline.endsWith(".") ? headline : `${headline}.`, cite(anchor, inp.articles.map((a) => a.id)), anchor.length ? supportFor(anchor[0]) : "MODERATE"));
  }

  // 5. Political announcement / speech act — only when the headline is a fragment
  const pc = td?.politicalCoverage;
  const announceInHeadline = /\b(announce\w*|unveil\w*|launch\w*|to move|to be launched|declares?|declared|rolls? out|proposes?|to introduce|plans? (?:to|for)|sanction\w*|approv\w*)\b/i.test(headline);
  if (!out.length && pc && pc.actors.length && (pc.speechAct === "announcement" || pc.speechAct === "order" || pc.speechAct === "assertion")) {
    if (announceInHeadline || !cleanEventClaim) {
      // the headline already states the announcement — use it as a declarative
      out.push(F.make(headline.endsWith(".") ? headline : `${headline}.`, cite(cleanEventClaim ? [cleanEventClaim] : [], inp.articles.map((a) => a.id)), cleanEventClaim ? supportFor(cleanEventClaim) : "LIMITED", pc.actors[0]));
    } else {
      const actor = titleCaseAuthority(pc.actors[0]);
      const what = lowerFirst(stripLeadActor(cleanHeadline(cleanEventClaim.canonicalText)));
      out.push(F.make(`${actor} announced ${what}${/[.!?]$/.test(what) ? "" : "."}`, cite([cleanEventClaim], inp.articles.map((a) => a.id)), supportFor(cleanEventClaim), pc.actors[0]));
    }
  }

  // 6. Allegation / criticism / response
  if (!out.length && pc && pc.actors.length && (pc.speechAct === "allegation" || pc.speechAct === "criticism" || pc.speechAct === "denial" || pc.speechAct === "response")) {
    const verb = pc.speechAct === "allegation" ? "alleged" : pc.speechAct === "criticism" ? "criticised" : pc.speechAct === "denial" ? "denied" : "responded";
    const actor = titleCaseAuthority(pc.actors[0]);
    const what = cleanEventClaim ? lowerFirst(stripLeadActor(cleanHeadline(cleanEventClaim.canonicalText))) : lowerFirst(headline);
    // if the headline already reads as "X slams Y", keep it
    if (/\b(slams?|hits? out|alleges?|accus\w+|denies|responds?|criticis\w+|flays?|questions?)\b/i.test(headline)) {
      out.push(F.make(headline.endsWith(".") ? headline : `${headline}.`, cite(cleanEventClaim ? [cleanEventClaim] : [], inp.articles.map((a) => a.id)), cleanEventClaim ? supportFor(cleanEventClaim) : "LIMITED", pc.actors[0]));
    } else {
      out.push(F.make(`${actor} ${verb} ${what}${/[.!?]$/.test(what) ? "" : "."}`, cite(cleanEventClaim ? [cleanEventClaim] : [], inp.articles.map((a) => a.id)), cleanEventClaim ? supportFor(cleanEventClaim) : "LIMITED", pc.actors[0]));
    }
  }

  // 7. Default — the corroborated event claim, else the cleaned headline
  if (!out.length) {
    if (cleanEventClaim) {
      out.push(F.make(cleanClaimText(cleanEventClaim.canonicalText), cite([cleanEventClaim], inp.articles.map((a) => a.id)), supportFor(cleanEventClaim)));
    } else {
      out.push(F.make(headline.endsWith(".") ? headline : `${headline}.`, cite([], inp.articles.map((a) => a.id)), "LIMITED"));
    }
  }

  // 6. Optional second sentence — the strongest non-event corroborated claim
  const second = usableClaims.find(
    (c) =>
      c.type !== "event" &&
      (c.status === "corroborated" || c.status === "partially-corroborated") &&
      !out.some((s) => s.citations.claimIds.includes(c.id)),
  );
  if (second && out.length < 2) {
    out.push(F.make(cleanClaimText(second.canonicalText), cite([second]), supportFor(second)));
  }

  return out.slice(0, 3);
}

// ── key facts ────────────────────────────────────────────────────────────────

function keyFactSentences(inp: BriefInputs, F: SentenceFactory, usedClaimIds: Set<string>): BriefSentence[] {
  const { usableClaims, cluster } = inp;
  const out: BriefSentence[] = [];
  const seen = new Set<string>();

  const push = (s: BriefSentence) => {
    const k = s.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 60);
    if (seen.has(k) || !k) return;
    if (isLowValueFact(s.text)) return;
    seen.add(k);
    out.push(s);
  };

  const disputedFields = new Set((cluster.claims?.disputes ?? []).map((d) => d.field.replace(/ /g, "_")));

  // structured facts first: corroborated, then attributed, then single-source statistics
  for (const c of usableClaims) {
    if (out.length >= 7) break;
    if (usedClaimIds.has(c.id)) continue;
    if (c.status === "disputed") continue;
    if (c.type === "event" && (c.status === "single-source" || c.status === "uncertain")) continue;
    if (isGenericActionStub(cleanClaimText(c.canonicalText))) {
      usedClaimIds.add(c.id);
      continue;
    }
    // a claim on a disputed numeric field belongs in "disagreements", not key facts
    if (c.predicates.some((p) => disputedFields.has(p))) {
      usedClaimIds.add(c.id);
      continue;
    }

    if (c.status === "attributed" || c.type === "allegation" || c.type === "prediction") {
      const { text: raw, speaker: parsed } = splitAttribution(c.canonicalText);
      const provSpeaker = c.provenance.find((p) => p.attribution)?.attribution;
      const speaker = normSpeaker(parsed ?? provSpeaker ?? c.subjects[0]);
      const text = trimDangling(stripLeadActor(raw));
      if (text.length < 14) {
        usedClaimIds.add(c.id);
        continue;
      }
      const rendered =
        speaker && !ATTRIBUTION_CUE_RE.test(text.slice(0, 40))
          ? `${titleCaseAuthority(speaker)} said ${lowerFirst(text)}`
          : text;
      push(F.make(rendered, cite([c]), supportFor(c), speaker));
    } else if (c.status === "corroborated" || c.status === "partially-corroborated" || (c.type === "statistic" && c.status === "single-source")) {
      push(F.make(cleanClaimText(c.canonicalText), cite([c]), supportFor(c)));
    }
    usedClaimIds.add(c.id);
  }

  // event-state confirmed facts (esp. official alerts) — non-duplicate, readable
  const es = cluster.trendData?.eventState;
  for (const f of es?.confirmedFacts ?? []) {
    if (out.length >= 7) break;
    const t = f.trim();
    if (t.length < 12 || t.length > 160) continue;
    if (isJunkFact(t)) continue;
    if (t.toLowerCase().startsWith(inp.cluster.title.toLowerCase().slice(0, 30))) continue;
    if (inp.cluster.title.toLowerCase().includes(t.toLowerCase().slice(0, 40))) continue;
    push(F.make(sentenceCase(t), cite([], inp.officialArticles.concat(inp.articles).slice(0, 6).map((a) => a.id), inp.primaryEvidence.map((e) => e.id)), inp.officialArticles.length ? "MODERATE" : "LIMITED"));
  }

  // local impact — grounded, phrase-backed
  const li = cluster.trendData?.localImpact;
  if (li && li.statements.length && out.length < 7) {
    for (const st of li.statements.slice(0, 2)) {
      push(F.make(sentenceCase(st.text), cite([], inp.articles.map((a) => a.id)), "MODERATE"));
    }
  }

  // finance market moves
  const moves = cluster.trendData?.financeEvent?.marketMoves ?? [];
  for (const m of moves.slice(0, 2)) {
    if (out.length >= 7) break;
    push(
      F.make(
        `${cap(m.instrument ?? "The market")} moved ${m.direction} ${m.value} ${m.unit}.`,
        cite(usableClaims.filter((c) => new RegExp(String(m.value)).test(c.canonicalText)).slice(0, 1), inp.newsArticles.map((a) => a.id)),
        "MODERATE",
      ),
    );
  }

  return out.slice(0, 7);
}

// ── uncertainties ────────────────────────────────────────────────────────────

function uncertaintySentences(inp: BriefInputs, slug: string): BriefUncertainty[] {
  const { cluster, claims, usableClaims } = inp;
  const out: BriefUncertainty[] = [];
  let n = 0;
  const add = (text: string, from: BriefUncertainty["derivedFrom"], c: CitationBinding) => {
    const key = text.toLowerCase().slice(0, 50);
    if (out.some((u) => u.text.toLowerCase().slice(0, 50) === key)) return;
    out.push({ id: `${slug}-u${++n}`, text: text.replace(/\s+/g, " ").trim(), derivedFrom: from, citations: c });
  };

  const isCrisis = cluster.isCrisis || cluster.trendData?.category === "crisis";
  // crisis-shaped "no casualty / no CAP record" notes are noise on a non-crisis story
  const crisisShaped = /casualty|evacuation|damage figure|CAP alert|on-ground report|on-the-ground report/i;
  const keep = (t: string) => isCrisis || !crisisShaped.test(t);

  const es = cluster.trendData?.eventState;
  for (const q of es?.openQuestions ?? es?.unresolvedQuestions ?? []) {
    if (out.length >= 4) break;
    if (/claim-by-claim comparison awaits review/i.test(q) || !keep(q)) continue;
    add(q, "event-state", cite([], inp.articles.slice(0, 5).map((a) => a.id)));
  }
  for (const u of claims?.unknowns ?? []) {
    if (out.length >= 4) break;
    if (/claim-by-claim comparison awaits review/i.test(u) || !keep(u)) continue;
    add(u, "claim-unknowns", cite([], inp.articles.slice(0, 5).map((a) => a.id)));
  }
  const singles = usableClaims.filter((c) => c.status === "single-source" && c.type !== "event");
  if (singles.length && out.length < 4) {
    add(
      `${singles.length === 1 ? "One statement below rests" : `${singles.length} statements below rest`} on a single source and ${singles.length === 1 ? "is" : "are"} not independently confirmed.`,
      "single-source",
      cite(singles),
    );
  }
  if (inp.officialArticles.length > 0 && inp.newsArticles.length === 0 && out.length < 4) {
    add("No independent on-the-ground report has corroborated this official alert yet.", "no-corroboration", cite([], inp.officialArticles.map((a) => a.id)));
  }
  return out;
}

// ── why it matters ───────────────────────────────────────────────────────────

function whyItMattersSentences(inp: BriefInputs, F: SentenceFactory): BriefSentence[] {
  const { cluster, usableClaims } = inp;
  const out: BriefSentence[] = [];
  const td = cluster.trendData;

  const li = td?.localImpact;
  if (li && li.scale !== "none" && (li.affectedInfrastructure.length || li.impactKinds.length)) {
    const what = [...new Set([...li.affectedInfrastructure, ...li.affectedInstitutions])].slice(0, 3).join(", ");
    const where = li.affectedDistricts.slice(0, 3).join(", ") || li.affectedTowns.slice(0, 3).join(", ");
    if (what) {
      out.push(
        F.make(
          `The disruption affects ${what}${where ? ` in ${where}` : ""} (${li.scale.replace(/-/g, " ")}).`,
          cite([], inp.articles.map((a) => a.id)),
          "MODERATE",
        ),
      );
    }
  }

  const casualty = usableClaims.find((c) => c.type === "statistic" && /killed|died|dead|injured|missing/i.test(c.canonicalText));
  if (casualty && !out.some((s) => s.citations.claimIds.includes(casualty.id))) {
    out.push(F.make(cleanClaimText(casualty.canonicalText), cite([casualty]), supportFor(casualty)));
  }

  const sev = td?.severity;
  if (sev && (sev.level === "severe" || sev.level === "critical") && out.length === 0) {
    out.push(F.make(sentenceCase(sev.reason), cite([], inp.articles.map((a) => a.id)), "LIMITED"));
  }

  // public-safety official action (closures / prohibitory orders / evacuation)
  const action = usableClaims.find((c) =>
    /(were|was) (closed|suspended|cancelled|banned|imposed|ordered)\b/i.test(c.canonicalText),
  );
  if (action && !out.some((s) => s.citations.claimIds.includes(action.id)) && out.length < 3) {
    out.push(F.make(cleanClaimText(action.canonicalText), cite([action]), supportFor(action)));
  }

  return out.slice(0, 3);
}

// ── what changed ─────────────────────────────────────────────────────────────

function whatChangedSentences(inp: BriefInputs, F: SentenceFactory): BriefSentence[] {
  const { cluster, usableClaims } = inp;
  const out: BriefSentence[] = [];
  const es = cluster.trendData?.eventState;
  const nov = cluster.trendData?.novelty;

  for (const ch of nov?.changes ?? []) {
    if (out.length >= 3) break;
    if (GENERIC_CHANGE.test(ch)) continue;
    out.push(F.make(sentenceCase(ch), cite([], inp.articles.map((a) => a.id)), "LIMITED"));
  }
  for (const corr of es?.corrections ?? []) {
    if (out.length >= 3) break;
    out.push(F.make(`Correction: ${sentenceCase(corr)}`, cite(usableClaims.filter((c) => c.corrections.length).slice(0, 1), inp.articles.map((a) => a.id)), "MODERATE"));
  }
  // a superseded figure
  const superseded = usableClaims.filter((c) => c.updates.some((u) => u.supersedes));
  for (const c of superseded.slice(0, 2)) {
    if (out.length >= 3) break;
    const u = c.updates.find((x) => x.supersedes)!;
    out.push(F.make(`An earlier figure was revised (${u.change}).`, cite([c]), "MODERATE"));
  }
  return out;
}

// ── disagreements ────────────────────────────────────────────────────────────

function disagreements(inp: BriefInputs): BriefDisagreement[] {
  const { claims, articles } = inp;
  if (!claims) return [];
  const pubOf = new Map(articles.map((a) => [a.id, a.publisher]));
  return claims.disputes.map((d: ClaimDispute) => {
    const fv = (v: string) => formatDisputeValue(d.field, v);
    const posA = { value: fv(d.a.value), sourceIds: [] as string[], publishers: d.a.publisherIds, at: d.a.at };
    const posB = { value: fv(d.b.value), sourceIds: [] as string[], publishers: d.b.publisherIds, at: d.b.at };
    // best-supported: more distinct publishers, else the later value on a temporal update
    let bestSupported: string | undefined;
    let reasoning: string | undefined;
    if (d.possiblyTemporalUpdate) {
      bestSupported = fv(d.b.value);
      reasoning = "The later report is treated as an update; the earlier figure stays on the timeline.";
    } else if (d.a.publisherIds.length !== d.b.publisherIds.length) {
      const more = d.a.publisherIds.length > d.b.publisherIds.length ? d.a : d.b;
      bestSupported = fv(more.value);
      reasoning = `Reported by more sources (${more.publisherIds.length} vs ${(more === d.a ? d.b : d.a).publisherIds.length}). Best-supported ≠ confirmed true.`;
    } else {
      reasoning = "Sources are evenly split — IFFA does not pick one.";
    }
    void pubOf;
    return { topic: d.field, positions: [posA, posB], bestSupported, reasoning, possiblyTemporalUpdate: d.possiblyTemporalUpdate };
  });
}

// ── references ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  "official-alert": "Official alert",
  "primary-document": "Primary document",
  "government-statement": "Government statement",
  "on-ground-report": "On-the-ground report",
  "independent-report": "News report",
  "expert-analysis": "Expert analysis",
  "fact-check": "Fact-check",
  "developing-unverified": "Developing report",
};

function references(inp: BriefInputs): BriefReference[] {
  const { articles, claims } = inp;
  const claimsByArticle = new Map<string, string[]>();
  for (const c of claims?.claims ?? []) {
    for (const aid of c.supportingArticleIds) {
      const list = claimsByArticle.get(aid) ?? [];
      list.push(c.id);
      claimsByArticle.set(aid, list);
    }
  }
  const seenUrl = new Set<string>();
  const refs: BriefReference[] = [];
  for (const a of articles) {
    if (seenUrl.has(a.url)) continue;
    seenUrl.add(a.url);
    const p = publisherByName(a.publisher);
    refs.push({
      sourceId: a.id,
      publisher: a.publisher,
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      language: a.language,
      roleLabel: ROLE_LABEL[a.evidenceRole] ?? "News report",
      evidenceRole: a.evidenceRole,
      supportsClaimIds: claimsByArticle.get(a.id) ?? [],
      excerpt: a.excerpt && a.excerpt.length > 20 ? clipWords(a.excerpt, 40) : undefined,
      isPrimaryRecord: a.evidenceRole === "official-alert" || a.evidenceRole === "primary-document",
    });
    void p;
  }
  for (const e of claims?.evidence ?? []) {
    if (seenUrl.has(e.url)) continue;
    seenUrl.add(e.url);
    refs.push({
      sourceId: e.id,
      publisher: e.publisher,
      title: e.title,
      url: e.url,
      publishedAt: e.publishedAt ?? "",
      language: "en",
      roleLabel: "Primary record",
      evidenceRole: "primary-record",
      supportsClaimIds: e.supportsClaimIds,
      isPrimaryRecord: true,
    });
  }
  return refs;
}

// ── entry point ──────────────────────────────────────────────────────────────

/**
 * Synthesize the RAW brief (pre-verification). Call ./verify.ts `verifyBrief`
 * before rendering — it drops any sentence that fails structural checks.
 */
export function synthesizeBrief(cluster: LiveCluster, articles: LiveArticle[], opts: SynthesizeOptions): IFFABrief {
  const inp = selectBriefInputs(cluster, articles);
  const slug = cluster.slug || cluster.id;
  const F = new SentenceFactory(slug);
  const generatedAt = new Date(opts.now ?? Date.now()).toISOString();
  const headline = cleanHeadline(cluster.title);
  const place = placeOf(cluster);
  const category = cluster.trendData?.category ?? "other-relevant";

  const base: IFFABrief = {
    eventId: cluster.id,
    slug,
    generatedAt,
    language: "en",
    category,
    headline,
    place,
    shortVersion: [],
    keyFacts: [],
    uncertainties: [],
    whyItMatters: [],
    whatChanged: [],
    disagreements: [],
    references: references(inp),
    coverage: inp.coverage,
    verification: { sentencesConsidered: 0, sentencesDropped: 0, dropReasons: [] },
    synthesizer: "deterministic-v1",
  };

  if (inp.withhold) {
    base.withheldReason = inp.withhold.reason;
    base.withheldDetail = inp.withhold.detail;
    base.familyMerges = inp.withhold.familyMerges;
    // still surface disagreements + references so the page is not empty
    base.disagreements = disagreements(inp);
    return base;
  }

  const lead = leadSentences(inp, F);
  const usedClaimIds = new Set<string>(lead.flatMap((s) => s.citations.claimIds));
  const keyFacts = keyFactSentences(inp, F, usedClaimIds);
  const why = whyItMattersSentences(inp, F);
  const changed = whatChangedSentences(inp, F);
  const uncertain = uncertaintySentences(inp, slug);

  base.shortVersion = lead;
  base.keyFacts = keyFacts;
  base.whyItMatters = why;
  base.whatChanged = changed;
  base.uncertainties = uncertain;
  base.disagreements = disagreements(inp);
  base.verification.sentencesConsidered =
    lead.length + keyFacts.length + why.length + changed.length;

  void familyIndex;
  return base;
}

// ── tiny helpers ─────────────────────────────────────────────────────────────

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
function sentenceCase(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  const c = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(c) ? c : `${c}.`;
}
/**
 * A key fact must carry information. Reject pronoun-led human-interest lines with
 * no number, no named entity and no concrete action ("His 43 years in uniform
 * taught him discipline…").
 */
function isLowValueFact(text: string): boolean {
  const t = text.trim();
  if (!/^(he|his|she|her|they|their|it|we|i)\b/i.test(t)) return false;
  // keep it only if it carries a hard signal
  const hasNamedThing = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(t.replace(/^\S+\s/, "")); // 2+ Title words
  const hasQuantity = /₹|\b\d[\d,.]*\s*(crore|lakh|%|per cent|mm|cusecs?|kmph|bps|points?|runs?|wickets?|dead|killed|injured|missing)\b/i.test(t);
  const hasAction = /\b(announced?|passed?|cleared?|rejected?|ruled?|upheld|quashed|opened?|signed?|approved?|sanctioned?|launched?|ordered?|won|lost|resigned?|arrested?|banned?|imposed?|withdrew|withdrawn)\b/i.test(t);
  return !hasNamedThing && !hasQuantity && !hasAction;
}

/** Render a disputed value with the unit its field implies. */
function formatDisputeValue(field: string, value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  const f = field.toLowerCase();
  if (/inr|amount|crore|rupee/.test(f)) {
    if (n >= 1e7) return `₹${(n / 1e7).toLocaleString("en-IN")} crore`;
    if (n >= 1e5) return `₹${(n / 1e5).toLocaleString("en-IN")} lakh`;
    return `₹${n.toLocaleString("en-IN")} crore`;
  }
  if (/mm|rain/.test(f)) return `${value} mm`;
  if (/cusec/.test(f)) return `${value} cusecs`;
  if (/km|wind|speed/.test(f)) return `${value} kmph`;
  return value;
}

function stripLeadActor(s: string): string {
  return s.replace(/^(?:the\s+)?(?:tamil nadu\s+)?(?:cm|chief minister|minister|governor|government|opposition)\b[\s,:-]*/i, "");
}
const JUNK_SPEAKER_RE = /^(a statement|as per|according to|sources?|the said|per the|report|it|they|petition|officials?)\b/i;
const ATTRIBUTION_CUE_RE = /\b(said|says|announced?|stated?|alleged?|accus\w+|claimed?|warned?|forecast|urged?|proposed?|denied?|noted?)\b/i;
/** Drop a sentence that ends on a dangling preposition/conjunction (a clipped claim). */
function trimDangling(s: string): string {
  return s.replace(/[\s,]+(under|for|to|with|and|of|in|on|at|by|from|as|that|which|the|a)\s*[.…]?\s*$/i, ".").replace(/\.\.$/, ".");
}
function normSpeaker(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  if (!t || JUNK_SPEAKER_RE.test(t) || t.length > 44) return undefined;
  return t;
}
