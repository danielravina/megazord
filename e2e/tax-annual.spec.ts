import { test, expect, type Page } from "@playwright/test";

function parseCurrency(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^\d.\-]/g, "");
  return parseFloat(cleaned) || 0;
}

async function authGuard(page: Page) {
  await page.goto("/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
}

async function addWaterfallTile(page: Page) {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();
  await page.locator(".border-dashed").click();
  await expect(page.locator("h2:has-text('מה תרצה לראות')")).toBeVisible({ timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button:has-text('אומדן מס שנתי')").click();
  await page.waitForTimeout(800);
}

async function removeWaterfallTile(page: Page) {
  const tile = page.locator("[data-tile]").filter({ has: page.locator("[data-testid='wf-step-0']") }).first();
  await tile.hover();
  await page.waitForTimeout(300);
  await tile.locator("button[aria-label='אפשרויות טייל']").click();
  await page.waitForTimeout(200);
  await page.locator("button:has-text('הסר')").last().click();
  await page.waitForTimeout(300);
  await page.locator("button:has-text('סיום')").click();
  await page.waitForTimeout(500);
}

test("annual tax estimate waterfall tile can be added from the picker", async ({ page }) => {
  await addWaterfallTile(page);

  const tile = page.locator("[data-tile]").filter({ has: page.locator("[data-testid='wf-step-0']") }).first();
  await expect(tile).toBeVisible({ timeout: 5000 });
  await expect(tile.locator("text=סך הכנסות")).toBeVisible();

  await removeWaterfallTile(page);
});

test("waterfall shows all annual tax estimate steps", async ({ page }) => {
  await addWaterfallTile(page);

  const tile = page.locator("[data-tile]").filter({ has: page.locator("[data-testid='wf-step-0']") }).first();
  await expect(tile).toBeVisible({ timeout: 5000 });

  const labels = [
    "סך הכנסות (נטו ממע״מ)",
    "פחות: הוצאות מוכרות",
    "= רווח נקי",
    "מס הכנסה גולמי",
    "פחות: נקודות זיכוי",
    "= מס לאחר נקודות זיכוי",
    "פחות: מקדמות ששולמו",
  ];
  for (const label of labels) {
    await expect(tile.locator(`text=${label}`).first()).toBeVisible({ timeout: 3000 });
  }
  await expect(tile.locator("[data-testid='wf-balance']")).toBeVisible({ timeout: 3000 });

  await removeWaterfallTile(page);
});

test("waterfall net profit row is never negative", async ({ page }) => {
  await addWaterfallTile(page);

  const tile = page.locator("[data-tile]").filter({ has: page.locator("[data-testid='wf-step-0']") }).first();
  await expect(tile).toBeVisible({ timeout: 5000 });

  const netProfitText = await tile.locator("[data-testid='wf-step-2'] [data-testid='wf-value']").textContent();
  const netProfit = parseCurrency(netProfitText || "0");
  expect(netProfit).toBeGreaterThanOrEqual(0);

  await removeWaterfallTile(page);
});

test("waterfall steps chain arithmetically", async ({ page }) => {
  await addWaterfallTile(page);

  const tile = page.locator("[data-tile]").filter({ has: page.locator("[data-testid='wf-step-0']") }).first();
  await expect(tile).toBeVisible({ timeout: 5000 });

  const readValue = async (idx: number) =>
    parseCurrency((await tile.locator(`[data-testid='wf-step-${idx}'] [data-testid='wf-value']`).textContent()) || "0");

  const income = await readValue(0);
  const expenses = await readValue(1);
  const netProfit = await readValue(2);
  const grossTax = await readValue(3);
  const credit = await readValue(4);
  const afterCredits = await readValue(5);
  const advances = await readValue(6);

  // Net Profit = max(0, Income - Expenses); the engine floors losses at 0
  expect(Math.abs(netProfit - Math.max(0, income - expenses))).toBeLessThanOrEqual(1);
  // After Credits = Gross Tax - Credit (floored at 0)
  expect(Math.abs(afterCredits - Math.max(0, grossTax - credit))).toBeLessThanOrEqual(1);

  const balanceText = (await tile.locator("[data-testid='wf-balance']").textContent()) || "";
  const isDebt = balanceText.includes("לתשלום");
  const isRefund = balanceText.includes("זכאי להחזר");

  if (isRefund) {
    // refund shown as a positive amount (Math.abs), never negative
    expect(balanceText).not.toContain("-");
    const refundVal = parseCurrency(balanceText);
    expect(refundVal).toBeGreaterThan(0);
  } else if (isDebt) {
    const debtVal = parseCurrency(balanceText);
    expect(debtVal).toBeGreaterThan(0);
    expect(Math.abs(debtVal - (afterCredits - advances))).toBeLessThanOrEqual(1);
  }

  await removeWaterfallTile(page);
});