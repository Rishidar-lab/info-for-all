import { expect, test } from "@playwright/test";

test("search from the header returns cross-entity results", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("search").first().locator("input").fill("superconductivity");
  await page.getByRole("search").first().locator("input").press("Enter");

  await expect(page).toHaveURL(/\/search\?q=superconductivity/);
  await expect(page.getByRole("heading", { level: 2 })).toContainText("Results for");
  await expect(page.locator("li a").first()).toBeVisible();
});

test("the sources directory lists synthetic publications and links to a profile", async ({ page }) => {
  await page.goto("/sources");
  await expect(page.getByText("Publications and record-keepers")).toBeVisible();
  await expect(
    page.getByText("does", { exact: false }).filter({ hasText: "political-bias scores" }),
  ).toBeVisible();
  const firstSource = page.locator("table a").first();
  await firstSource.click();
  await expect(page.getByText("Corporate structure")).toBeVisible();
  await expect(page.getByText("No political-bias score is assigned.", { exact: false })).toBeVisible();
});

test("methodology page documents the CGI formula", async ({ page }) => {
  await page.goto("/methodology");
  await expect(page.getByText("How IFA produces every number")).toBeVisible();
  await expect(page.getByText("cgi-v0.1", { exact: false })).toBeVisible();
});
