import type { TaxSettings, TaxCalculation, Income, Expense, Saving } from "./finance-types";
import { incomeTaxOnIncome, VAT_DEFAULT, CREDIT_POINT_ANNUAL_VALUE } from "../shared/israeli-tax";

// VAT "absorbed" (מגולם) from a VAT-inclusive gross amount
export function vatFromGross(amount: number, rate: number): number {
  const r = rate / 100;
  return amount - amount / (1 + r);
}

// VAT summed per income row, using each row's rate (if set) or the global default
export function totalVat(incomes: Income[], defaultRate: number): number {
  return incomes.reduce((s, i) => s + vatFromGross(Number(i.amount), i.vat_rate ?? defaultRate), 0);
}

// Deductible expenses for income tax:
// - עוסק זעיר (zeair): a flat % of gross income (no need to track receipts)
// - standard: itemized expenses + savings
function deductibleExpenses(
  grossWithoutVat: number,
  expenses: Expense[],
  savings: Saving[],
  settings: TaxSettings | null,
): number {
  if (settings?.income_scheme === "zeair") {
    return grossWithoutVat * ((settings.zeair_expense_rate ?? 0) / 100);
  }
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalSavings = savings.reduce((s, sv) => s + Number(sv.amount), 0);
  return totalExpenses + totalSavings;
}

// Tax advances (מקדמות ששולמו) only count for the year they were set for.
// Zeroing stale values prevents silently double-counting last year's advances.
export function effectiveTaxAdvances(settings: TaxSettings | null): number {
  if ((settings?.tax_advances_year ?? 0) !== new Date().getFullYear()) return 0;
  return settings?.tax_advances_paid ?? 0;
}

export function calculateTaxes(
  incomes: Income[],
  expenses: Expense[],
  savings: Saving[],
  settings: TaxSettings | null,
): TaxCalculation {
  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);

  const vatRate = settings?.vat_rate ?? VAT_DEFAULT;
  const vat = totalVat(incomes, vatRate);

  const grossWithoutVat = totalIncome - vat;

  const dedExpenses = deductibleExpenses(grossWithoutVat, expenses, savings, settings);

  // Income tax is computed on NET PROFIT via the 2026 progressive monthly
  // brackets, annualized. Net profit is floored at 0 — losses never generate tax.
  const netProfit = Math.max(0, grossWithoutVat - dedExpenses);
  const incomeTax = incomeTaxOnIncome(netProfit / 12) * 12;

  const btlAdv = grossWithoutVat * ((settings?.bituah_leumi ?? 5) / 100);

  // Credit points (נקודות זכות) offset Income Tax ONLY — they never reduce VAT
  // or Bituach Leumi liabilities. The result is floored at 0.
  const annualCredit = (settings?.credit_points ?? 2.25) * CREDIT_POINT_ANNUAL_VALUE;
  const taxAfterCredits = Math.max(0, incomeTax - annualCredit);

  const taxAdvancesPaid = effectiveTaxAdvances(settings);
  const balanceDue = taxAfterCredits - taxAdvancesPaid;

  const totalTax = vat + btlAdv + taxAfterCredits;
  const netIncome = totalIncome - totalTax - dedExpenses;

  return {
    vat: Math.round(vat),
    incomeTax: Math.round(incomeTax),
    bituahLeumi: Math.round(btlAdv),
    creditValue: Math.round(annualCredit),
    totalTax: Math.round(totalTax),
    netIncome: Math.round(netIncome),
    totalIncome: Math.round(totalIncome),
    grossWithoutVat: Math.round(grossWithoutVat),
    dedExpenses: Math.round(dedExpenses),
    netProfit: Math.round(netProfit),
    taxAfterCredits: Math.round(taxAfterCredits),
    taxAdvancesPaid: Math.round(taxAdvancesPaid),
    balanceDue: Math.round(balanceDue),
  };
}
