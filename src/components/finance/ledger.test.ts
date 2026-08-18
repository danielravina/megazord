import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLedger, outstandingDemands, futurePaymentScans } from "./ledger";
import type { Invoice } from "@/components/documents/invoice-types";
import type { ScanEvidence } from "./ledger";

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

function scan(overrides: Partial<ScanEvidence> = {}): ScanEvidence {
  return {
    id: "s1", title: "הוצאה", doc_type: "receipt", direction: "expense",
    total_amount: 50, date_on_doc: "2026-08-01", date: "2026-08-01T10:00:00Z",
    folder: "שיווק", project_id: null,
    ...overrides,
  };
}

describe("buildLedger — issued documents", () => {
  it("books income for a paid tax_invoice (morashi)", () => {
    const { incomes } = buildLedger([invoice()], [], "morashi");
    assert.equal(incomes.length, 1);
    assert.equal(incomes[0].amount, 118);
    assert.equal(incomes[0].vat_rate, 18);
  });

  it("books income for combined tax_invoice_receipt (morashi)", () => {
    const { incomes } = buildLedger([invoice({ document_type: "tax_invoice_receipt" })], [], "morashi");
    assert.equal(incomes.length, 1);
  });

  it("books NEGATIVE income for credit_invoice (morashi)", () => {
    const { incomes } = buildLedger([invoice({ document_type: "credit_invoice", amount: 118 })], [], "morashi");
    assert.equal(incomes.length, 1);
    assert.equal(incomes[0].amount, -118);
  });

  it("does NOT book income for receipt (morashi)", () => {
    const { incomes } = buildLedger([invoice({ document_type: "receipt" })], [], "morashi");
    assert.equal(incomes.length, 0);
  });

  it("does NOT book income for transaction_account / quotation / delivery_note", () => {
    const { incomes } = buildLedger(
      [
        invoice({ document_type: "transaction_account" }),
        invoice({ document_type: "quotation" }),
        invoice({ document_type: "delivery_note" }),
      ],
      [],
      "morashi",
    );
    assert.equal(incomes.length, 0);
  });

  it("patoor: receipt books income, tax_invoice does not", () => {
    const { incomes } = buildLedger(
      [invoice({ document_type: "receipt" }), invoice({ document_type: "tax_invoice" })],
      [],
      "patoor",
    );
    assert.equal(incomes.length, 1);
    assert.equal(incomes[0].amount, 118);
  });
});

describe("buildLedger — scanned evidence", () => {
  it("books an expense for a paid scan (receipt)", () => {
    const { expenses } = buildLedger([], [scan()], "morashi");
    assert.equal(expenses.length, 1);
    assert.equal(expenses[0].amount, 50);
    assert.equal(expenses[0].category, "שיווק");
  });

  it("does NOT book a future-payment scan (transaction_account)", () => {
    const { expenses } = buildLedger([], [scan({ doc_type: "transaction_account" })], "morashi");
    assert.equal(expenses.length, 0);
  });

  it("does NOT book non-financial scans (quotation / delivery_note / other)", () => {
    const { expenses } = buildLedger(
      [],
      [scan({ doc_type: "quotation" }), scan({ doc_type: "delivery_note" }), scan({ doc_type: "other" })],
      "morashi",
    );
    assert.equal(expenses.length, 0);
  });

  it("books NEGATIVE expense for a scanned credit_invoice", () => {
    const { expenses } = buildLedger([], [scan({ doc_type: "credit_invoice", total_amount: 30 })], "morashi");
    assert.equal(expenses.length, 1);
    assert.equal(expenses[0].amount, -30);
  });

  it("books income for a paid income scan", () => {
    const { incomes } = buildLedger([], [scan({ direction: "income", doc_type: "tax_invoice_receipt", total_amount: 200 })], "morashi");
    assert.equal(incomes.length, 1);
    assert.equal(incomes[0].amount, 200);
  });
});

describe("outstanding / future helpers", () => {
  it("outstandingDemands returns issued transaction accounts", () => {
    const demands = outstandingDemands([
      invoice({ document_type: "transaction_account" }),
      invoice({ document_type: "tax_invoice" }),
    ]);
    assert.equal(demands.length, 1);
  });

  it("futurePaymentScans returns transaction_account scans", () => {
    const futures = futurePaymentScans([scan({ doc_type: "transaction_account" }), scan({ doc_type: "receipt" })]);
    assert.equal(futures.length, 1);
  });
});
