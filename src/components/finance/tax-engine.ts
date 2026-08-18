import type { TaxSettings, TaxCalculation, Income, Expense, Saving } from "./finance-types";
import { incomeTaxOnIncome, creditValue, VAT_DEFAULT } from "../shared/israeli-tax";

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

  // Income tax via 2026 progressive monthly brackets, annualized.
  // The aggregated income is treated as annual; we tax the monthly average and
  // scale back up to a year.
  const incomeTax = incomeTaxOnIncome(grossWithoutVat / 12) * 12;

  const btlAdv = grossWithoutVat * ((settings?.bituah_leumi ?? 5) / 100);

  // Credit points (נקודות זכות): monthly value x12 to annualize.
  const annualCredit = creditValue(settings?.credit_points ?? 2.25) * 12;

  const dedExpenses = deductibleExpenses(grossWithoutVat, expenses, savings, settings);

  const totalTax = Math.max(0, vat + incomeTax + btlAdv - annualCredit);
  const netIncome = totalIncome - totalTax - dedExpenses;

  return {
    vat: Math.round(vat),
    incomeTax: Math.round(incomeTax),
    bituahLeumi: Math.round(btlAdv),
    creditValue: Math.round(annualCredit),
    totalTax: Math.round(totalTax),
    netIncome: Math.round(netIncome),
  };
}
