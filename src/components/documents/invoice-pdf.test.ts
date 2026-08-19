import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInvoiceHtml } from "./invoice-pdf";
import type { Invoice } from "./invoice-types";
import type { TaxSettings } from "../finance/finance-types";

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv1", user_id: "u", customer_id: "c1", project_id: null,
    invoice_number: "2026-0001", issue_date: "2026-08-10", due_date: null,
    items: [{ id: "i", description: "שירות", quantity: 1, unit_price: 100 }],
    amount: 118, vat_rate: 18, document_type: "tax_invoice",
    notes: null, created_at: "2026-08-10", customer_name: "לקוח",
    ...overrides,
  };
}

const settings: TaxSettings = {
  user_id: "u", vat_rate: 18, vat_frequency: "bimonthly", vat_billing_day: 15,
  income_tax_advance: 0, income_tax_billing_day: 15, bituah_leumi: 5, bituah_leumi_billing_day: 15,
  credit_points: 2.25, vat_status: "morashi", income_scheme: "standard", zeair_expense_rate: 0,
  business_name: "העסק", vat_number: "512345678", business_address: null,
  business_phone: null, accountant_email: null, owner_name: null,
};

describe("buildInvoiceHtml — document types", () => {
  it("renders a tax invoice with per-item VAT", () => {
    const html = buildInvoiceHtml(invoice(), null, settings);
    assert.ok(html.includes("חשבונית מס"));
    assert.ok(html.includes("מע\"מ"));
    assert.ok(!html.includes("מע\"מ (18%)"));
  });

  it("renders a receipt without per-item VAT", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "receipt" }), null, settings);
    assert.ok(html.includes("קבלה"));
    assert.ok(!html.includes("חשבונית מס"));
  });

  it("renders a combined tax invoice / receipt", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "tax_invoice_receipt" }), null, settings);
    assert.ok(html.includes("חשבונית מס/קבלה"));
  });

  it("renders a credit invoice with negative styling", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "credit_invoice", amount: 118 }), null, settings);
    assert.ok(html.includes("חשבונית מס זיכוי"));
    assert.ok(html.includes("סה\"כ זיכוי"));
  });

  it("renders a transaction account with a demand notice", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "transaction_account" }), null, settings);
    assert.ok(html.includes("חשבונית עסקה"));
    assert.ok(html.includes("דרישת תשלום"));
  });

  it("renders a quotation without a payable total", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "quotation" }), null, settings);
    assert.ok(html.includes("הצעת מחיר"));
    assert.ok(html.includes("סה\"כ להצעה"));
  });

  it("renders a delivery note without a payable total", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "delivery_note" }), null, settings);
    assert.ok(html.includes("תעודת משלוח"));
    assert.ok(html.includes("סה\"כ פריטים"));
  });
});

describe("buildInvoiceHtml — עוסק פטור (exempt)", () => {
  it("shows the exemption clause and no per-item VAT column", () => {
    const html = buildInvoiceHtml(invoice({ vat_rate: 0 }), null, settings);
    assert.ok(html.includes("עוסק פטור — חשבונית זו אינה כוללת מע\"מ"));
    assert.ok(!html.includes("סעיף 31"));
  });
});

describe("buildInvoiceHtml — totals", () => {
  it("renders a single total with VAT embedded per item", () => {
    const html = buildInvoiceHtml(invoice(), null, settings);
    assert.ok(html.includes("סה\"כ לתשלום"));
    assert.ok(!html.includes("סכום ללא מע\"מ"));
    assert.ok(!html.includes("מע\"מ (18%)"));
  });

  it("renders per-line VAT with mixed rates and a dash for exempt lines", () => {
    const doc = invoice({
      items: [
        { id: "labour", description: "עבודה", quantity: 2, unit_price: 100, vat_rate: 18 }, // vat 36, gross 236
        { id: "mat", description: "חומר", quantity: 1, unit_price: 118, vat_rate: 0 }, // exempt => vat "—", gross 118
      ],
    });
    const html = buildInvoiceHtml(doc, null, settings);
    // labour: gross 236
    assert.ok(html.includes("236"));
    // exempt material: vat cell shows a dash, gross 118
    assert.ok(html.includes("—"));
    assert.ok(html.includes("118"));
    // total = 236 + 118 = 354
    assert.ok(html.includes("354"));
    // tax invoice shows the per-line rate column (18%)
    assert.ok(html.includes("18%"));
    assert.ok(html.includes("0%"));
  });
});
