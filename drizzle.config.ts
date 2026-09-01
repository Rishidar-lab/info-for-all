import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — used only for generating migration SQL from the schema.
 * Runtime DB access goes through src/lib/db/index.ts.
 */
const url = (process.env.DATABASE_URL ?? "file:./ifa.db").replace(/^file:/, "");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
