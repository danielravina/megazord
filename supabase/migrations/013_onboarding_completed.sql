-- 013: Onboarding wizard tracking.
-- Nullable (not defaulted to false) so existing users with a tax_settings row
-- are never forced through the wizard: only rows written with an explicit
-- `false` trigger the onboarding gate.
alter table tax_settings add column if not exists onboarding_completed boolean;
