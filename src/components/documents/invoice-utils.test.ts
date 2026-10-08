import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  nextNumberFor, nextInvoiceNumber, nextQuotationNumber, nextDeliveryNoteNumber, computeTotals, computeLineTotals, effectiveLineVatRate, lineTotal, lineVatBreakdown, booksIncome, incomeSign,
} from "./invoice-utils";

describe("nextNumberFor (per-category sequence)", () => {
  it("starts each category at its category digit + 0001", () => {
    assert.equal(nextNumberFor("tax_invoice", []), "30001");
    assert.equal(nextNumberFor("receipt", []), "60001");
    assert.equal(nextNumberFor("tax_invoice_receipt", []), "50001");
    assert.equal(nextNumberFor("delivery_note", []), "70001");
    assert.equal(nextNumberFor("quotation", []), "10001");
    assert.equal(nextNumberFor("transaction_account", []), "20001");
    assert.equal(nextNumberFor("credit_invoice", []), "40001");
  });

  it("counts each category independently", () => {
    const existing = [{ invoice_number: "30007" }, { invoice_number: "60002" }, { invoice_number: "50001" }];
    assert.equal(nextNumberFor("tax_invoice", existing), "30008");
    assert.equal(nextNumberFor("receipt", existing), "60003");
    assert.equal(nextNumberFor("tax_invoice_receipt", existing), "50002");
  });

  it("ignores legacy YYYY-NNNN numbers and other categories", () => {
    const existing = [{ invoice_number: "2026-0005" }, { invoice_number: "40009" }, { invoice_number: "something" }];
    assert.equal(nextNumberFor("tax_invoice", existing), "30001");
    assert.equal(nextNumberFor("credit_invoice", existing), "40010");
  });

  it("ignores malformed numbers and handles 5-digit sequences", () => {
    const existing = [{ invoice_number: "7-005" }, { invoice_number: "7abc" }, { invoice_number: "712345" }];
    assert.equal(nextNumberFor("delivery_note", existing), "712346");
  });
});

describe("legacy number helpers (per-category sequences)", () => {
  it("nextInvoiceNumber / nextQuotationNumber / nextDeliveryNoteNumber use their category", () => {
    assert.equal(nextInvoiceNumber([]), "30001");
    assert.equal(nextQuotationNumber([{ invoice_number: "10012" }]), "10013");
    assert.equal(nextDeliveryNoteNumber([{ invoice_number: "70099" }]), "70100");
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

  it("zeair behaves like patoor: only receipt books income", () => {
    assert.equal(booksIncome("receipt", "zeair"), true);
    assert.equal(booksIncome("tax_invoice", "zeair"), false);
    assert.equal(booksIncome("tax_invoice_receipt", "zeair"), false);
    assert.equal(booksIncome("credit_invoice", "zeair"), false);
    assert.equal(booksIncome("transaction_account", "zeair"), false);
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

describe("lineVatBreakdown", () => {
  it("splits a net price into per-line net / vat / gross", () => {
    const bd = lineVatBreakdown({ id: "a", description: "x", quantity: 2, unit_price: 100 }, 18);
    assert.equal(bd.net, 200);
    assert.equal(bd.vat, 36);
    assert.equal(bd.gross, 236);
  });

  it("handles exempt / zero rate", () => {
    const bd = lineVatBreakdown({ id: "a", description: "x", quantity: 3, unit_price: 50 }, 0);
    assert.equal(bd.net, 150);
    assert.equal(bd.vat, 0);
    assert.equal(bd.gross, 150);
  });
});

describe("effectiveLineVatRate", () => {
  it("uses the line's own rate when set, otherwise the default", () => {
    assert.equal(effectiveLineVatRate({ id: "a", description: "x", quantity: 1, unit_price: 100, vat_rate: 0 }, 18), 0);
    assert.equal(effectiveLineVatRate({ id: "a", description: "x", quantity: 1, unit_price: 100, vat_rate: 17 }, 18), 17);
    assert.equal(effectiveLineVatRate({ id: "a", description: "x", quantity: 1, unit_price: 100 }, 18), 18);
    assert.equal(effectiveLineVatRate({ id: "a", description: "x", quantity: 1, unit_price: 100, vat_rate: null }, 18), 18);
  });
});

describe("computeLineTotals (per-line VAT rates)", () => {
  it("sums net / vat / gross across mixed rates", () => {
    // labour at default 18%: 2x100 net => vat 36, gross 236
    // material exempt (0%): 1x118 => vat 0, gross 118
    const items = [
      { id: "labour", description: "עבודה", quantity: 2, unit_price: 100, vat_rate: 18 },
      { id: "mat", description: "חומר", quantity: 1, unit_price: 118, vat_rate: 0 },
    ];
    const t = computeLineTotals(items, 18);
    assert.equal(t.subtotal, 318);
    assert.equal(t.vat, 36);
    assert.equal(t.total, 354);
  });

  it("defaults items without a rate to the document rate", () => {
    const t = computeLineTotals([{ id: "a", description: "x", quantity: 1, unit_price: 100 }], 18);
    assert.equal(t.subtotal, 100);
    assert.equal(t.vat, 18);
    assert.equal(t.total, 118);
  });

  it("handles a fully exempt document / zero default rate", () => {
    const t = computeLineTotals(
      [
        { id: "a", description: "x", quantity: 2, unit_price: 100 },
        { id: "b", description: "y", quantity: 1, unit_price: 118, vat_rate: 0 },
      ],
      0,
    );
    assert.equal(t.subtotal, 318);
    assert.equal(t.vat, 0);
    assert.equal(t.total, 318);
  });
});
