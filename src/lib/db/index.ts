import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export { schema };

// better-sqlite3 is a native Node module; a client bundle importing this file
// would fail the Turbopack build. This guard makes the intent explicit.
if (typeof window !== "undefined") {
  throw new Error("src/lib/db must never be imported into client code");
}

export function resolveDbPath(rawUrl = process.env.DATABASE_URL ?? "file:./ifa.db"): string {
  const withoutScheme = rawUrl.replace(/^file:/, "").trim() || "./ifa.db";
  if (withoutScheme === ":memory:") return ":memory:";
  return isAbsolute(withoutScheme) ? withoutScheme : resolve(process.cwd(), withoutScheme);
}

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

function createDb(): Db {
  const path = resolveDbPath();
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema }) as Db;
}

// Reuse a single connection across dev hot-reloads.
const globalForDb = globalThis as unknown as { __ifaDb?: Db };

export const db: Db = globalForDb.__ifaDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__ifaDb = db;

export function databaseFileExists(): boolean {
  const path = resolveDbPath();
  return path === ":memory:" || existsSync(path);
}
