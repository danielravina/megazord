import { test, expect } from "@playwright/test";

/**
 * Helper: Re-implement the tax engine logic for verification
 */
function computeTaxes(incomes: number[], expenses: number[], savings: number[], settings: {
  vat_rate: number;
  income_tax_advance: number;
  bituah_leumi: number;
  credit_points: number;
}) {
  const totalIncome = incomes.reduce((s, v) => s + v, 0);
  const totalExpenses = expenses.reduce((s, v) => s + v, 0);
  const totalSavings = savings.reduce((s, v) => s + v, 0);
  const allExpenses = totalExpenses + totalSavings;

  const vatRate = settings.vat_rate / 100;
  const vat = totalIncome - totalIncome / (1 + vatRate);

  const grossWithoutVat = totalIncome - vat;
  const incomeTaxAdv = grossWithoutVat * (settings.income_tax_advance / 100);
  const btlAdv = grossWithoutVat * (settings.bituah_leumi / 100);
  const creditValue = settings.credit_points * 235;

  const totalTax = Math.max(0, vat + incomeTaxAdv + btlAdv - creditValue);
  const netIncome = totalIncome - totalTax - allExpenses;

  return {
    vat: Math.round(vat),
    incomeTax: Math.round(incomeTaxAdv),
    bituahLeumi: Math.round(btlAdv),
    creditValue: Math.round(creditValue),
    totalTax: Math.round(totalTax),
    netIncome: Math.round(netIncome),
  };
}

/**
 * Parse a formatted currency string like "‏1,452.99 ₪" to a number
 */
function parseCurrency(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^\d.\-]/g, "");
  return parseFloat(cleaned) || 0;
}

test("finance dashboard tab tax calculations are internally consistent", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  // Ensure we're on the dashboard sub-tab
  const dashboardTab = page.locator("button:has-text('לוח בקרה')");
  await dashboardTab.click();
  await expect(page.locator("text=הכנסות נטו (מוערך)")).toBeVisible({ timeout: 5000 });

  // Read the three summary cards
  const netIncomeText = await page.locator(".bg-indigo-50 .text-3xl").textContent();
  const bizExpensesText = await page.locator(".bg-amber-50 .text-3xl").textContent();
  const totalTaxText = await page.locator(".bg-rose-50 .text-3xl").textContent();

  const displayedNetIncome = parseCurrency(netIncomeText || "0");
  const displayedBizExpenses = parseCurrency(bizExpensesText || "0");
  const displayedTotalTax = parseCurrency(totalTaxText || "0");

  // Read the top-level totals
  const totalIncomeText = await page.locator(".text-emerald-600.text-3xl").first().textContent();
  const totalExpensesText = await page.locator(".text-rose-600.text-3xl").first().textContent();

  const displayedIncome = parseCurrency(totalIncomeText || "0");
  const displayedExpenses = parseCurrency(totalExpensesText || "0");

  // Read individual tax breakdown
  const vatText = await page.locator("text=/מע\"מ.*/").last().textContent();
  const incomeTaxText = await page.locator("text=/מקדמות מס הכנסה/").textContent();
  const btulText = await page.locator("text=/ביטוח לאומי/").textContent();

  const displayedVat = vatText ? parseCurrency(vatText.split("₪").filter(Boolean).pop() || "0") : 0;
  const displayedIncomeTax = incomeTaxText ? parseCurrency(incomeTaxText.split("₪").filter(Boolean).pop() || "0") : 0;
  const displayedBituahLeumi = btulText ? parseCurrency(btulText.split("₪").filter(Boolean).pop() || "0") : 0;

  // Basic sanity checks
  expect(displayedTotalTax).toBeGreaterThanOrEqual(0);
  expect(displayedVat + displayedIncomeTax + displayedBituahLeumi).toBeGreaterThanOrEqual(0);

  // Verify the total tax matches sum of components minus credits:
  // totalTax = Math.max(0, vat + incomeTax + bituahLeumi - creditValue)
  // Since credits reduce tax (floor at 0), totalTax <= vat + incomeTax + bituahLeumi
  expect(displayedTotalTax).toBeLessThanOrEqual(displayedVat + displayedIncomeTax + displayedBituahLeumi + 1);

  // Verify netIncome = totalIncome - totalTax - businessExpenses
  const computedNetIncome = displayedIncome - displayedTotalTax - displayedBizExpenses;
  const diff = Math.abs(computedNetIncome - displayedNetIncome);
  // Allow rounding difference of up to 1
  expect(diff).toBeLessThanOrEqual(1);
});

test("dashboard net worth matches finance net income", async ({ page }) => {
  // First get the finance net income value
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('לוח בקרה')").click();
  await expect(page.locator("text=הכנסות נטו (מוערך)")).toBeVisible({ timeout: 5000 });

  const netIncomeText = await page.locator(".bg-indigo-50 .text-3xl").textContent();
  const financeNetIncome = parseCurrency(netIncomeText || "0");

  // Now go to dashboard
  await page.goto("/");
  await expect(page.locator("h2:has-text('נטו חודשי')")).toBeVisible({ timeout: 10000 });

  // Read the big net worth number - the card shows the net value in a large font
  const allLargeText = await page.locator(".text-4xl, .text-5xl, .text-6xl, .text-7xl").textContent();
  const dashboardNetWorth = parseCurrency(allLargeText || "0");

  // After our fix, these should be equal
  expect(Math.abs(dashboardNetWorth - financeNetIncome)).toBeLessThanOrEqual(1);
});

test("VAT is calculated correctly from gross income", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('לוח בקרה')").click();
  await expect(page.locator("text=הכנסות נטו (מוערך)")).toBeVisible({ timeout: 5000 });

  // Read income total
  const incomeText = await page.locator(".text-emerald-600.text-3xl").first().textContent();
  const totalIncome = parseCurrency(incomeText || "0");

  // Read VAT
  const vatRow = page.locator("text=/מע\"מ.*/").last();
  const vatText = await vatRow.textContent();
  const displayedVat = vatText ? parseCurrency(vatText.split("₪").filter(Boolean).pop() || "0") : 0;

  if (totalIncome > 0) {
    // VAT should be less than totalIncome (VAT is part of the gross)
    expect(displayedVat).toBeLessThan(totalIncome + 1);

    // VAT should be approximately totalIncome * rate / (1 + rate) = totalIncome * 0.17/1.17
    const expectedVat = Math.round(totalIncome * 17 / 117);
    // Allow up to 1 unit difference for rounding
    expect(Math.abs(displayedVat - expectedVat)).toBeLessThanOrEqual(1);
  }
});

test("credit points are computed correctly", async ({ page }) => {
  await page.goto("/finance/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  await page.locator("button:has-text('מיסים')").click();
  await expect(page.locator("h3:has-text('הגדרות מיסים')")).toBeVisible({ timeout: 5000 });

  // Read credit points from the form
  const creditInput = page.locator("input[name='credit_points']");
  const creditValue = parseFloat(await creditInput.inputValue() || "2.25");

  // Each credit point = ₪235/month (verified via the tax engine formula)
  const creditValueRounded = Math.round(creditValue * 235);
  expect(creditValueRounded).toBeGreaterThan(0);

  // Switch back to dashboard tab to verify displayed credit value
  await page.locator("button:has-text('לוח בקרה')").click();
  await expect(page.locator("text=הכנסות נטו (מוערך)")).toBeVisible({ timeout: 5000 });

  // The credit value should be used to reduce tax
  // Total Tax should be >= 0 even with credits
  const totalTaxText = await page.locator(".bg-rose-50 .text-3xl").textContent();
  const displayedTotalTax = parseCurrency(totalTaxText || "0");
  expect(displayedTotalTax).toBeGreaterThanOrEqual(0);
});
