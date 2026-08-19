-- Add עוסק זעיר (zeair) as a valid vat_status. For VAT purposes a zeair
-- behaves like patoor (no VAT, issues receipts); in preferences it also
-- auto-applies the zeair expense scheme for income tax.

do $$
begin
  alter table tax_settings drop constraint if exists tax_settings_vat_status_check;
  alter table tax_settings add constraint tax_settings_vat_status_check check (vat_status in ('morashi', 'patoor', 'zeair'));
end $$;