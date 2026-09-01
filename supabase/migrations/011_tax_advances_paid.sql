-- 011: Tax advances paid tracking (מקדמות ששולמו) + the year they apply to.
-- tax_advances_paid is a cumulative ILS value; tax_advances_year stores the
-- fiscal year it was last set for. The engine zeroes advances when the year
-- does not match the current year, so a stale value can never be double-counted.

alter table tax_settings add column if not exists tax_advances_paid numeric not null default 0;
alter table tax_settings add column if not exists tax_advances_year int not null default 2026;