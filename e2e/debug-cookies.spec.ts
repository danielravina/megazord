import { test, expect } from "@playwright/test";

test("debug: cookie format", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2000);
  const cookies = await page.context().cookies();
  for (const c of cookies.filter((c) => c.name.includes("sb-"))) {
    console.log(`COOKIE ${c.name} len=${c.value.length} val=${c.value.slice(0, 80)}`);
  }
  const keys = await page.evaluate(() => Object.keys(localStorage));
  console.log("LOCALSTORAGE KEYS:", keys);
});

async function dumpDbRow(page: any, label: string) {
  const cookies = await page.context().cookies("http://localhost:3000");
  const chunk = cookies.find((c) => c.name === "sb-uqzlhaifylnhnbgrhdkw-auth-token");
  if (!chunk) { console.log(label, "NO COOKIE"); return; }
  const raw = chunk.value.replace(/^base64-/, "");
  const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  const token = parsed?.access_token || "";
  const uid = parsed?.user?.id || parsed?.sub || "";
  console.log(label, "uid:", uid);
  const row = await page.evaluate(async ({ url, key, token, uid }: any) => {
    const res = await fetch(`${url}/rest/v1/user_dashboard?user_id=eq.${uid}&select=layout,updated_at`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return `HTTP ${res.status}: ${await res.text()}`;
    const rows = await res.json();
    if (!rows?.length) return "NO ROW";
    return {
      updated_at: rows[0].updated_at,
      layout: (rows[0].layout as any[]).map((t: any) => `${t.type}/${t.id?.slice(0, 6)}/w=${t.width ?? "-"}`),
    };
  }, { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, token, uid });
  console.log(JSON.stringify(row));
}

test("debug: dump user_dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-tile]").first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);
  await dumpDbRow(page, "DB ROW:");
});

