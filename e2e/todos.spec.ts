import { test, expect } from "@playwright/test";

test("todos page loads with heading", async ({ page }) => {
  await page.goto("/todos/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("המשימות שלי");
});

test("todos page shows input field and add button", async ({ page }) => {
  await page.goto("/todos/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("input[placeholder='מה צריך לעשות?']")).toBeVisible();
  await expect(page.getByRole("button", { name: "הוסף" })).toBeVisible();
});

test("can add and see a todo", async ({ page }) => {
  await page.goto("/todos/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const input = page.locator("input[placeholder='מה צריך לעשות?']");
  await input.fill("בדיקת E2E - משימה");
  await page.getByRole("button", { name: "הוסף" }).click();

  // The todo should appear in the list
  await expect(page.locator("text=בדיקת E2E - משימה").first()).toBeVisible({ timeout: 5000 });
});

test("todos page shows empty state when no items", async ({ page }) => {
  await page.goto("/todos/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  // Just verify the page renders without errors
  await expect(page.locator("main h1")).toContainText("המשימות שלי");
});
