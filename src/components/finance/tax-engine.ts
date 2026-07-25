import type { TaxSettings, TaxCalculation, Income, Expense, Saving } from "./finance-types";

export function calculateTaxes(
  incomes: Income[],
  expenses: Expense[],
  savings: Saving[],
  settings: TaxSettings | null,
): TaxCalculation {
  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalSavings = savings.reduce((s, sv) => s + Number(sv.amount), 0);
  const allExpenses = totalExpenses + totalSavings;

  const vatRate = ((settings?.vat_rate ?? 17) / 100);
  const vat = totalIncome - totalIncome / (1 + vatRate);

  const grossWithoutVat = totalIncome - vat;
  const incomeTaxAdv = grossWithoutVat * ((settings?.income_tax_advance ?? 0) / 100);
  const btlAdv = grossWithoutVat * ((settings?.bituah_leumi ?? 5) / 100);
  const creditValue = (settings?.credit_points ?? 2.25) * 235;

  const totalTax = Math.max(0, vat + incomeTaxAdv + btlAdv - creditValue);
  const netIncome = totalIncome - totalTax - allExpenses;

  return {
    vat: Math.round(vat),
    incomeTax: Math.round(incomeTaxAdv),
    bituahLeumi: Math.round(btlAdv),
    creditValue: Math.round(creditValue),
    totalTax: Math.round(totalTax),
    netIncome: Math.round(netIncome),
  };
}
