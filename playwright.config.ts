import { defineConfig, devices } from "@playwright/test";

/**
 * IFFA E2E — drives the real exported static build (`out/`) in a headless
 * browser. `npm run build` must have run first (CI does this; locally the
 * webServer command below rebuilds if `out/` is missing).
 *
 * `tests/e2e/prod.spec.ts` is excluded from the default run — it hits the live
 * production URL and is run explicitly with `--grep @prod`.
 */
const PORT = 4173;
/**
 * The default local run builds + serves at the domain root (basePath unset) and
 * exercises all behaviour. The `/info-for-all` basePath is a deploy-config
 * concern verified by `tests/e2e/prod.spec.ts` (@prod) against the real site.
 */
const BASE_PATH = process.env.E2E_BASE_PATH ?? "";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  grepInvert: process.env.E2E_ALL ? undefined : /@prod/,
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH || "/"}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // `E2E_PROD_ONLY=1` runs only tests/e2e/prod.spec.ts against the live site and
  // needs no local server.
  webServer: process.env.E2E_PROD_ONLY
    ? undefined
    : {
        command: `sh -c 'rm -rf out && ${BASE_PATH ? `PAGES_BASE_PATH=${BASE_PATH} ` : ""}npm run build && PORT=${PORT} BASE_PATH=${BASE_PATH} node scripts/serve-out.mjs'`,
        url: `http://localhost:${PORT}${BASE_PATH}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile-390", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } } },
  ],
});
