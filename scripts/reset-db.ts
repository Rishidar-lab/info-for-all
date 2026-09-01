/**
 * Drops the SQLite database file(s) and re-applies migrations. Run: npm run db:reset
 * Follow with `npm run db:seed` to repopulate DEMO DATA.
 */
import { existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolveDbPath } from "../src/lib/db/index";

const path = resolveDbPath();
for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  const target = `${path}${suffix}`;
  if (existsSync(target)) {
    rmSync(target);
    process.stdout.write(`removed ${target}\n`);
  }
}

execFileSync("npx", ["tsx", "src/lib/db/migrate.ts"], { stdio: "inherit" });
process.stdout.write("database reset. run `npm run db:seed` to load DEMO DATA.\n");
