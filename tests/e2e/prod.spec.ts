import { test, expect } from "@playwright/test";

/**
 * @prod — hits the LIVE GitHub Pages deployment. Excluded from the default run;
 * run with `E2E_ALL=1 npx playwright test tests/e2e/prod.spec.ts --grep @prod`
 * after a deploy.
 */
const BASE = "https://rishidar-lab.github.io/info-for-all";

const ROUTES = [
  "/", "/crisis/", "/politics/", "/finance/", "/sports/", "/tamil-nadu/",
  "/india/", "/trends/", "/sources/", "/methodology/quality/", "/about/", "/diagnostics/",
];

test.describe("@prod live production smoke", () => {
  test.use({ baseURL: BASE });

  for (const r of ROUTES) {
    test(`@prod ${r} → 200`, async ({ page }) => {
      const resp = await page.goto(BASE + r, { waitUntil: "domcontentloaded" });
      expect(resp?.status()).toBe(200);
      await expect(page.locator("header")).toContainText("IFFA");
    });
  }

  test("@prod home: v0.8 label, situation bar, event cards, basePath assets", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.locator("footer")).toContainText(/v0\.8/);
    await expect(page.getByText("Current situation")).toBeVisible();
    expect(await page.locator("article.card").count()).toBeGreaterThan(3);
    const src = await page.locator('script[src*="_next/static"]').first().getAttribute("src");
    expect(src).toContain("/info-for-all/_next/static");
  });

  test("@prod no horizontal overflow at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const r of ["/", "/crisis/", "/trends/", "/methodology/quality/"]) {
      await page.goto(BASE + r);
      const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(of, `overflow on ${r}`).toBeLessThanOrEqual(1);
    }
  });
});
