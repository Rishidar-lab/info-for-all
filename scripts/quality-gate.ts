/**
 * IFA v0.4 quality gate (Phase 23).
 *
 *   npm run quality-gate
 *
 * Fails (exit 1) if the claim layer regresses past the release thresholds.
 * These thresholds encode the non-negotiables: IFA must not fabricate
 * corroboration, must not silently turn a developing count into a contradiction,
 * and must not drop a speaker.
 *
 * They are intentionally NOT tuned to whatever the engine currently scores —
 * lowering a threshold to make the gate pass is a code-review red flag.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runCorpus } from "../evaluation/claims/harness";
import { CORPUS } from "../evaluation/claims/corpus";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "src/data/generated/live-feed.json");

interface Gate {
  name: string;
  ok: boolean;
  detail: string;
}

const gates: Gate[] = [];
const gate = (name: string, ok: boolean, detail: string) => gates.push({ name, ok, detail });

// ── corpus thresholds ──────────────────────────────────────────────────
const report = runCorpus(CORPUS);
const m = report.metrics;

gate(
  "false corroboration rate < 2%",
  report.falseCorroboration.rate < 0.02,
  `${report.falseCorroboration.count}/${report.falseCorroboration.denominator} = ${(report.falseCorroboration.rate * 100).toFixed(1)}%`,
);
gate(
  "claim-matching precision ≥ 95%",
  (m.claimMatching.precision ?? 0) >= 0.95,
  `${((m.claimMatching.precision ?? 0) * 100).toFixed(1)}%`,
);
gate(
  "contradiction precision ≥ 90%",
  (m.contradiction.precision ?? 0) >= 0.9,
  `${((m.contradiction.precision ?? 0) * 100).toFixed(1)}%`,
);
gate(
  "attribution retention ≥ 90%",
  (m.attribution.accuracy ?? 0) >= 0.9,
  `${((m.attribution.accuracy ?? 0) * 100).toFixed(1)}%`,
);
gate(
  "temporal-update classification ≥ 70%",
  (m.temporalUpdate.accuracy ?? 0) >= 0.7,
  `${((m.temporalUpdate.accuracy ?? 0) * 100).toFixed(1)}%`,
);
gate(
  "primary-evidence precision ≥ 90%",
  (m.primaryEvidence.precision ?? 0) >= 0.9,
  `${((m.primaryEvidence.precision ?? 0) * 100).toFixed(1)}%`,
);
gate(
  "cross-language pairs never silently merged (100%)",
  (m.crossLanguageHeld.accuracy ?? 0) >= 1,
  `${((m.crossLanguageHeld.accuracy ?? 0) * 100).toFixed(1)}%`,
);
gate(
  "Tamil original text always preserved (100%)",
  (m.tamilOriginalKept.accuracy ?? 0) >= 1,
  `${((m.tamilOriginalKept.accuracy ?? 0) * 100).toFixed(1)}%`,
);

// ── live snapshot invariants ───────────────────────────────────────────
try {
  const data = JSON.parse(readFileSync(DATA, "utf8")) as {
    clusters: {
      slug: string;
      claims?: {
        claims: {
          status: string;
          canonicalText: string;
          independentSourceGroups: unknown[];
          supportingPublisherIds: unknown[];
          primaryEvidenceIds: unknown[];
          provenance: { attribution?: string; extractionMethod?: string }[];
        }[];
      };
    }[];
  };
  let corroViolations = 0;
  let attrViolations = 0;
  let modelViolations = 0;
  for (const c of data.clusters) {
    for (const cl of c.claims?.claims ?? []) {
      if (
        cl.status === "corroborated" &&
        (cl.independentSourceGroups.length < 2 || cl.supportingPublisherIds.length < 2) &&
        cl.primaryEvidenceIds.length === 0
      ) {
        corroViolations++;
      }
      if (cl.status === "attributed" && !cl.provenance.some((p) => p.attribution)) attrViolations++;
      if (cl.provenance.some((p) => p.extractionMethod === "model") && cl.provenance.every((p) => p.extractionMethod === "model") && !cl.provenance.some((p) => p.attribution) && cl.independentSourceGroups.length < 2) {
        // a model-only claim with no corroboration and no speaker must not exist
        modelViolations++;
      }
    }
  }
  gate("no fabricated consensus in the live snapshot", corroViolations === 0, `${corroViolations} violation(s)`);
  gate("every attributed claim keeps its speaker", attrViolations === 0, `${attrViolations} violation(s)`);
  gate("no model-only unsupported claim rendered", modelViolations === 0, `${modelViolations} violation(s)`);
} catch (e) {
  gate("live snapshot readable", false, String(e));
}

// ── report ─────────────────────────────────────────────────────────────
console.log("\nIFA v0.4 quality gate\n");
let failed = 0;
for (const g of gates) {
  console.log(`  ${g.ok ? "PASS" : "FAIL"}  ${g.name.padEnd(48)} ${g.detail}`);
  if (!g.ok) failed++;
}
console.log(`\n${gates.length - failed}/${gates.length} gates passed\n`);
process.exit(failed ? 1 : 0);
