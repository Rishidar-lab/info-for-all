import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Requires browsers: `npx playwright install chromium`.
 * Runs against a production build seeded with DEMO DATA.
 */
const PORT = Number(process.env.E2E_PORT ?? 3311);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && DATABASE_URL=file:./e2e.db npm run db:setup && DATABASE_URL=file:./e2e.db npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
