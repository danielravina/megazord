import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInvoiceHtml } from "./invoice-pdf";
import type { Invoice } from "./invoice-types";
import type { TaxSettings } from "../finance/finance-types";

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv1", user_id: "u", customer_id: "c1", project_id: null,
    invoice_number: "30001", issue_date: "2026-08-10", due_date: null,
    items: [{ id: "i", description: "שירות", quantity: 1, unit_price: 100 }],
    payments: [], amount: 118, vat_rate: 18, document_type: "tax_invoice",
    notes: null, created_at: "2026-08-10", customer_name: "לקוח",
    ...overrides,
  };
}

const settings: TaxSettings = {
  user_id: "u", vat_rate: 18, vat_frequency: "bimonthly", vat_billing_day: 15,
  income_tax_advance: 0, income_tax_billing_day: 15, bituah_leumi: 5, bituah_leumi_billing_day: 15,
  credit_points: 2.25, vat_status: "morashi", income_scheme: "standard", zeair_expense_rate: 0,
  business_name: "העסק", vat_number: "512345678", business_address: null,
  business_phone: null, business_email: null, accountant_email: null, owner_name: null,
  cover_image_path: null, logo_path: null,
  tax_advances_paid: 0, tax_advances_year: new Date().getFullYear(),
};

describe("buildInvoiceHtml — document types", () => {
  it("renders a tax invoice with per-item VAT", () => {
    const html = buildInvoiceHtml(invoice(), null, settings);
    assert.ok(html.includes("חשבונית מס"));
    assert.ok(html.includes("מע\"מ"));
  });

  it("renders a receipt without per-item VAT", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "receipt" }), null, settings);
    assert.ok(html.includes("קבלה"));
    assert.ok(!html.includes("חשבונית מס"));
  });

  it("renders a combined tax invoice / receipt with two framed sections and one unified number", () => {
    const html = buildInvoiceHtml(
      invoice({ document_type: "tax_invoice_receipt", invoice_number: "50122" }),
      null,
      settings,
    );
    assert.ok(html.includes("חשבונית מס/קבלה"));
    assert.ok(html.includes(">חשבונית מס<"));
    assert.ok(html.includes(">קבלה<"));
    // same unified number appears in both section title bars
    assert.equal(html.split("מס' 50122").length - 1, 2);
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
    const html = buildInvoiceHtml(invoice({ document_type: "quotation", invoice_number: "10001" }), null, settings);
    assert.ok(html.includes("הצעת מחיר"));
    assert.ok(html.includes("סה\"כ להצעה"));
  });

  it("renders a delivery note without a payable total", () => {
    const html = buildInvoiceHtml(invoice({ document_type: "delivery_note", invoice_number: "70001" }), null, settings);
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

  it("does not show a standalone VAT line for exempt documents", () => {
    const html = buildInvoiceHtml(invoice({ vat_rate: 0 }), null, settings);
    assert.ok(!html.includes('מע"מ (0%)'));
  });
});

describe("buildInvoiceHtml — business details", () => {
  it("shows the business email in the header when set", () => {
    const html = buildInvoiceHtml(invoice(), null, { ...settings, business_email: "biz@example.com" });
    assert.ok(html.includes("אימייל: biz@example.com"));
  });

  it("omits the email line when not set", () => {
    const html = buildInvoiceHtml(invoice(), null, settings);
    assert.ok(!html.includes("אימייל:"));
  });
});

describe("buildInvoiceHtml — totals", () => {
  it("shows subtotal, standalone VAT line and total before the payable amount", () => {
    const html = buildInvoiceHtml(invoice(), null, settings);
    assert.ok(html.includes("סה\"כ לפני מע\"מ"));
    assert.ok(html.includes('מע"מ (18%)'));
    assert.ok(html.includes("סה\"כ לתשלום"));
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
    // totals: subtotal 318, vat 36, total 354
    assert.ok(html.includes("318"));
    assert.ok(html.includes("36"));
    assert.ok(html.includes("354"));
    // tax invoice shows the per-line rate column (18%)
    assert.ok(html.includes("18%"));
    assert.ok(html.includes("0%"));
  });

  it("renders a receipt without VAT lines and with a payments table", () => {
    const doc = invoice({
      document_type: "receipt",
      vat_rate: 0,
      items: [{ id: "i", description: "שירות", quantity: 1, unit_price: 500 }],
      payments: [
        { id: "p1", method: "cash", date: "2026-08-10", amount: 200 },
        { id: "p2", method: "bank_transfer", date: "2026-08-11", bank_name: "לאומי", bank_branch: "123", bank_account: "456789", amount: 300 },
      ],
    });
    const html = buildInvoiceHtml(doc, null, settings);
    assert.ok(!html.includes("סה\"כ לפני מע\"מ"));
    assert.ok(!html.includes('מע"מ ('));
    assert.ok(html.includes("אמצעי תשלום"));
    assert.ok(html.includes("מזומן"));
    assert.ok(html.includes("העברה בנקאית"));
    assert.ok(html.includes("לאומי"));
    assert.ok(html.includes("456789"));
    assert.ok(html.includes("סה\"כ שולם"));
    assert.ok(html.includes("500"));
  });

  it("renders 'other' payments with the typed description", () => {
    const doc = invoice({
      document_type: "receipt",
      vat_rate: 0,
      payments: [{ id: "p1", method: "other", method_other: "PayPal", date: "2026-08-10", amount: 100 }],
    });
    const html = buildInvoiceHtml(doc, null, settings);
    assert.ok(html.includes("אחר: PayPal"));
  });
});

describe("buildInvoiceHtml — branding", () => {
  it("renders the cover banner and the logo when provided", () => {
    const html = buildInvoiceHtml(invoice(), null, settings, "700px", {
      coverDataUri: "data:image/png;base64,COV",
      logoDataUri: "data:image/png;base64,LOG",
    });
    assert.ok(html.includes('src="data:image/png;base64,COV"'));
    assert.ok(html.includes('src="data:image/png;base64,LOG"'));
    assert.ok(html.includes("לוגו"));
  });

  it("omits the banner and logo when not provided", () => {
    const html = buildInvoiceHtml(invoice(), null, settings);
    assert.ok(!html.includes("<img"));
  });
});