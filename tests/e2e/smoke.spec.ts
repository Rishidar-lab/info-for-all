import { test, expect, type Page } from "@playwright/test";

const ROUTES = [
  "/",
  "/crisis/",
  "/politics/",
  "/finance/",
  "/sports/",
  "/tamil-nadu/",
  "/india/",
  "/trends/",
  "/sources/",
  "/about/",
  "/methodology/quality/",
  "/diagnostics/",
];

/** Collect page errors + failed responses for the current navigation. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 400 && !u.includes("favicon")) errors.push(`${r.status()} ${u}`);
  });
  return errors;
}

test.describe("IFFA production build — every route", () => {
  for (const route of ROUTES) {
    test(`${route} loads with no fatal error`, async ({ page }) => {
      const errors = watch(page);
      const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(resp?.status(), route).toBeLessThan(400);
      await expect(page.getByRole("banner")).toBeVisible(); // site header
      await expect(page.getByRole("contentinfo")).toBeVisible(); // site footer
      // assets must resolve under the base path
      const badAssets = errors.filter((e) => /_next\/static/.test(e));
      expect(badAssets, `broken assets on ${route}`).toEqual([]);
      expect(errors.filter((e) => e.startsWith("Error")), `JS errors on ${route}`).toEqual([]);
      // no horizontal overflow
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("IFFA branding + version", () => {
  test("home shows IFFA / Info Free For All and v0.8", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toContainText("IFFA");
    await expect(page.getByRole("contentinfo")).toContainText(/Info Free For All/i);
    await expect(page.getByRole("contentinfo")).toContainText(/v0\.8/);
  });
});

test.describe("IFFA event-first UI", () => {
  test("home renders event cards and the situation bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Current situation")).toBeVisible();
    await expect(page.getByRole("heading", { name: /What matters right now/i })).toBeVisible();
    const cards = page.locator("article.card");
    expect(await cards.count()).toBeGreaterThan(3);
  });

  test("a trend 'why' breakdown opens", async ({ page }) => {
    await page.goto("/trends/");
    const why = page.locator("details summary", { hasText: /trend score/i }).first();
    await why.click();
    await expect(why.locator("..").locator("text=/independent source famil|updated in the last hour|relevance/i").first()).toBeVisible();
  });

  test("an event page shows the timeline and coverage comparison", async ({ page }) => {
    await page.goto("/");
    await page.locator('a:has-text("Open event")').first().click();
    await expect(page).toHaveURL(/\/story\//);
    await expect(page.getByText(/Timeline|What changed/i).first()).toBeVisible();
    await expect(page.getByText(/Compare coverage|How the sources describe/i).first()).toBeVisible();
  });

  test("category nav works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Crisis", exact: true }).first().click();
    await expect(page).toHaveURL(/\/crisis\//);
    await expect(page.getByRole("heading", { name: "Crisis", level: 1 })).toBeVisible();
  });
});

test.describe("IFFA quality + diagnostics", () => {
  test("quality dashboard shows the version history and the category eval", async ({ page }) => {
    await page.goto("/methodology/quality/");
    await expect(page.getByText(/v0\.4 . v0\.5 . v0\.6/i)).toBeVisible();
  });

  test("diagnostics shows source health", async ({ page }) => {
    await page.goto("/diagnostics/");
    await expect(page.getByText(/Source health/i)).toBeVisible();
    await expect(page.getByText(/Pipeline diagnostics/i)).toBeVisible();
  });
});
