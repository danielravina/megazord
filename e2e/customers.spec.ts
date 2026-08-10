import { test, expect } from "@playwright/test";

test("customers page loads with heading", async ({ page }) => {
  await page.goto("/customers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("ניהול לקוחות");
});

test("can create a customer", async ({ page }) => {
  await page.goto("/customers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('לקוח חדש')").click();
  await expect(page.locator("label:has-text('שם *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('שם *') + input").fill("בדיקת E2E - לקוח");
  await page.locator("label:has-text('אימייל') + input").fill("e2e@example.com");
  await page.locator("button:has-text('שמור לקוח')").click();
  await expect(page.locator("text=הלקוח נוצר")).toBeVisible({ timeout: 10000 });

  // Reload so the row reflects the committed DB write
  await page.reload();
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("td:has-text('בדיקת E2E - לקוח')").first()).toBeVisible({ timeout: 10000 });
});

test("can edit a customer", async ({ page }) => {
  await page.goto("/customers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('לקוח חדש')").click();
  await expect(page.locator("label:has-text('שם *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('שם *') + input").fill("בדיקת E2E - עריכה");
  await page.locator("button:has-text('שמור לקוח')").click();
  await expect(page.locator("text=הלקוח נוצר")).toBeVisible({ timeout: 10000 });

  // Reload so the row reflects the committed DB write before editing
  await page.reload();
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await page.locator("tr:has-text('בדיקת E2E - עריכה') button[title='ערוך']").first().click();
  await expect(page.locator("label:has-text('שם *')")).toBeVisible();
  await page.locator("label:has-text('שם *') + input").fill("בדיקת E2E - עריכה 2");
  await page.locator("button:has-text('שמור שינויים')").click();

  await expect(page.locator("td:has-text('בדיקת E2E - עריכה 2')").first()).toBeVisible({ timeout: 10000 });
});
