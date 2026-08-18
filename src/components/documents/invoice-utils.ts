import { generateId } from "@/components/shared/generate-id";
import { DOC_TYPE_META } from "./invoice-types";
import type { DocumentType, InvoiceItem, VatStatus } from "./invoice-types";

// Auto-incrementing document number: YYYY-NNNN (shared across all types)
export function nextInvoiceNumber(existing: { invoice_number: string }[], now: Date): string {
  return nextSequenceNumber(existing, now);
}

// Kept for API compatibility — all types share the numeric sequence.
export function nextQuotationNumber(existing: { invoice_number: string }[], now: Date): string {
  return nextSequenceNumber(existing, now);
}

// Kept for API compatibility — all types share the numeric sequence.
export function nextDeliveryNoteNumber(existing: { invoice_number: string }[], now: Date): string {
  return nextSequenceNumber(existing, now);
}

function nextSequenceNumber(existing: { invoice_number: string }[], now: Date): string {
  const year = now.getFullYear();
  const prefix = `${year}-`;
  let maxSeq = 0;
  for (const inv of existing) {
    const num = inv.invoice_number;
    if (num.startsWith(prefix)) {
      const seq = parseInt(num.slice(prefix.length), 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

// Returns the next number for any document type (shared numeric sequence)
export function nextNumberFor(
  _type: DocumentType,
  existing: { invoice_number: string }[],
  now: Date,
): string {
  return nextInvoiceNumber(existing, now);
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

// Per-line VAT and gross, handling both net and VAT-inclusive unit prices.
export function lineVatBreakdown(
  item: InvoiceItem,
  vatRate: number,
  inclusive: boolean,
): { vat: number; net: number; gross: number } {
  const raw = lineTotal(item);
  const r = (vatRate || 0) / 100;
  if (r === 0) return { vat: 0, net: raw, gross: raw };
  if (inclusive) {
    const net = raw / (1 + r);
    return { vat: raw - net, net, gross: raw };
  }
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

// Compute totals from VAT-inclusive (gross) unit prices: the total is the sum
// of the gross, with net and VAT backed out. Round-trips with computeTotals.
export function computeTotalsInclusive(items: InvoiceItem[], vatRate: number): InvoiceTotals {
  const total = items.reduce((s, i) => s + lineTotal(i), 0);
  const r = (vatRate || 0) / 100;
  if (r === 0) return { subtotal: total, vat: 0, total };
  const net = total / (1 + r);
  return { subtotal: net, vat: total - net, total };
}

export function emptyItem(): InvoiceItem {
  return { id: generateId(), description: "", quantity: 1, unit_price: 0 };
}
