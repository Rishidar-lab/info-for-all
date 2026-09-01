import { expect, test } from "@playwright/test";

test("home page shows the masthead, demo banner and story sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Info For All", level: 1 })).toBeVisible();
  await expect(page.getByText("DEMO DATA", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Current event clusters")).toBeVisible();
  await expect(page.getByText("Strong factual convergence")).toBeVisible();
  await expect(page.getByText("Significant contradictions")).toBeVisible();
  await expect(page.locator("text=/CGI/").first()).toBeVisible();
});

test("navigating from the home feed opens a story page", async ({ page }) => {
  await page.goto("/");
  const firstStory = page.locator("article h3 a").first();
  const title = (await firstStory.textContent())?.trim();
  await firstStory.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(title ?? "");
  await expect(page.getByText("What sources agree on")).toBeVisible();
  await expect(page.getByText("What sources disagree on")).toBeVisible();
  await expect(page.getByText("What we don't know yet")).toBeVisible();
});
