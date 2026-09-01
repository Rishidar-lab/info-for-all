import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/helpers/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./.vitest-ifa.db",
      IFA_DEMO_MODE: "true",
      AI_PROVIDER: "mock",
      LOG_LEVEL: "error",
    },
    pool: "forks",
    // Integration tests share one SQLite file — run files serially in one worker.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/db/seed.ts", "src/lib/db/migrate.ts", "**/*.d.ts"],
    },
  },
});
