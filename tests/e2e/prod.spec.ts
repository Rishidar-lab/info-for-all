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
      await expect(page.getByRole("banner")).toContainText("IFFA");
    });
  }

  test("@prod home: version label, situation bar, event cards, basePath assets", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByRole("contentinfo")).toContainText(/v0\.(9|10|11|12)/);
    await expect(page.getByText("Current situation")).toBeVisible();
    expect(await page.locator("article.card").count()).toBeGreaterThan(3);
    const src = await page.locator('script[src*="_next/static"]').first().getAttribute("src");
    expect(src).toContain("/info-for-all/_next/static");
  });

  test("@prod a story page leads with the native IFFA Brief", async ({ page }) => {
    await page.goto(BASE + "/");
    await page.locator("#top-stories article a[href*='/story/']").first().click();
    await expect(page).toHaveURL(/\/story\//);
    await expect(page.getByRole("region", { name: "IFFA Brief" })).toBeVisible();
    await expect(page.getByText(/synthesises this brief from the reporting and primary records/i)).toBeVisible();
    await expect(page.getByText(/does not write its own prose account/i)).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /References/i })).toBeVisible();
  });

  test("@prod a withheld story names what was checked, not just 'one source' (§B.2.5)", async ({ page }) => {
    // the diagnostics page links withheld stories; a broader check: at least one
    // story page in the site carries the research-trail phrasing.
    const res = await page.request.get(BASE + "/data/index/latest.json");
    expect(res.status()).toBe(200);
    const { clusters } = (await res.json()) as { clusters: { slug: string; brief?: { withheld?: boolean } }[] };
    const withheld = clusters.find((c) => c.brief?.withheld);
    expect(withheld, "a withheld cluster exists in the index shard").toBeTruthy();
    await page.goto(`${BASE}/story/${withheld!.slug}/`);
    await expect(page.getByRole("region", { name: "IFFA Brief" })).toBeVisible();
    await expect(page.getByText(/A brief is written only when a genuinely independent/i)).toBeVisible();
  });

  test("@prod search ships a shell and loads its index shard", async ({ page }) => {
    const shard = await page.request.get(BASE + "/data/search/index.json");
    expect(shard.status()).toBe(200);
    expect((await shard.json()).entries.length).toBeGreaterThan(50);
    await page.goto(BASE + "/search/");
    await expect(page.getByRole("searchbox")).toBeVisible();
    await page.getByRole("searchbox").fill("tamil nadu");
    await expect(page.locator("a[href*='/story/']").first()).toBeVisible({ timeout: 10_000 });
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
