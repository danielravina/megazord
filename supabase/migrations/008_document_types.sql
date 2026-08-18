-- 008: 7 document types, evidence-based state (no is_paid/status/sent_at)

-- ---- documents (scans) ----
-- Map legacy scan doc_type values to the unified vocabulary.
update documents set doc_type = 'tax_invoice' where doc_type = 'Invoice';
update documents set doc_type = 'delivery_note' where doc_type = 'Delivery Note';
update documents set doc_type = 'quotation' where doc_type = 'Proforma Invoice';

-- Add direction column for local DB parity (exists in production via dashboard).
alter table documents add column if not exists direction text not null default 'expense';

-- Link scans to a supplier/business (address book) — existed ad-hoc in production.
alter table documents add column if not exists business_id uuid references businesses(id) on delete set null;

-- Calendar events: project links + end date — existed ad-hoc in production.
alter table events add column if not exists end_date date;
alter table events add column if not exists project_id uuid references projects(id) on delete set null;

-- Business profile on tax_settings (shown on PDFs / monthly report) — existed ad-hoc in production.
alter table tax_settings add column if not exists owner_name text;
alter table tax_settings add column if not exists business_name text;
alter table tax_settings add column if not exists vat_number text;
alter table tax_settings add column if not exists business_address text;
alter table tax_settings add column if not exists business_phone text;
alter table tax_settings add column if not exists accountant_email text;

-- Drop payment boolean; state is now derived purely from doc_type.
alter table documents drop column if exists is_paid;

-- ---- invoices (issued documents) ----
-- Extend the document_type check to all 7 supported types.
do $$
begin
  alter table invoices drop constraint if exists invoices_document_type_check;
  alter table invoices add constraint invoices_document_type_check check (document_type in (
    'tax_invoice', 'transaction_account', 'tax_invoice_receipt',
    'credit_invoice', 'receipt', 'quotation', 'delivery_note'
  ));
exception when duplicate_object then null;
end $$;

-- Drop workflow/payment columns; the type is the state.
alter table invoices drop column if exists status;
alter table invoices drop column if exists sent_at;
alter table invoices drop column if exists is_paid;
alter table invoices drop column if exists paid_date;