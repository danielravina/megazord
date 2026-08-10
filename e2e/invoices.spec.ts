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

test("invoices page loads with heading", async ({ page }) => {
  await page.goto("/invoices/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("חשבוניות");
});

test("can create an invoice with items, preview and mark as sent", async ({ page }) => {
  await page.goto("/invoices/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const custName = `בדיקת E2E - חשבונית ${Date.now()}`;
  await createCustomer(page, custName);

  await page.goto("/invoices/");
  await page.locator("button:has-text('חשבונית חדשה')").click();
  await expect(page.locator("label:has-text('לקוח *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('לקוח *') + select").selectOption({ label: custName });

  // Force 18% VAT so the total is deterministic (200 * 1.18 = 236)
  await page.locator("label:has-text('שיעור מע') + input").fill("18");

  // Fill line item
  await page.locator("input[placeholder='תיאור השירות / המוצר']").fill("בדיקת E2E - שירות");
  await page.locator("input[placeholder='כמות']").fill("2");
  await page.locator("input[placeholder='מחיר ליחידה']").fill("100");
  await page.locator("button:has-text('צור חשבונית')").click();

  // Wait for the create modal to close, then reload so the list reflects the DB
  await expect(page.locator("button:has-text('צור חשבונית')")).toBeHidden({ timeout: 10000 });
  await page.reload();
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  // Invoice row appears (customer name + total 236 incl. 18% VAT)
  const row = page.locator(`tr:has-text('${custName}')`).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator("td").nth(3)).toContainText("236");

  // Capture invoice number
  const invoiceNumber = (await row.locator("td").first().textContent())!.trim();

  // Open preview
  await row.locator("button[title='תצוגה']").click();
  await expect(page.locator("text=חשבונית מס")).toBeVisible({ timeout: 5000 });

  // Mark as sent (income is recorded without email)
  page.on("dialog", (d) => d.accept());
  await page.locator("button:has-text('סמן כנשלח')").click();
  await expect(page.locator("button:has-text('סמן כשולם')")).toBeVisible({ timeout: 5000 });

  // Status badge updated in the list
  await page.locator("button:has-text('סגור')").click();
  await expect(row.locator("span:has-text('נשלחה')").first()).toBeVisible({ timeout: 5000 });

  // The income appears in finance
  await page.goto("/finance/");
  await page.locator("button:has-text('הכנסות')").click();
  await expect(page.locator(`text=חשבונית ${invoiceNumber}`).first()).toBeVisible({ timeout: 5000 });
});
