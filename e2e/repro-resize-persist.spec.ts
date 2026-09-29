import { test, expect } from "@playwright/test";

async function dumpDom(page: any, label: string) {
  const dom = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-tile]")).map((el) => ({
      id: (el.getAttribute("data-tile") || "").slice(0, 6),
      w: Math.round(el.getBoundingClientRect().width),
    })),
  );
  console.log(`${label} DOM:`, JSON.stringify(dom.map((t) => `${t.id}/w=${t.w}`)));
}

test("user flow on real account with save logging", async ({ page }) => {
  page.on("console", (msg) => {
    if (msg.text().includes("[DBG")) console.log("BROWSER:", msg.text());
  });

  await page.goto("/");
  await expect(page.locator("[data-tile]").first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000);
  await dumpDom(page, "LOAD 1:");

  await page.locator("button:has-text('התאמה אישית')").click();
  await page.waitForTimeout(500);

  const t2 = page.locator("[data-tile='t2']");
  const hb = await t2.locator("button[aria-label='שנה רוחב']").boundingBox();
  await page.mouse.move(hb!.x + hb!.width / 2, hb!.y + hb!.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb!.x + hb!.width / 2 + 120, hb!.y + hb!.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(2000);
  await dumpDom(page, "AFTER RESIZE t2:");

  await page.locator("button:has-text('סיום')").click();
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.locator("[data-tile]").first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000);
  await dumpDom(page, "AFTER RELOAD:");
});
