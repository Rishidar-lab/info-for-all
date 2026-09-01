import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Runs once before the test suite: provisions a clean SQLite database at
 * ./.vitest-ifa.db (matching vitest.config `env.DATABASE_URL`), migrates it and
 * loads DEMO DATA so API-route integration tests have something to read.
 */
export default function setup() {
  const dbPath = resolve(process.cwd(), ".vitest-ifa.db");
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const target = `${dbPath}${suffix}`;
    if (existsSync(target)) rmSync(target);
  }

  const env = { ...process.env, DATABASE_URL: "file:./.vitest-ifa.db", LOG_LEVEL: "error" };
  execFileSync("npx", ["tsx", "src/lib/db/migrate.ts"], { env, stdio: "ignore" });
  execFileSync("npx", ["tsx", "src/lib/db/seed.ts"], { env, stdio: "ignore" });

  return () => {
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const target = `${dbPath}${suffix}`;
      if (existsSync(target)) rmSync(target);
    }
  };
}
