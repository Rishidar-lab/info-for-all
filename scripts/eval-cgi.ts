/**
 * CGI calibration / sensitivity harness (v0.4, Phase 19).
 *
 *   npm run eval:cgi
 *
 * The Common Ground Index is EXPERIMENTAL. This does not "fix" it — it measures
 * how much its output moves when each weight is perturbed ±20%, and what happens
 * when primary evidence is unavailable. Writes:
 *
 *   evaluation/reports/cgi-sensitivity.json   (tracked)
 *   evaluation/reports/cgi-sensitivity.md     (tracked)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeCgi, DEFAULT_CGI_WEIGHTS, type CgiWeights } from "../src/lib/claims/cgi";
import type { Claim, ClaimDispute, Evidence, EventClaims } from "../src/lib/claims/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = resolve(ROOT, "evaluation/reports");
const DATA = resolve(ROOT, "src/data/generated/live-feed.json");

interface StoredEC {
  claims: Claim[];
  evidence: Evidence[];
  disputes: ClaimDispute[];
  independence: EventClaims["independence"];
}

function loadEvents(): { id: string; ec: StoredEC }[] {
  const data = JSON.parse(readFileSync(DATA, "utf8")) as {
    clusters: { slug: string; claims?: StoredEC }[];
  };
  return data.clusters
    .filter((c) => c.claims && c.claims.independence.distinctPublishers >= 2)
    .map((c) => ({ id: c.slug, ec: c.claims! }));
}

function cgiOf(ec: StoredEC, w: CgiWeights) {
  return computeCgi(ec.claims, ec.evidence, ec.disputes, ec.independence, w);
}

const PERTURB_KEYS: (keyof CgiWeights)[] = [
  "corroboratedGain",
  "evidenceBonus",
  "singleSourcePenalty",
  "attributedPenalty",
  "disputedPenalty",
  "hardDisputePenalty",
  "syndicationPenalty",
  "thinBaseCap",
];

function main() {
  const events = loadEvents();
  const baseline = events.map((e) => ({ id: e.id, cgi: cgiOf(e.ec, DEFAULT_CGI_WEIGHTS) })).filter((e) => e.cgi);

  const sweeps: {
    weight: string;
    direction: string;
    from: number;
    to: number;
    meanAbsDelta: number;
    maxAbsDelta: number;
    bandFlips: number;
  }[] = [];

  for (const key of PERTURB_KEYS) {
    for (const factor of [0.8, 1.2]) {
      const w = { ...DEFAULT_CGI_WEIGHTS, [key]: Math.round(DEFAULT_CGI_WEIGHTS[key] * factor) };
      let sum = 0;
      let max = 0;
      let flips = 0;
      let count = 0;
      for (const b of baseline) {
        const ev = events.find((e) => e.id === b.id)!;
        const next = cgiOf(ev.ec, w);
        if (!next || !b.cgi) continue;
        const d = Math.abs(next.score - b.cgi.score);
        sum += d;
        max = Math.max(max, d);
        if (next.band !== b.cgi.band) flips++;
        count++;
      }
      sweeps.push({
        weight: key,
        direction: factor < 1 ? "−20%" : "+20%",
        from: DEFAULT_CGI_WEIGHTS[key],
        to: Math.round(DEFAULT_CGI_WEIGHTS[key] * factor),
        meanAbsDelta: count ? +(sum / count).toFixed(2) : 0,
        maxAbsDelta: max,
        bandFlips: flips,
      });
    }
  }

  // Scenario: primary evidence unavailable for every event.
  let noEvidFlips = 0;
  let noEvidMeanDrop = 0;
  let noEvidCount = 0;
  for (const b of baseline) {
    const ev = events.find((e) => e.id === b.id)!;
    const stripped: StoredEC = {
      ...ev.ec,
      evidence: [],
      claims: ev.ec.claims.map((c) => ({ ...c, primaryEvidenceIds: [] })),
    };
    const next = cgiOf(stripped, DEFAULT_CGI_WEIGHTS);
    if (!next || !b.cgi) continue;
    noEvidMeanDrop += b.cgi.score - next.score;
    if (next.band !== b.cgi.band) noEvidFlips++;
    noEvidCount++;
  }

  const bandCounts = baseline.reduce<Record<string, number>>((a, b) => {
    a[b.cgi!.band] = (a[b.cgi!.band] ?? 0) + 1;
    return a;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    events: baseline.length,
    bandDistribution: bandCounts,
    meanScore: baseline.length
      ? +(baseline.reduce((s, b) => s + (b.cgi?.score ?? 0), 0) / baseline.length).toFixed(1)
      : 0,
    weightSweeps: sweeps.sort((a, b) => b.meanAbsDelta - a.meanAbsDelta),
    noPrimaryEvidenceScenario: {
      events: noEvidCount,
      meanScoreDrop: noEvidCount ? +(noEvidMeanDrop / noEvidCount).toFixed(2) : 0,
      bandFlips: noEvidFlips,
    },
    defaults: DEFAULT_CGI_WEIGHTS,
  };

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(resolve(REPORT_DIR, "cgi-sensitivity.json"), JSON.stringify(report, null, 2) + "\n");

  const md: string[] = [];
  md.push("# CGI sensitivity analysis");
  md.push("");
  md.push("_The Common Ground Index is **experimental**. This report measures how ");
  md.push("stable it is — it is not a claim that the weights are correct._");
  md.push("");
  md.push(`- events analysed (≥2 publishers, CGI present): **${report.events}**`);
  md.push(`- mean CGI: **${report.meanScore}** · band distribution: ${JSON.stringify(report.bandDistribution)}`);
  md.push("");
  md.push("## Weight perturbation (±20%), ranked by impact");
  md.push("");
  md.push("| Weight | Change | value | mean |Δscore| | max |Δ| | band flips |");
  md.push("|---|---|---|---|---|---|");
  for (const s of report.weightSweeps) {
    md.push(`| ${s.weight} | ${s.direction} | ${s.from}→${s.to} | ${s.meanAbsDelta} | ${s.maxAbsDelta} | ${s.bandFlips} |`);
  }
  md.push("");
  md.push("## Scenario: no primary evidence retrieved");
  md.push("");
  md.push(
    `Stripping every CAP/SACHET record: mean CGI drop **${report.noPrimaryEvidenceScenario.meanScoreDrop}** points, ` +
      `**${report.noPrimaryEvidenceScenario.bandFlips}** of ${report.noPrimaryEvidenceScenario.events} events change band.`,
  );
  md.push("");
  md.push("## Reading this");
  md.push("");
  md.push("- A weight whose ±20% swing moves the mean score by only a point or two, with no band flips, is not doing much work — the score is dominated by the corroboration ratio and the presence of primary evidence, which is the intent.");
  md.push("- If `corroboratedGain` or `evidenceBonus` show the largest impact, that is expected and desirable: CGI *should* be most sensitive to genuine corroboration and to a primary record.");
  md.push("- Large `disputedPenalty` sensitivity with band flips means a single disputed claim can tip an event out of the moderate band — deliberately conservative.");
  md.push("");

  writeFileSync(resolve(REPORT_DIR, "cgi-sensitivity.md"), md.join("\n") + "\n");
  console.log(
    `eval:cgi — ${report.events} events · mean ${report.meanScore} · ` +
      `top-sensitivity weight: ${report.weightSweeps[0]?.weight ?? "—"} ` +
      `(mean Δ ${report.weightSweeps[0]?.meanAbsDelta ?? 0}, ${report.weightSweeps[0]?.bandFlips ?? 0} flips)`,
  );
}

main();
