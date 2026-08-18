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
