/**
 * Applies pending SQL migrations from ./drizzle to the configured database.
 * Run with: npm run db:migrate
 */
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { resolveDbPath } from "./index";

function main() {
  const path = resolveDbPath();
  const migrationsFolder = resolve(process.cwd(), "drizzle");
  const sqlite = new Database(path);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  const startedAt = Date.now();
  migrate(db, { migrationsFolder });
  sqlite.close();

  process.stdout.write(
    `migrations applied to ${path} in ${Date.now() - startedAt}ms\n`,
  );
}

main();
