import { test, expect } from "@playwright/test";

test("calendar page loads with month heading and grid", async ({ page }) => {
  await page.goto("/calendar/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  // Should show a month name in the heading
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("h1").locator("svg")).toBeVisible();
});

test("calendar page has days of week headers", async ({ page }) => {
  await page.goto("/calendar/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const daysOfWeek = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  for (const day of daysOfWeek) {
    await expect(page.locator(`.grid-cols-7.bg-slate-50 div:has-text("${day}")`)).toBeVisible();
  }
});

test("calendar page has navigation buttons", async ({ page }) => {
  await page.goto("/calendar/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("button:has-text('היום')")).toBeVisible();
});

test("clicking a calendar day opens add event modal", async ({ page }) => {
  await page.goto("/calendar/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  // Click on any day cell (first non-header cell in the grid)
  const dayCells = page.locator(".grid-cols-7").last().locator("> div");
  await dayCells.first().click();

  // A modal should open
  await expect(page.locator("[role='dialog'], .fixed.inset-0")).toBeVisible({ timeout: 5000 });
});
