import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  nextInvoiceNumber, nextQuotationNumber, nextDeliveryNoteNumber, computeTotals, computeTotalsInclusive, lineTotal, lineVatBreakdown, booksIncome, incomeSign,
} from "./invoice-utils";

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

describe("nextQuotationNumber (shared numeric sequence)", () => {
  it("returns YYYY-0001 for an empty list", () => {
    assert.equal(nextQuotationNumber([], new Date("2026-08-10")), "2026-0001");
  });

  it("increments the highest sequence for the current year", () => {
    const existing = [{ invoice_number: "2026-0003" }, { invoice_number: "2026-0001" }];
    assert.equal(nextQuotationNumber(existing, new Date("2026-08-10")), "2026-0004");
  });

  it("ignores other years and non-numeric suffixes", () => {
    const existing = [{ invoice_number: "2025-0010" }, { invoice_number: "2026-0002" }];
    assert.equal(nextQuotationNumber(existing, new Date("2026-08-10")), "2026-0003");
  });
});

describe("nextDeliveryNoteNumber (shared numeric sequence)", () => {
  it("returns YYYY-0001 for an empty list", () => {
    assert.equal(nextDeliveryNoteNumber([], new Date("2026-08-10")), "2026-0001");
  });

  it("increments the highest sequence for the current year", () => {
    const existing = [{ invoice_number: "2026-0002" }, { invoice_number: "2026-0001" }];
    assert.equal(nextDeliveryNoteNumber(existing, new Date("2026-08-10")), "2026-0003");
  });
});

describe("booksIncome / incomeSign", () => {
  it("morashi: tax_invoice / combined / credit book income, receipt does not", () => {
    assert.equal(booksIncome("tax_invoice", "morashi"), true);
    assert.equal(booksIncome("tax_invoice_receipt", "morashi"), true);
    assert.equal(booksIncome("credit_invoice", "morashi"), true);
    assert.equal(booksIncome("receipt", "morashi"), false);
    assert.equal(booksIncome("transaction_account", "morashi"), false);
    assert.equal(booksIncome("quotation", "morashi"), false);
    assert.equal(booksIncome("delivery_note", "morashi"), false);
  });

  it("patoor: only receipt books income", () => {
    assert.equal(booksIncome("receipt", "patoor"), true);
    assert.equal(booksIncome("tax_invoice", "patoor"), false);
    assert.equal(booksIncome("tax_invoice_receipt", "patoor"), false);
    assert.equal(booksIncome("credit_invoice", "patoor"), false);
    assert.equal(booksIncome("transaction_account", "patoor"), false);
  });

  it("credit invoices are negative", () => {
    assert.equal(incomeSign("credit_invoice"), -1);
    assert.equal(incomeSign("tax_invoice"), 1);
    assert.equal(incomeSign("receipt"), 1);
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

describe("computeTotalsInclusive", () => {
  it("derives net and vat from a VAT-inclusive price", () => {
    // 2 x 100 net (@18%) => gross 118 each => 236 total
    const items = [
      { id: "a", description: "שירות 1", quantity: 1, unit_price: 118 },
      { id: "b", description: "שירות 2", quantity: 1, unit_price: 118 },
    ];
    const t = computeTotalsInclusive(items, 18);
    assert.equal(t.subtotal, 200);
    assert.equal(t.vat, 36);
    assert.equal(t.total, 236);
  });

  it("round-trips with computeTotals for the same net", () => {
    const grossItems = [{ id: "a", description: "x", quantity: 2, unit_price: 295 }];
    const inc = computeTotalsInclusive(grossItems, 18);
    // net per unit = 295 / 1.18 = 250
    const netItems = [{ id: "a", description: "x", quantity: 2, unit_price: 250 }];
    const net = computeTotals(netItems, 18);
    assert.equal(inc.subtotal, net.subtotal);
    assert.equal(inc.vat, net.vat);
    assert.equal(inc.total, net.total);
  });

  it("handles exempt / zero rate", () => {
    const t = computeTotalsInclusive([{ id: "a", description: "x", quantity: 2, unit_price: 100 }], 0);
    assert.equal(t.vat, 0);
    assert.equal(t.subtotal, 200);
    assert.equal(t.total, 200);
  });

  it("handles empty items", () => {
    const t = computeTotalsInclusive([], 18);
    assert.equal(t.subtotal, 0);
    assert.equal(t.vat, 0);
    assert.equal(t.total, 0);
  });
});

describe("lineVatBreakdown", () => {
  it("splits a net price into per-line net / vat / gross", () => {
    const bd = lineVatBreakdown({ id: "a", description: "x", quantity: 2, unit_price: 100 }, 18, false);
    assert.equal(bd.net, 200);
    assert.equal(bd.vat, 36);
    assert.equal(bd.gross, 236);
  });

  it("backs VAT out of a gross (inclusive) price", () => {
    const bd = lineVatBreakdown({ id: "a", description: "x", quantity: 1, unit_price: 118 }, 18, true);
    assert.equal(bd.net, 100);
    assert.equal(bd.vat, 18);
    assert.equal(bd.gross, 118);
  });

  it("handles exempt / zero rate", () => {
    const bd = lineVatBreakdown({ id: "a", description: "x", quantity: 3, unit_price: 50 }, 0, false);
    assert.equal(bd.net, 150);
    assert.equal(bd.vat, 0);
    assert.equal(bd.gross, 150);
  });
});
