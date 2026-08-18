import type { Income, Expense } from "./finance-types";
import type { Invoice, VatStatus } from "@/components/documents/invoice-types";
import { DOC_TYPE_META } from "@/components/documents/invoice-types";
import { booksIncome, incomeSign } from "@/components/documents/invoice-utils";

export interface ScanEvidence {
  id: string;
  title: string;
  doc_type: string;
  direction: string;
  total_amount: number | null;
  date_on_doc: string | null;
  date: string;
  folder: string | null;
  project_id: string | null;
}

// סוגי סריקה שנחשבים "שולמו" (סטטוס תשלום נגזר מהסוג)
const PAID_SCAN_TYPES = ["tax_invoice", "receipt", "tax_invoice_receipt", "credit_invoice"];

function scanState(docType: string): "paid" | "future" | "none" {
  if (PAID_SCAN_TYPES.includes(docType)) return "paid";
  if (docType === "transaction_account") return "future";
  return "none";
}

// בניית פנקס ההכנסות/הוצאות ישירות מתוך הראיות:
//  - הכנסה: מסמכים שהונפקו ללקוח שסוגם רושם הכנסה (לפי סוג העוסק) + סריקות הכנסה ששולמו
//  - הוצאה: סריקות הוצאה ששולמו (סוג המסמך = שולם)
// ללא טבלאות incomes/expenses נפרדות.
export function buildLedger(
  invoices: Invoice[],
  documents: ScanEvidence[],
  vatStatus: VatStatus,
): { incomes: Income[]; expenses: Expense[] } {
  const incomes: Income[] = [];
  const expenses: Expense[] = [];

  // Income from issued documents (tax invoice / combined / credit negative)
  for (const inv of invoices) {
    const type = (inv.document_type || "tax_invoice") as Invoice["document_type"];
    if (!booksIncome(type, vatStatus)) continue;
    const sign = incomeSign(type);
    const date = inv.issue_date || new Date(inv.created_at).toISOString().split("T")[0];
    incomes.push({
      id: inv.id,
      user_id: inv.user_id,
      description: `${DOC_TYPE_META[type].label} ${inv.invoice_number}`,
      amount: Number(inv.amount) * sign,
      date,
      type: "שוטף",
      project_id: inv.project_id || null,
      vat_rate: inv.vat_rate,
      created_at: inv.created_at,
    });
  }

  // Income/expense from scanned evidence (state derived from doc_type)
  for (const d of documents) {
    const state = scanState(d.doc_type);
    if (state !== "paid") continue; // future payments are not recognized yet
    const amount = Number(d.total_amount || 0);
    if (amount === 0) continue;
    const date = d.date_on_doc || d.date.split("T")[0];
    const sign = d.doc_type === "credit_invoice" ? -1 : 1;
    if (d.direction === "income") {
      incomes.push({
        id: d.id,
        user_id: "",
        description: `הכנסה ממסמך: ${d.title}`,
        amount: amount * sign,
        date,
        type: "שוטף",
        project_id: d.project_id,
        vat_rate: null,
        created_at: d.date,
      });
    } else if (d.direction === "expense") {
      expenses.push({
        id: d.id,
        user_id: "",
        description: d.title,
        amount: amount * sign,
        date,
        category: d.folder || "כללי",
        is_paid: true,
        created_at: d.date,
      });
    }
  }

  // Sort by date descending
  incomes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  expenses.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return { incomes, expenses };
}

// סכום הכנסות שלא הוכרו עדיין = חשבונות עסקה שהונפקו ולא הומרו לחשבונית מס
export function outstandingDemands(invoices: Invoice[]): Invoice[] {
  return invoices.filter((inv) => inv.document_type === "transaction_account");
}

export function futurePaymentScans(documents: ScanEvidence[]): ScanEvidence[] {
  return documents.filter((d) => scanState(d.doc_type) === "future");
}

// Re-export helper for tests / dashboard
export function scanStateForTest(docType: string): "paid" | "future" | "none" {
  return scanState(docType);
}
