import { test, expect } from "@playwright/test";

test("documents page loads with heading", async ({ page }) => {
  await page.goto("/scans/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("המסמכים שלי");
});

test("documents page shows folders on main view", async ({ page }) => {
  await page.goto("/scans/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await expect(page.locator("h3:has-text('תיקיות')")).toBeVisible();
  await expect(page.locator("h4:has-text('בנק')")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("h4:has-text('מע\"מ')")).toBeVisible();
});

test("documents page has search input", async ({ page }) => {
  await page.goto("/scans/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("input[placeholder='חיפוש מסמכים או תגיות...']")).toBeVisible();
});

test("scan document button exists on dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("button:has-text('סרוק מסמך')")).toBeVisible({ timeout: 5000 });
});

test("folders show document counts", async ({ page }) => {
  await page.goto("/scans/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await expect(page.locator("text=/\\d+ מסמכים/").first()).toBeVisible({ timeout: 5000 });
});

test("can add a folder", async ({ page }) => {
  await page.goto("/scans/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('תיקייה חדשה')").first().click();
  await expect(page.locator("h2:has-text('תיקייה חדשה'), h3:has-text('תיקייה חדשה')").first()).toBeVisible({ timeout: 5000 });
});

test("can enter a folder and go back", async ({ page }) => {
  await page.goto("/scans/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("h4:has-text('בנק')").dblclick();
  await expect(page.locator("text=כל התיקיות")).toBeVisible({ timeout: 5000 });

  await page.locator("text=כל התיקיות").click();
  await expect(page.locator("h3:has-text('תיקיות')")).toBeVisible({ timeout: 5000 });
});
