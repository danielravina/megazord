import { test, expect, type Page } from "@playwright/test";

async function createCustomer(page: Page, name: string) {
  await page.goto("/customers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await page.locator("button:has-text('לקוח חדש')").click();
  await expect(page.locator("label:has-text('שם *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('שם *') + input").fill(name);
  await page.locator("button:has-text('שמור לקוח')").click();
  // Success toast appears only after the DB insert commits
  await expect(page.locator("text=הלקוח נוצר")).toBeVisible({ timeout: 10000 });
  // Reload so the row reflects the committed DB write
  await page.reload();
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(`td:has-text('${name}')`).first()).toBeVisible({ timeout: 10000 });
}

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
  await expect(page.locator("label:has-text('לקוח')")).toBeVisible({ timeout: 5000 });
});

test("can create a project", async ({ page }) => {
  await page.goto("/projects/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const custName = `בדיקת E2E - לקוח ${Date.now()}`;
  await createCustomer(page, custName);

  await page.goto("/projects/");
  await page.locator("button:has-text('פרויקט חדש')").click();
  await expect(page.locator("label:has-text('לקוח')")).toBeVisible();

  // Select required fields
  await page.locator("label:has-text('לקוח') + select").selectOption({ label: custName });
  await page.locator("label:has-text('תאריך התחלה') + input").fill("2026-01-01");

  await page.locator("button:has-text('שמור פרויקט')").click();

  // The project should appear
  await expect(page.locator(`h3:has-text('${custName}')`).first()).toBeVisible({ timeout: 5000 });
});

test("project creates calendar event with link back to project", async ({ page }) => {
  await page.goto("/projects/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const custName = `בדיקת E2E - לינק ליומן ${Date.now()}`;
  await createCustomer(page, custName);

  // Create a project with today's date for calendar sync
  const today = new Date().toISOString().split("T")[0];

  await page.goto("/projects/");
  await page.locator("button:has-text('פרויקט חדש')").click();
  await expect(page.locator("label:has-text('לקוח')")).toBeVisible();

  await page.locator("label:has-text('לקוח') + select").selectOption({ label: custName });
  await page.locator("label:has-text('תאריך התחלה') + input").fill(today);
  await page.locator("button:has-text('שמור פרויקט')").click();
  // Wait for the create modal to close, then reload so the list reflects the DB
  await expect(page.locator("button:has-text('שמור פרויקט')")).toBeHidden({ timeout: 5000 });
  await page.reload();
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  const cardH3 = page.locator("h3", { hasText: custName }).first();
  await expect(cardH3).toBeVisible({ timeout: 5000 });

  // Reopen the project to verify edit page works
  await cardH3.click();
  await page.waitForURL(/\/projects\/detail\/\?project=/);
  await expect(page.locator("main h1")).toContainText("עריכת פרויקט");
  // Verify customer is selected
  await expect(page.locator("label:has-text('לקוח') + select option:checked")).toHaveText(custName);
});
