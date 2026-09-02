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
  { canonical: "Test series", sport: "cricket", aliases: ["test match", "test series", "border-gavaskar", "the ashes"] },
  { canonical: "ODI series", sport: "cricket", aliases: ["odi series", "one-day series", "odi"] },
  { canonical: "T20I series", sport: "cricket", aliases: ["t20i", "t20 series", "t20 internationals"] },
  { canonical: "Cricket World Cup", sport: "cricket", aliases: ["world cup", "odi world cup", "t20 world cup", "champions trophy"] },
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

export interface SportsFixture {
  competition?: string;
  sport?: string;
  teams: string[];
  women: boolean;
  junior: boolean;
  /** YYYY-MM-DD when a date is resolvable. */
  date?: string;
}

export function detectFixture(text: string, eventDate?: string): SportsFixture {
  const comp = detectCompetition(text);
  return {
    competition: comp?.canonical,
    sport: comp?.sport,
    teams: detectTeams(text).sort(),
    women: WOMEN_RE.test(text),
    junior: JUNIOR_RE.test(text),
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
  if (a.teams.length >= 2 && b.teams.length >= 2) {
    const shared = a.teams.filter((t) => b.teams.includes(t));
    if (shared.length < 2) return false;
  }
  return true;
}
