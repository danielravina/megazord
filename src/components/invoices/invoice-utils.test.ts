import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nextInvoiceNumber, computeTotals, lineTotal } from "./invoice-utils";

describe("nextInvoiceNumber", () => {
  it("returns YYYY-0001 for an empty list", () => {
    assert.equal(nextInvoiceNumber([], new Date("2026-08-10")), "2026-0001");
  });

  it("increments the highest sequence for the current year", () => {
    const existing = [{ invoice_number: "2026-0003" }, { invoice_number: "2026-0001" }, { invoice_number: "2026-0002" }];
    assert.equal(nextInvoiceNumber(existing, new Date("2026-08-10")), "2026-0004");
  });

  it("ignores other years", () => {
    const existing = [{ invoice_number: "2025-0010" }, { invoice_number: "2026-0002" }];
    assert.equal(nextInvoiceNumber(existing, new Date("2026-08-10")), "2026-0003");
  });

  it("ignores malformed numbers", () => {
    const existing = [{ invoice_number: "2026-abc" }, { invoice_number: "something" }];
    assert.equal(nextInvoiceNumber(existing, new Date("2026-08-10")), "2026-0001");
  });
});

describe("computeTotals", () => {
  const items = [
    { id: "a", description: "שירות 1", quantity: 2, unit_price: 100 },
    { id: "b", description: "שירות 2", quantity: 1, unit_price: 50 },
  ];

  it("computes subtotal, vat and total", () => {
    const t = computeTotals(items, 18);
    assert.equal(t.subtotal, 250);
    assert.equal(t.vat, 45);
    assert.equal(t.total, 295);
  });

  it("handles 0 vat rate (exempt)", () => {
    const t = computeTotals(items, 0);
    assert.equal(t.subtotal, 250);
    assert.equal(t.vat, 0);
    assert.equal(t.total, 250);
  });

  it("handles empty items", () => {
    const t = computeTotals([], 18);
    assert.equal(t.subtotal, 0);
    assert.equal(t.vat, 0);
    assert.equal(t.total, 0);
  });

  it("handles missing quantity / price as zero", () => {
    const t = computeTotals([{ id: "c", description: "", quantity: 0, unit_price: 100 }], 18);
    assert.equal(lineTotal({ id: "c", description: "", quantity: 0, unit_price: 100 }), 0);
    assert.equal(t.subtotal, 0);
  });
});
