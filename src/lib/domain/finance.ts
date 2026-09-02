/**
 * Finance instrument + market-move recognition (v0.7, Phase G).
 *
 * Used by the /finance view and the finance-safety tests. It is NOT wired into
 * `decideIdentity` — it only reads text and reports what it finds, exactly.
 *
 * Non-negotiable: a move in POINTS and a move in PERCENT are never conflated
 * ("Sensex rises 1,000 points" ≠ "Sensex rises 1,000%"; "Nifty falls 2%" ≠
 * "Nifty falls 2 points").
 */

export interface FinanceInstrument {
  canonical: string;
  kind: "index" | "currency" | "commodity" | "crypto" | "rate";
  aliases: string[];
}

export const FINANCE_INSTRUMENTS: FinanceInstrument[] = [
  { canonical: "Sensex", kind: "index", aliases: ["sensex", "bse sensex", "s&p bse sensex"] },
  { canonical: "Nifty 50", kind: "index", aliases: ["nifty", "nifty50", "nifty 50", "nse nifty"] },
  { canonical: "Bank Nifty", kind: "index", aliases: ["bank nifty", "nifty bank"] },
  { canonical: "Nifty Midcap", kind: "index", aliases: ["nifty midcap", "midcap index"] },
  { canonical: "Indian rupee", kind: "currency", aliases: ["rupee", "inr", "rupee vs dollar", "rupee against the dollar", "usd/inr", "usd-inr"] },
  { canonical: "Gold", kind: "commodity", aliases: ["gold price", "gold prices", "gold rate", "24-carat gold", "22-carat gold", "mcx gold"] },
  { canonical: "Silver", kind: "commodity", aliases: ["silver price", "silver rate", "mcx silver"] },
  { canonical: "Crude oil", kind: "commodity", aliases: ["crude oil", "brent crude", "brent", "wti crude", "crude price"] },
  { canonical: "Bitcoin", kind: "crypto", aliases: ["bitcoin", "btc"] },
  { canonical: "Ethereum", kind: "crypto", aliases: ["ethereum", "ether", "eth"] },
  { canonical: "Repo rate", kind: "rate", aliases: ["repo rate", "policy rate", "benchmark rate"] },
];

function word(hay: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(hay);
}

export function detectFinanceInstruments(text: string): string[] {
  const hay = " " + text.toLowerCase() + " ";
  const out: string[] = [];
  for (const inst of FINANCE_INSTRUMENTS) {
    if (inst.aliases.some((a) => word(hay, a))) out.push(inst.canonical);
  }
  return [...new Set(out)];
}

export type MoveUnit = "points" | "percent" | "bps" | "rupees";
export type MoveDirection = "up" | "down" | "flat";

export interface MarketMove {
  instrument?: string;
  direction: MoveDirection;
  value: number;
  unit: MoveUnit;
  raw: string;
}

const UP = /\b(ris\w+|rall\w+|surg\w+|gain\w+|jump\w+|climb\w+|advanc\w+|soar\w+|up by|higher by|added|zoom\w+|spik\w+)\b/i;
const DOWN = /\b(fall\w+|drop\w+|slump\w+|plung\w+|declin\w+|slid\w+|tank\w+|shed\w+|lower by|down by|los[te]\w*|crash\w+|tumbl\w+|sink\w+)\b/i;
const FLAT = /\b(flat|unchanged|steady|little changed|holds? steady|ends? flat)\b/i;

/**
 * Extract every market move stated in the text, keeping the unit exactly as
 * written. `1,000 points` and `2 per cent` become distinct units.
 */
export function parseMarketMoves(text: string): MarketMove[] {
  const instruments = detectFinanceInstruments(text);
  const primary = instruments[0];
  const out: MarketMove[] = [];

  const re =
    /(?:^|[\s(])(?:by\s+)?(?:rs\.?\s*)?([\d,]+(?:\.\d+)?)\s*(points?|pts?|per\s*cent|percent|%|basis\s*points?|bps|paise|rupees?)(?![a-z])/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const value = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;
    const u = m[2].toLowerCase().replace(/\s+/g, "");
    const unit: MoveUnit =
      /point|pts|pt/.test(u) ? "points" : /cent|%|percent/.test(u) ? "percent" : /bps|basispoint/.test(u) ? "bps" : "rupees";

    // direction from the nearest cue in a window around the number
    const around = text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 20);
    const direction: MoveDirection = FLAT.test(around) ? "flat" : DOWN.test(around) ? "down" : UP.test(around) ? "up" : "flat";

    out.push({ instrument: primary, direction, value, unit, raw: m[0].trim() });
  }
  return out;
}

// ── v0.9 Phase O — policy events vs market reactions ─────────────────────────

export type PolicyAuthority = "RBI" | "US Fed" | "SEBI" | "GST Council" | "Finance Ministry" | "MPC";
export type PolicyDecision = "cut" | "hike" | "hold" | "change" | "other";

export interface PolicyEvent {
  authority: PolicyAuthority;
  /** what the decision is about — "repo rate", "GST rate", "CRR", … */
  instrument: string;
  decision: PolicyDecision;
  /** basis points / percentage-point size of the change, when stated */
  changeBps?: number;
  previousValue?: string;
  newValue?: string;
  effectiveFrom?: string;
  raw: string;
}

const AUTHORITY: [RegExp, PolicyAuthority][] = [
  [/\b(reserve bank of india|rbi)\b/i, "RBI"],
  [/\bmonetary policy committee|mpc\b/i, "MPC"],
  [/\b(us federal reserve|federal reserve|us fed|the fed)\b/i, "US Fed"],
  [/\b(sebi|securities and exchange board)\b/i, "SEBI"],
  [/\bgst council\b/i, "GST Council"],
  [/\b(finance ministry|ministry of finance|union finance minister|nirmala sitharaman)\b/i, "Finance Ministry"],
];

const POLICY_INSTRUMENT: [RegExp, string][] = [
  [/\brepo rate\b/i, "repo rate"],
  [/\breverse repo\b/i, "reverse repo rate"],
  [/\b(crr|cash reserve ratio)\b/i, "CRR"],
  [/\b(slr|statutory liquidity ratio)\b/i, "SLR"],
  [/\bgst (?:rate|slab)s?\b/i, "GST rate"],
  [/\b(policy rate|benchmark rate|interest rate)s?\b/i, "policy rate"],
  [/\bfed funds rate|federal funds rate\b/i, "fed funds rate"],
];

/**
 * A monetary / fiscal POLICY decision — distinct from the market's reaction to
 * it. "RBI keeps repo rate unchanged" is a PolicyEvent; "Sensex rises after RBI
 * decision" is a market reaction (see `isMarketReaction`).
 */
export function detectPolicyEvent(text: string, opts: { effectiveFrom?: string } = {}): PolicyEvent | undefined {
  const authority = AUTHORITY.find(([re]) => re.test(text))?.[1];
  if (!authority) return undefined;
  const instrument = POLICY_INSTRUMENT.find(([re]) => re.test(text))?.[1];
  if (!instrument) return undefined;

  // A liquidity operation (VRRR / OMO / auction) is not a policy-rate decision.
  if (/\b(vrrr|variable rate reverse repo|omo|open market operation|auction|conduct\w*|liquidity (?:adjustment|management))\b/i.test(text))
    return undefined;

  let decision: PolicyDecision = "other";
  if (/\b(unchanged|keeps?|holds?|status quo|maintains?|retains?|leaves? .* (?:unchanged|untouched)|no change|pause[sd]?)\b/i.test(text))
    decision = "hold";
  else if (/\b(cuts?|slashes?|lowers?|reduces?|trims?)\b/i.test(text)) decision = "cut";
  else if (/\b(hikes?|raises?|increases?|lifts?|tightens?)\b/i.test(text)) decision = "hike";
  else if (/\b(revis\w+|changes?|adjusts?)\b/i.test(text)) decision = "change";
  // No stated decision verb and no numbers → not a decision event.
  if (decision === "other" && !/\b\d+(?:\.\d+)?\s*(?:bps|basis points?|per cent|%)\b/i.test(text)) return undefined;

  const bpsM = /\b(\d+(?:\.\d+)?)\s*(?:bps|basis points?)\b/i.exec(text);
  const pctPtM = /\bby\s+(\d+(?:\.\d+)?)\s*(?:percentage points?|per cent|%)\b/i.exec(text);
  const changeBps = bpsM
    ? Number(bpsM[1])
    : pctPtM
      ? Math.round(Number(pctPtM[1]) * 100)
      : undefined;

  const fromToM = /\bfrom\s+(\d+(?:\.\d+)?\s?(?:per cent|%)?)\s+to\s+(\d+(?:\.\d+)?\s?(?:per cent|%)?)/i.exec(text);
  const atM = /\b(?:at|to)\s+(\d+(?:\.\d+)?\s?(?:per cent|%))\b/i.exec(text);
  const effM = /\bwith effect from\s+([A-Z][a-z]+ \d{1,2}(?:,? \d{4})?)|w\.e\.f\.?\s+([A-Z][a-z]+ \d{1,2})/i.exec(text);

  return {
    authority,
    instrument,
    decision,
    changeBps,
    previousValue: fromToM?.[1]?.trim(),
    newValue: fromToM?.[2]?.trim() ?? atM?.[1]?.trim(),
    effectiveFrom: effM?.[1] ?? effM?.[2] ?? opts.effectiveFrom,
    raw: (AUTHORITY.find(([re]) => re.test(text))?.[0].exec(text)?.[0] ?? authority).trim(),
  };
}

/**
 * A story that is primarily the MARKET'S REACTION (an index / currency / gold
 * move) rather than the policy decision itself. Both can be true of a headline
 * that leads with the move ("Sensex jumps 900 pts after RBI holds rate").
 */
export function isMarketReaction(text: string): boolean {
  const moves = parseMarketMoves(text);
  if (moves.length === 0) return false;
  const reactionCue = /\b(after|following|on|as|post|tracks?|amid|reacts? to|cheers?|shrugs? off)\b/i.test(text);
  const leadsWithMove = /^(?:the\s+)?(sensex|nifty|bank nifty|rupee|gold|silver|markets?|stocks?|shares?|indices)\b/i.test(
    text.trim(),
  );
  return leadsWithMove || (moves.length > 0 && reactionCue);
}

/** True when two texts describe the SAME instrument moving the SAME way by the SAME amount+unit. */
export function sameMarketMove(a: string, b: string): boolean {
  const ma = parseMarketMoves(a);
  const mb = parseMarketMoves(b);
  if (ma.length === 0 || mb.length === 0) return false;
  return ma.some((x) =>
    mb.some(
      (y) =>
        x.unit === y.unit &&
        x.direction === y.direction &&
        Math.abs(x.value - y.value) < 0.001 &&
        (x.instrument ?? "") === (y.instrument ?? ""),
    ),
  );
}
