import { expect, test } from "@playwright/test";

test("the AI-bill story page renders every analytical section", async ({ page }) => {
  await page.goto("/events/ardenne-ai-oversight-bill-introduced");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI oversight bill");
  await expect(page.locator("text=/CGI/").first()).toBeVisible();

  for (const section of [
    "Overview",
    "Independently corroborated claims",
    "Conflicting claims",
    "Open questions and uncertainty",
    "Documents and records",
    "How the information evolved",
    "Source coverage",
    "Common Ground Index",
  ]) {
    await expect(page.getByText(section, { exact: false }).first()).toBeVisible();
  }
});

test("the CGI explainer shows a transparent component breakdown", async ({ page }) => {
  await page.goto("/events/ardenne-ai-oversight-bill-introduced#cgi");
  await expect(page.getByText("How this score was built")).toBeVisible();
  await expect(page.getByText("Independent corroboration of core claims")).toBeVisible();
  await expect(page.getByText("Density of direct contradictions", { exact: false })).toBeVisible();
  await expect(page.getByText("Inputs snapshot:", { exact: false })).toBeVisible();
});

test("a claim can be expanded to reveal its evidence and provenance", async ({ page }) => {
  await page.goto("/events/reserve-bank-ardenne-holds-rate");
  const disclosure = page.getByText("Show evidence, sources and provenance").first();
  await disclosure.click();
  await expect(page.getByText("Extracted from", { exact: false }).first()).toBeVisible();
});
