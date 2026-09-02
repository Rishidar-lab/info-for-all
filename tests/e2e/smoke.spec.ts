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
  test("home shows IFFA / Info Free For All and v0.9", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toContainText("IFFA");
    await expect(page.getByRole("contentinfo")).toContainText(/Info Free For All/i);
    await expect(page.getByRole("contentinfo")).toContainText(/v0\.9/);
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

  test("a ranking 'why' breakdown opens", async ({ page }) => {
    await page.goto("/");
    const why = page.locator("details summary", { hasText: /score/i }).first();
    await why.click();
    await expect(
      why.locator("..").locator("text=/independent|relevance|consequence|updated|Priority domain|new information/i").first(),
    ).toBeVisible();
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

test.describe("IFFA v0.9 — editorial intelligence", () => {
  test("home shows the editorial hierarchy: Right now, Background/more", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /What matters right now/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Relevant, but not currently developing/i })).toBeVisible();
    await expect(page.getByText("Background / more")).toBeVisible();
  });

  test("an event's 'why prominent' breakdown lists interpretable factors", async ({ page }) => {
    await page.goto("/");
    const why = page.locator("details summary", { hasText: /score/i }).first();
    await why.click();
    const panel = why.locator("..");
    await expect(
      panel.locator("text=/relevance|consequence|independent|new information|recency|Priority domain/i").first(),
    ).toBeVisible();
  });

  test("footer carries the v0.9 label; the page links the editorial model", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toContainText(/v0\.9/);
    await expect(page.getByRole("link", { name: /editorial model/i }).first()).toHaveAttribute(
      "href",
      /EDITORIAL-MODEL\.md/,
    );
    // the score is described as a ranking, not a probability of truth
    await expect(page.getByText(/ranking/i).first()).toBeVisible();
  });

  test("quality dashboard shows the v0.9 editorial layer with a top-events table", async ({ page }) => {
    await page.goto("/methodology/quality/");
    await expect(page.getByText(/v0\.9 . Editorial Intelligence layer/i)).toBeVisible();
    await expect(page.getByText(/Top 10 events by editorial score/i)).toBeVisible();
    await expect(page.getByText(/Editorial bands/i).first()).toBeVisible();
  });

  test("offline shows an unmistakable OFFLINE — NOT LIVE banner", async ({ page, context }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle").catch(() => {});
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(
      page.getByRole("alert").filter({ hasText: /offline/i }),
    ).toContainText(/offline . not live/i);
    await context.setOffline(false);
  });

  test("mobile home hierarchy fits 390px without horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Right now/i })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
