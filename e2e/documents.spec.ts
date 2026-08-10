import { test, expect } from "@playwright/test";

test("documents page loads with heading", async ({ page }) => {
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("המסמכים שלי");
});

test("documents page has list/folders toggle", async ({ page }) => {
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await expect(page.locator("button:has-text('רשימה')")).toBeVisible();
  await expect(page.locator("button:has-text('תיקיות')")).toBeVisible();
});

test("documents page has search input", async ({ page }) => {
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("input[placeholder='חיפוש מסמכים או תגיות...']")).toBeVisible();
});

test("scan document button exists on dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("button:has-text('סרוק מסמך')")).toBeVisible({ timeout: 5000 });
});

test("can switch to folders view", async ({ page }) => {
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('תיקיות')").click();

  // Should show folder cards
  await expect(page.locator("h4:has-text('בנק')")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("h4:has-text('מע\"מ')")).toBeVisible();
});

test("folders view shows document counts", async ({ page }) => {
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('תיקיות')").click();

  // Each folder should show a count
  await expect(page.locator("text=/\\d+ מסמכים/").first()).toBeVisible({ timeout: 5000 });
});
