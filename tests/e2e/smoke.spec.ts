import { test, expect, type Page } from "@playwright/test";

const ROUTES = [
  "/",
  "/landscape/",
  "/tamil-nadu/landscape/",
  "/search/",
  "/source/compare/",
  "/source/the-hindu/",
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
  test("home renders story cards and the situation bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Current situation")).toBeVisible();
    await expect(page.getByRole("heading", { name: /most-covered stories right now/i })).toBeVisible();
    const cards = page.locator("#top-stories article.card");
    expect(await cards.count()).toBeGreaterThan(3);
  });

  test("a story page shows the timeline and coverage comparison tabs", async ({ page }) => {
    await page.goto("/");
    await page.locator("#top-stories article a[href^='/story/']").first().click();
    await expect(page).toHaveURL(/\/story\//);
    await expect(page.getByRole("tab", { name: /Timeline/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Full coverage/i })).toBeVisible();
    await page.getByRole("tab", { name: /Timeline/i }).click();
    await expect(page.getByText(/Timeline|What changed|first reported/i).first()).toBeVisible();
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

test.describe("IFFA v0.10 — media landscape", () => {
  test("home leads with the media-landscape framing, not a feed", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /See the coverage, not just the headline/i })).toBeVisible();
    await expect(page.getByText(/who is reporting it, who isn.t, who owns those sources/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /most-covered stories right now/i })).toBeVisible();
    // a story card shows a source count + coverage alignment
    await expect(page.getByText(/SOURCES/).first()).toBeVisible();
    await expect(page.getByText(/Coverage alignment/i).first()).toBeVisible();
  });

  test("a story page has the media-landscape tabs and the no-truth-score framing", async ({ page }) => {
    await page.goto("/");
    await page.locator("#top-stories article a[href^='/story/']").first().click();
    await expect(page.getByRole("tab", { name: /Full coverage/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Media landscape/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Headlines/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Evidence/i })).toBeVisible();
    await page.getByRole("tab", { name: /Media landscape/i }).click();
    await expect(page.getByRole("heading", { name: /Who is covering this/i })).toBeVisible();
  });

  test("/landscape shows the media-landscape dashboard", async ({ page }) => {
    await page.goto("/landscape/");
    await expect(page.getByRole("heading", { name: /Today.s media landscape/i })).toBeVisible();
    await expect(page.getByText(/Independent families/i).first()).toBeVisible();
    await expect(page.getByText(/Ownership is metadata/i).first()).toBeVisible();
  });

  test("a source profile shows provenance-backed ownership + separate IFFA metrics", async ({ page }) => {
    await page.goto("/source/the-hindu/");
    await expect(page.getByRole("heading", { name: "The Hindu", exact: true })).toBeVisible();
    await expect(page.getByText(/Kasturi & Sons/).first()).toBeVisible();
    await expect(page.getByText(/verified 2026-|confidence:/i).first()).toBeVisible();
    await expect(page.getByText(/IFFA observed metrics/i)).toBeVisible();
    await expect(page.getByText(/never blended/i)).toBeVisible();
  });

  test("home still exposes the de-emphasised background section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Background / more")).toBeVisible();
  });

  test("a story page's Overview exposes the interpretable ranking breakdown", async ({ page }) => {
    await page.goto("/");
    await page.locator("#top-stories article a[href^='/story/']").first().click();
    const why = page.locator("details summary", { hasText: /score/i }).first();
    if (await why.count()) {
      await why.click();
      await expect(
        page.locator("text=/relevance|consequence|independent|new information|recency|Priority domain/i").first(),
      ).toBeVisible();
    }
    // the evidence profile never shows a truth percentage
    await expect(page.getByText(/not a .+percent.* true|Counts, not a/i).first()).toBeVisible();
  });

  test("footer links the editorial model and calls the score a ranking", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /editorial model/i }).first()).toHaveAttribute(
      "href",
      /EDITORIAL-MODEL\.md/,
    );
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
