/**
 * Milestone B §B.2.0 — instrument before you build.
 *
 *   npx tsx scripts/withheld-claim-profile.ts
 *
 * For every routable cluster whose brief is WITHHELD, extract from the available
 * title + excerpt(s): claim type, named entities, numbers-with-units, dates,
 * places, and the issuing authority (named or implied). Then rank which primary-
 * record adapter would unlock how many withheld clusters.
 *
 * Output: reports/withheld-claim-profile.json + a console table.
 * The adapter build order in IFFA_MILESTONE_B2_REPORT.md is justified by this.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LiveArticle, LiveCluster, LiveDataset } from "../src/lib/live/types";
import { buildBrief } from "../src/lib/brief/build";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const d = JSON.parse(readFileSync(resolve(ROOT, "src/data/generated/live-feed.json"), "utf8")) as LiveDataset;
const byId = new Map(d.articles.map((a) => [a.id, a]));
const arts = (c: LiveCluster): LiveArticle[] => c.articleIds.map((id) => byId.get(id)).filter((a): a is LiveArticle => !!a);

type ClaimType =
  | "weather_event"
  | "court"
  | "official_action"
  | "scheme_allocation"
  | "casualty_count"
  | "appointment"
  | "electoral"
  | "crime"
  | "quantity"
  | "sports"
  | "entertainment"
  | "other";

const RULES: [ClaimType, RegExp][] = [
  ["weather_event", /\b(rain|rainfall|cyclone|flood|inundat|imd|meteorolog|red alert|orange alert|yellow alert|weather warning|thunderstorm|lightning|heatwave|depression|monsoon|waterlogg|squall)\b/i],
  // court needs a courtroom ACTION, not just the word "court" (e.g. "…as High Court language")
  ["court", /\b(?:court|bench|tribunal)\b[^.]{0,40}\b(?:reject\w*|dismiss\w*|rule[sd]?|ruling|uphold\w*|upheld|quash\w*|stay\w*|grant\w*|allow\w*|refus\w*|declin\w*|hear\w*|adjourn\w*|order\w*|verdict|acquit\w*|convict\w*|bail|notice|direct\w*)\b|\b(?:plea|petition|petitioner|writ petition|slp|special leave|division bench|interim order|impleadment)\b/i],
  ["electoral", /\b(election|by-?election|poll|electoral roll|voter|nomination|ec(?:i)?\b|returning officer|candidate|affidavit|constituency|counting|psepholog)\b/i],
  ["crime", /\b(arrest|raid|ed |enforcement directorate|cbi|fir|booked|seized|remand|custody|murder|rape|assault|kidnap|extortion|smuggl|ganja|narcotic|chargesheet|absconding|encounter)\b/i],
  ["appointment", /\b(appoint|named as|takes charge|assumes? office|resign|steps? down|new (?:chief|chair|head|director|trustee|dgp|commissioner)|reshuffle|sworn in|inducted|trust gets)\b/i],
  ["scheme_allocation", /\b(₹|rs\.?\s*\d|crore|lakh|allocat|outlay|sanction|package|grant|disburse|fund release|budget for|scheme|welfare|subsidy|assistance of)\b/i],
  ["casualty_count", /\b(\d+\s+(?:dead|killed|died|injured|hurt|missing)|death toll|toll (?:rises|mounts|climbs)|casualt|fatalit|lost their lives)\b/i],
  ["official_action", /\b(government|govt|cabinet|minister|chief minister|\bcm\b|collector|corporation|assembly|to move (?:a )?resolution|announce|launch|inaugurat|order(?:s|ed)?|notif|g\.?o\.?\b|directs?|approves?|clears?|sanctions?|to be launched|rolls? out)\b/i],
  ["quantity", /\b\d[\d,.]*\s*(?:per cent|%|billion|crore|lakh|bps|points|\$|usd|gdp|inflation|repo rate)\b/i],
  ["sports", /\b(match|innings|wicket|trophy|cup|tournament|final|squad|test|odi|t20|duleep|ranji|olympic|medal|defeat|beat|score|runs|goal)\b/i],
  ["entertainment", /\b(box office|film|movie|actor|actress|singer|album|trailer|teaser|celebrity|serial|OTT|web series|shooting wrapped)\b/i],
];

function classify(text: string): ClaimType {
  for (const [t, re] of RULES) if (re.test(text)) return t;
  return "other";
}

const AUTHORITY_RULES: [string, RegExp][] = [
  ["IMD / RMC Chennai", /\b(imd|india meteorological|rmc chennai|meteorological (?:centre|department)|weather office)\b/i],
  ["NDMA / SDMA", /\b(ndma|sdma|disaster management authority|sachet)\b/i],
  ["Madras High Court / eCourts", /\b(madras (?:high )?court|madurai bench|high court|division bench)\b/i],
  ["Supreme Court", /\b(supreme court|apex court)\b/i],
  ["TN Government (DIPR)", /\b(tamil nadu government|tn govt|state government|state cabinet|tn cm|chief minister.*(?:tamil nadu|tn)|dipr|தமிழ்நாடு அரசு)\b/i],
  ["Union Government (PIB)", /\b(union government|centre|central government|govt of india|government of india|union (?:cabinet|minister)|ministry of|pib)\b/i],
  ["Election Commission (CEO TN)", /\b(election commission|eci\b|ceo tamil nadu|returning officer)\b/i],
  ["RBI", /\b(rbi|reserve bank)\b/i],
  ["SEBI", /\b(sebi|securities and exchange board)\b/i],
  ["ED / CBI", /\b(enforcement directorate|\bed\b|cbi|central bureau)\b/i],
  ["District Collectorate", /\b(collector|district administration|revenue department|corporation commissioner)\b/i],
  ["TN Assembly", /\b(tamil nadu assembly|state assembly|legislative assembly|சட்டப்பேரவை)\b/i],
];

function authority(text: string): string | null {
  for (const [name, re] of AUTHORITY_RULES) if (re.test(text)) return name;
  return null;
}

function extract(text: string) {
  const numbers = [
    ...new Set(
      (text.match(/(?:₹|rs\.?\s*)?\d[\d,]*(?:\.\d+)?\s*(?:crore|lakh|per cent|%|mm|cusecs?|kmph|bps|points?|km|billion|\$)?/gi) ?? [])
        .map((s) => s.trim())
        .filter((s) => /\d/.test(s) && s.length > 1),
    ),
  ].slice(0, 8);
  const dates = [
    ...new Set(
      (text.match(/\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}|\d{4}-\d{2}-\d{2}|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|today|tomorrow|yesterday)\b/gi) ?? []).map((s) => s.toLowerCase()),
    ),
  ].slice(0, 6);
  const places = [
    ...new Set(
      (text.match(/\b(Chennai|Coimbatore|Madurai|Trichy|Tiruchirappalli|Salem|Erode|Tirunelveli|Vellore|Thanjavur|Cuddalore|Nagapattinam|Kancheepuram|Chengalpattu|Villupuram|Dindigul|Karur|Namakkal|Dharmapuri|Krishnagiri|Tenkasi|Ranipet|Perambalur|Ariyalur|Sivaganga|Ramanathapuram|Virudhunagar|Thoothukudi|Pudukkottai|Nilgiris|Tiruppur|Tiruvallur|Tiruvannamalai|Kallakurichi|Mayiladuthurai|Tamil Nadu|Delhi|Mumbai|Bengaluru|Kolkata|Kerala|Keralam)\b/g) ?? []),
    ),
  ].slice(0, 6);
  return { numbers, dates, places };
}

const ADAPTER_FOR: Record<ClaimType, string[]> = {
  weather_event: ["imd_rmc_chennai"],
  court: ["ecourts"],
  official_action: ["tn_dipr", "pib", "tn_gazette"],
  scheme_allocation: ["tn_dipr", "pib", "data_gov_in"],
  casualty_count: ["district_collectorate", "tn_dipr"],
  appointment: ["pib", "tn_dipr"],
  electoral: ["eci_tn_ceo"],
  crime: ["district_collectorate", "factcheck_verified"],
  quantity: ["rbi_press", "data_gov_in"],
  sports: [],
  entertainment: [],
  other: [],
};

// ── run ────────────────────────────────────────────────────────────────────
const routable = d.clusters.filter((c) => c.slug && (c.trendData?.geoTier ?? "out") !== "out");
const edSurfaces = new Set<string>([
  ...(d.editorial?.urgent ?? []),
  ...(d.editorial?.rightNow ?? []),
  ...(d.editorial?.fastRising ?? []),
  ...(d.editorial?.tamilNadu ?? []),
  ...(d.editorial?.india ?? []),
]);

interface Row {
  slug: string;
  title: string;
  frontDoor: boolean;
  scope: string;
  tnTie: boolean;
  withheldReason: string;
  familiesGenuine: number;
  claimType: ClaimType;
  authority: string | null;
  numbers: string[];
  dates: string[];
  places: string[];
  candidateAdapters: string[];
  ageHours: number;
  checkable: boolean;
}

const rows: Row[] = [];
for (const c of routable) {
  const a = arts(c);
  const b = buildBrief(c, a);
  if (!b.withheldReason) continue;
  const blob = `${c.title}. ${a.map((x) => `${x.title}. ${x.excerpt ?? ""}`).join(" ")}`.slice(0, 1200);
  const ct = classify(blob);
  const ex = extract(blob);
  const tnTie = c.scope === "tamil-nadu" || c.trendData?.geoTier === "P0" || c.districts.length > 0;
  const ageHours = (Date.parse(d.generatedAt) - Date.parse(c.trendData?.firstSeenAt ?? c.updatedAt)) / 3.6e6;
  const adapters = ADAPTER_FOR[ct].filter((id) => {
    if (id === "tn_dipr" && !tnTie) return false;
    if (id === "pib" && tnTie && ct === "official_action" && authority(blob) === "TN Government (DIPR)") return false;
    return true;
  });
  rows.push({
    slug: c.slug,
    title: c.title.slice(0, 70),
    frontDoor: edSurfaces.has(c.slug),
    scope: c.scope,
    tnTie,
    withheldReason: b.withheldReason,
    familiesGenuine: b.coverage.genuineFamilies,
    claimType: ct,
    authority: authority(blob),
    numbers: ex.numbers,
    dates: ex.dates,
    places: ex.places,
    candidateAdapters: adapters,
    ageHours: Math.round(ageHours),
    checkable: (ex.numbers.length + ex.dates.length + ex.places.length > 0) || !!authority(blob),
  });
}

// ── ranked adapter table ───────────────────────────────────────────────────
const unlock = new Map<string, { total: number; frontDoor: number; fresh: number; tn: number; checkable: number }>();
for (const r of rows) {
  for (const ad of r.candidateAdapters) {
    const u = unlock.get(ad) ?? { total: 0, frontDoor: 0, fresh: 0, tn: 0, checkable: 0 };
    u.total++;
    if (r.frontDoor) u.frontDoor++;
    if (r.ageHours < 72) u.fresh++;
    if (r.tnTie) u.tn++;
    if (r.checkable) u.checkable++;
    unlock.set(ad, u);
  }
}
const ranked = [...unlock.entries()].sort((a, b) => b[1].checkable - a[1].checkable || b[1].total - a[1].total);

const byType: Record<string, number> = {};
for (const r of rows) byType[r.claimType] = (byType[r.claimType] ?? 0) + 1;

/** Fetchability of each candidate primary source from a server (probed 2026-09-03). */
const FETCHABILITY: Record<string, string> = {
  tn_dipr: "listing reachable; releases are JPG SCANS → OCR required + human confirm",
  pib: "RSS reachable (title+link only, plain UA); full release text behind Akamai bot-wall",
  tn_gazette: "not probed — G.O. PDFs, low applicability (most 'official_action' news is a DIPR release, not a G.O.)",
  imd_rmc_chennai: "public RSS retired (404); warnings API is 401-gated; only unstructured HTML",
  ecourts: "form/CAPTCHA-gated; needs a case number news rarely gives — deferred",
  district_collectorate: "27 separate district sites, mostly PDF/image notes — deferred",
  data_gov_in: "open API works (key required); DATASETS only — hard to match a news claim to a CSV",
  rbi_press: "RSS ALREADY INGESTED by IFFA (10 official articles in this snapshot) — clean full text",
  eci_tn_ceo: "not probed — deferred (8 clusters)",
  factcheck_verified: "corroboration tier only — NEVER a primary anchor (I from B→E §8)",
};

mkdirSync(resolve(ROOT, "reports"), { recursive: true });
writeFileSync(
  resolve(ROOT, "reports/withheld-claim-profile.json"),
  JSON.stringify(
    {
      generatedAt: d.generatedAt,
      snapshot: d.generatedAt,
      withheldCount: rows.length,
      byClaimType: byType,
      adapterRanking: ranked.map(([id, u]) => ({ id, ...u, fetchability: FETCHABILITY[id] ?? "unknown" })),
      rows,
    },
    null,
    2,
  ),
);

console.log(`\n§B.2.0 WITHHELD-CLAIM PROFILE — ${rows.length} withheld routable clusters · snapshot ${d.generatedAt}\n`);
console.log("claim types:");
for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${t}`);
console.log(`\nfront-door withheld: ${rows.filter((r) => r.frontDoor).length}  ·  < 72h: ${rows.filter((r) => r.ageHours < 72).length}  ·  checkable (has entity/number/date/authority): ${rows.filter((r) => r.checkable).length}`);
console.log("\nADAPTER RANKING — withheld clusters each would be QUERIED for (checkable, fresh <72h):");
console.log("  adapter                 total  front-door  <72h  TN-tie  checkable  fetchability");
for (const [id, u] of ranked) {
  console.log(`  ${id.padEnd(22)}  ${String(u.total).padStart(5)}  ${String(u.frontDoor).padStart(10)}  ${String(u.fresh).padStart(4)}  ${String(u.tn).padStart(6)}  ${String(u.checkable).padStart(9)}  ${FETCHABILITY[id] ?? ""}`);
}
console.log("\nwrote reports/withheld-claim-profile.json");
