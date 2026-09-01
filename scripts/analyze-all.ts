/**
 * Recomputes independence, corroboration, contradiction, information status and
 * the Common Ground Index for every event. Run: npm run analyze
 */
import { db } from "../src/lib/db/index";
import { analyzeAllEvents } from "../src/lib/domain/analyze";

async function main() {
  const results = await analyzeAllEvents(db);
  for (const r of results) {
    process.stdout.write(
      `${r.eventId}  CGI ${String(r.cgi.score).padStart(3)} (${r.cgi.band})  ` +
        `claims:${r.claimsUpdated}  contradictions:${r.contradictionPairs}  ` +
        `independentSources:${r.independentSourceCount}\n`,
    );
  }
  process.stdout.write(`\nanalyzed ${results.length} event(s)\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
