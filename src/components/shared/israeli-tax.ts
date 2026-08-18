// Single source of truth for Israeli 2026 tax data and calculations.
// Used by the tax engine, calculators and monthly reporting.

export const VAT_DEFAULT = 18;

// Value of a single credit point (נקודת זיכוי) per month in ILS (2026).
export const CREDIT_POINT_VALUE = 242;

// Israeli monthly income tax brackets for 2026 (personal/יגיעה אישית).
// Each bracket: max (upper bound, Infinity = top) and marginal rate.
// The top 50% rate includes the 3% surcharge (יסף) on very high incomes.
export interface TaxBracket {
  max: number;
  rate: number;
}

export const TAX_BRACKETS_2026: TaxBracket[] = [
  { max: 7010, rate: 0.1 },
  { max: 10060, rate: 0.14 },
  { max: 19000, rate: 0.2 },
  { max: 25100, rate: 0.31 },
  { max: 46690, rate: 0.35 },
  { max: 60130, rate: 0.47 },
  { max: Infinity, rate: 0.5 },
];

// Marginal income tax on a given taxable (gross, pre-tax) amount, applying
// the 2026 progressive brackets.
export function incomeTaxOnIncome(taxable: number): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  let remaining = taxable;
  let prevMax = 0;
  for (const bracket of TAX_BRACKETS_2026) {
    const slice = Math.min(remaining, bracket.max - prevMax);
    if (slice <= 0) break;
    tax += slice * bracket.rate;
    remaining -= slice;
    prevMax = bracket.max;
  }
  return tax;
}

// Value of credit points for a single month.
export function creditValue(points: number): number {
  return points * CREDIT_POINT_VALUE;
}
