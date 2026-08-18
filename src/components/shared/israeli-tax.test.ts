import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TAX_BRACKETS_2026,
  incomeTaxOnIncome,
  creditValue,
  VAT_DEFAULT,
  CREDIT_POINT_VALUE,
} from "./israeli-tax";

describe("TAX_BRACKETS_2026", () => {
  it("defines the 2026 thresholds in order", () => {
    assert.deepEqual(
      TAX_BRACKETS_2026.map((b) => b.max),
      [7010, 10060, 19000, 25100, 46690, 60130, Infinity],
    );
    assert.deepEqual(
      TAX_BRACKETS_2026.map((b) => b.rate),
      [0.1, 0.14, 0.2, 0.31, 0.35, 0.47, 0.5],
    );
  });
});

describe("incomeTaxOnIncome", () => {
  it("returns 0 for zero income", () => {
    assert.equal(incomeTaxOnIncome(0), 0);
  });

  it("applies 10% up to 7010", () => {
    assert.equal(incomeTaxOnIncome(7010), 7010 * 0.1);
    assert.equal(incomeTaxOnIncome(7000), 700);
  });

  it("applies 14% on the next slice up to 10060", () => {
    // 7010*0.1 + 1*0.14
    assert.equal(incomeTaxOnIncome(7011), 701 + 0.14);
    assert.equal(incomeTaxOnIncome(10060), 701 + (10060 - 7010) * 0.14);
  });

  it("applies 20% on the next slice up to 19000", () => {
    assert.equal(incomeTaxOnIncome(19000), 2916);
  });

  it("applies 31% on the next slice up to 25100", () => {
    assert.equal(incomeTaxOnIncome(25100), 4807);
  });

  it("applies 35% on the next slice up to 46690", () => {
    assert.equal(incomeTaxOnIncome(46690), 12363.5);
  });

  it("applies 47% on the next slice up to 60130", () => {
    assert.equal(incomeTaxOnIncome(60130), 18680.3);
  });

  it("applies 50% above 60130 (incl the 3% surcharge)", () => {
    assert.equal(incomeTaxOnIncome(80000), 18680.3 + (80000 - 60130) * 0.5);
  });
});

describe("creditValue", () => {
  it("returns 242 per credit point", () => {
    assert.equal(creditValue(1), 242);
    assert.equal(creditValue(2.25), 544.5);
    assert.equal(creditValue(0), 0);
  });
});

describe("CREDIT_POINT_VALUE", () => {
  it("is 242", () => {
    assert.equal(CREDIT_POINT_VALUE, 242);
  });
});

describe("VAT_DEFAULT", () => {
  it("is 18%", () => {
    assert.equal(VAT_DEFAULT, 18);
  });
});
