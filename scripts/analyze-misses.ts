/**
 * v0.5 Phase 8 — error-driven development.
 *
 *   npx tsx scripts/analyze-misses.ts
 *
 * Groups every current false negative (expected `same`/`uncertain`, engine kept
 * them apart, or expected a specific shared claim and didn't get one) by ROOT
 * CAUSE, so the highest-frequency categories can be prioritised. Writes
 * evaluation/reports/missed-matches.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FULL_CORPUS as CORPUS } from "../evaluation/claims/corpus-all";
import { observe } from "../evaluation/claims/harness";
import { classifyGeo } from "../src/lib/live/geo";
import { normalisedTitleKey } from "../src/lib/live/text";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "evaluation/reports/missed-matches.md");

type Cause =
  | "synonym/paraphrase"
  | "action-verb variant"
  | "entity alias"
  | "location alias / transliteration"
  | "abbreviation"
  | "numeric normalization"
  | "date formatting"
  | "Tamil inflection / morphology"
  | "Tamil↔English (no cross-language layer)"
  | "insufficient context (state-level, no district)"
  | "figure phrasing not extracted"
  | "truly ambiguous / borderline"
  | "other";

function hasTamil(s: string): boolean {
  return /[஀-௿]/.test(s);
}

function guessCause(a: string, b: string): Cause {
  if (hasTamil(a) && hasTamil(b)) return "Tamil inflection / morphology";
  if (hasTamil(a) || hasTamil(b)) return "Tamil↔English (no cross-language layer)";
  const ga = classifyGeo({ title: a });
  const gb = classifyGeo({ title: b });
  if (ga.districts.length === 0 && gb.districts.length === 0) return "insufficient context (state-level, no district)";
  if (/\b(mm|cm|crore|lakh|billion|kmph|km\/h|cusec|ft|feet)\b/i.test(a + b)) return "numeric normalization";
  if (/\b(a dozen|dozen|half a)\b/i.test(a + b)) return "numeric normalization";
  const aWords = new Set(normalisedTitleKey(a).split(" "));
  const bWords = new Set(normalisedTitleKey(b).split(" "));
  let inter = 0;
  for (const w of aWords) if (bWords.has(w)) inter++;
  const jac = inter / (aWords.size + bWords.size - inter || 1);
  if (jac < 0.25) return "synonym/paraphrase";
  return "action-verb variant";
}

function main() {
  const targets = CORPUS.filter(
    (c) => c.inputB && (c.expected.relation === "same" || (c.expected.relation === "uncertain" && c.inputA.language === "ta")),
  );

  const misses: { id: string; category: string; cause: Cause; a: string; b: string; detail: string }[] = [];
  for (const c of targets) {
    const o = observe(c);
    const level = c.expected.matchLevel ?? "specific";
    const matched = level === "event" ? o.sharedEvent : !!o.sharedSpecific;
    const wantHeld = c.expected.relation === "uncertain"; // should NOT match, but should be a candidate someday
    if (matched && !wantHeld) continue;
    if (wantHeld) continue; // cross-lang held cases are correct today — list separately below
    misses.push({
      id: c.id,
      category: c.category,
      cause: guessCause(c.inputA.text, c.inputB!.text),
      a: c.inputA.text,
      b: c.inputB!.text,
      detail: o.clusteredTogether
        ? o.sharedEvent
          ? "clustered; no shared SPECIFIC claim (claim-identity gap)"
          : "clustered but not a shared event"
        : "NOT clustered (event-identity gap)",
    });
  }

  const byCause = new Map<Cause, typeof misses>();
  for (const m of misses) {
    if (!byCause.has(m.cause)) byCause.set(m.cause, []);
    byCause.get(m.cause)!.push(m);
  }
  const ranked = [...byCause.entries()].sort((x, y) => y[1].length - x[1].length);

  const L: string[] = [];
  L.push("# Missed matches — root-cause analysis (v0.5 Phase 8)");
  L.push("");
  L.push(`Full corpus (${CORPUS.length} cases). ${targets.length} true same-fact pairs examined; **${misses.length} false negatives** after v0.5.`);
  L.push("");
  L.push("## By root cause (ranked)");
  L.push("");
  L.push("| Cause | Count | Cases |");
  L.push("|---|---|---|");
  for (const [cause, list] of ranked) {
    L.push(`| ${cause} | ${list.length} | ${list.map((m) => m.id).join(", ")} |`);
  }
  L.push("");
  L.push("## Detail");
  L.push("");
  for (const [cause, list] of ranked) {
    L.push(`### ${cause} (${list.length})`);
    L.push("");
    for (const m of list) {
      L.push(`- **${m.id}** — ${m.detail}`);
      L.push(`  - A: ${m.a}`);
      L.push(`  - B: ${m.b}`);
    }
    L.push("");
  }
  L.push("## Priority order for v0.5");
  L.push("");
  ranked.forEach(([cause, list], i) => L.push(`${i + 1}. **${cause}** — ${list.length} case(s)`));
  L.push("");

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, L.join("\n") + "\n");
  console.log(`analyze-misses — ${misses.length} false negatives across ${ranked.length} causes → ${OUT}`);
  for (const [c, l] of ranked) console.log(`  ${String(l.length).padStart(3)}  ${c}`);
}

main();
