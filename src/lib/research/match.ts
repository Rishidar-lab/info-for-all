/**
 * §B.2.3 — thin-claim matching.
 *
 * IFFA's claims come from a headline + a short excerpt; records are full
 * documents. Fewer claims, each TIGHTLY anchored. Partial match is not match —
 * and a wrong-record "corroboration" is worse than a withhold, so the gate is
 * deliberately strict:
 *
 *   1. DOMAIN must be compatible (a court claim ≠ an RBI record).
 *   2. A SPECIFIC anchor must be shared — a proper noun, a place, or a
 *      number-with-unit. Generic government vocabulary alone is not a match.
 *   3. Then: every claim number matches (with unit), dates match, action verb
 *      is compatible.
 *
 * Outcomes: corroborated (attach + stored locator) · contradicted (a FINDING —
 * both values surfaced) · not_found (record silent — logged for the withhold reason).
 */
import type { Claim } from "@/lib/claims/types";
import type { ClaimMatch, PrimaryRecord, ResearchQuery } from "./types";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9%.\s]/g, " ").replace(/\s+/g, " ").trim();
}
function numTokens(s: string): { raw: string; value: number; unit: string }[] {
  const out: { raw: string; value: number; unit: string }[] = [];
  for (const m of s.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(crore|lakh|per cent|percent|%|mm|cusecs?|kmph|bps|points?|billion|dead|killed|injured|missing)?/gi)) {
    const value = parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;
    let unit = (m[2] ?? "").toLowerCase();
    // "7 people died" / "7 killed in ..." — look ahead for a casualty verb
    if (!unit) {
      const after = s.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 34).toLowerCase();
      if (/\b(dead|died|killed|deaths?|lost their lives)\b/.test(after)) unit = "dead";
      else if (/\b(injured|hurt|wounded)\b/.test(after)) unit = "injured";
      else if (/\b(missing|unaccounted)\b/.test(after)) unit = "missing";
    }
    if (unit === "percent" || unit === "per cent") unit = "%";
    if (unit === "cusec") unit = "cusecs";
    if (["killed", "died"].includes(unit)) unit = "dead";
    out.push({ raw: m[0].trim(), value, unit });
  }
  return out;
}
function sentences(s: string): string[] {
  return s.split(/(?<=[.!?])\s+/).filter((x) => x.trim().length > 15);
}
function properNouns(s: string): string[] {
  return [
    ...new Set(
      (s.match(/\b[A-Z][a-z]{3,}(?:\s+(?:of|the|and|&)?\s*[A-Z][a-z]{3,}){0,3}/g) ?? [])
        .map((x) => x.trim().toLowerCase())
        .filter((x) => !/^(the|this|that|these|those|india|indian|tamil nadu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(x)),
    ),
  ];
}

const ACTION_GROUPS: RegExp[] = [
  /\b(announce\w*|unveil\w*|launch\w*|introduc\w*|roll(?:s|ed)? out|declar\w*|propos\w*|to move)\b/i,
  /\b(sanction\w*|allocat\w*|approv\w*|clear\w*|release\w* funds?|disburse\w*|grant\w*)\b/i,
  /\b(reject\w*|dismiss\w*|quash\w*|set aside|strike[sd]? down|refus\w*|declin\w*)\b/i,
  /\b(uphold\w*|upheld|allow\w*|grant\w*|notice|hear\w*|adjourn\w*)\b/i,
  /\b(order\w*|direct\w*|gives? direction|instruct\w*|asks?|calls? (?:up)?on|reviews?|held a review|takes? stock)\b/i,
  /\b(warn\w*|alert\w*|bulletin|forecast\w*|likely to)\b/i,
  /\b(appoint\w*|nominat\w*|name[sd]? as|induct\w*|takes? charge|resign\w*|gets? new)\b/i,
];
function actionCompatible(claimText: string, recordText: string): boolean {
  const cg = ACTION_GROUPS.filter((re) => re.test(claimText));
  if (cg.length === 0) return true;
  return cg.some((re) => re.test(recordText));
}

/** The record must be from the right kind of authority for the claim. */
function domainCompatible(claimType: string, record: PrimaryRecord): boolean {
  const auth = record.authority.toLowerCase();
  const txt = norm(record.text);
  const isWeather = /meteorolog|imd|sachet|ndma|disaster/.test(auth) || /\b(rain|cyclone|flood|thunderstorm|lightning|alert|warning|mm of rain|cusecs?)\b/.test(txt);
  const isFinance = /reserve bank|rbi|sebi|securities/.test(auth) || /\b(repo rate|liquidity|auction|monetary policy|basis points|bond|g-?sec|forex)\b/.test(txt);
  const isCourt = /court|tribunal/.test(auth) || /\b(court|bench|petition|plea|verdict|judg?ment|writ)\b/.test(txt);
  const isGovAction = /pib|press information|dipr|government|ministry/.test(auth) || record.tier === "primary_official";
  switch (claimType) {
    case "weather_event":
    case "casualty_count":
      return isWeather || /police|collector|revenue/.test(auth);
    case "court":
      return isCourt;
    case "quantity":
      return isFinance || isGovAction;
    case "electoral":
      return /election|eci/.test(auth) || /\b(poll|electoral|voter|nomination)\b/.test(txt);
    case "official_action":
    case "scheme_allocation":
    case "appointment":
      return isGovAction && !isFinance && !isWeather ? true : isGovAction;
    default:
      return true;
  }
}

export function matchClaimToRecord(claim: Claim, query: ResearchQuery, record: PrimaryRecord): ClaimMatch {
  const base = { claimId: claim.id, claimText: claim.canonicalText, recordId: record.id };
  if (record.requiresOcr && record.ocrConfidence == null) {
    return { ...base, outcome: "not_found", reason: "record is a scan we have not verified" };
  }
  if (!domainCompatible(query.claimType, record)) {
    return { ...base, outcome: "not_found", reason: `${record.authority}'s record is not the right kind of source for this claim` };
  }

  const recN = norm(record.text);
  const recNums = numTokens(record.text);
  const recNouns = new Set(properNouns(record.text));
  const claimNouns = properNouns(`${claim.canonicalText} ${query.entities.join(" ")}`);

  // SPECIFIC anchor: a shared proper noun, a shared place, or a number-with-unit match
  const sharedNoun = claimNouns.find((n) => n.length > 4 && (recNouns.has(n) || recN.includes(n)));
  const sharedPlace = query.places.find((p) => recN.includes(norm(p)));
  const claimNums = numTokens(claim.canonicalText);
  const sharedNumWithUnit = claimNums.find((cn) => cn.unit && recNums.some((rn) => rn.unit === cn.unit && Math.abs(rn.value - cn.value) / Math.max(cn.value, 1) < 0.02));
  if (!sharedNoun && !sharedPlace && !sharedNumWithUnit) {
    return { ...base, outcome: "not_found", reason: `${record.authority}'s record does not name the same people, places or figures` };
  }

  // CONTRADICTION: same unit, different value
  for (const cn of claimNums) {
    if (!cn.unit) continue;
    const sameUnit = recNums.filter((rn) => rn.unit === cn.unit);
    if (sameUnit.length && !sameUnit.some((rn) => Math.abs(rn.value - cn.value) / Math.max(cn.value, 1) < 0.02)) {
      return {
        ...base,
        outcome: "contradicted",
        conflict: { field: cn.unit, reportingValue: cn.raw, recordValue: sameUnit[0].raw },
        reason: `the reporting says ${cn.raw}; ${record.authority}'s record says ${sameUnit[0].raw}`,
      };
    }
  }

  if (!record.bodyAvailable) {
    const titleN = norm(record.title);
    const nameInTitle = claimNouns.some((n) => n.length > 6 && titleN.includes(n)) || (sharedNoun && titleN.includes(sharedNoun));
    const placeInTitle = sharedPlace && titleN.includes(norm(sharedPlace));
    return (nameInTitle || placeInTitle) && actionCompatible(claim.canonicalText, record.title)
      ? { ...base, outcome: "corroborated", locator: { start: 0, end: record.title.length }, reason: `${record.authority} issued a release with a matching headline (full text not retrieved)` }
      : { ...base, outcome: "not_found", reason: `${record.authority} release found but its headline does not confirm the specific claim` };
  }

  const numsOk = claimNums.every((cn) => recNums.some((rn) => (rn.unit === cn.unit || (!cn.unit && !rn.unit)) && Math.abs(rn.value - cn.value) < 0.001));
  const datesOk = query.dates.every((dt) => recN.includes(norm(dt)));
  const actOk = actionCompatible(claim.canonicalText, record.text);

  if (numsOk && datesOk && actOk) {
    const ct = new Set(norm(claim.canonicalText).split(" ").filter((w) => w.length > 3));
    let best = { s: "", score: 0, at: 0 };
    for (const s of sentences(record.text)) {
      const score = norm(s).split(" ").filter((w) => ct.has(w)).length;
      if (score > best.score) best = { s, score, at: record.text.indexOf(s) };
    }
    if (best.score < 2) return { ...base, outcome: "not_found", reason: `${record.authority}'s record touches the topic but not this specific claim` };
    return {
      ...base,
      outcome: "corroborated",
      locator: { start: best.at, end: best.at + best.s.length },
      reason: `${record.authority}'s record confirms this — ${[sharedNoun && "names", sharedPlace && "place", claimNums.length && "figures", query.dates.length && "date"].filter(Boolean).join(", ")} match`,
    };
  }

  return { ...base, outcome: "not_found", reason: `${record.authority}'s record is silent on this specific claim` };
}
