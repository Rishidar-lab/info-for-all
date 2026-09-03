/**
 * Ground-Parity Milestone A — native-comprehension audit.
 *
 *   npx tsx scripts/audit-native-comprehension.ts          (before/after both when brief lib present)
 *
 * Picks the 20 stories a reader is most likely to actually land on (highest
 * editorial priority among the routable clusters, spread across categories) and
 * asks, for each: could a normal reader accurately explain the essential event
 * from IFFA ALONE — without opening a single external publisher link?
 *
 * BEFORE (the shipped v0.11 story page): the page renders a working title,
 * coverage stats, an evidence/claims list and — for official alerts — the CAP
 * box. It explicitly states IFFA does not write a prose account. So "understand
 * from IFFA alone" is scored YES only where the rendered structured data already
 * amounts to an explanation:
 *   - an official CAP alert with event + area + window, OR
 *   - >= 2 confirmed facts in Event State AND (>=1 corroborated OR >=2 attributed) claims.
 *
 * AFTER (this milestone): YES when a non-withheld IFFA Brief survives verification
 * with a complete lead sentence (>= 1 short-version sentence, >= 7 words). Key
 * facts / why-it-matters / what-changed add depth ("rich") but a simple story is
 * fully understood from one solid verified sentence.
 *
 * Nothing here is fabricated: the rate is computed from the live snapshot.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LiveArticle, LiveCluster, LiveDataset } from "../src/lib/live/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTIVE = resolve(ROOT, "src/data/generated/live-feed.json");
const dataset = JSON.parse(readFileSync(ACTIVE, "utf8")) as LiveDataset;

const artById = new Map(dataset.articles.map((a) => [a.id, a]));
const clusterArts = (c: LiveCluster): LiveArticle[] =>
  c.articleIds.map((id) => artById.get(id)).filter((a): a is LiveArticle => !!a);

// Optional: the brief subsystem (present once Milestone A is built).
type SynthFn = (
  c: LiveCluster,
  arts: LiveArticle[],
  opts: { language: "en" | "ta" },
) => import("../src/lib/brief/types").IFFABrief;
type VerifyFn = (
  b: import("../src/lib/brief/types").IFFABrief,
  c: LiveCluster,
  arts: LiveArticle[],
) => import("../src/lib/brief/types").IFFABrief;

/** Routable clusters (the ones that get a static story page), highest-priority first. */
function routable(): LiveCluster[] {
  const score = (c: LiveCluster) =>
    c.trendData?.editorial?.score ??
    c.trendData?.trend?.score ??
    c.crisisPriority ??
    0;
  return [...dataset.clusters]
    .filter((c) => c.slug && (c.trendData?.geoTier ?? "out") !== "out")
    .sort((a, b) => score(b) - score(a));
}

/**
 * 20 stories a reader actually lands on: the home-page editorial surfaces
 * (urgent · right-now · fast-rising · Tamil Nadu · India), in the order the home
 * page shows them, then filled from trend order. This is the real front door —
 * not a category round-robin that over-weights single-item celebrity feeds.
 */
function sample(n = 20): LiveCluster[] {
  const bySlug = new Map(dataset.clusters.filter((c) => c.slug).map((c) => [c.slug, c]));
  const ed = dataset.editorial;
  const order: string[] = [
    ...(ed?.urgent ?? []),
    ...(ed?.rightNow ?? []),
    ...(ed?.fastRising ?? []),
    ...(ed?.tamilNadu ?? []),
    ...(ed?.india ?? []),
    ...(dataset.trending ?? []),
  ];
  const out: LiveCluster[] = [];
  const seen = new Set<string>();
  for (const slug of order) {
    if (out.length >= n) break;
    const c = bySlug.get(slug);
    if (c && !seen.has(slug)) {
      seen.add(slug);
      out.push(c);
    }
  }
  for (const c of routable()) {
    if (out.length >= n) break;
    if (!seen.has(c.slug)) {
      seen.add(c.slug);
      out.push(c);
    }
  }
  return out.slice(0, n);
}

function understoodBefore(c: LiveCluster): boolean {
  const cap = c.cap;
  if (cap && (cap.event || cap.senderName) && (cap.areaDescription || c.districts.length > 0)) return true;
  const ec = c.claims;
  const es = c.trendData?.eventState;
  if (!ec || !es) return false;
  const corroborated = ec.claims.filter((cl) => cl.status === "corroborated" || cl.status === "partially-corroborated").length;
  const attributed = ec.claims.filter((cl) => cl.status === "attributed").length;
  return es.confirmedFacts.length >= 2 && (corroborated >= 1 || attributed >= 2);
}

interface Row {
  slug: string;
  event: string;
  category: string;
  articles: number;
  families: number;
  hasExcerpts: boolean;
  hasClaims: boolean;
  hasPrimary: boolean;
  currentSummary: string;
  understoodBefore: boolean;
  understoodAfter: boolean | null;
  afterNote: string;
}

async function main() {
let synthesizeBrief: SynthFn | null = null;
let verifyBrief: VerifyFn | null = null;
try {
  const mod = await import("../src/lib/brief/index");
  synthesizeBrief = mod.synthesizeBrief as SynthFn;
  verifyBrief = mod.verifyBrief as VerifyFn;
} catch {
  /* before state — brief lib not built yet */
}

const rows: Row[] = [];
for (const c of sample(20)) {
  const arts = clusterArts(c);
  const ml = c.trendData?.mediaLandscape;
  const ec = c.claims;
  const families = ml?.coverage.independentSourceFamilies ?? c.trendData?.independence?.families ?? 1;
  const hasExcerpts = arts.filter((a) => (a.excerpt ?? "").trim().length > 40).length >= Math.ceil(arts.length / 2);
  const hasClaims = !!ec && ec.claims.length >= 1;
  const hasPrimary =
    (ec?.evidence.length ?? 0) > 0 ||
    arts.some((a) => a.evidenceRole === "official-alert" || a.evidenceRole === "primary-document") ||
    (ml?.evidenceProfile.primaryDocumentSupported ?? 0) > 0;

  let understoodAfter: boolean | null = null;
  let afterNote = "brief lib not built";
  if (synthesizeBrief && verifyBrief) {
    try {
      const raw = synthesizeBrief(c, arts, { language: "en" });
      const b = verifyBrief(raw, c, arts);
      if (b.withheldReason) {
        understoodAfter = false;
        afterNote = `withheld: ${b.withheldReason}`;
      } else {
        const shortN = b.shortVersion.length;
        const factsN = b.keyFacts.length;
        const shortWords = b.shortVersion.map((s) => s.text).join(" ").split(/\s+/).filter(Boolean).length;
        // "can a normal reader explain the essential event from IFFA alone?"
        // a complete, verified lead sentence does that; key facts / why add depth.
        understoodAfter = shortN >= 1 && shortWords >= 7;
        const rich = factsN >= 2 || b.whyItMatters.length + b.whatChanged.length >= 1;
        afterNote = `${shortN} short (${shortWords}w) · ${factsN} facts · ${b.uncertainties.length} uncertain${rich ? " · rich" : ""}`;
      }
    } catch (e) {
      understoodAfter = false;
      afterNote = `error: ${(e as Error).message}`;
    }
  }

  rows.push({
    slug: c.slug,
    event: c.title.slice(0, 68),
    category: c.trendData?.category ?? "other-relevant",
    articles: arts.length,
    families,
    hasExcerpts,
    hasClaims,
    hasPrimary,
    currentSummary: "none — page states IFFA writes no prose account",
    understoodBefore: understoodBefore(c),
    understoodAfter,
    afterNote,
  });
}

const yn = (b: boolean) => (b ? "YES" : "no ");
console.log(`\nNATIVE-COMPREHENSION AUDIT — ${rows.length} stories · snapshot ${dataset.generatedAt}\n`);
for (const r of rows) {
  console.log(`■ ${r.event}`);
  console.log(`    slug=${r.slug}  category=${r.category}`);
  console.log(`    articles=${r.articles}  independent-families=${r.families}`);
  console.log(`    has excerpts? ${yn(r.hasExcerpts)}   has structured claims? ${yn(r.hasClaims)}   has primary evidence? ${yn(r.hasPrimary)}`);
  console.log(`    current native summary: ${r.currentSummary}`);
  console.log(`    understand from IFFA alone — BEFORE: ${yn(r.understoodBefore)}    AFTER: ${r.understoodAfter == null ? "—" : yn(r.understoodAfter)}   (${r.afterNote})`);
  console.log("");
}

const beforeYes = rows.filter((r) => r.understoodBefore).length;
const afterYes = rows.filter((r) => r.understoodAfter).length;
const afterKnown = rows.filter((r) => r.understoodAfter != null).length;
const withheld = rows.filter((r) => r.afterNote.startsWith("withheld")).length;
console.log("──────────────────────────────────────────────");
console.log(`NATIVE_COMPREHENSION_RATE (BEFORE): ${beforeYes}/${rows.length} = ${((beforeYes / rows.length) * 100).toFixed(0)}%`);
if (afterKnown > 0) {
  console.log(`NATIVE_COMPREHENSION_RATE (AFTER):  ${afterYes}/${rows.length} = ${((afterYes / rows.length) * 100).toFixed(0)}%`);
  console.log(`  of which withheld (insufficient independent coverage): ${withheld}/${rows.length}`);
  console.log(`  briefs delivered: ${afterYes}/${rows.length - withheld} of the stories that had the coverage to support one`);
}

// ── whole-corpus view: where the data supports a brief, does the synthesiser deliver? ──
if (synthesizeBrief && verifyBrief) {
  const multi = dataset.clusters.filter((c) => {
    const fam = c.trendData?.mediaLandscape?.coverage.independentSourceFamilies ?? c.trendData?.independence?.families ?? 1;
    return c.slug && (c.trendData?.geoTier ?? "out") !== "out" && (fam >= 2 || c.cap);
  });
  let delivered = 0;
  let held = 0;
  const dropReasons: Record<string, number> = {};
  for (const c of multi) {
    const a = clusterArts(c);
    try {
      const b = verifyBrief(synthesizeBrief(c, a, { language: "en" }), c, a);
      if (b.withheldReason) held++;
      else delivered++;
      for (const r of b.verification.dropReasons) {
        const key = r.split("—").pop()!.trim().replace(/"[^"]*"/g, "…").replace(/\d+/g, "N").slice(0, 60);
        dropReasons[key] = (dropReasons[key] ?? 0) + 1;
      }
    } catch {
      held++;
    }
  }
  console.log("──────────────────────────────────────────────");
  console.log(`WHOLE-CORPUS (${multi.length} clusters with ≥2 independent families or an official alert):`);
  console.log(`  brief delivered: ${delivered}  ·  withheld: ${held}  ·  delivery rate ${((delivered / multi.length) * 100).toFixed(0)}%`);
  console.log(`  verifier drop reasons (normalised):`);
  for (const [k, n] of Object.entries(dropReasons).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`    ${n}×  ${k}`);
}
console.log("──────────────────────────────────────────────\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
