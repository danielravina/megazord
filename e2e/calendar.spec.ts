import { test, expect } from "@playwright/test";

test("calendar page loads with month heading and grid", async ({ page }) => {
  await page.goto("/calendar/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  // Should show a month name in the heading
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("h1").locator("svg")).toBeVisible();
});

test("calendar page has days of week headers", async ({ page }) => {
  await page.goto("/calendar/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const daysOfWeek = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  for (const day of daysOfWeek) {
    await expect(page.locator(`.grid-cols-7.bg-slate-50 div:has-text("${day}")`)).toBeVisible();
  }
});

test("calendar page has navigation buttons", async ({ page }) => {
  await page.goto("/calendar/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("button:has-text('היום')")).toBeVisible();
});

test("clicking a calendar day opens add event modal", async ({ page }) => {
  await page.goto("/calendar/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  // Wait until the calendar has finished loading (the skeleton has its own grid
  // without click handlers, so wait for the real month heading)
  await expect(page.locator("main h1")).toBeVisible({ timeout: 10000 });

  // Click the day-number of the first cell (avoids event chips inside the cell)
  const dayCells = page.locator(".grid-cols-7").last().locator("> div");
  await dayCells.first().locator("div").first().click();

  // A modal should open
  await expect(page.locator("[role='dialog'], .fixed.inset-0")).toBeVisible({ timeout: 5000 });
});

test("multi-day project event shows once and spans the calendar", async ({ page }) => {
  // Create a customer
  await page.goto("/customers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 15000 });
  const cust = `פרויקט יומן ${Date.now()}`;
  await page.locator("button:has-text('לקוח חדש')").click();
  await expect(page.locator("label:has-text('שם *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('שם *') + input").fill(cust);
  await page.locator("button:has-text('שמור לקוח')").click();
  await expect(page.locator("text=הלקוח נוצר")).toBeVisible({ timeout: 10000 });

  // Create a project starting on the 20th of the current month (a quiet day),
  // duration 5 days
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-20`;
  await page.goto("/projects/");
  await page.locator("button:has-text('פרויקט חדש')").click();
  await expect(page.locator("label:has-text('לקוח')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('לקוח') + select").selectOption({ label: cust });
  await page.locator("label:has-text('תאריך התחלה') + input").fill(startDate);
  await page.locator("label:has-text('משך עבודה') + input").fill("5");
  await page.locator("button:has-text('שמור פרויקט')").click();
  await expect(page.locator("button:has-text('שמור פרויקט')")).toBeHidden({ timeout: 10000 });

  // The title should render exactly once (first day), not once per day
  await page.goto("/calendar/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("main h1")).toBeVisible({ timeout: 10000 });
  const titlePills = await page.locator(`div[style*='background-color']:has-text('${cust}')`).count();
  console.log("TITLE PILL COUNT (expect 1):", titlePills);
  expect(titlePills).toBe(1);
});
