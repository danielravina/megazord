interface SupplierDoc {
  id: string;
  title: string;
  doc_type: string;
  direction: string;
  total_amount: number | null;
  date_on_doc: string | null;
  date: string;
  business_id?: string | null;
}

const PAID_SCAN_TYPES = ["tax_invoice", "receipt", "tax_invoice_receipt", "credit_invoice"];

// הוצאות לספק = מסמכים המשויכים לספק (business_id), כיוון הוצאה, שסוגם משולם
export interface SupplierExpense {
  id: string;
  title: string;
  amount: number;
  date: string;
  doc_type: string;
}

export function supplierExpenses(documents: SupplierDoc[], supplierId: string): SupplierExpense[] {
  const out: SupplierExpense[] = [];
  for (const d of documents) {
    if (d.business_id !== supplierId) continue;
    if (d.direction !== "expense") continue;
    if (!PAID_SCAN_TYPES.includes(d.doc_type)) continue;
    const amount = Number(d.total_amount || 0);
    if (amount === 0) continue;
    const sign = d.doc_type === "credit_invoice" ? -1 : 1;
    out.push({
      id: d.id,
      title: d.title,
      amount: amount * sign,
      date: d.date_on_doc || d.date.split("T")[0],
      doc_type: d.doc_type,
    });
  }
  return out;
}

export function sumExpenses(expenses: SupplierExpense[], year?: number, month?: number): number {
  let total = 0;
  for (const e of expenses) {
    const d = new Date(e.date + "T00:00:00");
    if (Number.isNaN(d.getTime())) continue;
    if (year != null && d.getFullYear() !== year) continue;
    if (month != null && d.getMonth() !== month) continue;
    total += e.amount;
  }
  return total;
}