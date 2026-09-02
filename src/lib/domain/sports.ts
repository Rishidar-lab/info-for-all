/**
 * Sports competition + fixture recognition (v0.7, Phase G).
 *
 * Used by the /sports view and the sports-safety tests to keep DISTINCT
 * fixtures distinct: "CSK beat RCB" on two different dates, or in two different
 * competitions, or a men's vs a women's match, must never be shown as one event.
 *
 * This never MERGES anything — it only helps SPLIT. Splitting is always safe.
 */

export interface Competition {
  canonical: string;
  sport: string;
  aliases: string[];
}

export const COMPETITIONS: Competition[] = [
  { canonical: "IPL", sport: "cricket", aliases: ["ipl", "indian premier league", "tata ipl"] },
  { canonical: "WPL", sport: "cricket", aliases: ["wpl", "women's premier league"] },
  { canonical: "Ranji Trophy", sport: "cricket", aliases: ["ranji trophy", "ranji"] },
  { canonical: "Duleep Trophy", sport: "cricket", aliases: ["duleep trophy"] },
  { canonical: "Irani Cup", sport: "cricket", aliases: ["irani cup", "irani trophy"] },
  { canonical: "Vijay Hazare Trophy", sport: "cricket", aliases: ["vijay hazare"] },
  { canonical: "Syed Mushtaq Ali Trophy", sport: "cricket", aliases: ["syed mushtaq ali", "mushtaq ali trophy"] },
  { canonical: "Test series", sport: "cricket", aliases: ["test match", "test series", "border-gavaskar", "the ashes", "wtc final", "world test championship"] },
  { canonical: "ODI series", sport: "cricket", aliases: ["odi series", "one-day series", "one day international series"] },
  { canonical: "T20I series", sport: "cricket", aliases: ["t20i series", "t20 series", "t20 internationals"] },
  { canonical: "Cricket World Cup", sport: "cricket", aliases: ["cricket world cup", "odi world cup", "t20 world cup", "champions trophy", "women's world cup"] },
  { canonical: "FIFA World Cup", sport: "football", aliases: ["fifa world cup", "football world cup"] },
  { canonical: "Asia Cup", sport: "cricket", aliases: ["asia cup"] },
  { canonical: "TNPL", sport: "cricket", aliases: ["tnpl", "tamil nadu premier league"] },
  { canonical: "ISL", sport: "football", aliases: ["isl", "indian super league"] },
  { canonical: "I-League", sport: "football", aliases: ["i-league", "i league"] },
  { canonical: "Pro Kabaddi", sport: "kabaddi", aliases: ["pro kabaddi", "pkl"] },
  { canonical: "Chess World Championship", sport: "chess", aliases: ["world chess championship", "candidates tournament", "chess olympiad"] },
];

export const TEAMS: Record<string, string[]> = {
  CSK: ["csk", "chennai super kings"],
  RCB: ["rcb", "royal challengers bengaluru", "royal challengers bangalore"],
  MI: ["mi", "mumbai indians"],
  "KKR": ["kkr", "kolkata knight riders"],
  "SRH": ["srh", "sunrisers hyderabad"],
  "DC": ["dc", "delhi capitals"],
  "RR": ["rr", "rajasthan royals"],
  "PBKS": ["pbks", "punjab kings"],
  "GT": ["gt", "gujarat titans"],
  "LSG": ["lsg", "lucknow super giants"],
  India: ["india", "team india", "men in blue"],
  Australia: ["australia", "aussies"],
  England: ["england"],
  "South Africa": ["south africa", "proteas"],
  Pakistan: ["pakistan"],
  "New Zealand": ["new zealand", "black caps"],
  "Sri Lanka": ["sri lanka"],
  Bangladesh: ["bangladesh"],
};

function word(hay: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(hay);
}

export function detectCompetition(text: string): Competition | undefined {
  const hay = " " + text.toLowerCase() + " ";
  return COMPETITIONS.find((c) => c.aliases.some((a) => word(hay, a)));
}

export function detectTeams(text: string): string[] {
  const hay = " " + text.toLowerCase() + " ";
  const out: string[] = [];
  for (const [team, aliases] of Object.entries(TEAMS)) {
    if (aliases.some((a) => word(hay, a))) out.push(team);
  }
  return [...new Set(out)];
}

const WOMEN_RE = /\b(women'?s?|w\/o?men|female)\b/i;
const JUNIOR_RE = /\b(under-1\d|u-?1\d|under-2\d|u-?2\d|junior|colts|youth)\b/i;

/** v0.9 Phase P — where in a competition a fixture sits. */
export type FixtureRound =
  | "final"
  | "semi-final"
  | "qualifier"
  | "knockout"
  | "group stage"
  | "league stage"
  | "series";

/** v0.9 Phase P — the fixture's lifecycle state, from the reporting only. */
export type FixtureStatus =
  | "scheduled"
  | "delayed"
  | "live"
  | "completed"
  | "abandoned"
  | "postponed"
  | "unknown";

export interface FixtureResult {
  winner?: string;
  /** e.g. "by 6 wickets", "by 21 runs", "2-1" */
  margin?: string;
}

export interface SportsFixture {
  competition?: string;
  sport?: string;
  teams: string[];
  women: boolean;
  junior: boolean;
  round?: FixtureRound;
  status: FixtureStatus;
  result?: FixtureResult;
  /** YYYY-MM-DD when a date is resolvable. */
  date?: string;
}

const ROUND: [RegExp, FixtureRound][] = [
  [/\b(grand )?final\b/i, "final"],
  [/\bsemi-?final\b/i, "semi-final"],
  [/\b(eliminator|qualifier [12]|the qualifier)\b/i, "qualifier"],
  [/\b(knockout|quarter-?final|last (?:8|16)|pre-?quarter)\b/i, "knockout"],
  [/\bgroup (?:stage|[a-h])\b/i, "group stage"],
  [/\b(league (?:stage|match)|round-robin|round \d+)\b/i, "league stage"],
];

function detectRound(text: string): FixtureRound | undefined {
  return ROUND.find(([re]) => re.test(text))?.[1];
}

function detectStatus(text: string): FixtureStatus {
  if (/\b(abandoned|called off (?:due to|because of) rain|no result|washed out)\b/i.test(text)) return "abandoned";
  if (/\b(postponed|rescheduled|deferred|moved to|shifted to another (?:day|date))\b/i.test(text)) return "postponed";
  if (/\b(rain delay|delayed start|start delayed|toss delayed|play (?:to )?resume|covers? on|interrupted by rain)\b/i.test(text))
    return "delayed";
  if (/\b(beat|beats|defeat\w*|won by|win by|thrash\w*|clinch\w*|lift the (?:trophy|title|cup)|register a .* win|seal\w* (?:the )?(?:series|win)|chased? down|bowled out .* to win)\b/i.test(text))
    return "completed";
  if (/\b(live|in progress|currently batting|need \d+ runs? (?:from|off)|are \d+\/\d+|reduced to \d+\/\d+|at the crease)\b/i.test(text))
    return "live";
  if (/\b(will (?:play|face|take on|host)|to play|set to (?:play|face)|preview|squad announced|pre-?season|camp (?:begins|from)|fixture|to be held|scheduled for|ahead of the)\b/i.test(text))
    return "scheduled";
  return "unknown";
}

function detectResult(text: string, teams: string[]): FixtureResult | undefined {
  const NAME = "[A-Z][\\w']+(?:\\s+[A-Z][\\w']+){0,2}";
  const m = new RegExp(
    `\\b(${NAME})\\s+(?:beat|beats|defeated?|thrash\\w*|edge\\w*|outplay\\w*|outclass\\w*)\\s+(${NAME})(?:\\s+(by \\d+ (?:runs?|wickets?)|by an innings[\\w ]*|\\d+-\\d+))?`,
  ).exec(text);
  if (m) {
    const pick = (s: string) => teams.find((t) => s.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(s.toLowerCase()));
    return { winner: pick(m[1]) ?? m[1].trim(), margin: m[3]?.trim() };
  }
  const marginOnly = /\bwon by (\d+ (?:runs?|wickets?)|an innings(?: and \d+ runs)?)\b/i.exec(text);
  if (marginOnly) return { margin: `by ${marginOnly[1]}` };
  return undefined;
}

export function detectFixture(text: string, eventDate?: string): SportsFixture {
  const comp = detectCompetition(text);
  const teams = detectTeams(text).sort();
  const status = detectStatus(text);
  return {
    competition: comp?.canonical,
    sport: comp?.sport,
    teams,
    women: WOMEN_RE.test(text),
    junior: JUNIOR_RE.test(text),
    round: detectRound(text),
    status,
    result: status === "completed" ? detectResult(text, teams) : undefined,
    date: eventDate,
  };
}

/**
 * True when two fixtures are the SAME match. Different competition, different
 * teams, men vs women, junior vs senior, or a resolvable date apart ⇒ NOT the
 * same. When a signal is missing on one side it does not, by itself, split.
 */
export function sameSportsFixture(a: SportsFixture, b: SportsFixture): boolean {
  if (a.competition && b.competition && a.competition !== b.competition) return false;
  if (a.women !== b.women) return false;
  if (a.junior !== b.junior) return false;
  if (a.date && b.date && a.date !== b.date) return false;
  // a league-stage meeting and a final between the same teams are different fixtures
  if (a.round && b.round && a.round !== b.round && (a.round === "final" || b.round === "final" || a.round === "semi-final" || b.round === "semi-final"))
    return false;
  if (a.teams.length >= 2 && b.teams.length >= 2) {
    const shared = a.teams.filter((t) => b.teams.includes(t));
    if (shared.length < 2) return false;
  }
  return true;
}
