import { test, expect } from "@playwright/test";

test("suppliers page loads with heading", async ({ page }) => {
  await page.goto("/suppliers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("ניהול ספקים");
});

test("can create a supplier", async ({ page }) => {
  await page.goto("/suppliers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('ספק חדש')").click();
  await expect(page.locator("label:has-text('שם *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('שם *') + input").fill("בדיקת E2E - ספק");
  await page.locator("label:has-text('אימייל') + input").fill("e2e-supplier@example.com");
  await page.locator("button:has-text('שמור ספק')").click();
  await expect(page.locator("text=הספק נוצר")).toBeVisible({ timeout: 10000 });

  // Reload so the row reflects the committed DB write
  await page.reload();
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("td:has-text('בדיקת E2E - ספק')").first()).toBeVisible({ timeout: 10000 });
});

test("can edit a supplier", async ({ page }) => {
  await page.goto("/suppliers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('ספק חדש')").click();
  await expect(page.locator("label:has-text('שם *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('שם *') + input").fill("בדיקת E2E - עריכת ספק");
  await page.locator("button:has-text('שמור ספק')").click();
  await expect(page.locator("text=הספק נוצר")).toBeVisible({ timeout: 10000 });

  // Reload so the row reflects the committed DB write before editing
  await page.reload();
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await page.locator("tr:has-text('בדיקת E2E - עריכת ספק') button[title='ערוך']").first().click();
  await expect(page.locator("label:has-text('שם *')")).toBeVisible();
  await page.locator("label:has-text('שם *') + input").fill("בדיקת E2E - עריכת ספק 2");
  await page.locator("button:has-text('שמור שינויים')").click();

  await expect(page.locator("td:has-text('בדיקת E2E - עריכת ספק 2')").first()).toBeVisible({ timeout: 10000 });
});
