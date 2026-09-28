import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("document form is usable on mobile (stacked cards, no squeeze)", async ({ page }) => {
  await page.goto("/documents/?new=1&document_type=tax_invoice");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });

  const form = page.locator("form");
  await expect(form).toBeVisible({ timeout: 10000 });

  // Customer select is full-width on mobile (stack from grid-cols-1)
  const customer = form.locator("select").nth(0);
  const srcBox = await customer.boundingBox();
  const formBox = await form.boundingBox();
  expect(srcBox!.width).toBeGreaterThanOrEqual(formBox!.width * 0.8);

  // Mobile card list (not the desktop table) is visible
  const mobileCards = form.locator("div.md\\:hidden");
  await expect(mobileCards.first()).toBeVisible();

  // Desktop table hidden on mobile
  const desktopTable = form.locator("table");
  await expect(desktopTable).not.toBeVisible();
});

test("suppliers list is scrollable, not squeezed on mobile", async ({ page }) => {
  await page.goto("/suppliers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("h1")).toContainText("ניהול ספקים");
  // Table lives inside an overflow-x-auto wrapper (no page-level horizontal squeeze)
  const wrapper = page.locator("div.overflow-x-auto").first();
  await expect(wrapper).toBeVisible();
  const wrapperBox = await wrapper.boundingBox();
  expect(wrapperBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("supplier profile renders full-width on mobile without overflow", async ({ page }) => {
  await page.goto("/suppliers/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
  const row = page.locator("tr").filter({ hasText: "E2E" }).first();
  if (await row.count()) {
    await row.click();
    await expect(page).toHaveURL(/suppliers\/detail/);
    const card = page.locator("div.bg-white").first();
    const cardBox = await card.boundingBox();
    expect(cardBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 2);
  }
});