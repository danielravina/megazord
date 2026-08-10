import { generateId } from "@/components/shared/generate-id";
import type { InvoiceItem } from "./invoice-types";

// Auto-incrementing invoice number: YYYY-NNNN
export function nextInvoiceNumber(existing: { invoice_number: string }[], now: Date): string {
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
  return `${year}-${String(maxSeq + 1).padStart(4, "0")}`;
}

export function lineTotal(item: InvoiceItem): number {
  return (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
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

export function emptyItem(): InvoiceItem {
  return { id: generateId(), description: "", quantity: 1, unit_price: 0 };
}
