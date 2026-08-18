export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

// סוגי מסמכים ללקוח: מצב המסמך (= מתי רושמים הכנסה) נגזר מהסוג + סוג העוסק.
export type DocumentType =
  | "tax_invoice" // חשבונית מס
  | "transaction_account" // חשבונית עסקה (דרישת תשלום)
  | "tax_invoice_receipt" // חשבונית מס/קבלה
  | "credit_invoice" // חשבונית מס זיכוי
  | "receipt" // קבלה
  | "quotation" // הצעת מחיר
  | "delivery_note"; // תעודת משלוח

export type VatStatus = "morashi" | "patoor";

export interface DocumentTypeMeta {
  label: string;
  // האם הוצאת המסמך רושמת הכנסה (לפי סוג העוסק)
  booksIncome: Record<VatStatus, boolean>;
  // סימן ההכנסה (זיכוי = שלילי)
  incomeSign: number;
  // אופן הצגת מע"מ במסמך
  vatMode: "breakdown" | "single" | "none";
}

// מקור אמת יחיד להתנהגות המסמך.
// הכנסה נרשמת במסמך שמופק כשהכסף מתקבל בפועל:
//  - מורשה: חשבונית מס / חשבונית מס+קבלה / זיכוי (שלילי)
//  - פטור: קבלה בלבד
export const DOC_TYPE_META: Record<DocumentType, DocumentTypeMeta> = {
  tax_invoice: {
    label: "חשבונית מס",
    booksIncome: { morashi: true, patoor: false },
    incomeSign: 1,
    vatMode: "breakdown",
  },
  transaction_account: {
    label: "חשבונית עסקה",
    booksIncome: { morashi: false, patoor: false },
    incomeSign: 1,
    vatMode: "breakdown",
  },
  tax_invoice_receipt: {
    label: "חשבונית מס/קבלה",
    booksIncome: { morashi: true, patoor: false },
    incomeSign: 1,
    vatMode: "breakdown",
  },
  credit_invoice: {
    label: "חשבונית מס זיכוי",
    booksIncome: { morashi: true, patoor: false },
    incomeSign: -1,
    vatMode: "breakdown",
  },
  receipt: {
    label: "קבלה",
    booksIncome: { morashi: false, patoor: true },
    incomeSign: 1,
    vatMode: "single",
  },
  quotation: {
    label: "הצעת מחיר",
    booksIncome: { morashi: false, patoor: false },
    incomeSign: 1,
    vatMode: "none",
  },
  delivery_note: {
    label: "תעודת משלוח",
    booksIncome: { morashi: false, patoor: false },
    incomeSign: 1,
    vatMode: "none",
  },
};

// סוגי מסמכים שמותר לעסק פטור להוציא (לא רשומים במע"מ)
export const DOC_TYPES_FOR_PATOOR: DocumentType[] = ["receipt", "transaction_account", "quotation", "delivery_note"];
export const DOC_TYPES_FOR_MORASHI: DocumentType[] = [
  "tax_invoice",
  "transaction_account",
  "tax_invoice_receipt",
  "credit_invoice",
  "receipt",
  "quotation",
  "delivery_note",
];

export function docTypesFor(vatStatus: VatStatus): DocumentType[] {
  return vatStatus === "patoor" ? DOC_TYPES_FOR_PATOOR : DOC_TYPES_FOR_MORASHI;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id: string;
  project_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  items: InvoiceItem[];
  amount: number;
  vat_rate: number;
  document_type: DocumentType;
  notes: string | null;
  created_at: string;
  customer_name?: string | null;
}

export interface InvoiceFormData {
  customer_id: string;
  project_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  vat_rate: number;
  is_exempt: boolean;
  document_type: DocumentType;
  items: InvoiceItem[];
  notes: string;
}
