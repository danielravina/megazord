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
    amount: 118, vat_rate: 18, status: "draft", document_type: "tax_invoice",
    notes: null, sent_at: null, created_at: "2026-08-10", customer_name: "לקוח",
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
  it("renders a tax invoice with the VAT breakdown", () => {
    const html = buildInvoiceHtml(invoice(), null, settings);
    assert.ok(html.includes("חשבונית מס"));
    assert.ok(html.includes("מע\"מ (18%)"));
  });

  it("renders a receipt without a VAT breakdown", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "receipt" }), null, settings);
    assert.ok(html.includes("קבלה"));
    assert.ok(!html.includes("חשבונית מס"));
    assert.ok(!html.includes("מע\"מ ("));
  });

  it("renders a combined tax invoice / receipt", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "tax_invoice_receipt" }), null, settings);
    assert.ok(html.includes("חשבונית מס/קבלה"));
  });
});

describe("buildInvoiceHtml — עוסק פטור (exempt)", () => {
  it("shows the exemption clause and no VAT amount", () => {
    const html = buildInvoiceHtml(invoice({ vat_rate: 0 }), null, settings);
    assert.ok(html.includes("עוסק פטור — חשבונית זו אינה כוללת מע\"מ"));
    assert.ok(!html.includes("סעיף 31"));
    assert.ok(!html.includes("מע\"מ ("));
  });
});

describe("buildInvoiceHtml — totals", () => {
  it("renders the totals section with subtotal / total", () => {
    const html = buildInvoiceHtml(invoice(), null, settings);
    assert.ok(html.includes("סכום ללא מע\"מ"));
    assert.ok(html.includes("סה\"כ לתשלום"));
  });
});
