import { test, expect } from "@playwright/test";

test("kanban page loads with heading and columns", async ({ page }) => {
  await page.goto("/kanban/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("מעקב בקשות לקוח");
});

test("kanban page shows three columns", async ({ page }) => {
  await page.goto("/kanban/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await expect(page.locator("h3:has-text('חדש')")).toBeVisible();
  await expect(page.locator("h3:has-text('בביצוע')")).toBeVisible();
  await expect(page.locator("h3:has-text('הושלם')")).toBeVisible();
});

test("kanban page has new request button", async ({ page }) => {
  await page.goto("/kanban/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("button:has-text('בקשה חדשה')")).toBeVisible();
});

test("clicking new request button shows form", async ({ page }) => {
  await page.goto("/kanban/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('בקשה חדשה')").click();

  // Form should appear with a title input
  await expect(page.locator("label:has-text('כותרת הבקשה')")).toBeVisible({ timeout: 5000 });
});

test("can create a new kanban request", async ({ page }) => {
  await page.goto("/kanban/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('בקשה חדשה')").click();
  await expect(page.locator("label:has-text('כותרת הבקשה')")).toBeVisible();

  // Fill and submit the form
  await page.locator("label:has-text('כותרת הבקשה') + input").fill("בדיקת E2E - בקשה");
  await page.locator("textarea").fill("פירוט בדיקה");
  await page.locator("button:has-text('שלח בקשה')").click();

  // The request should appear in the new column
  await expect(page.locator("h4:has-text('בדיקת E2E - בקשה')").first()).toBeVisible({ timeout: 5000 });
});
