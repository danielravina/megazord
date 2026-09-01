import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateTaxes, vatFromGross, totalVat, effectiveTaxAdvances } from "./tax-engine";
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
    tax_advances_paid: 0,
    tax_advances_year: new Date().getFullYear(),
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
    // netProfit 84120 - 8412 = 75708 -> monthly avg 6309 -> 630.9/mo -> 7570.8/yr.
    // itemized expenses of 50000 must be IGNORED.
    const r = calculateTaxes(
      [income(84120, 0)],
      [expense(50000)],
      [saving(2000)],
      settings({ vat_rate: 0, credit_points: 0, income_scheme: "zeair", zeair_expense_rate: 10 }),
    );
    assert.equal(r.bituahLeumi, 0);
    assert.equal(r.netProfit, 75708);
    assert.equal(r.dedExpenses, 8412);
    assert.equal(r.incomeTax, 7571);
    // net = totalIncome - totalTax - flatDeduction (NOT the itemized 52000)
    assert.equal(r.netIncome, 84120 - 7571 - 8412);
  });
});

describe("calculateTaxes — standard expense scheme", () => {
  it("deducts itemized expenses + savings", () => {
    // netProfit = 84120 - 5000 = 79120 -> monthly avg 6593.333 -> 659.33/mo -> 7912/yr
    const r = calculateTaxes(
      [income(84120, 0)],
      [expense(3000)],
      [saving(2000)],
      settings({ vat_rate: 0, credit_points: 0, income_scheme: "standard" }),
    );
    assert.equal(r.netProfit, 79120);
    assert.equal(r.incomeTax, 7912);
    assert.equal(r.netIncome, 84120 - 7912 - 5000);
  });
});

describe("calculateTaxes — credit points (נקודות זיכוי)", () => {
  it("offsets income tax only and floors at zero", () => {
    // incomeTax 8412 vs annualCredit 4*2904=11616 -> taxAfterCredits 0
    const r = calculateTaxes([income(84120, 0)], [], [], settings({ vat_rate: 0, credit_points: 4 }));
    assert.equal(r.incomeTax, 8412);
    assert.equal(r.taxAfterCredits, 0);
    assert.equal(r.totalTax, 0);
  });

  it("never reduces VAT or Bituach Leumi liabilities", () => {
    // vat 180, bituahLeumi 50, incomeTax 100, annualCredit 11616 -> taxAfterCredits 0
    const r = calculateTaxes(
      [income(1180, 18)],
      [],
      [],
      settings({ bituah_leumi: 5, credit_points: 4 }),
    );
    assert.equal(r.vat, 180);
    assert.equal(r.bituahLeumi, 50);
    assert.equal(r.incomeTax, 100);
    assert.equal(r.taxAfterCredits, 0);
    // VAT + Bituach are NOT offset by credits
    assert.equal(r.totalTax, 230);
    assert.equal(r.totalTax, r.vat + r.bituahLeumi);
  });
});

describe("calculateTaxes — tax advances (מקדמות ששולמו)", () => {
  it("produces a refund when advances exceed the tax after credits", () => {
    // incomeTax 8412, credit_points 0 -> taxAfterCredits 8412, advances 10000 -> refund 1588
    const r = calculateTaxes(
      [income(84120, 0)],
      [],
      [],
      settings({ vat_rate: 0, credit_points: 0, tax_advances_paid: 10000 }),
    );
    assert.equal(r.taxAdvancesPaid, 10000);
    assert.equal(r.taxAfterCredits, 8412);
    assert.equal(r.balanceDue, -1588);
  });

  it("keeps a positive balance due as a debt", () => {
    // advances 5000 < 8412 -> still owe 3412
    const r = calculateTaxes(
      [income(84120, 0)],
      [],
      [],
      settings({ vat_rate: 0, credit_points: 0, tax_advances_paid: 5000 }),
    );
    assert.equal(r.balanceDue, 3412);
  });

  it("ignores advances from a previous year", () => {
    const s = settings({ vat_rate: 0, credit_points: 0, tax_advances_paid: 10000, tax_advances_year: new Date().getFullYear() - 1 });
    assert.equal(effectiveTaxAdvances(s), 0);
    const r = calculateTaxes([income(84120, 0)], [], [], s);
    assert.equal(r.taxAdvancesPaid, 0);
    assert.equal(r.balanceDue, 8412);
  });
});

describe("calculateTaxes — net loss", () => {
  it("floors net profit and income tax at zero, advances become a refund", () => {
    const r = calculateTaxes(
      [income(1000, 0)],
      [expense(5000)],
      [],
      settings({ vat_rate: 0, credit_points: 0, income_scheme: "standard", tax_advances_paid: 500 }),
    );
    assert.equal(r.netProfit, 0);
    assert.equal(r.incomeTax, 0);
    assert.equal(r.taxAfterCredits, 0);
    assert.equal(r.balanceDue, -500);
  });
});
