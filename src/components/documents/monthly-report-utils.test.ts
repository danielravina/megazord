import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyReport, filterByMonth, categoryLabel, escapeHtml, vatForMonth } from "./monthly-report-utils";
import type { Income, Expense, Saving, TaxSettings } from "../finance/finance-types";

const income = (id: string, amount: number, date: string): Income => ({
  id, user_id: "u", description: `הכנסה ${id}`, amount, date, type: "שוטף", created_at: date,
});

const expense = (id: string, amount: number, date: string, category: string): Expense => ({
  id, user_id: "u", description: `הוצאה ${id}`, amount, date, category, is_paid: true, created_at: date,
});

const saving = (id: string, amount: number, date: string): Saving => ({
  id, user_id: "u", fund_type: "קרן השתלמות", amount, date, created_at: date,
});

const settings: TaxSettings = {
  user_id: "u", vat_rate: 17, vat_frequency: "bimonthly", vat_billing_day: 15,
  income_tax_advance: 15, income_tax_billing_day: 15, bituah_leumi: 5, bituah_leumi_billing_day: 15,
  credit_points: 2.25, business_name: null, vat_number: null, business_address: null,
  business_phone: null, accountant_email: null, owner_name: null,
};

describe("filterByMonth", () => {
  it("keeps only items in the selected month/year", () => {
    const items = [
      income("a", 100, "2026-08-05"),
      income("b", 200, "2026-08-20"),
      income("c", 300, "2026-07-31"),
      income("d", 400, "2025-08-01"),
    ];
    const result = filterByMonth(items, 7, 2026); // August is 7 (0-indexed)
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((i) => i.id), ["a", "b"]);
  });
});

describe("categoryLabel", () => {
  it("maps known English folder ids to Hebrew", () => {
    assert.equal(categoryLabel("Suppliers"), "ספקים");
    assert.equal(categoryLabel("Bank"), "בנק");
  });

  it("passes through unknown categories", () => {
    assert.equal(categoryLabel("שיווק"), "שיווק");
  });
});

describe("escapeHtml", () => {
  it("escapes special characters", () => {
    assert.equal(escapeHtml('<a href="x">&</a>'), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
});

describe("buildMonthlyReport", () => {
  it("computes income, expense grouping and net", () => {
    const incomes = [income("i1", 1000, "2026-08-10"), income("i2", 500, "2026-07-10")];
    const expenses = [
      expense("e1", 100, "2026-08-01", "שיווק"),
      expense("e2", 50, "2026-08-02", "שיווק"),
      expense("e3", 300, "2026-08-03", "רכש"),
      expense("e4", 999, "2026-07-01", "רכש"),
    ];
    const savings = [saving("s1", 200, "2026-08-01"), saving("s2", 999, "2026-07-01")];

    const r = buildMonthlyReport(incomes, expenses, savings, settings, 7, 2026);

    assert.equal(r.incomeTotal, 1000);
    assert.equal(r.incomeItems.length, 1);

    assert.equal(r.expenseTotal, 450);
    assert.equal(r.expenseGroups.length, 2);
    assert.equal(r.expenseGroups[0].category, "רכש");
    assert.equal(r.expenseGroups[0].total, 300);
    assert.equal(r.expenseGroups[0].label, "רכש");
    assert.equal(r.expenseGroups[1].category, "שיווק");
    assert.equal(r.expenseGroups[1].total, 150);
    assert.equal(r.expenseGroups[1].label, "שיווק");

    assert.equal(r.savingsTotal, 200);
    assert.equal(r.netBeforeTax, 1000 - 450 - 200);
  });

  it("skips months with no activity", () => {
    const r = buildMonthlyReport([], [], [], settings, 0, 2025);
    assert.equal(r.incomeTotal, 0);
    assert.equal(r.expenseTotal, 0);
    assert.equal(r.savingsTotal, 0);
    assert.equal(r.expenseGroups.length, 0);
  });

  it("maps english folder categories to hebrew labels", () => {
    const expenses = [expense("e1", 100, "2026-08-01", "Suppliers")];
    const r = buildMonthlyReport([], expenses, [], settings, 7, 2026);
    assert.equal(r.expenseGroups[0].label, "ספקים");
  });

  it("calculates vat from income", () => {
    const vat = vatForMonth([income("i1", 1170, "2026-08-10"), income("i2", 1170, "2026-07-10")], settings, 7, 2026);
    // vatFromGross(1170, 17) = 1170 - 1170/1.17 = 170
    assert.equal(vat, 170);
  });
});
