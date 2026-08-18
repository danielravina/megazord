export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

// סוג מסמך: חשבונית מס / קבלה / חשבונית מס+קבלה
export type DocumentType = "tax_invoice" | "receipt" | "tax_invoice_receipt";

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
  status: string;
  document_type: DocumentType;
  notes: string | null;
  sent_at: string | null;
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
