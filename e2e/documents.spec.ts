import { test, expect, type Page } from "@playwright/test";

async function createCustomer(page: Page, name: string) {
  await page.goto("/customers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await page.locator("button:has-text('לקוח חדש')").click();
  await expect(page.locator("label:has-text('שם *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('שם *') + input").fill(name);
  await page.locator("button:has-text('שמור לקוח')").click();
  await expect(page.locator("text=הלקוח נוצר")).toBeVisible({ timeout: 10000 });
  await page.reload();
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(`td:has-text('${name}')`).first()).toBeVisible({ timeout: 10000 });
}

test("documents page loads with heading", async ({ page }) => {
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main h1")).toContainText("מסמכים");
});

test("can create a tax invoice which books income immediately", async ({ page }) => {
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const custName = `בדיקת E2E - חשבונית ${Date.now()}`;
  await createCustomer(page, custName);

  await page.goto("/documents/");
  await page.locator("button:has-text('מסמך חדש')").click();
  await expect(page.locator("label:has-text('לקוח *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('לקוח *') + select").selectOption({ label: custName });

  // VAT rate comes from Preferences (tax_settings.vat_rate = 18)
  // so the total is deterministic (200 * 1.18 = 236)

  // Fill line item
  await page.locator("input[placeholder='תיאור השירות / המוצר']").fill("בדיקת E2E - שירות");
  await page.locator("input[placeholder='כמות']").fill("2");
  await page.locator("input[placeholder='מחיר ליחידה']").fill("100");
  await page.locator("button:has-text('צור מסמך')").click();

  // After creation we land on the full-page preview (?view=<id>)
  await expect(page.locator("button:has-text('הורד PDF')")).toBeVisible({ timeout: 10000 });
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const row = page.locator(`tr:has-text('${custName}')`).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator("td").nth(3)).toContainText("236");

  const invoiceNumber = (await row.locator("td").first().textContent())!.trim();

  // Tax invoice books income at issuance
  await page.goto("/finance/");
  await page.locator("button:has-text('הכנסות')").click();
  await expect(page.locator(`text=חשבונית מס ${invoiceNumber}`).first()).toBeVisible({ timeout: 5000 });
});

test("can create a quotation which does NOT book income", async ({ page }) => {
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const custName = `בדיקת E2E - הצעה ${Date.now()}`;
  await createCustomer(page, custName);

  await page.goto("/documents/");
  await page.locator("button:has-text('מסמך חדש')").click();
  await expect(page.locator("label:has-text('לקוח *')")).toBeVisible({ timeout: 5000 });
  await page.locator("label:has-text('לקוח *') + select").selectOption({ label: custName });
  await page.locator("label:has-text('סוג מסמך') + select").selectOption({ label: "הצעת מחיר" });
  await page.locator("input[placeholder='תיאור השירות / המוצר']").fill("בדיקת E2E - הצעה");
  await page.locator("input[placeholder='כמות']").fill("1");
  await page.locator("input[placeholder='מחיר ליחידה']").fill("500");
  await page.locator("button:has-text('צור מסמך')").click();
  await expect(page.locator("button:has-text('הורד PDF')")).toBeVisible({ timeout: 10000 });
  await page.goto("/documents/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const quoteNumber = (await page.locator(`tr:has-text('${custName}') td`).first().textContent())!.trim();

  // Quotation must NOT book income
  await page.goto("/finance/");
  await page.locator("button:has-text('הכנסות')").click();
  await expect(page.locator(`text=${quoteNumber}`)).toBeHidden({ timeout: 5000 });
});
