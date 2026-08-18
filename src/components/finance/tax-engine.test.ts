import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateTaxes, vatFromGross, totalVat } from "./tax-engine";
import type { Income, Expense, Saving, TaxSettings } from "./finance-types";

const income = (amount: number, vat_rate?: number | null): Income => ({
  id: "x", user_id: "u", description: "הכנסה", amount, date: "2026-01-01", type: "שוטף",
  vat_rate: vat_rate ?? undefined, created_at: "2026-01-01",
});

const expense = (amount: number): Expense => ({
  id: "x", user_id: "u", description: "הוצאה", amount, date: "2026-01-01",
  category: "שיווק", is_paid: true, created_at: "2026-01-01",
});

const saving = (amount: number): Saving => ({
  id: "x", user_id: "u", fund_type: "קרן השתלמות", amount, date: "2026-01-01", created_at: "2026-01-01",
});

function settings(overrides: Partial<TaxSettings> = {}): TaxSettings {
  return {
    user_id: "u", vat_rate: 18, vat_frequency: "bimonthly", vat_billing_day: 15,
    income_tax_advance: 0, income_tax_billing_day: 15, bituah_leumi: 0, bituah_leumi_billing_day: 15,
    credit_points: 2.25,
    vat_status: "morashi", income_scheme: "standard", zeair_expense_rate: 0,
    business_name: null, vat_number: null, business_address: null,
    business_phone: null, accountant_email: null, owner_name: null,
    ...overrides,
  };
}

describe("vatFromGross", () => {
  it("extracts VAT from a gross amount", () => {
    assert.equal(vatFromGross(118, 18), 18);
    assert.equal(vatFromGross(117, 17), 17);
  });
});

describe("totalVat", () => {
  it("sums per-row VAT using each row's rate", () => {
    const rows = [income(118, 18), income(117, 17)];
    // vatFromGross(118,18)=18 ; vatFromGross(117,17)=17
    assert.equal(totalVat(rows, 18), 35);
  });
});

describe("calculateTaxes — VAT", () => {
  it("computes vat from gross income (morashi, 18%)", () => {
    const r = calculateTaxes([income(118, 18)], [], [], settings());
    assert.equal(r.vat, 18);
  });

  it("returns zero vat for patoor / 0 rate", () => {
    const r = calculateTaxes([income(1000, 0)], [], [], settings({ vat_rate: 0, vat_status: "patoor" }));
    assert.equal(r.vat, 0);
  });
});

describe("calculateTaxes — income tax (2026 brackets, annualized)", () => {
  it("applies brackets to the monthly average", () => {
    // grossWithoutVat = 84120 (vat 0). monthly avg = 7010 -> 701/mo -> 8412/yr
    const r = calculateTaxes([income(84120, 0)], [], [], settings({ vat_rate: 0, credit_points: 0 }));
    assert.equal(r.incomeTax, 8412);
  });

  it("annualizes credit points (242 * points * 12)", () => {
    const r = calculateTaxes([income(0, 0)], [], [], settings({ vat_rate: 0, credit_points: 2.25 }));
    assert.equal(r.creditValue, 544.5 * 12);
  });
});

describe("calculateTaxes — עוסק זעיר (zeair) expense scheme", () => {
  it("deducts a flat % of gross instead of itemized expenses", () => {
    // income 84120, vat 0 -> grossWithoutVat 84120. zeair 10% -> deductible 8412.
    // incomeTax 8412 (from above). itemized expenses of 50000 must be IGNORED.
    const r = calculateTaxes(
      [income(84120, 0)],
      [expense(50000)],
      [saving(2000)],
      settings({ vat_rate: 0, credit_points: 0, income_scheme: "zeair", zeair_expense_rate: 10 }),
    );
    assert.equal(r.bituahLeumi, 0);
    assert.equal(r.incomeTax, 8412);
    // net = totalIncome - totalTax - flatDeduction (NOT the itemized 52000)
    assert.equal(r.netIncome, 84120 - 8412 - 8412);
  });
});

describe("calculateTaxes — standard expense scheme", () => {
  it("deducts itemized expenses + savings", () => {
    const r = calculateTaxes(
      [income(84120, 0)],
      [expense(3000)],
      [saving(2000)],
      settings({ vat_rate: 0, credit_points: 0, income_scheme: "standard" }),
    );
    assert.equal(r.incomeTax, 8412);
    assert.equal(r.netIncome, 84120 - 8412 - 5000);
  });
});
