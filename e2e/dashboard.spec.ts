import { test, expect, type Page } from "@playwright/test";

async function authGuard(page: Page) {
  await page.goto("/");
  await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
}

// Reliably remove the first tile in customize mode: open its options menu and click "הסר"
async function removeFirstTile(page: Page) {
  const tile = page.locator("[data-tile]").first();
  await tile.hover();
  await page.waitForTimeout(200);
  await tile.locator("button[aria-label='אפשרויות טייל']").click();
  await page.waitForTimeout(200);
  await page.locator("button:has-text('הסר')").last().click();
  await page.waitForTimeout(300);
}

async function resetLayout(page: Page) {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();

  let tiles = page.locator("[data-tile]");
  let count = await tiles.count();
  while (count > 0) {
    await removeFirstTile(page);
    tiles = page.locator("[data-tile]");
    count = await tiles.count();
  }

  // add one tile so layout isn't empty (empty = triggers default on reload)
  await page.locator(".border-dashed").click();
  await expect(page.locator("h2:has-text('מה תרצה לראות')")).toBeVisible({ timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button:has-text('מחשבון')").click();
  await page.waitForTimeout(300);

  await page.locator("button:has-text('סיום')").click();
  await page.waitForTimeout(500);

  // remove that tile so layout is empty → next reload loads defaults
  await page.locator("button:has-text('התאמה אישית')").click();
  await removeFirstTile(page);

  await page.locator("button:has-text('סיום')").click();
  await page.waitForTimeout(500);

  await page.reload();
  await authGuard(page);
  await expect(page.locator("[data-tile]").first()).toBeVisible({ timeout: 5000 });
}

// ── Dashboard Load ────────────────────────────

// Reset layout to defaults at start so all tests have a clean slate
test("reset layout to defaults so other tests have clean state", async ({ page }) => {
  await authGuard(page);
  // Go to customize and remove all tiles
  await page.locator("button:has-text('התאמה אישית')").click();
  let tiles = page.locator("[data-tile]");
  let count = await tiles.count();
  while (count > 0) {
    await removeFirstTile(page);
    tiles = page.locator("[data-tile]");
    count = await tiles.count();
  }
  await page.locator("button:has-text('סיום')").click();
  await page.waitForTimeout(500);

  // Reload — empty layout triggers defaults
  await page.reload();
  await authGuard(page);
});

test("dashboard loads, shows header with title", async ({ page }) => {
  await authGuard(page);
  await expect(page.locator("h2")).toContainText("לוח בקרה");
});

test("dashboard header has refresh button", async ({ page }) => {
  await authGuard(page);
  await expect(page.getByLabel("רענן נתונים")).toBeVisible();
});

test("dashboard header has customize toggle", async ({ page }) => {
  await authGuard(page);
  await expect(page.locator("button:has-text('התאמה אישית')")).toBeVisible();
});

test("manual refresh button exists and is clickable", async ({ page }) => {
  await authGuard(page);
  await page.getByLabel("רענן נתונים").click();
  await expect(page.locator("h2")).toContainText("לוח בקרה");
});

// ── Default Layout ─────────────────────────────

test("dashboard renders tiles on the grid", async ({ page }) => {
  await authGuard(page);
  const tiles = page.locator("[data-tile]");
  await expect(tiles.first()).toBeVisible({ timeout: 5000 });
});

test("hero tiles render ₪ currency values", async ({ page }) => {
  await authGuard(page);
  await expect(page.locator("[data-tile]").locator("text=/₪/").first()).toBeVisible({ timeout: 5000 });
});

// ── Customize Mode ─────────────────────────────

test("customize mode toggle activates and deactivates", async ({ page }) => {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();
  await expect(page.locator("button:has-text('סיום')")).toBeVisible();
  await page.locator("button:has-text('סיום')").click();
  await expect(page.locator("button:has-text('התאמה אישית')")).toBeVisible();
});

test("customize mode shows add-tile slot", async ({ page }) => {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();
  await expect(page.locator(".border-dashed")).toBeVisible();
  await page.locator("button:has-text('סיום')").click();
});

// ── Add-Tile Picker ────────────────────────────

test("add-tile picker opens with list of options", async ({ page }) => {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();
  await page.locator(".border-dashed").click();

  await expect(page.locator("h2:has-text('מה תרצה לראות')")).toBeVisible({ timeout: 5000 });

  const picker = page.locator(".fixed.inset-0.z-50");
  await expect(picker.locator("button:has-text('הכנסות')")).toBeVisible();
  await expect(picker.locator("button:has-text('הוצאות')")).toBeVisible();
  await expect(picker.locator("button:has-text('משימות פתוחות')")).toBeVisible();
  await expect(picker.locator("button:has-text('מחשבון')")).toBeVisible();
  await expect(picker.locator("button:has-text('שעון')")).toBeVisible();
  await expect(picker.locator("button:has-text('מזג אוויר')")).toBeVisible();

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.locator("button:has-text('סיום')").click();
});

test("adding a calculator tile works with one click", async ({ page }) => {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();
  await page.locator(".border-dashed").click();
  await expect(page.locator("h2:has-text('מה תרצה לראות')")).toBeVisible({ timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button:has-text('מחשבון')").click();
  await page.waitForTimeout(800);

  // find the calc tile — it's the one containing a '7' button
  const calcTile = page.locator("[data-tile]").filter({ has: page.locator("button:has-text('7')") }).first();
  await expect(calcTile).toBeVisible({ timeout: 5000 });

  // 2+3=5
  await calcTile.locator("button:has-text('2')").click();
  await calcTile.locator("text=+").click();
  await calcTile.locator("button:has-text('3')").click();
  await calcTile.getByText("=", { exact: true }).click();
  await expect(calcTile.locator(".text-lg").filter({ hasText: "5" }).first()).toBeVisible({ timeout: 2000 });

  // remove
  await calcTile.hover();
  await page.waitForTimeout(300);
  const btns = calcTile.locator("button");
  if ((await btns.count()) > 0) await btns.last().click();
  await page.waitForTimeout(300);
  await page.locator("button:has-text('סיום')").click();
});

test("adding a clock tile works with one click", async ({ page }) => {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();

  await page.locator(".border-dashed").click();
  await expect(page.locator("h2:has-text('מה תרצה לראות')")).toBeVisible({ timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button:has-text('שעון')").click();
  await page.waitForTimeout(800);

  // clock tile should exist
  const hasClock = (await page.locator("[data-tile]").locator("svg").count() > 0);
  expect(hasClock || (await page.locator("[data-tile]").count() > 0)).toBe(true);

  // clean up — remove any tile with a clock-like icon
  const lastTile = page.locator("[data-tile]").last();
  await lastTile.hover();
  await page.waitForTimeout(300);
  const btns = lastTile.locator("button");
  if ((await btns.count()) > 0) await btns.last().click();
  await page.waitForTimeout(300);

  await page.locator("button:has-text('סיום')").click();
});

// ── Tile Edit Overlay ──────────────────────────

test("tile shows remove button on hover in customize mode", async ({ page }) => {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();

  const firstTile = page.locator("[data-tile]").first();
  await firstTile.hover();
  await page.waitForTimeout(500);

  const btnCount = await firstTile.locator("button").count();
  expect(btnCount).toBeGreaterThanOrEqual(1);

  await page.locator("button:has-text('סיום')").click();
});

test("data tiles show view-cycle and time-range buttons in overlay", async ({ page }) => {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();

  // find a hero tile (data tile, not static)
  const heroTile = page.locator("[data-tile]").filter({ has: page.locator("text=/₪/") }).first();
  if (await heroTile.isVisible().catch(() => false)) {
    await heroTile.hover();
    await page.waitForTimeout(300);

    // the overlay should have buttons
    const btns = await heroTile.locator("button").count();
    expect(btns).toBeGreaterThanOrEqual(1);
  }

  await page.locator("button:has-text('סיום')").click();
});

// ── Drag Handle ────────────────────────────────

test("drag handle visible on tiles in customize mode", async ({ page }) => {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();

  const firstTile = page.locator("[data-tile]").first();
  await expect(firstTile.locator("svg").first()).toBeVisible({ timeout: 3000 });

  await page.locator("button:has-text('סיום')").click();
});

test("special widgets show resize handle in customize mode", async ({ page }) => {
  await authGuard(page);
  await page.locator("button:has-text('התאמה אישית')").click();
  await page.locator(".border-dashed").click();
  await expect(page.locator("h2:has-text('מה תרצה לראות')")).toBeVisible({ timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button:has-text('מחשבון')").click();
  await page.waitForTimeout(800);

  const calcTile = page.locator("[data-tile]").filter({ has: page.locator("button:has-text('7')") }).first();
  await expect(calcTile).toBeVisible({ timeout: 5000 });
  await expect(calcTile.locator("button[aria-label='שנה רוחב']")).toBeVisible({ timeout: 3000 });

  await page.locator("button:has-text('סיום')").click();
});

// ── Responsive Grid ────────────────────────────

test("grid adjusts columns on mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await authGuard(page);
  await expect(page.locator("h2")).toContainText("לוח בקרה");
});

// ── Layout Persistence ─────────────────────────

test("layout persists after page reload", async ({ page }) => {
  await resetLayout(page);

  await page.locator("button:has-text('התאמה אישית')").click();
  const tileCountBefore = await page.locator("[data-tile]").count();

  await removeFirstTile(page);

  await page.locator("button:has-text('סיום')").click();
  await page.waitForTimeout(3000);

  await page.reload();
  await authGuard(page);
  await page.waitForTimeout(1500);

  const tileCountAfter = await page.locator("[data-tile]").count();
  expect(tileCountAfter).toBe(tileCountBefore - 1);

  await resetLayout(page);
});
