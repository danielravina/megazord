-- Drop the kanban feature (requests table + attachments storage bucket)
-- NOTE: the storage bucket is removed via the Storage API/dashboard, since
-- direct deletes from storage tables are blocked by the protect_delete trigger.

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'requests') then
    drop policy if exists "Users can manage their own requests" on requests;
    drop table if exists requests cascade;
  end if;
end
$$;

drop policy if exists "Users can upload attachments" on storage.objects;
drop policy if exists "Users can read attachments" on storage.objects;
