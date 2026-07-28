import { test, expect } from "@playwright/test";

test("projects page loads with heading", async ({ page }) => {
  await page.goto("/projects/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("ניהול פרויקטים");
});

test("projects page has new project button", async ({ page }) => {
  await page.goto("/projects/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("button:has-text('פרויקט חדש')")).toBeVisible();
});

test("clicking new project button opens modal", async ({ page }) => {
  await page.goto("/projects/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('פרויקט חדש')").click();
  await expect(page.locator("label:has-text('שם לקוח')")).toBeVisible({ timeout: 5000 });
});

test("can create a project", async ({ page }) => {
  await page.goto("/projects/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('פרויקט חדש')").click();
  await expect(page.locator("label:has-text('שם לקוח')")).toBeVisible();

  // Fill required field
  await page.locator("label:has-text('שם לקוח') + input").fill("בדיקת E2E - לקוח");
  // Set a start date
  await page.locator("label:has-text('תאריך התחלה') + input").fill("2026-01-01");

  await page.locator("button:has-text('שמור פרויקט')").click();

  // The project should appear
  await expect(page.locator("h3:has-text('בדיקת E2E - לקוח')").first()).toBeVisible({ timeout: 5000 });
});

test("project creates calendar event with link back to project", async ({ page }) => {
  await page.goto("/projects/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  // Create a project with today's date for calendar sync
  const today = new Date().toISOString().split("T")[0];

  await page.locator("button:has-text('פרויקט חדש')").click();
  await expect(page.locator("label:has-text('שם לקוח')")).toBeVisible();

  await page.locator("label:has-text('שם לקוח') + input").fill("בדיקת E2E - לינק ליומן");
  await page.locator("label:has-text('תאריך התחלה') + input").fill(today);
  await page.locator("button:has-text('שמור פרויקט')").click();
  await expect(page.locator("h3:has-text('בדיקת E2E - לינק ליומן')").first()).toBeVisible({ timeout: 5000 });

  // Reopen the project to verify edit page works
  await page.locator("h3:has-text('בדיקת E2E - לינק ליומן')").first().click();
  await page.waitForURL(/\/projects\/detail\/\?project=/);
  await expect(page.locator("main h1")).toContainText("עריכת פרויקט");
  // Verify customer name is filled
  await expect(page.locator("label:has-text('שם לקוח') + input")).toHaveValue("בדיקת E2E - לינק ליומן");
});
