import type { TaxSettings, TaxCalculation, Income, Expense, Saving } from "./finance-types";

// VAT "absorbed" (מגולם) from a VAT-inclusive gross amount
export function vatFromGross(amount: number, rate: number): number {
  const r = rate / 100;
  return amount - amount / (1 + r);
}

// VAT summed per income row, using each row's rate (if set) or the global default
export function totalVat(incomes: Income[], defaultRate: number): number {
  return incomes.reduce((s, i) => s + vatFromGross(Number(i.amount), i.vat_rate ?? defaultRate), 0);
}

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

  const vatRate = settings?.vat_rate ?? 17;
  const vat = totalVat(incomes, vatRate);

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
