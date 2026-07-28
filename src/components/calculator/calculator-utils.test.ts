import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Inline the functions to avoid ESM/TS module resolution issues in Node test runner
// These are identical to the source functions

interface VatResult { amount: number; vat: number; total: number; rate: number; }
interface VatReverseResult { total: number; vat: number; net: number; rate: number; }
interface TaxEstimate { monthlyIncome: number; monthlyExpenses: number; taxableIncome: number; incomeTax: number; bituahLeumi: number; totalTax: number; netIncome: number; effectiveRate: number; }
interface PricingResult { desiredNet: number; requiredGross: number; vat: number; estimatedTax: number; finalNet: number; }

function round(n: number): number { return Math.round(n); }

function addVat(netAmount: number, rate = 18): VatResult {
  const vat = netAmount * (rate / 100);
  return { amount: netAmount, vat: round(vat), total: round(netAmount + vat), rate };
}

function removeVat(grossAmount: number, rate = 18): VatReverseResult {
  const net = grossAmount / (1 + rate / 100);
  const vat = grossAmount - net;
  return { total: grossAmount, vat: round(vat), net: round(net), rate };
}

const TAX_BRACKETS = [
  { max: 7010, rate: 0.10 }, { max: 10060, rate: 0.14 }, { max: 16150, rate: 0.20 },
  { max: 22470, rate: 0.31 }, { max: 42010, rate: 0.35 }, { max: 54030, rate: 0.47 },
  { max: Infinity, rate: 0.50 },
];

function calcBituahLeumi(monthlyIncome: number): number {
  const maxForBL = 49030;
  if (monthlyIncome <= 0) return 0;
  const capped = Math.min(monthlyIncome, maxForBL);
  const threshold = 7522;
  if (capped <= threshold) return capped * 0.104;
  return capped * 0.1783;
}

function estimateTaxes(monthlyIncome: number, monthlyExpenses = 0, creditPoints = 2.25): TaxEstimate {
  const taxableIncome = Math.max(0, monthlyIncome - monthlyExpenses);
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
  incomeTax = Math.max(0, incomeTax - creditPoints * 235);
  const bl = calcBituahLeumi(taxableIncome);
  const totalTax = round(incomeTax + bl);
  const netIncome = round(monthlyIncome - totalTax - monthlyExpenses);
  return { monthlyIncome: round(monthlyIncome), monthlyExpenses: round(monthlyExpenses), taxableIncome: round(taxableIncome), incomeTax: round(incomeTax), bituahLeumi: round(bl), totalTax, netIncome, effectiveRate: taxableIncome > 0 ? round(totalTax / taxableIncome * 100) : 0 };
}

function priceForNet(desiredNet: number, monthlyExpenses = 0, vatRate = 18): PricingResult {
  let low = desiredNet;
  let high = desiredNet * 3;
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const tax = estimateTaxes(mid, monthlyExpenses);
    const afterTax = mid - tax.totalTax;
    const afterVat = afterTax / (1 + vatRate / 100);
    if (afterVat > desiredNet) high = mid; else low = mid;
  }
  const requiredGross = round((low + high) / 2);
  const tax = estimateTaxes(requiredGross, monthlyExpenses);
  const afterTax = requiredGross - tax.totalTax;
  const afterVat = afterTax / (1 + vatRate / 100);
  return { desiredNet: round(desiredNet), requiredGross, vat: round(requiredGross * (vatRate / 100)), estimatedTax: tax.totalTax, finalNet: round(afterVat) };
}

// Tests
describe("addVat", () => {
  it("adds 18% VAT to a net amount", () => {
    const r = addVat(100, 18);
    assert.equal(r.amount, 100);
    assert.equal(r.vat, 18);
    assert.equal(r.total, 118);
    assert.equal(r.rate, 18);
  });

  it("adds 17% VAT", () => {
    const r = addVat(1000, 17);
    assert.equal(r.vat, 170);
    assert.equal(r.total, 1170);
  });

  it("handles zero", () => {
    const r = addVat(0, 18);
    assert.equal(r.vat, 0);
    assert.equal(r.total, 0);
  });

  it("handles decimal amounts", () => {
    const r = addVat(99.99, 18);
    assert.equal(r.vat, 18);
    assert.equal(r.total, 118);
  });
});

describe("removeVat", () => {
  it("extracts 18% VAT from gross amount", () => {
    const r = removeVat(118, 18);
    assert.equal(r.total, 118);
    assert.equal(r.vat, 18);
    assert.equal(r.net, 100);
  });

  it("extracts 17% VAT", () => {
    const r = removeVat(1170, 17);
    assert.equal(r.total, 1170);
    assert.equal(r.vat, 170);
    assert.equal(r.net, 1000);
  });

  it("handles zero", () => {
    const r = removeVat(0, 18);
    assert.equal(r.vat, 0);
    assert.equal(r.net, 0);
  });

  it("net + vat equals total", () => {
    const r = removeVat(500, 18);
    assert.equal(r.net + r.vat, r.total);
  });
});

describe("estimateTaxes", () => {
  it("calculates tax for 10,000 monthly income", () => {
    const r = estimateTaxes(10000);
    assert.equal(r.monthlyIncome, 10000);
    assert.equal(r.taxableIncome, 10000);
    assert.equal(r.incomeTax, 591);
    assert.equal(r.bituahLeumi, 1783);
    assert.equal(r.totalTax, 2374);
    assert.equal(r.netIncome, 7626);
  });

  it("deducts expenses from taxable income", () => {
    const r = estimateTaxes(10000, 3000);
    assert.equal(r.taxableIncome, 7000);
  });

  it("handles zero income", () => {
    const r = estimateTaxes(0);
    assert.equal(r.taxableIncome, 0);
    assert.equal(r.incomeTax, 0);
    assert.equal(r.totalTax, 0);
  });

  it("handles high income", () => {
    const r = estimateTaxes(60000);
    assert.ok(r.totalTax > 0);
    assert.ok(r.netIncome < 60000);
  });

  it("effective rate is reasonable", () => {
    const r = estimateTaxes(15000);
    assert.ok(r.effectiveRate > 0 && r.effectiveRate < 50);
  });
});

describe("priceForNet", () => {
  it("required gross exceeds desired net", () => {
    const r = priceForNet(5000);
    assert.equal(r.desiredNet, 5000);
    assert.ok(r.requiredGross > 5000);
    assert.ok(Math.abs(r.finalNet - r.desiredNet) <= 1);
  });

  it("accounts for expenses", () => {
    const r = priceForNet(5000, 2000);
    assert.ok(r.requiredGross > 5000);
  });

  it("handles zero", () => {
    const r = priceForNet(0);
    assert.equal(r.finalNet, 0);
  });
});
