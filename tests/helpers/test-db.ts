import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";
import type { Db } from "@/lib/db";

/**
 * Creates a fully isolated, migrated SQLite database for a single test.
 * Domain functions (`analyzeEvent`, `ingest`, `getEventDetail`, …) take a `Db`
 * argument, so tests can run against this instead of the app singleton.
 */
export interface TestDb {
  db: Db;
  cleanup: () => void;
}

export function createTestDb(): TestDb {
  const dir = mkdtempSync(join(tmpdir(), "ifa-test-"));
  const sqlite = new Database(join(dir, "test.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema }) as unknown as Db;

  migrate(db as never, { migrationsFolder: "drizzle" });

  return {
    db,
    cleanup: () => {
      sqlite.close();
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    },
  };
}

export { schema };
