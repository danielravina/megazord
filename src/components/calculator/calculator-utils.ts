// Israeli tax and financial calculation utilities
// Used by the calculator widget

export interface VatResult {
  amount: number;
  vat: number;
  total: number;
  rate: number;
}

export interface VatReverseResult {
  total: number;
  vat: number;
  net: number;
  rate: number;
}

export interface TaxEstimate {
  monthlyIncome: number;
  monthlyExpenses: number;
  taxableIncome: number;
  incomeTax: number;
  bituahLeumi: number;
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
}

export interface PricingResult {
  desiredNet: number;
  requiredGross: number;
  vat: number;
  estimatedTax: number;
  finalNet: number;
}

// VAT: add VAT to a net amount
export function addVat(netAmount: number, rate = 18): VatResult {
  const vat = netAmount * (rate / 100);
  return {
    amount: netAmount,
    vat: round(vat),
    total: round(netAmount + vat),
    rate,
  };
}

// VAT: extract VAT from a gross amount
export function removeVat(grossAmount: number, rate = 18): VatReverseResult {
  const net = grossAmount / (1 + rate / 100);
  const vat = grossAmount - net;
  return {
    total: grossAmount,
    vat: round(vat),
    net: round(net),
    rate,
  };
}

// Israeli income tax brackets (monthly, 2025)
const TAX_BRACKETS = [
  { max: 7010, rate: 0.10 },
  { max: 10060, rate: 0.14 },
  { max: 16150, rate: 0.20 },
  { max: 22470, rate: 0.31 },
  { max: 42010, rate: 0.35 },
  { max: 54030, rate: 0.47 },
  { max: Infinity, rate: 0.50 },
];

// Self-employed Bituah Leumi rates (2025) - simplified
function calcBituahLeumi(monthlyIncome: number): number {
  const maxForBL = 49030;

  if (monthlyIncome <= 0) return 0;

  const capped = Math.min(monthlyIncome, maxForBL);

  // Rates: below threshold uses reduced rate, above uses full rate
  const threshold = 7522;
  if (capped <= threshold) {
    return capped * 0.104; // ~10.4%
  }
  return capped * 0.1783; // ~17.83%
}

// Credit points for income tax reduction
function calcCreditPoints(points = 2.25): number {
  return points * 235; // ₪235 per point per month
}

// Estimate Israeli taxes for self-employed
export function estimateTaxes(
  monthlyIncome: number,
  monthlyExpenses = 0,
  creditPoints = 2.25,
): TaxEstimate {
  const taxableIncome = Math.max(0, monthlyIncome - monthlyExpenses);

  // Income tax (bracket-based)
  let incomeTax = 0;
  let remaining = taxableIncome;
  let prevMax = 0;

  for (const bracket of TAX_BRACKETS) {
    const bracketIncome = Math.min(remaining, bracket.max - prevMax);
    if (bracketIncome <= 0) break;
    incomeTax += bracketIncome * bracket.rate;
    remaining -= bracketIncome;
    prevMax = bracket.max;
  }

  // Apply credit points
  incomeTax = Math.max(0, incomeTax - calcCreditPoints(creditPoints));

  // Bituah Leumi
  const bl = calcBituahLeumi(taxableIncome);

  const totalTax = round(incomeTax + bl);
  const netIncome = round(monthlyIncome - totalTax - monthlyExpenses);

  return {
    monthlyIncome: round(monthlyIncome),
    monthlyExpenses: round(monthlyExpenses),
    taxableIncome: round(taxableIncome),
    incomeTax: round(incomeTax),
    bituahLeumi: round(bl),
    totalTax,
    netIncome,
    effectiveRate: taxableIncome > 0 ? round(totalTax / taxableIncome * 100) : 0,
  };
}

// Pricing helper: calculate required gross to achieve desired net income
export function priceForNet(
  desiredNet: number,
  monthlyExpenses = 0,
  vatRate = 18,
): PricingResult {
  // Binary search for the required gross
  let low = desiredNet;
  let high = desiredNet * 3;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const tax = estimateTaxes(mid, monthlyExpenses);
    const afterTax = mid - tax.totalTax;
    const afterVat = afterTax / (1 + vatRate / 100);

    if (afterVat > desiredNet) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const requiredGross = round((low + high) / 2);
  const tax = estimateTaxes(requiredGross, monthlyExpenses);
  const afterTax = requiredGross - tax.totalTax;
  const afterVat = afterTax / (1 + vatRate / 100);

  return {
    desiredNet: round(desiredNet),
    requiredGross,
    vat: round(requiredGross * (vatRate / 100)),
    estimatedTax: tax.totalTax,
    finalNet: round(afterVat),
  };
}

function round(n: number): number {
  return Math.round(n);
}
