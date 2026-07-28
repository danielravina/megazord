import { test, expect } from "@playwright/test";

test("finance page loads with heading and total cards", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("ניהול כספים");
});

test("finance page shows income and expense total cards", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await expect(page.locator("text=סך הכנסות")).toBeVisible();
  await expect(page.locator("text=סך הוצאות")).toBeVisible();
});

test("finance page has tabs: dashboard, incomes, expenses, taxes, savings", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const tabs = ["לוח בקרה", "הכנסות", "הוצאות", "מיסים", "חסכונות"];
  for (const tab of tabs) {
    await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
  }
});

test("finance dashboard tab shows net income and tax totals", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await expect(page.locator("text=הכנסות נטו (מוערך)")).toBeVisible();
  await expect(page.locator("text=הוצאות עסקיות")).toBeVisible();
  await expect(page.locator("text=חבות מס כוללת")).toBeVisible();
});

test("can switch to incomes tab and see add form", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('הכנסות')").click();

  // The add income form should be visible
  await expect(page.locator("label:has-text('תיאור')")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("button:has-text('הוסף הכנסה')")).toBeVisible();
});

test("can add an income entry", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('הכנסות')").click();
  await expect(page.locator("label:has-text('תיאור')")).toBeVisible();

  // Fill income form
  await page.locator("label:has-text('תיאור') + input").fill("בדיקת E2E - הכנסה");
  await page.locator("label:has-text('סכום') + input").fill("1000");
  await page.locator("button:has-text('הוסף הכנסה')").click();

  // The income should appear in the table
  await expect(page.locator("text=בדיקת E2E - הכנסה")).toBeVisible({ timeout: 5000 });
});

test("can switch to expenses tab and see add form", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('הוצאות')").click();
  await expect(page.locator("label:has-text('תיאור')")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("button:has-text('הוסף הוצאה')")).toBeVisible();
});

test("can add an expense entry", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('הוצאות')").click();
  await expect(page.locator("label:has-text('תיאור')")).toBeVisible();

  await page.locator("label:has-text('תיאור') + input").fill("בדיקת E2E - הוצאה");
  await page.locator("label:has-text('סכום') + input").fill("500");
  await page.locator("button:has-text('הוסף הוצאה')").click();

  await expect(page.locator("text=בדיקת E2E - הוצאה")).toBeVisible({ timeout: 5000 });
});

test("can switch to taxes tab and see settings form", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('מיסים')").click();
  await expect(page.locator("h3:has-text('הגדרות מיסים')")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("button:has-text('שמור הגדרות מיסים')")).toBeVisible();
});

test("can switch to savings tab and see add form", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('חסכונות')").click();
  await expect(page.locator("button:has-text('הוסף הפקדה')")).toBeVisible({ timeout: 5000 });
});

test("can add a saving entry", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('חסכונות')").click();
  await expect(page.locator("button:has-text('הוסף הפקדה')")).toBeVisible();

  await page.locator("label:has-text('סכום') + input").fill("2000");
  await page.locator("button:has-text('הוסף הפקדה')").click();

  // The saving should appear in the table - look for the formatted amount
  await expect(page.locator("td.font-bold.text-teal-600").first()).toBeVisible({ timeout: 5000 });
});
