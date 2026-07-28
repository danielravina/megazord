import { test, expect } from "@playwright/test";

test("dashboard loads and shows net monthly card", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("h2")).toContainText("נטו חודשי");
});

test("dashboard shows net worth and expense chart", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("h2")).toContainText("נטו חודשי");
  await expect(page.locator("text=התפלגות הוצאות")).toBeVisible();
});

test("dashboard shows cashflow and tax widget", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("text=תזרים חודשי")).toBeVisible();
  await expect(page.locator("text=מסמכים אחרונים")).toBeVisible();
  await expect(page.locator("text=תשלומים צפויים").first()).toBeVisible();
});
