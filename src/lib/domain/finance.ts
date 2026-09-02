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
