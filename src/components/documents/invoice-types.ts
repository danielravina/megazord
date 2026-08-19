export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  // שיעור מע"מ לשורה. ברירת מחדל (undefined/null) = שיעור המסמך; 0 = פטור.
  vat_rate?: number | null;
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

export type VatStatus = "morashi" | "patoor" | "zeair";

// עוסק זעיר מתנהג כפטור לצורכי מע"מ (אינו גובה מע"מ, מוציא קבלות)
export function vatBehaviorStatus(status: VatStatus): "morashi" | "patoor" {
  return status === "morashi" ? "morashi" : "patoor";
}

// Is this status VAT-exempt (does not charge VAT)?
export function isVatExempt(status: VatStatus): boolean {
  return status !== "morashi";
}

export interface DocumentTypeMeta {
  label: string;
  // צורת הרבים של שם המסמך (למשל "קבלות")
  labelPlural: string;
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
    labelPlural: "חשבוניות מס",
    booksIncome: { morashi: true, patoor: false, zeair: false },
    incomeSign: 1,
    vatMode: "breakdown",
  },
  transaction_account: {
    label: "חשבונית עסקה",
    labelPlural: "חשבוניות עסקה",
    booksIncome: { morashi: false, patoor: false, zeair: false },
    incomeSign: 1,
    vatMode: "breakdown",
  },
  tax_invoice_receipt: {
    label: "חשבונית מס/קבלה",
    labelPlural: "חשבוניות מס/קבלה",
    booksIncome: { morashi: true, patoor: false, zeair: false },
    incomeSign: 1,
    vatMode: "breakdown",
  },
  credit_invoice: {
    label: "חשבונית מס זיכוי",
    labelPlural: "חשבוניות מס זיכוי",
    booksIncome: { morashi: true, patoor: false, zeair: false },
    incomeSign: -1,
    vatMode: "breakdown",
  },
  receipt: {
    label: "קבלה",
    labelPlural: "קבלות",
    booksIncome: { morashi: false, patoor: true, zeair: true },
    incomeSign: 1,
    vatMode: "single",
  },
  quotation: {
    label: "הצעת מחיר",
    labelPlural: "הצעות מחיר",
    booksIncome: { morashi: false, patoor: false, zeair: false },
    incomeSign: 1,
    vatMode: "none",
  },
  delivery_note: {
    label: "תעודת משלוח",
    labelPlural: "תעודות משלוח",
    booksIncome: { morashi: false, patoor: false, zeair: false },
    incomeSign: 1,
    vatMode: "none",
  },
};

// סוגי מסמכים שמותר לעסק פטור / זעיר להוציא (לא רשומים במע"מ)
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
  return vatBehaviorStatus(vatStatus) === "patoor" ? DOC_TYPES_FOR_PATOOR : DOC_TYPES_FOR_MORASHI;
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
  document_type: DocumentType;
  items: InvoiceItem[];
  notes: string;
}
