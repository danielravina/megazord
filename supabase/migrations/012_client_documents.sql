-- 012: client-facing document changes
-- - business email shown in the document header
-- - branding images (cover banner + logo) uploaded from Preferences
-- - receipts hold multiple payment rows (method/date/bank/amount)

alter table tax_settings add column if not exists business_email text;
alter table tax_settings add column if not exists cover_image_path text;
alter table tax_settings add column if not exists logo_path text;

alter table invoices add column if not exists payments jsonb not null default '[]'::jsonb;

-- Public bucket for document branding (cover image + logo appear on client
-- documents, so the files must be publicly readable via getPublicUrl).
-- Kept separate from the private "documents" scans bucket.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload their branding" on storage.objects;
create policy "Users can upload their branding"
  on storage.objects for insert
  with check (
    bucket_id = 'branding'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their branding" on storage.objects;
create policy "Users can update their branding"
  on storage.objects for update
  using (
    bucket_id = 'branding'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their branding" on storage.objects;
create policy "Users can delete their branding"
  on storage.objects for delete
  using (
    bucket_id = 'branding'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public can read branding" on storage.objects;
create policy "Public can read branding"
  on storage.objects for select
  using (bucket_id = 'branding');