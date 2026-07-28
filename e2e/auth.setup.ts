import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  await page.goto("/login/");
  await expect(page.locator("h1")).toContainText("עצמאי");

  await page.fill("#email", "danielravina@gmail.com");
  await page.fill("#password", "asdasdasd");
  await page.locator("button[type='submit']").click();

  // Wait for navigation to dashboard
  await page.waitForURL("/", { timeout: 15000 });

  // Verify we got past auth guard (sidebar should be visible)
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.context().storageState({ path: authFile });
});
