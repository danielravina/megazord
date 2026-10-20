-- 015: Remove יום חיוב מס הכנסה and יום חיוב ביטוח לאומי settings.
-- These billing days are no longer configurable; consumers use day 15.

alter table tax_settings drop column if exists income_tax_billing_day;
alter table tax_settings drop column if exists bituah_leumi_billing_day;
