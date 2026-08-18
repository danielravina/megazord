-- Business-status (עוסק) fields on tax_settings
alter table tax_settings add column vat_status text not null default 'morashi';
alter table tax_settings add column income_scheme text not null default 'standard';
alter table tax_settings add column zeair_expense_rate numeric not null default 0;

-- Constrain valid values
do $$
begin
  alter table tax_settings add constraint tax_settings_vat_status_check check (vat_status in ('morashi', 'patoor'));
  alter table tax_settings add constraint tax_settings_income_scheme_check check (income_scheme in ('standard', 'zeair'));
exception when duplicate_object then null;
end $$;

-- Invoice document type (חשבונית מס / קבלה / חשבונית מס+קבלה)
alter table invoices add column document_type text not null default 'tax_invoice';
do $$
begin
  alter table invoices add constraint invoices_document_type_check check (document_type in ('tax_invoice', 'receipt', 'tax_invoice_receipt'));
exception when duplicate_object then null;
end $$;

-- Bump invoice VAT default to current Israeli rate (18%)
alter table invoices alter column vat_rate set default 18;
