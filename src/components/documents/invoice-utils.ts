import { generateId } from "@/components/shared/generate-id";
import { DOC_CATEGORY, DOC_TYPE_META } from "./invoice-types";
import type { DocumentType, InvoiceItem, InvoicePayment, VatStatus } from "./invoice-types";

// Numbering: {category}{seq4} — e.g. 70122 = category 7, document 0122.
// Each category counts independently (first receipt = 60001, first tax invoice = 30001...).
// Legacy YYYY-NNNN numbers never match the category pattern, so they are ignored
// by the counter and left untouched.
function nextSequenceNumber(type: DocumentType, existing: { invoice_number: string }[]): string {
  const cat = DOC_CATEGORY[type];
  const pattern = new RegExp(`^${cat}(\\d{4,})$`);
  let maxSeq = 0;
  for (const inv of existing) {
    const m = pattern.exec(inv.invoice_number);
    if (m) {
      const seq = parseInt(m[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${cat}${String(maxSeq + 1).padStart(4, "0")}`;
}

// Returns the next number for a document type (per-category sequence).
export function nextNumberFor(type: DocumentType, existing: { invoice_number: string }[]): string {
  return nextSequenceNumber(type, existing);
}

// Kept for API compatibility — per-category sequences.
export function nextInvoiceNumber(existing: { invoice_number: string }[]): string {
  return nextNumberFor("tax_invoice", existing);
}

// Kept for API compatibility — per-category sequences.
export function nextQuotationNumber(existing: { invoice_number: string }[]): string {
  return nextNumberFor("quotation", existing);
}

// Kept for API compatibility — per-category sequences.
export function nextDeliveryNoteNumber(existing: { invoice_number: string }[]): string {
  return nextNumberFor("delivery_note", existing);
}

// Does issuing this document book income for this business status?
export function booksIncome(type: DocumentType, vatStatus: VatStatus): boolean {
  return DOC_TYPE_META[type].booksIncome[vatStatus];
}

// Sign of the booked income (credit invoices are negative)
export function incomeSign(type: DocumentType): number {
  return DOC_TYPE_META[type].incomeSign;
}

// Documents that can be created for a given business status
export { docTypesFor } from "./invoice-types";

export function lineTotal(item: InvoiceItem): number {
  return (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
}

// The VAT rate that applies to this line: its own rate, or the document default.
export function effectiveLineVatRate(item: InvoiceItem, defaultRate: number): number {
  const r = item.vat_rate;
  return r == null || Number.isNaN(r) ? defaultRate : r;
}

// Per-line net / vat / gross. Prices are treated as net (VAT added on top).
export function lineVatBreakdown(
  item: InvoiceItem,
  vatRate: number,
): { vat: number; net: number; gross: number } {
  const raw = lineTotal(item);
  const r = (vatRate || 0) / 100;
  const vat = raw * r;
  return { vat, net: raw, gross: raw + vat };
}

export interface InvoiceTotals {
  subtotal: number;
  vat: number;
  total: number;
}

export function computeTotals(items: InvoiceItem[], vatRate: number): InvoiceTotals {
  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const vat = subtotal * ((vatRate || 0) / 100);
  return { subtotal, vat, total: subtotal + vat };
}

// Compute totals honoring each item's own vat_rate (per-line VAT, mixed rates).
export function computeLineTotals(items: InvoiceItem[], defaultRate: number): InvoiceTotals {
  let subtotal = 0;
  let vat = 0;
  let total = 0;
  for (const it of items) {
    const bd = lineVatBreakdown(it, effectiveLineVatRate(it, defaultRate));
    subtotal += bd.net;
    vat += bd.vat;
    total += bd.gross;
  }
  return { subtotal, vat, total };
}

export function emptyItem(): InvoiceItem {
  return { id: generateId(), description: "", quantity: 1, unit_price: 0, vat_rate: null };
}

export function emptyPayment(date: string): InvoicePayment {
  return {
    id: generateId(),
    method: "cash",
    method_other: null,
    date,
    bank_name: null,
    bank_branch: null,
    bank_account: null,
    amount: 0,
  };
}
