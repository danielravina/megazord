-- 017: Remove יום חיוב מע"מ setting.
-- The billing day is no longer configurable; consumers use day 15.

alter table tax_settings drop column if exists vat_billing_day;
